import Redis from 'ioredis';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GameRepository } from '../../src/infrastructure/game/game.repository';
import { GameEnd } from '@chess/contract';
import { Game } from '../../src/domain/game/entities/game';
import { RedisKeys } from '../../src/infrastructure/redis';
import { EventType } from '../../src/infrastructure/messaging';
import { RedisTestDb, clearChessKeys, testRedis } from '../redis/helpers';
import { generateClient, generateConfig } from './generators';

describe('GameRepository (integration, Redis)', () => {
  let redis: Redis;
  let repo: GameRepository;

  beforeAll(() => {
    redis = testRedis(RedisTestDb.repository);
    repo = new GameRepository(redis);
  });
  beforeEach(() => clearChessKeys(redis));
  afterAll(() => redis.quit());

  const lobbyGame = async (userId = 1) => {
    const game = new Game(
      generateClient(true, userId),
      generateConfig('w', 0),
      await repo.nextId(),
    );
    await repo.create(game);
    return game;
  };

  const activeGame = async () => {
    const game = await lobbyGame(1);
    const { game: started } = await repo.update(game.id, (g) => {
      g.addPlayer(generateClient(true, 2));
      g.start();
    });
    return started;
  };

  it('should allocate increasing ids', async () => {
    const a = await repo.nextId();
    const b = await repo.nextId();
    expect(b).toBe(a + 1);
  });

  it('should create a lobby game and index it', async () => {
    const game = await lobbyGame();
    const loaded = await repo.load(game.id);
    expect(loaded.version).toBe(1);
    expect(loaded.game.toSnapshot()).toStrictEqual(game.toSnapshot());
    expect(await repo.lobbyIds()).toEqual([String(game.id)]);
    expect(
      JSON.parse(await redis.hget(RedisKeys.lobbyView, String(game.id))),
    ).toStrictEqual({
      id: game.id,
      players: [{ userId: 1, name: game.players[0].name, side: 'w' }],
      config: game.config,
    });
    expect(await redis.hgetall(RedisKeys.userView(1))).toStrictEqual({
      gameId: String(game.id),
      status: 'lobby',
      opponentId: '',
    });
  });

  it('should refuse to create the same game twice', async () => {
    const game = await lobbyGame();
    await expect(repo.create(game)).rejects.toThrow(ConflictException);
  });

  it('should move a started game from the lobby to the active set with a deadline', async () => {
    const game = await activeGame();
    expect(await repo.lobbyIds()).toHaveLength(0);
    expect(await redis.hlen(RedisKeys.lobbyView)).toBe(0);
    expect(await redis.hgetall(RedisKeys.userView(1))).toStrictEqual({
      gameId: String(game.id),
      status: 'active',
      opponentId: '2',
    });
    expect(await redis.hgetall(RedisKeys.userView(2))).toMatchObject({
      status: 'active',
      opponentId: '1',
    });
    expect(await repo.activeIds()).toEqual([String(game.id)]);
    expect(Number(await redis.zscore(RedisKeys.deadlines, game.id))).toBe(
      game.deadline(),
    );
    expect(await repo.dueDeadlines(game.deadline())).toEqual([game.id]);
    expect(await repo.dueDeadlines(game.deadline() - 1)).toEqual([]);
    expect((await repo.findUserGame(2)).id).toBe(game.id);
    expect(await repo.counts()).toStrictEqual({ active: 1, lobby: 0 });
  });

  it('should throw NotFound when updating a missing game', async () => {
    await expect(repo.update(404, () => undefined)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should write game.ended to the event stream atomically when a game ends, and clean indexes', async () => {
    const game = await activeGame();
    await repo.update(game.id, (g) =>
      g.endGame(g.players[0], g.players[1], GameEnd.surrender),
    );

    const entries = await redis.xrange(RedisKeys.events, '-', '+');
    expect(entries).toHaveLength(1);
    const message = JSON.parse(entries[0][1][1]);
    expect(message).toMatchObject({
      type: EventType.GameEnded,
      messageId: game.matchId,
      payload: { gameId: game.id, reason: 'surrender' },
    });

    expect(await repo.activeIds()).toEqual([]);
    expect(await redis.zcard(RedisKeys.deadlines)).toBe(0);
    expect(await redis.exists(RedisKeys.userView(1))).toBe(0);
    expect(await redis.exists(RedisKeys.userView(2))).toBe(0);
    expect(await redis.ttl(RedisKeys.game(game.id))).toBeGreaterThan(0);
  });

  it('should not write events for updates that do not end the game', async () => {
    const game = await activeGame();
    await repo.update(game.id, (g) => g.setDrawProposeFrom('w'));
    const lobby = await lobbyGame(3);
    await repo.update(lobby.id, (g) => g.cancel());
    expect(await redis.xlen(RedisKeys.events)).toBe(0);
  });

  it('should keep a user pointer that belongs to another game', async () => {
    const first = await lobbyGame(1);
    await redis.hset(RedisKeys.userView(1), 'gameId', '999');
    await repo.update(first.id, (g) => g.cancel());
    expect(await redis.hget(RedisKeys.userView(1), 'gameId')).toBe('999');
    expect(await redis.hlen(RedisKeys.lobbyView)).toBe(0);
  });

  it('should retry on concurrent writes so no update is lost', async () => {
    const game = await activeGame();
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        repo.update(game.id, (g) => g.chat.addMessage(`m${i}`, g.players[0])),
      ),
    );
    const stored = await repo.load(game.id);
    expect(stored.game.chat.messages).toHaveLength(10);
  });

  it('should let only one of two racing moves through', async () => {
    const game = await activeGame();
    const white = game.players.find((pl) => pl.side === 'w').userId;
    const results = await Promise.allSettled([
      repo.update(game.id, (g) => g.makeTurn(white, 'pawn4', 'd4')),
      repo.update(game.id, (g) => g.makeTurn(white, 'pawn5', 'e4')),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect((await repo.get(game.id)).moves).toHaveLength(1);
  });

  it('should end a game exactly once under concurrent surrenders', async () => {
    const game = await activeGame();
    await Promise.allSettled(
      game.players.map((pl) =>
        repo.update(game.id, (g) => {
          if (!g.isActive) throw new ConflictException('Game is not active');
          g.endGame(
            g.opponentOf(pl.userId),
            g.findPlayer(pl.userId),
            GameEnd.surrender,
          );
        }),
      ),
    );
    expect(await redis.xlen(RedisKeys.events)).toBe(1);
  });

  it('should load many games in one round trip and skip missing ones', async () => {
    const a = await lobbyGame(1);
    const b = await lobbyGame(2);
    const games = await repo.loadMany([a.id, 12345, b.id]);
    expect(games.map((g) => g.id)).toStrictEqual([a.id, b.id]);
  });

  it('should not touch the views when a write loses the version race', async () => {
    const game = await lobbyGame(1);
    const view = await redis.hget(RedisKeys.lobbyView, String(game.id));
    game.cancel();
    const saved = await (
      repo as unknown as {
        save: (g: Game, v: number, o: null) => Promise<boolean>;
      }
    ).save(game, 0, null);
    expect(saved).toBe(false);
    expect(await redis.hget(RedisKeys.lobbyView, String(game.id))).toBe(view);
    expect(await redis.hget(RedisKeys.userView(1), 'status')).toBe('lobby');
  });

  it('should reproject views from the snapshot and skip finished games', async () => {
    const lobby = await lobbyGame(5);
    const active = await activeGame();
    await redis.del(
      RedisKeys.lobbyView,
      RedisKeys.userView(1),
      RedisKeys.userView(5),
    );

    expect(await repo.reproject(lobby.id)).toBe(true);
    expect(await repo.reproject(active.id)).toBe(true);
    expect(await redis.hexists(RedisKeys.lobbyView, String(lobby.id))).toBe(1);
    expect(await redis.hget(RedisKeys.userView(1), 'opponentId')).toBe('2');

    await repo.update(active.id, (g) =>
      g.endGame(g.players[0], g.players[1], GameEnd.surrender),
    );
    expect(await repo.reproject(active.id)).toBe(false);
    expect(await redis.exists(RedisKeys.userView(1))).toBe(0);
  });
});
