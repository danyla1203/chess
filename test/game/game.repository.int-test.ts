import Redis from 'ioredis';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GameRepository } from '../../src/game/game.repository';
import { GameEnd } from '../../src/game/EmitTypes';
import { Game } from '../../src/game/entities/game';
import { RedisKeys } from '../../src/redis';
import { RoutingKey } from '../../src/messaging';
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
    expect(await repo.lobby()).toEqual([
      expect.objectContaining({ id: game.id }),
    ]);
    expect(await redis.get(RedisKeys.userGame(1))).toBe(String(game.id));
  });

  it('should refuse to create the same game twice', async () => {
    const game = await lobbyGame();
    await expect(repo.create(game)).rejects.toThrow(ConflictException);
  });

  it('should move a started game from the lobby to the active set with a deadline', async () => {
    const game = await activeGame();
    expect(await repo.lobby()).toHaveLength(0);
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

  it('should write the outbox atomically when a game ends, and clean indexes', async () => {
    const game = await activeGame();
    await repo.update(game.id, (g) =>
      g.endGame(g.players[0], g.players[1], GameEnd.surrender),
    );

    const entries = await redis.xrange(RedisKeys.outbox, '-', '+');
    expect(entries).toHaveLength(1);
    const message = JSON.parse(entries[0][1][1]);
    expect(message).toMatchObject({
      routingKey: RoutingKey.GameEnded,
      messageId: game.matchId,
      payload: { gameId: game.id, reason: 'surrender' },
    });

    expect(await repo.activeIds()).toEqual([]);
    expect(await redis.zcard(RedisKeys.deadlines)).toBe(0);
    expect(await redis.exists(RedisKeys.userGame(1))).toBe(0);
    expect(await redis.ttl(RedisKeys.game(game.id))).toBeGreaterThan(0);
  });

  it('should not write the outbox for updates that do not end the game', async () => {
    const game = await activeGame();
    await repo.update(game.id, (g) => g.setDrawProposeFrom('w'));
    const lobby = await lobbyGame(3);
    await repo.update(lobby.id, (g) => g.cancel());
    expect(await redis.xlen(RedisKeys.outbox)).toBe(0);
  });

  it('should keep a user pointer that belongs to another game', async () => {
    const first = await lobbyGame(1);
    await redis.set(RedisKeys.userGame(1), '999');
    await repo.update(first.id, (g) => g.cancel());
    expect(await redis.get(RedisKeys.userGame(1))).toBe('999');
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
    expect(await redis.xlen(RedisKeys.outbox)).toBe(1);
  });

  it('should load many games in one round trip and skip missing ones', async () => {
    const a = await lobbyGame(1);
    const b = await lobbyGame(2);
    const games = await repo.loadMany([a.id, 12345, b.id]);
    expect(games.map((g) => g.id)).toStrictEqual([a.id, b.id]);
  });
});
