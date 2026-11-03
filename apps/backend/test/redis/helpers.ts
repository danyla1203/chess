import Redis from 'ioredis';

export const RedisTestDb = {
  repository: 1,
  clock: 2,
  outbox: 3,
  grpc: 4,
  events: 5,
  views: 6,
} as const;

export const testRedis = (db: number) =>
  new Redis(process.env.REDIS_URL, { db });

export const clearChessKeys = async (redis: Redis): Promise<void> => {
  const keys = await redis.keys('{chess}:*');
  if (keys.length) await redis.del(...keys);
};
