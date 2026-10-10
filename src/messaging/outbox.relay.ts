import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  metrics,
  propagation,
  trace,
} from '@opentelemetry/api';
import type Redis from 'ioredis';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { REDIS, RedisKeys } from '../redis';
import { LoggerService } from '../tools/logger';
import { RabbitMQService } from './rabbitmq.service';
import type { OutboxMessage } from './outbox';

const GROUP = 'relay';
const BATCH = 50;
const BLOCK_MS = 2000;
const RECLAIM_IDLE_MS = 30000;
const RECLAIM_EVERY_MS = 15000;
const FAILURE_BACKOFF_MS = 1000;
const SHUTDOWN_WAIT_MS = 2500;

type StreamEntry = [id: string, fields: string[]];

@Injectable()
export class OutboxRelay
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly consumer = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
  private readonly tracer = trace.getTracer('chess.outbox');
  private readonly meter = metrics.getMeter('chess.outbox');
  private readonly relayed = this.meter.createCounter('chess.outbox.relayed', {
    description: 'Outbox entries published to the broker',
  });
  private readonly failures = this.meter.createCounter(
    'chess.outbox.relay.failures',
    { description: 'Outbox entries that failed to publish' },
  );
  private readonly lag = this.meter.createHistogram('chess.outbox.relay.lag', {
    unit: 's',
    description: 'Time from outbox write to broker confirm',
    advice: {
      explicitBucketBoundaries: [
        0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 5, 30, 120,
      ],
    },
  });
  private reader: Redis;
  private running = false;
  private loop: Promise<void>;
  private lastReclaim = 0;
  reclaimIdleMs = RECLAIM_IDLE_MS;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly rabbit: RabbitMQService,
    private readonly logger: LoggerService,
  ) {
    this.meter
      .createObservableGauge('chess.outbox.pending', {
        description: 'Outbox entries not yet confirmed by the broker',
      })
      .addCallback(async (result) =>
        result.observe(await this.redis.xlen(RedisKeys.outbox)),
      );
  }

  async onApplicationBootstrap(): Promise<void> {
    this.reader = this.redis.duplicate();
    await this.redis
      .xgroup('CREATE', RedisKeys.outbox, GROUP, '0', 'MKSTREAM')
      .catch((err: Error) => {
        if (!err.message.includes('BUSYGROUP')) throw err;
      });
    this.running = true;
    this.loop = this.run();
  }

  async onApplicationShutdown(): Promise<void> {
    this.running = false;
    await Promise.race([
      this.loop,
      new Promise((resolve) => setTimeout(resolve, SHUTDOWN_WAIT_MS).unref()),
    ]);
    this.reader?.disconnect();
  }

  private async run(): Promise<void> {
    while (this.running) {
      try {
        const entries = [...(await this.reclaim()), ...(await this.readNew())];
        for (const entry of entries) {
          if (!(await this.relay(entry))) {
            await new Promise((r) => setTimeout(r, FAILURE_BACKOFF_MS));
            break;
          }
        }
      } catch (err) {
        if (!this.running) break;
        this.logger.error(
          `Outbox relay loop failed: ${(err as Error).message}`,
          (err as Error).stack,
          OutboxRelay.name,
        );
        await new Promise((r) => setTimeout(r, FAILURE_BACKOFF_MS));
      }
    }
  }

  private async readNew(): Promise<StreamEntry[]> {
    const response = (await this.reader.xreadgroup(
      'GROUP',
      GROUP,
      this.consumer,
      'COUNT',
      BATCH,
      'BLOCK',
      BLOCK_MS,
      'STREAMS',
      RedisKeys.outbox,
      '>',
    )) as [string, StreamEntry[]][] | null;
    return response?.[0]?.[1] ?? [];
  }

  private async reclaim(): Promise<StreamEntry[]> {
    if (Date.now() - this.lastReclaim < RECLAIM_EVERY_MS) return [];
    this.lastReclaim = Date.now();
    const [, entries] = (await this.redis.xautoclaim(
      RedisKeys.outbox,
      GROUP,
      this.consumer,
      this.reclaimIdleMs,
      '0-0',
      'COUNT',
      BATCH,
    )) as [string, StreamEntry[]];
    return entries.filter(([, fields]) => fields !== null);
  }

  private async relay([id, fields]: StreamEntry): Promise<boolean> {
    const message = JSON.parse(fields[1]) as OutboxMessage;
    const parent = propagation.extract(ROOT_CONTEXT, message.trace ?? {});
    return this.tracer.startActiveSpan(
      `outbox relay ${message.routingKey}`,
      { kind: SpanKind.INTERNAL, attributes: { 'chess.outbox.id': id } },
      parent,
      async (span) => {
        try {
          await this.rabbit.publish(
            message.exchange,
            message.routingKey,
            message.payload,
            { messageId: message.messageId },
          );
          await this.redis
            .multi()
            .xack(RedisKeys.outbox, GROUP, id)
            .xdel(RedisKeys.outbox, id)
            .exec();
          this.relayed.add(1, { routing_key: message.routingKey });
          this.lag.record((Date.now() - Number(id.split('-')[0])) / 1000, {
            routing_key: message.routingKey,
          });
          return true;
        } catch (err) {
          span.recordException(err as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          this.failures.add(1, { routing_key: message.routingKey });
          this.logger.warn(
            `Outbox entry ${id} not published yet: ${(err as Error).message}`,
            OutboxRelay.name,
          );
          return false;
        } finally {
          span.end();
        }
      },
    );
  }
}
