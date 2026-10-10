import Redis from 'ioredis';
import {
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';
import type { Channel, ChannelModel, GetMessage } from 'amqplib';
import {
  DELIVERY_LIMIT,
  Exchange,
  Queue,
  RabbitMQService,
  RoutingKey,
} from '../../src/messaging';
import { assertTopology } from '../../src/messaging/topology';
import { OutboxRelay } from '../../src/messaging/outbox.relay';
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
import { generateClient, generateConfig } from '../game/generators';

const url = process.env.RABBITMQ_URL;
const describeBroker = url ? describe : describe.skip;

const waitFor = async (
  check: () => boolean | Promise<boolean>,
  timeout = 8000,
) => {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeout) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 25));
  }
};

type Emitted = { rooms: string[]; event: string; payload: unknown };

describeBroker('core <-> game-svc over a real RabbitMQ (integration)', () => {
  jest.setTimeout(20000);
  let admin: ChannelModel;
  let channel: Channel;
  let redis: Redis;
  let stoppers: (() => Promise<unknown>)[];
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
  const config = new ConfigService({ RABBITMQ_URL: url });

  const white = generateClient(true, 1);
  const black = generateClient(true, 2);
  const stranger = generateClient(true, 3);

  const rabbit = () => {
    const service = new RabbitMQService(config, logger);
    service.onModuleInit();
    stoppers.push(() => service.onApplicationShutdown());
    return service;
  };

  const startGameSvc = async () => {
    const service = rabbit();
    const repo = new GameRepository(redis);
    const notifier = new AmqpGameNotifier(service, logger);
    const games = new GameService(repo, metrics, notifier, new GameAdapter());
    const clock = new GameClock(redis, repo, games, notifier, logger, metrics);
    stoppers.push(() => clock.onApplicationShutdown());
    new GameCommandHandler(
      service,
      games,
      metrics,
      logger,
    ).onApplicationBootstrap();
    const relay = new OutboxRelay(redis, service, logger);
    await relay.onApplicationBootstrap();
    stoppers.push(() => relay.onApplicationShutdown());
    return { clock, repo };
  };

  const startCore = async (emitted: Emitted[]) => {
    const service = rabbit();
    const socketNotifier = new SocketNotifier();
    socketNotifier.bind({
      to: (rooms: string | string[]) => ({
        emit: (event: string, payload?: unknown) =>
          emitted.push({ rooms: [rooms].flat(), event, payload }),
      }),
      emit: (event: string, payload?: unknown) =>
        emitted.push({ rooms: ['*'], event, payload }),
      in: () => ({ socketsJoin: jest.fn() }),
    } as never);
    new NotificationConsumer(
      service,
      socketNotifier,
      logger,
    ).onApplicationBootstrap();
    return new GameClient(service);
  };

  const nextMessage = async (queue: string): Promise<GetMessage> => {
    let message: GetMessage | false = false;
    await waitFor(async () => {
      message = await channel.get(queue, { noAck: true });
      return message !== false;
    });
    return message as unknown as GetMessage;
  };

  const purge = async () => {
    for (const queue of Object.values(Queue)) await channel.purgeQueue(queue);
  };

  beforeAll(async () => {
    admin = await connect(url);
    channel = await admin.createChannel();
    await assertTopology(channel as never);
  });
  afterAll(async () => {
    await channel.close();
    await admin.close();
  });
  beforeEach(async () => {
    stoppers = [];
    redis = testRedis(RedisTestDb.rabbitmq);
    await clearChessKeys(redis);
    await purge();
  });
  afterEach(async () => {
    for (const stop of stoppers.reverse()) await stop();
    await redis.quit();
  });

  it('should play a game through commands and map domain errors back', async () => {
    await startGameSvc();
    const games = await startCore([]);

    const created = await games.createGame(white, generateConfig('w', 0));
    const joined = await games.joinGame(black, created.id);
    expect(joined.players.map((p) => p.userId)).toEqual([1, 2]);

    await expect(
      games.move(white, { gameId: created.id, figure: 'pawn4', cell: 'd4' }),
    ).resolves.toMatchObject({ prevCell: 'd2', side: 'w' });
    await expect(
      games.move(white, { gameId: created.id, figure: 'pawn5', cell: 'e4' }),
    ).rejects.toThrow('Not your turn');
    await expect(games.chat(stranger, created.id, 'hi')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should answer concurrent commands from two core instances', async () => {
    await startGameSvc();
    const [a, b] = await Promise.all([startCore([]), startCore([])]);
    const created = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        (i % 2 ? a : b).createGame(
          generateClient(true, 100 + i),
          generateConfig('w', 0),
        ),
      ),
    );
    expect(new Set(created.map((g) => g.id)).size).toBe(20);
    expect(await a.lobby()).toHaveLength(20);
  });

  it('should time out when game-svc is not running', async () => {
    const service = rabbit();
    const started = Date.now();
    await expect(
      service.request(
        Exchange.GameCommands,
        RoutingKey.GameCommand,
        'lobby',
        {},
        300,
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('should deliver each notification once across core instances', async () => {
    const { clock, repo } = await startGameSvc();
    const first: Emitted[] = [];
    const second: Emitted[] = [];
    const games = await startCore(first);
    await startCore(second);

    const created = await games.createGame(white, generateConfig('w', 0));
    await games.joinGame(black, created.id);
    const stored = await repo.get(created.id);
    await clock.tick(stored.deadline() + 1);

    const ends = () =>
      [...first, ...second].filter(
        (e) => e.event === (GameEvent.end as string),
      );
    await waitFor(() => ends().length === 2);
    await new Promise((r) => setTimeout(r, 300));
    expect(ends()).toHaveLength(2);
    expect(
      ends()
        .map((e) => e.rooms[0])
        .sort(),
    ).toStrictEqual(['user:1', 'user:2']);
    expect(ends()[0].payload).toMatchObject({ reason: GameEnd.timeout });
  });

  it('should relay a finished game from the outbox to the history queue', async () => {
    await startGameSvc();
    const games = await startCore([]);
    const created = await games.createGame(white, generateConfig('w', 0));
    await games.joinGame(black, created.id);

    await games.surrender(white, created.id);

    const message = await nextMessage(Queue.GameEndedPersist);
    expect(await redis.xlen(RedisKeys.outbox)).toBe(0);
    expect(message.properties.type).toBe(RoutingKey.GameEnded);
    expect(JSON.parse(message.content.toString())).toMatchObject({
      reason: GameEnd.surrender,
      players: [
        { userId: 1, isWinner: false },
        { userId: 2, isWinner: true },
      ],
    });
  });

  it('should dead-letter a message that keeps failing', async () => {
    const service = rabbit();
    const attempts = jest.fn().mockRejectedValue(new Error('db down'));
    await service.subscribe(Queue.GameEndedPersist, attempts);
    await service.publish(
      Exchange.GameLifecycle,
      RoutingKey.GameEnded,
      { matchId: 'poison' },
      { messageId: 'poison' },
    );

    const dead = await nextMessage(Queue.DeadLetter);
    expect(JSON.parse(dead.content.toString())).toStrictEqual({
      matchId: 'poison',
    });
    expect(attempts).toHaveBeenCalledTimes(DELIVERY_LIMIT);
  });
});
