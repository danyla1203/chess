import Redis from 'ioredis';
import { GameClock } from '../../src/infrastructure/game/game.clock';
import { GameRepository } from '../../src/infrastructure/game/game.repository';
import { GameService } from '../../src/game/game.service';
import { GamePublisher } from '../../src/game/game.publisher';
import { GameMetrics } from '../../src/infrastructure/game/game.metrics';
import { GameAdapter } from '../../src/game/game.adapter';
import { GameEnd } from '@chess/contract';
import { LoggerService } from '../../src/infrastructure/logger';
import { RedisKeys } from '../../src/infrastructure/redis';
import { RedisTestDb, clearChessKeys, testRedis } from '../redis/helpers';
import { generateClient, generateConfig } from './generators';
import { fakeMetrics, fakePublisher } from './fakes';

describe('GameClock (integration, Redis)', () => {
  let redis: Redis;
  let repo: GameRepository;
  let service: GameService;
  let publisher: ReturnType<typeof fakePublisher>;
  const logger = { error: jest.fn() } as unknown as LoggerService;

  const clock = () =>
    new GameClock(
      redis,
      repo,
      service,
      logger,
      fakeMetrics() as unknown as GameMetrics,
    );

  beforeEach(async () => {
    redis = testRedis(RedisTestDb.clock);
    await clearChessKeys(redis);
    repo = new GameRepository(redis);
    publisher = fakePublisher();
    service = new GameService(
      repo,
      fakeMetrics() as unknown as GameMetrics,
      publisher as unknown as GamePublisher,
      new GameAdapter(),
    );
  });
  afterEach(() => redis.quit());

  const startGame = async () => {
    const created = await service.createGame(
      generateClient(true, 1),
      generateConfig('w', 0),
    );
    return service.connectToGame(generateClient(true, 2), created.id);
  };

  it('should elect exactly one leader', async () => {
    const a = clock();
    const b = clock();
    await a.tick();
    await b.tick();
    expect(a.isLeader()).toBe(true);
    expect(b.isLeader()).toBe(false);

    await a.onApplicationShutdown();
    await b.tick();
    expect(b.isLeader()).toBe(true);
    await b.onApplicationShutdown();
  });

  it('should take over when the leader stops renewing', async () => {
    const a = clock();
    const b = clock();
    await a.tick();
    await redis.pexpire(RedisKeys.clockLeader, 1);
    await new Promise((r) => setTimeout(r, 10));
    await b.tick();
    expect(b.isLeader()).toBe(true);
    await b.onApplicationShutdown();
  });

  it('should leave games before their deadline untouched', async () => {
    const game = await startGame();
    const leader = clock();
    await leader.tick(game.turnStartedAt + 1500);
    expect((await repo.get(game.id)).isActive).toBe(true);
    expect(publisher.types()).not.toContain('ended');
    await leader.onApplicationShutdown();
  });

  it('should end games whose deadline passed and write the outbox once', async () => {
    const game = await startGame();
    const leader = clock();
    const late = game.deadline() + 5;

    await leader.tick(late);
    await leader.tick(late + 1000);

    const stored = await repo.get(game.id);
    expect(stored.endReason).toBe(GameEnd.timeout);
    expect(stored.winner.side).toBe('b');
    expect(publisher.types().filter((t) => t === 'ended')).toHaveLength(1);
    expect(await redis.xlen(RedisKeys.events)).toBe(1);
    await leader.onApplicationShutdown();
  });

  it('should not run clocks on a follower', async () => {
    const game = await startGame();
    const leader = clock();
    const follower = clock();
    await leader.tick();
    await follower.tick(game.deadline() + 5);
    expect((await repo.get(game.id)).isActive).toBe(true);
    await leader.onApplicationShutdown();
  });
});
