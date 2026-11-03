import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS, RedisKeys } from '../redis';
import type { IntegrationEvent } from '../messaging';
import {
  Game,
  GameSnapshot,
  GameStatus,
} from '../../domain/game/entities/game';
import { gameEndedMessage } from './game.events';
import { lobbyView } from '../../game/game.views';

const SAVE_GAME = `
local current = redis.call('HGET', KEYS[1], 'version') or '0'
if current ~= ARGV[1] then return 0 end
local version = tonumber(ARGV[1]) + 1
local status = ARGV[3]
local id = ARGV[4]
local finished = status == 'ended' or status == 'cancelled'
redis.call('HSET', KEYS[1], 'data', ARGV[2], 'version', version)
if status == 'lobby' then
  redis.call('ZADD', KEYS[3], ARGV[6], id)
  redis.call('HSET', KEYS[6], id, ARGV[9])
else
  redis.call('ZREM', KEYS[3], id)
  redis.call('HDEL', KEYS[6], id)
end
if status == 'active' then
  redis.call('SADD', KEYS[4], id)
  redis.call('ZADD', KEYS[5], ARGV[5], id)
else
  redis.call('SREM', KEYS[4], id)
  redis.call('ZREM', KEYS[5], id)
end
for i = 7, #KEYS do
  if finished then
    if redis.call('HGET', KEYS[i], 'gameId') == id then redis.call('DEL', KEYS[i]) end
  else
    redis.call('HSET', KEYS[i], 'gameId', id, 'status', status, 'opponentId', ARGV[i + 4])
  end
end
if finished then redis.call('EXPIRE', KEYS[1], ARGV[8]) end
if ARGV[7] ~= '' then
  redis.call('XADD', KEYS[2], 'MAXLEN', '~', ARGV[10], 'ACKED', '*', 'message', ARGV[7])
end
return version
`;

const FINISHED_GAME_TTL_SECONDS = 600;
export const EVENTS_MAXLEN = 100000;
const MAX_ATTEMPTS = 10;
const BACKOFF_MS = 5;

type SaveGameCommand = {
  chessSaveGame(numKeys: number, ...args: (string | number)[]): Promise<number>;
};

export type Loaded = { game: Game; version: number };

export type Updated<T> = {
  game: Game;
  result: T;
  previousStatus: GameStatus;
};

@Injectable()
export class GameRepository {
  constructor(@Inject(REDIS) private readonly redis: Redis) {
    this.redis.defineCommand('chessSaveGame', { lua: SAVE_GAME });
  }

  public nextId(): Promise<number> {
    return this.redis.incr(RedisKeys.gameSeq);
  }

  public async load(id: number): Promise<Loaded | null> {
    const [data, version] = await this.redis.hmget(
      RedisKeys.game(id),
      'data',
      'version',
    );
    if (!data) return null;
    return {
      game: Game.fromSnapshot(JSON.parse(data) as GameSnapshot),
      version: Number(version),
    };
  }

  public async get(id: number): Promise<Game | null> {
    return (await this.load(id))?.game ?? null;
  }

  public async create(game: Game): Promise<void> {
    const saved = await this.save(game, 0, null);
    if (!saved) throw new ConflictException('Game already exists');
  }

  public async update<T>(
    id: number,
    mutate: (game: Game) => T,
  ): Promise<Updated<T>> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const loaded = await this.load(id);
      if (!loaded) throw new NotFoundException('Game not found');
      const { game, version } = loaded;
      const previousStatus = game.status;

      const result = mutate(game);

      const event =
        previousStatus === 'active' && game.status === 'ended'
          ? gameEndedMessage(game)
          : null;
      if (await this.save(game, version, event)) {
        return { game, result, previousStatus };
      }
      const delay = Math.random() * BACKOFF_MS * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    throw new ConflictException('Game was changed concurrently, try again');
  }

  public async findUserGame(userId: number): Promise<Game | null> {
    const id = await this.redis.hget(RedisKeys.userView(userId), 'gameId');
    return id ? this.get(Number(id)) : null;
  }

  public lobbyIds(): Promise<string[]> {
    return this.redis.zrange(RedisKeys.lobby, 0, -1);
  }

  public async reproject(id: number): Promise<boolean> {
    const loaded = await this.load(id);
    if (!loaded || loaded.game.isFinished) return false;
    return this.save(loaded.game, loaded.version, null);
  }

  public activeIds(): Promise<string[]> {
    return this.redis.smembers(RedisKeys.active);
  }

  public async dueDeadlines(now: number, limit = 100): Promise<number[]> {
    const ids = await this.redis.zrangebyscore(
      RedisKeys.deadlines,
      '-inf',
      now,
      'LIMIT',
      0,
      limit,
    );
    return ids.map(Number);
  }

  public async loadMany(ids: (string | number)[]): Promise<Game[]> {
    if (ids.length === 0) return [];
    const pipeline = this.redis.pipeline();
    for (const id of ids) pipeline.hget(RedisKeys.game(id), 'data');
    const results = await pipeline.exec();
    return results
      .map(([, data]) => data as string | null)
      .filter((data): data is string => !!data)
      .map((data) => Game.fromSnapshot(JSON.parse(data) as GameSnapshot));
  }

  public async counts(): Promise<{ active: number; lobby: number }> {
    const [active, lobby] = await Promise.all([
      this.redis.scard(RedisKeys.active),
      this.redis.zcard(RedisKeys.lobby),
    ]);
    return { active, lobby };
  }

  private async save(
    game: Game,
    expectedVersion: number,
    event: IntegrationEvent | null,
  ): Promise<boolean> {
    const keys = [
      RedisKeys.game(game.id),
      RedisKeys.events,
      RedisKeys.lobby,
      RedisKeys.active,
      RedisKeys.deadlines,
      RedisKeys.lobbyView,
      ...game.players.map((pl) => RedisKeys.userView(pl.userId)),
    ];
    const args = [
      expectedVersion,
      JSON.stringify(game.toSnapshot()),
      game.status,
      game.id,
      game.deadline() ?? '',
      game.createdAt,
      event ? JSON.stringify(event) : '',
      FINISHED_GAME_TTL_SECONDS,
      game.status === 'lobby' ? JSON.stringify(lobbyView(game)) : '',
      EVENTS_MAXLEN,
      ...game.players.map((pl) => game.opponentOf(pl.userId)?.userId ?? ''),
    ];
    const version = await (
      this.redis as unknown as SaveGameCommand
    ).chessSaveGame(keys.length, ...keys, ...args);
    return version !== 0;
  }
}
