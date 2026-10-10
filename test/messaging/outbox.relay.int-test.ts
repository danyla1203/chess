import Redis from 'ioredis';
import { OutboxRelay } from '../../src/messaging/outbox.relay';
import { RabbitMQService } from '../../src/messaging';
import { RedisKeys } from '../../src/redis';
import { LoggerService } from '../../src/tools/logger';
import { RedisTestDb, clearChessKeys, testRedis } from '../redis/helpers';

const waitFor = async (check: () => Promise<boolean>, timeout = 8000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('condition not met in time');
};

const addEntry = (redis: Redis, messageId: string) =>
  redis.xadd(
    RedisKeys.outbox,
    '*',
    'message',
    JSON.stringify({
      exchange: 'game.lifecycle',
      routingKey: 'game.v1.ended',
      messageId,
      payload: { matchId: messageId },
      trace: {},
    }),
  );

describe('OutboxRelay (integration, Redis)', () => {
  let redis: Redis;
  let relay: OutboxRelay;
  let publish: jest.Mock;

  beforeEach(async () => {
    redis = testRedis(RedisTestDb.outbox);
    await clearChessKeys(redis);
    publish = jest.fn().mockResolvedValue(undefined);
    const logger = {
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as LoggerService;
    relay = new OutboxRelay(
      redis,
      { publish } as unknown as RabbitMQService,
      logger,
    );
  });
  afterEach(async () => {
    await relay.onApplicationShutdown();
    await redis.quit();
  });

  it('should publish entries written before it started, then delete them', async () => {
    await addEntry(redis, 'm1');
    await relay.onApplicationBootstrap();

    await waitFor(async () => (await redis.xlen(RedisKeys.outbox)) === 0);
    expect(publish).toHaveBeenCalledWith(
      'game.lifecycle',
      'game.v1.ended',
      { matchId: 'm1' },
      { messageId: 'm1' },
    );
  });

  it('should pick up new entries while running', async () => {
    await relay.onApplicationBootstrap();
    await addEntry(redis, 'm2');
    await waitFor(async () => publish.mock.calls.length === 1);
    await waitFor(async () => (await redis.xlen(RedisKeys.outbox)) === 0);
  });

  it('should keep an entry when the broker does not confirm', async () => {
    publish.mockRejectedValue(new Error('broker down'));
    await relay.onApplicationBootstrap();
    await addEntry(redis, 'm3');

    await waitFor(async () => publish.mock.calls.length >= 1);
    expect(await redis.xlen(RedisKeys.outbox)).toBe(1);
    const pending = (await redis.xpending(RedisKeys.outbox, 'relay')) as [
      number,
      ...unknown[],
    ];
    expect(pending[0]).toBe(1);
  });

  it('should redeliver an entry left pending by a crashed relay', async () => {
    await redis.xgroup('CREATE', RedisKeys.outbox, 'relay', '0', 'MKSTREAM');
    await addEntry(redis, 'm4');
    await redis.xreadgroup(
      'GROUP',
      'relay',
      'dead-pod',
      'COUNT',
      1,
      'STREAMS',
      RedisKeys.outbox,
      '>',
    );
    relay.reclaimIdleMs = 0;

    await relay.onApplicationBootstrap();

    await waitFor(async () => (await redis.xlen(RedisKeys.outbox)) === 0);
    expect(publish).toHaveBeenCalledWith(
      'game.lifecycle',
      'game.v1.ended',
      { matchId: 'm4' },
      { messageId: 'm4' },
    );
  });
});
