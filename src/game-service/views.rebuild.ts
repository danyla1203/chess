import Redis from 'ioredis';
import { GameRepository } from '../infrastructure/game/game.repository';
import { RedisKeys } from '../infrastructure/redis';

export async function rebuildViews(redis: Redis): Promise<number> {
  const repo = new GameRepository(redis);
  const ids = new Set([
    ...(await repo.lobbyIds()),
    ...(await repo.activeIds()),
  ]);

  await redis.del(RedisKeys.lobbyView);
  const stream = redis.scanStream({
    match: RedisKeys.userViewPattern,
    count: 500,
  });
  for await (const keys of stream as AsyncIterable<string[]>) {
    if (keys.length) await redis.del(...keys);
  }

  let projected = 0;
  for (const id of ids) {
    if (await repo.reproject(Number(id))) projected++;
  }
  return projected;
}

if (require.main === module) {
  const redis = new Redis(process.env.REDIS_URL);
  rebuildViews(redis)
    .then((count) => console.warn(`Rebuilt views for ${count} games`))
    .catch((err: Error) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => void redis.quit());
}
