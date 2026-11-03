import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type Redis from 'ioredis';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { REDIS, RedisKeys } from '../redis';
import { LoggerService } from '../logger';
import { GameRepository } from './game.repository';
import { GameService } from '../../game/game.service';
import { GameMetrics } from './game.metrics';

const TICK_MS = 1000;
const LEASE_MS = 3000;

const ACQUIRE = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
  return 1
end
if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2]) then return 1 end
return 0
`;

const RELEASE = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
`;

@Injectable()
export class GameClock
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly instanceId = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
  private readonly tracer = trace.getTracer('chess.game.clock');
  private timer: NodeJS.Timeout;
  private ticking = false;
  private leader = false;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly repo: GameRepository,
    private readonly service: GameService,
    private readonly logger: LoggerService,
    metrics: GameMetrics,
  ) {
    metrics.clockLeadership(() => this.leader);
  }

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
  }

  async onApplicationShutdown(): Promise<void> {
    clearInterval(this.timer);
    if (this.leader) {
      await this.redis
        .eval(RELEASE, 1, RedisKeys.clockLeader, this.instanceId)
        .catch(() => undefined);
      this.leader = false;
    }
  }

  public isLeader(): boolean {
    return this.leader;
  }

  public async tick(now = Date.now()): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      this.leader = await this.acquireLeadership();
      if (!this.leader) return;
      await this.expireDeadlines(now);
    } catch (err) {
      this.logger.error(
        `Clock tick failed: ${(err as Error).message}`,
        (err as Error).stack,
        GameClock.name,
      );
    } finally {
      this.ticking = false;
    }
  }

  private async acquireLeadership(): Promise<boolean> {
    const acquired = await this.redis.eval(
      ACQUIRE,
      1,
      RedisKeys.clockLeader,
      this.instanceId,
      LEASE_MS,
    );
    return acquired === 1;
  }

  private async expireDeadlines(now: number): Promise<void> {
    for (const gameId of await this.repo.dueDeadlines(now)) {
      await this.tracer.startActiveSpan('game.clock.timeout', async (span) => {
        span.setAttribute('chess.game.id', gameId);
        try {
          await this.service.endByTimeout(gameId, now);
        } catch (err) {
          span.recordException(err as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          this.logger.error(
            `Timeout handling failed for game ${gameId}: ${(err as Error).message}`,
            (err as Error).stack,
            GameClock.name,
          );
        } finally {
          span.end();
        }
      });
    }
  }
}
