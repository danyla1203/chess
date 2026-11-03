import Redis from 'ioredis';
import {
  DELIVERY_LIMIT,
  EventStream,
  EventType,
  integrationEvent,
} from '../../src/infrastructure/messaging';
import type { EventTypeName } from '../../src/infrastructure/messaging';
import { RedisKeys } from '../../src/infrastructure/redis';
import { LoggerService } from '../../src/infrastructure/logger';
import { RedisTestDb, clearChessKeys, testRedis } from '../redis/helpers';

const waitFor = async (check: () => Promise<boolean>, timeout = 8000) => {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeout) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe('EventStream (integration, Redis)', () => {
  jest.setTimeout(20000);
  let redis: Redis;
  let streams: EventStream[];
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as LoggerService;

  const stream = () => {
    const s = new EventStream(redis, logger);
    streams.push(s);
    return s;
  };

  const append = (
    messageId: string,
    type: EventTypeName = EventType.GameEnded,
  ) =>
    redis.xadd(
      RedisKeys.events,
      '*',
      'message',
      JSON.stringify(integrationEvent(type, messageId, { messageId })),
    );

  const pending = async (group: string) =>
    Number(((await redis.xpending(RedisKeys.events, group)) as [number])[0]);

  beforeEach(async () => {
    redis = testRedis(RedisTestDb.events);
    await clearChessKeys(redis);
    streams = [];
  });
  afterEach(async () => {
    for (const s of streams) await s.onApplicationShutdown();
    await redis.quit();
  });

  it('should deliver events written before the group existed, then ack them', async () => {
    await append('m1');
    const seen: string[] = [];
    stream().subscribe<{ messageId: string }>(
      'history',
      EventType.GameEnded,
      async (payload) => {
        seen.push(payload.messageId);
      },
    );
    await append('m2');

    await waitFor(async () => seen.length === 2);
    expect(seen).toStrictEqual(['m1', 'm2']);
    await waitFor(async () => (await pending('history')) === 0);
  });

  it('should hand each event to exactly one pod of the same group', async () => {
    const seen: string[] = [];
    const handler = async ({ messageId }: { messageId: string }) => {
      seen.push(messageId);
    };
    stream().subscribe('history', EventType.GameEnded, handler);
    stream().subscribe('history', EventType.GameEnded, handler);

    for (let i = 0; i < 20; i++) await append(`m${i}`);

    await waitFor(async () => seen.length >= 20);
    await new Promise((r) => setTimeout(r, 200));
    expect(seen.sort()).toStrictEqual(
      Array.from({ length: 20 }, (_, i) => `m${i}`).sort(),
    );
  });

  it('should ack events of other types without calling the handler', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    stream().subscribe('history', EventType.GameEnded, handler);
    await append('other', 'game.v1.other' as EventTypeName);

    await waitFor(async () => (await pending('history')) === 0);
    await waitFor(async () => {
      const [group] = (await redis.xinfo(
        'GROUPS',
        RedisKeys.events,
      )) as unknown[][];
      return Number(group[group.indexOf('entries-read') + 1]) === 1;
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should retry a failing event and dead-letter it after the delivery limit', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('db down'));
    stream().subscribe('history', EventType.GameEnded, handler, {
      reclaimIdleMs: 30,
      blockMs: 20,
    });
    await append('poison');

    await waitFor(async () => (await redis.xlen(RedisKeys.deadEvents)) === 1);
    expect(handler).toHaveBeenCalledTimes(DELIVERY_LIMIT);
    expect(await pending('history')).toBe(0);
    const [[, fields]] = await redis.xrange(RedisKeys.deadEvents, '-', '+');
    expect(fields).toEqual(
      expect.arrayContaining(['group', 'history', 'error', 'db down']),
    );
  });

  it('should recover after one failure without dead-lettering', async () => {
    const handler = jest
      .fn()
      .mockRejectedValueOnce(new Error('blip'))
      .mockResolvedValue(undefined);
    stream().subscribe('history', EventType.GameEnded, handler, {
      reclaimIdleMs: 30,
      blockMs: 20,
    });
    await append('m1');

    await waitFor(async () => handler.mock.calls.length === 2);
    await waitFor(async () => (await pending('history')) === 0);
    expect(await redis.xlen(RedisKeys.deadEvents)).toBe(0);
  });

  it('should keep retrying the group until Redis answers, then consume', async () => {
    const broken = new EventStream(
      {
        xgroup: jest
          .fn()
          .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
          .mockImplementation((...args: unknown[]) =>
            (redis.xgroup as (...a: unknown[]) => Promise<unknown>)(...args),
          ),
        duplicate: () => redis.duplicate(),
        xautoclaim: (...args: unknown[]) =>
          (redis.xautoclaim as (...a: unknown[]) => Promise<unknown>)(...args),
        xack: (...args: unknown[]) =>
          (redis.xack as (...a: unknown[]) => Promise<unknown>)(...args),
        pipeline: () => redis.pipeline(),
      } as unknown as Redis,
      logger,
    );
    streams.push(broken);
    const seen: string[] = [];
    broken.subscribe<{ messageId: string }>(
      'history',
      EventType.GameEnded,
      async ({ messageId }) => {
        seen.push(messageId);
      },
    );
    await append('late');

    await waitFor(async () => seen.length === 1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('ECONNREFUSED'),
      expect.anything(),
      'EventStream',
    );
  });
});
