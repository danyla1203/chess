import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS, RedisKeys } from '../infrastructure/redis';
import type { LobbyView, UserView } from './views';

@Injectable()
export class GameReadModel {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  public async lobby(): Promise<LobbyView[]> {
    const entries = await this.redis.hvals(RedisKeys.lobbyView);
    return entries
      .map((entry) => JSON.parse(entry) as LobbyView)
      .sort((a, b) => a.id - b.id);
  }

  public async userGame(userId: number): Promise<UserView | null> {
    const view = await this.redis.hgetall(RedisKeys.userView(userId));
    if (!view.gameId) return null;
    return {
      gameId: Number(view.gameId),
      status: view.status as UserView['status'],
      opponentId: view.opponentId ? Number(view.opponentId) : null,
    };
  }
}
