import Redis from 'ioredis';
import { GameRepository } from '../../src/infrastructure/game/game.repository';
import { Game } from '../../src/domain/game/entities/game';
import { GameEnd } from '@chess/contract';
import { GameReadModel } from '../../src/game-read';
import { rebuildViews } from '../../src/game-service/views.rebuild';
import { RedisKeys } from '../../src/infrastructure/redis';
import { RedisTestDb, clearChessKeys, testRedis } from '../redis/helpers';
import { generateClient, generateConfig } from '../game/generators';

describe('views:rebuild (integration, Redis)', () => {
  let redis: Redis;
  let repo: GameRepository;
  let views: GameReadModel;

  beforeAll(() => {
    redis = testRedis(RedisTestDb.views);
    repo = new GameRepository(redis);
    views = new GameReadModel(redis);
  });
  beforeEach(() => clearChessKeys(redis));
  afterAll(() => redis.quit());

  const create = async (userId: number) => {
    const game = new Game(
      generateClient(true, userId),
      generateConfig('w', 0),
      await repo.nextId(),
    );
    await repo.create(game);
    return game;
  };

  it('should restore lost and stale views from the snapshots', async () => {
    const lobby = await create(1);
    const active = await create(2);
    await repo.update(active.id, (g) => {
      g.addPlayer(generateClient(true, 3));
      g.start();
    });
    const ended = await create(4);
    await repo.update(ended.id, (g) => {
      g.addPlayer(generateClient(true, 5));
      g.start();
    });
    await repo.update(ended.id, (g) =>
      g.endGame(g.players[0], g.players[1], GameEnd.surrender),
    );

    await redis.del(RedisKeys.lobbyView, RedisKeys.userView(3));
    await redis.hset(RedisKeys.userView(99), 'gameId', '12345');

    expect(await rebuildViews(redis)).toBe(2);

    expect((await views.lobby()).map((g) => g.id)).toStrictEqual([lobby.id]);
    expect(await views.userGame(3)).toStrictEqual({
      gameId: active.id,
      status: 'active',
      opponentId: 2,
    });
    expect(await views.userGame(1)).toMatchObject({ status: 'lobby' });
    expect(await views.userGame(4)).toBeNull();
    expect(await views.userGame(99)).toBeNull();
  });
});
