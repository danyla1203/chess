import Redis from 'ioredis';
import { GameClock } from '../../src/game/game.clock';
import { GameRepository } from '../../src/game/game.repository';
import { GameService } from '../../src/game/game.service';
import { GameNotifier } from '../../src/game/game.notifier';
import { GameMetrics } from '../../src/game/game.metrics';
import { GameAdapter } from '../../src/game/entities/game';
import { GameEnd } from '../../src/game/EmitTypes';
import { LoggerService } from '../../src/tools/logger';
import { RedisKeys } from '../../src/redis';
import { RedisTestDb, clearChessKeys, testRedis } from '../redis/helpers';
import { generateClient, generateConfig } from './generators';
import { fakeMetrics, fakeNotifier } from './fakes';

describe('GameClock (integration, Redis)', () => {
  let redis: Redis;
  let repo: GameRepository;
  let service: GameService;
  let notifier: ReturnType<typeof fakeNotifier>;
  const logger = { error: jest.fn() } as unknown as LoggerService;

  const clock = () =>
    new GameClock(
      redis,
      repo,
      service,
      notifier as unknown as GameNotifier,
      logger,
      fakeMetrics() as unknown as GameMetrics,
    );

  beforeEach(async () => {
    redis = testRedis(RedisTestDb.clock);
    await clearChessKeys(redis);
    repo = new GameRepository(redis);
    notifier = fakeNotifier();
    service = new GameService(
      repo,
      fakeMetrics() as unknown as GameMetrics,
      notifier as unknown as GameNotifier,
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

  it('should broadcast remaining time for active games', async () => {
    const game = await startGame();
    const leader = clock();
    await leader.tick(game.turnStartedAt + 1500);
    expect(notifier.timeTick).toHaveBeenCalledWith(game.id, {
      w: game.config.time - 1500,
      b: game.config.time,
    });
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
    expect(notifier.gameEnd).toHaveBeenCalledTimes(2);
    expect(await redis.xlen(RedisKeys.outbox)).toBe(1);
    expect(notifier.timeTick).not.toHaveBeenCalled();
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
