import Redis from 'ioredis';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import type { ClientGrpcProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { GameRepository } from '../../src/infrastructure/game/game.repository';
import { GameService } from '../../src/game/game.service';
import { GameClock } from '../../src/infrastructure/game/game.clock';
import { GameMetrics } from '../../src/infrastructure/game/game.metrics';
import { GamePublisher } from '../../src/game/game.publisher';
import { GameAdapter } from '../../src/game/game.adapter';
import { GameEnd } from '../../src/domain/game/EmitTypes';
import { GameCommandHandler } from '../../src/game-service/game.commands';
import { GameGrpcController } from '../../src/game-service/game.grpc.controller';
import { GrpcHealthController } from '../../src/game-service/grpc.health.controller';
import { connectGrpc } from '../../src/game-service/grpc.server';
import { GameClient } from '../../src/gateway/game.client';
import { GameReadModel } from '../../src/game-read';
import {
  CLIENT_CHANNEL_OPTIONS,
  GAME_PACKAGE,
  GAME_PROTO,
  GameServiceUnavailableError,
  HEALTH_PACKAGE,
  HEALTH_PROTO,
  PROTO_LOADER,
} from '../../src/infrastructure/grpc';
import type { HealthClient } from '../../src/generated/grpc/health/v1/health';
import { EventType } from '../../src/infrastructure/messaging';
import { REDIS, RedisKeys } from '../../src/infrastructure/redis';
import { LoggerService } from '../../src/infrastructure/logger';
import { RedisTestDb, clearChessKeys, testRedis } from '../redis/helpers';
import { generateClient, generateConfig } from '../game/generators';
import { fakeMetrics, fakePublisher } from '../game/fakes';

const freePort = () =>
  new Promise<number>((resolve) => {
    const server = createServer();
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => resolve(port));
    });
  });

const grpcClient = (port: number, pkg: string, protoPath: string) =>
  ClientProxyFactory.create({
    transport: Transport.GRPC,
    options: {
      package: pkg,
      protoPath,
      url: `localhost:${port}`,
      loader: PROTO_LOADER,
      channelOptions: CLIENT_CHANNEL_OPTIONS,
    },
  }) as ClientGrpcProxy;

describe('core <-> game-svc over gRPC (integration, Redis)', () => {
  let redis: Redis;
  let app: INestApplication;
  let port: number;
  let proxy: ClientGrpcProxy;
  let games: GameClient;
  let views: GameReadModel;
  let service: GameService;
  let clock: GameClock;
  let publisher: ReturnType<typeof fakePublisher>;
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as LoggerService;

  const white = generateClient(true, 1);
  const black = generateClient(true, 2);
  const stranger = generateClient(true, 3);

  beforeAll(async () => {
    redis = testRedis(RedisTestDb.grpc);
    publisher = fakePublisher();
    const moduleRef = await Test.createTestingModule({
      controllers: [GameGrpcController, GrpcHealthController],
      providers: [
        GameCommandHandler,
        GameService,
        GameRepository,
        { provide: REDIS, useValue: redis },
        { provide: GameMetrics, useValue: fakeMetrics() },
        { provide: GamePublisher, useValue: publisher },
        { provide: 'GameAdapterI', useClass: GameAdapter },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    port = await freePort();
    connectGrpc(app, port);
    await app.startAllMicroservices();
    await app.init();
    service = app.get(GameService);
    clock = new GameClock(
      redis,
      app.get(GameRepository),
      service,
      logger,
      fakeMetrics() as unknown as GameMetrics,
    );

    proxy = grpcClient(port, GAME_PACKAGE, GAME_PROTO);
    games = new GameClient(proxy);
    games.onModuleInit();
    views = new GameReadModel(redis);
  });
  beforeEach(async () => {
    await clearChessKeys(redis);
    publisher.published.length = 0;
    games.deadlineMs = 5000;
    jest.restoreAllMocks();
  });
  afterAll(async () => {
    await clock.onApplicationShutdown();
    proxy.close();
    await app.close();
    await redis.quit();
  });

  const startGame = async () => {
    const created = await games.createGame(white, generateConfig('w', 0));
    await games.joinGame(black, created.id);
    return created;
  };

  it('should create and join a game through commands and read it back from views', async () => {
    const created = await games.createGame(white, generateConfig('w', 0));
    expect(created).toStrictEqual({
      id: created.id,
      matchId: expect.any(String),
    });
    expect(await views.lobby()).toEqual([
      expect.objectContaining({ id: created.id }),
    ]);

    expect(await games.joinGame(black, created.id)).toStrictEqual({
      id: created.id,
    });
    expect(await views.lobby()).toEqual([]);
    expect(await views.userGame(white.userId)).toStrictEqual({
      gameId: created.id,
      status: 'active',
      opponentId: 2,
    });
    expect(publisher.types()).toStrictEqual(['created', 'started']);
  });

  it('should carry the pending game with init data, and null without one', async () => {
    expect(await games.pendingGame(stranger)).toBeNull();
    const config = generateConfig('w', 0);
    const { id } = await games.createGame(white, config);
    await games.joinGame(black, id);

    const pending = await games.pendingGame(black);

    expect(pending.id).toBe(id);
    expect(pending.initData).toMatchObject({
      gameId: id,
      side: 'b',
      maxTime: config.time,
      timeIncrement: config.timeIncrement,
      clock: { running: 'w' },
    });
    expect(Object.keys(pending.initData.board.w)).toHaveLength(16);
  });

  it('should keep false and empty values on the wire', async () => {
    const anon = generateClient(false, 50);
    const { id } = await games.createGame(anon, generateConfig('b', 0));
    const stored = await new GameRepository(redis).get(id);
    expect(stored.players[0]).toMatchObject({ authorized: false, side: 'b' });
  });

  it('should apply moves and rebuild domain errors as the same exception classes', async () => {
    const { id } = await startGame();
    await expect(
      games.move(white, { gameId: id, figure: 'pawn4', cell: 'd4' }),
    ).resolves.toBeNull();
    expect(publisher.published.at(-1).event).toMatchObject({
      type: 'moved',
      prevCell: 'd2',
    });

    const outOfTurn = games.move(white, {
      gameId: id,
      figure: 'pawn5',
      cell: 'e4',
    });
    await expect(outOfTurn).rejects.toBeInstanceOf(ConflictException);
    await expect(outOfTurn).rejects.toThrow('Not your turn');
    await expect(games.chat(stranger, id, 'hi')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(games.surrender(stranger, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should map unexpected server errors to a 500 and log them', async () => {
    const { id } = await startGame();
    jest
      .spyOn(service, 'pushMessage')
      .mockRejectedValueOnce(new Error('redis exploded'));

    const failed = games.chat(white, id, 'hi');

    await expect(failed).rejects.toBeInstanceOf(HttpException);
    await expect(failed).rejects.toMatchObject({ status: 500 });
    expect(logger.error).toHaveBeenCalled();
  });

  it('should end a game by surrender and append game.ended to the stream', async () => {
    const { id } = await startGame();
    await expect(games.surrender(white, id)).resolves.toBeNull();

    const [[, fields]] = await redis.xrange(RedisKeys.events, '-', '+');
    expect(JSON.parse(fields[1])).toMatchObject({
      type: EventType.GameEnded,
      payload: { gameId: id, reason: GameEnd.surrender },
    });
    expect(await views.userGame(white.userId)).toBeNull();
  });

  it('should publish the end when game-svc ends a game on time', async () => {
    const { id } = await startGame();
    const stored = await new GameRepository(redis).get(id);

    await clock.tick(stored.deadline() + 1);

    expect(publisher.published.at(-1)).toStrictEqual({
      gameId: id,
      event: { type: 'ended', reason: GameEnd.timeout },
    });
  });

  it('should give up after the deadline and report the game service as unavailable', async () => {
    const { id } = await startGame();
    jest
      .spyOn(service, 'pushMessage')
      .mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 500)) as never,
      );
    games.deadlineMs = 100;

    const started = Date.now();
    await expect(games.chat(white, id, 'slow')).rejects.toBeInstanceOf(
      GameServiceUnavailableError,
    );
    expect(Date.now() - started).toBeLessThan(400);
  });

  it('should fail fast with UNAVAILABLE when no game-svc listens', async () => {
    const deadProxy = grpcClient(await freePort(), GAME_PACKAGE, GAME_PROTO);
    const dead = new GameClient(deadProxy);
    dead.onModuleInit();

    const started = Date.now();
    await expect(dead.pendingGame(white)).rejects.toBeInstanceOf(
      GameServiceUnavailableError,
    );
    expect(Date.now() - started).toBeLessThan(2000);
    deadProxy.close();
  });

  it('should answer the standard gRPC health check', async () => {
    const health = grpcClient(port, HEALTH_PACKAGE, HEALTH_PROTO);
    const client = health.getService<HealthClient>('Health');
    await expect(
      firstValueFrom(client.check({ service: '' })),
    ).resolves.toStrictEqual({
      status: 'SERVING',
    });
    health.close();
  });
});
