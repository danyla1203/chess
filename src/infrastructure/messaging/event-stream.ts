import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
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
import { LoggerService } from '../logger';
import type { EventTypeName, IntegrationEvent } from './integration-event';

export const DELIVERY_LIMIT = 5;
export const DEAD_STREAM_MAXLEN = 10000;

const BATCH = 50;
const BLOCK_MS = 2000;
const RECLAIM_IDLE_MS = 30000;
const RECLAIM_EVERY_MS = 15000;
const FAILURE_BACKOFF_MS = 1000;
const SHUTDOWN_WAIT_MS = 2500;

type StreamEntry = [id: string, fields: string[]];

export type EventHandler<T> = (
  payload: T,
  event: IntegrationEvent<T>,
) => Promise<void>;

export type SubscribeOptions = { reclaimIdleMs?: number; blockMs?: number };

type Subscription = {
  group: string;
  type: EventTypeName;
  handler: EventHandler<unknown>;
  reader: Redis;
  consumer: string;
  reclaimIdleMs: number;
  blockMs: number;
  lastReclaim: number;
  grouped: boolean;
  loop?: Promise<void>;
};

@Injectable()
export class EventStream implements OnApplicationShutdown {
  private readonly subscriptions: Subscription[] = [];
  private running = true;
  private readonly tracer = trace.getTracer('chess.events');
  private readonly meter = metrics.getMeter('chess.messaging');
  private readonly processDuration = this.meter.createHistogram(
    'chess.messaging.process.duration',
    {
      unit: 's',
      description: 'Time spent handling a consumed event',
      advice: {
        explicitBucketBoundaries: [
          0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5,
        ],
      },
    },
  );

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly logger: LoggerService,
  ) {
    this.meter
      .createObservableGauge('chess.events.lag', {
        description: 'Events in the stream not yet read by a consumer group',
      })
      .addCallback(async (result) => {
        for (const { group, lag } of await this.groupLags()) {
          result.observe(lag, { group });
        }
      });
    this.meter
      .createObservableGauge('chess.events.dead', {
        description: 'Events that exhausted their deliveries',
      })
      .addCallback(async (result) =>
        result.observe(await this.redis.xlen(RedisKeys.deadEvents)),
      );
  }

  subscribe<T>(
    group: string,
    type: EventTypeName,
    handler: EventHandler<T>,
    options: SubscribeOptions = {},
  ): void {
    const subscription: Subscription = {
      group,
      type,
      handler,
      reader: this.redis.duplicate(),
      consumer: `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`,
      reclaimIdleMs: options.reclaimIdleMs ?? RECLAIM_IDLE_MS,
      blockMs: options.blockMs ?? BLOCK_MS,
      lastReclaim: 0,
      grouped: false,
    };
    this.subscriptions.push(subscription);
    subscription.loop = this.run(subscription);
  }

  async onApplicationShutdown(): Promise<void> {
    this.running = false;
    await Promise.race([
      Promise.allSettled(this.subscriptions.map((s) => s.loop)),
      new Promise((resolve) => setTimeout(resolve, SHUTDOWN_WAIT_MS).unref()),
    ]);
    for (const { reader } of this.subscriptions) reader.disconnect();
  }

  private async groupLags(): Promise<{ group: string; lag: number }[]> {
    const groups = (await this.redis
      .xinfo('GROUPS', RedisKeys.events)
      .catch(() => [])) as (string | number)[][];
    return groups.map((fields) => {
      const info = new Map<string, string | number>();
      for (let i = 0; i < fields.length; i += 2) {
        info.set(String(fields[i]), fields[i + 1]);
      }
      return {
        group: String(info.get('name')),
        lag: Number(info.get('lag') ?? 0),
      };
    });
  }

  private async ensureGroup(sub: Subscription): Promise<void> {
    await this.redis
      .xgroup('CREATE', RedisKeys.events, sub.group, '0', 'MKSTREAM')
      .catch((err: Error) => {
        if (!err.message.includes('BUSYGROUP')) throw err;
      });
    sub.grouped = true;
  }

  private async run(sub: Subscription): Promise<void> {
    while (this.running) {
      try {
        if (!sub.grouped) await this.ensureGroup(sub);
        for (const [entry, deliveries] of await this.reclaim(sub)) {
          await this.process(sub, entry, deliveries);
        }
        for (const entry of await this.readNew(sub)) {
          await this.process(sub, entry, 1);
        }
      } catch (err) {
        if (!this.running) break;
        if ((err as Error).message.includes('NOGROUP')) sub.grouped = false;
        this.logger.error(
          `Event stream loop for ${sub.group} failed: ${(err as Error).message}`,
          (err as Error).stack,
          EventStream.name,
        );
        await new Promise((r) => setTimeout(r, FAILURE_BACKOFF_MS));
      }
    }
  }

  private async readNew(sub: Subscription): Promise<StreamEntry[]> {
    const response = (await sub.reader.xreadgroup(
      'GROUP',
      sub.group,
      sub.consumer,
      'COUNT',
      BATCH,
      'BLOCK',
      sub.blockMs,
      'STREAMS',
      RedisKeys.events,
      '>',
    )) as [string, StreamEntry[]][] | null;
    return response?.[0]?.[1] ?? [];
  }

  private async reclaim(sub: Subscription): Promise<[StreamEntry, number][]> {
    if (
      Date.now() - sub.lastReclaim <
      Math.min(RECLAIM_EVERY_MS, sub.reclaimIdleMs)
    ) {
      return [];
    }
    sub.lastReclaim = Date.now();
    const [, claimed] = (await this.redis.xautoclaim(
      RedisKeys.events,
      sub.group,
      sub.consumer,
      sub.reclaimIdleMs,
      '0-0',
      'COUNT',
      BATCH,
    )) as [string, (StreamEntry | null)[]];
    const entries = claimed.filter(
      (entry): entry is StreamEntry => !!entry && entry[1] !== null,
    );
    if (entries.length === 0) return [];
    const pipeline = this.redis.pipeline();
    for (const [id] of entries) {
      pipeline.xpending(RedisKeys.events, sub.group, id, id, 1);
    }
    const pending = await pipeline.exec();
    return entries.map((entry, i) => {
      const rows = pending[i][1] as [string, string, number, number][];
      return [entry, Number(rows?.[0]?.[3] ?? 1)];
    });
  }

  private async process(
    sub: Subscription,
    [id, fields]: StreamEntry,
    deliveries: number,
  ): Promise<void> {
    const raw = fields[1];
    const event = JSON.parse(raw) as IntegrationEvent;
    if (event.type !== sub.type) {
      await this.redis.xack(RedisKeys.events, sub.group, id);
      return;
    }
    const parent = propagation.extract(ROOT_CONTEXT, event.trace ?? {});
    const start = performance.now();
    let outcome = 'ack';
    await this.tracer.startActiveSpan(
      `${event.type} process`,
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          'messaging.system': 'redis',
          'messaging.destination.name': RedisKeys.events,
          'messaging.consumer.group.name': sub.group,
          'messaging.message.id': event.messageId,
        },
      },
      parent,
      async (span) => {
        try {
          await sub.handler(event.payload, event);
          await this.redis.xack(RedisKeys.events, sub.group, id);
        } catch (err) {
          span.recordException(err as Error);
          span.setStatus({ code: SpanStatusCode.ERROR });
          const dead = deliveries >= DELIVERY_LIMIT;
          outcome = dead ? 'dead-letter' : 'retry';
          this.logger.error(
            `Failed to handle ${event.type} ${id} for ${sub.group} (delivery ${deliveries}/${DELIVERY_LIMIT}): ${(err as Error).message}`,
            (err as Error).stack,
            EventStream.name,
          );
          if (dead) {
            await this.redis
              .multi()
              .xadd(
                RedisKeys.deadEvents,
                'MAXLEN',
                '~',
                DEAD_STREAM_MAXLEN,
                '*',
                'message',
                raw,
                'group',
                sub.group,
                'id',
                id,
                'error',
                (err as Error).message,
              )
              .xack(RedisKeys.events, sub.group, id)
              .exec();
          }
        } finally {
          span.end();
          this.processDuration.record((performance.now() - start) / 1000, {
            'messaging.consumer.group.name': sub.group,
            outcome,
          });
        }
      },
    );
  }
}
