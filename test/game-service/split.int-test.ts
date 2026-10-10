import Redis from 'ioredis';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqp-connection-manager';
import { RabbitMQService } from '../../src/messaging';
import { LoggerService } from '../../src/tools/logger';
import { GameRepository } from '../../src/game/game.repository';
import { GameService } from '../../src/game/game.service';
import { GameClock } from '../../src/game/game.clock';
import { GameMetrics } from '../../src/game/game.metrics';
import { GameAdapter } from '../../src/game/entities/game';
import { Game as GameEvent, GameEnd } from '../../src/game/EmitTypes';
import { AmqpGameNotifier } from '../../src/game-service/amqp.notifier';
import { GameCommandHandler } from '../../src/game-service/game.commands';
import { GameClient } from '../../src/gateway/game.client';
import { SocketNotifier } from '../../src/gateway/socket.notifier';
import { NotificationConsumer } from '../../src/gateway/notification.consumer';
import { RedisKeys } from '../../src/redis';
import { RedisTestDb, clearChessKeys, testRedis } from '../redis/helpers';
import { FakeBroker, fakeConnection, flush } from '../messaging/fake-broker';
import { generateClient, generateConfig } from '../game/generators';

const waitFor = async (check: () => boolean, timeout = 3000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
};

describe('core <-> game-svc over RabbitMQ (integration, Redis + fake broker)', () => {
  let redis: Redis;
  let broker: FakeBroker;
  let games: GameClient;
  let clock: GameClock;
  let emitted: { rooms: string[]; event: string; payload: unknown }[];
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as LoggerService;
  const metrics = {
    gameCreated: jest.fn(),
    gameEnded: jest.fn(),
    clockLeadership: jest.fn(),
    trackMove: jest.fn(<T>(fn: () => Promise<T>) => fn()),
  } as unknown as GameMetrics;

  const white = generateClient(true, 1);
  const black = generateClient(true, 2);
  const stranger = generateClient(true, 3);

  beforeEach(async () => {
    redis = testRedis(RedisTestDb.split);
    await clearChessKeys(redis);
    broker = new FakeBroker();
    jest
      .spyOn(amqp, 'connect')
      .mockImplementation(() => fakeConnection(broker) as never);
    const config = new ConfigService({ RABBITMQ_URL: 'amqp://fake' });

    const gameSvcRabbit = new RabbitMQService(config, logger);
    gameSvcRabbit.onModuleInit();
    const repo = new GameRepository(redis);
    const notifier = new AmqpGameNotifier(gameSvcRabbit, logger);
    const service = new GameService(repo, metrics, notifier, new GameAdapter());
    clock = new GameClock(redis, repo, service, notifier, logger, metrics);
    new GameCommandHandler(
      gameSvcRabbit,
      service,
      metrics,
      logger,
    ).onApplicationBootstrap();

    const coreRabbit = new RabbitMQService(config, logger);
    coreRabbit.onModuleInit();
    games = new GameClient(coreRabbit);
    emitted = [];
    const socketNotifier = new SocketNotifier();
    const target = (rooms: string | string[]) => ({
      emit: (event: string, payload?: unknown) =>
        emitted.push({ rooms: [rooms].flat(), event, payload }),
    });
    socketNotifier.bind({
      to: target,
      emit: (event: string, payload?: unknown) =>
        emitted.push({ rooms: ['*'], event, payload }),
      in: () => ({ socketsJoin: jest.fn() }),
    } as never);
    new NotificationConsumer(
      coreRabbit,
      socketNotifier,
      logger,
    ).onApplicationBootstrap();
    await flush();
  });
  afterEach(async () => {
    await clock.onApplicationShutdown();
    jest.restoreAllMocks();
    await redis.quit();
  });

  const startGame = async () => {
    const created = await games.createGame(white, generateConfig('w', 0));
    return games.joinGame(black, created.id);
  };

  it('should create and join a game through commands', async () => {
    const created = await games.createGame(white, generateConfig('w', 0));
    expect(await games.lobby()).toEqual([
      expect.objectContaining({ id: created.id }),
    ]);

    const joined = await games.joinGame(black, created.id);
    expect(joined.players.map((p) => [p.userId, p.initData.side])).toEqual([
      [1, 'w'],
      [2, 'b'],
    ]);
    expect(await games.pendingGame(black)).toMatchObject({ id: created.id });
    expect(await games.currentOpponent(white)).toStrictEqual({ userId: 2 });
  });

  it('should apply moves and surface domain errors to the gateway', async () => {
    const { id } = await startGame();
    const move = await games.move(white, {
      gameId: id,
      figure: 'pawn4',
      cell: 'd4',
    });
    expect(move).toMatchObject({ prevCell: 'd2', side: 'w' });

    await expect(
      games.move(white, { gameId: id, figure: 'pawn5', cell: 'e4' }),
    ).rejects.toThrow('Not your turn');
  });

  it('should reject commands from someone outside the game', async () => {
    const { id } = await startGame();
    await expect(games.chat(stranger, id, 'hi')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(games.surrender(stranger, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should end a game by surrender and write the result to the outbox', async () => {
    const { id } = await startGame();
    const result = await games.surrender(white, id);
    expect(result.winner).toStrictEqual({ userId: 2 });
    expect(result.gameDto.id).toBe(id);
    expect(await redis.xlen(RedisKeys.outbox)).toBe(1);
  });

  it('should deliver clock ticks from game-svc to sockets in core', async () => {
    const { id } = await startGame();
    await clock.tick();
    await waitFor(() =>
      emitted.some((e) => e.event === (GameEvent.timeTick as string)),
    );
    const tick = emitted.find(
      (e) => e.event === (GameEvent.timeTick as string),
    );
    expect(tick.rooms).toStrictEqual([`game:${id}`]);
    expect(tick.payload).toHaveProperty('w');
  });

  it('should notify both players in core when game-svc ends a game on time', async () => {
    const { id } = await startGame();
    const stored = await new GameRepository(redis).get(id);

    await clock.tick(stored.deadline() + 1);

    await waitFor(
      () =>
        emitted.filter((e) => e.event === (GameEvent.end as string)).length ===
        2,
    );
    const ends = emitted.filter((e) => e.event === (GameEvent.end as string));
    expect(ends.map((e) => e.rooms[0]).sort()).toStrictEqual([
      'user:1',
      'user:2',
    ]);
    expect(ends[0].payload).toMatchObject({ reason: GameEnd.timeout });
  });
});
