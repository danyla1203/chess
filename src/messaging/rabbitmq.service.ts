import {
  HttpStatus,
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { metrics } from '@opentelemetry/api';
import amqp from 'amqp-connection-manager';
import type {
  AmqpConnectionManager,
  ChannelWrapper,
} from 'amqp-connection-manager';
import type { ConsumeMessage } from 'amqplib';
import { randomUUID } from 'node:crypto';
import { LoggerService } from '../tools/logger';
import { DELIVERY_LIMIT, DIRECT_REPLY_TO, assertTopology } from './topology';
import { RpcReply, RpcTimeoutError, fromRpcError, toRpcError } from './rpc';

export type MessageHandler<T> = (
  payload: T,
  message: ConsumeMessage,
) => Promise<void>;

export type PublishOptions = {
  messageId?: string;
  headers?: Record<string, string>;
  persistent?: boolean;
  expiration?: number;
};

export type RequestHandler = (
  type: string,
  payload: unknown,
) => Promise<unknown>;

type PendingReply = {
  resolve: (reply: RpcReply) => void;
  timer: NodeJS.Timeout;
};

const RPC_TIMEOUT_MS = 5000;
const RETRY_BASE_MS = 100;
const RETRY_MAX_MS = 2000;

const previousAttempts = (message: ConsumeMessage): number => {
  const headers = message.properties.headers ?? {};
  return Math.max(
    Number(headers['x-acquired-count'] ?? 0),
    Number(headers['x-delivery-count'] ?? 0),
  );
};

@Injectable()
export class RabbitMQService implements OnModuleInit, OnApplicationShutdown {
  private connection: AmqpConnectionManager;
  private publisher: ChannelWrapper;
  private rpcChannel: ChannelWrapper;
  private readonly pending = new Map<string, PendingReply>();
  private readonly consumers: ChannelWrapper[] = [];
  private readonly meter = metrics.getMeter('chess.messaging');
  private readonly processDuration = this.meter.createHistogram(
    'chess.messaging.process.duration',
    {
      unit: 's',
      description: 'Time spent handling a consumed message',
      advice: {
        explicitBucketBoundaries: [
          0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5,
        ],
      },
    },
  );
  private readonly publishFailures = this.meter.createCounter(
    'chess.messaging.publish.failures',
    { description: 'Messages the broker did not confirm' },
  );
  private readonly rpcDuration = this.meter.createHistogram(
    'chess.rpc.client.duration',
    {
      unit: 's',
      description: 'Round trip of a command sent over RabbitMQ',
      advice: {
        explicitBucketBoundaries: [
          0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 5,
        ],
      },
    },
  );

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit(): void {
    this.connection = amqp.connect([this.brokerUrl()], {
      heartbeatIntervalInSeconds: 15,
      reconnectTimeInSeconds: 2,
    });
    this.connection.on('connect', () =>
      this.logger.log('Connected to RabbitMQ', RabbitMQService.name),
    );
    this.connection.on('disconnect', ({ err }) =>
      this.logger.warn(
        `Disconnected from RabbitMQ: ${err?.message}`,
        RabbitMQService.name,
      ),
    );
    this.publisher = this.connection.createChannel({
      name: 'publisher',
      json: true,
      confirm: true,
      publishTimeout: 5000,
      setup: assertTopology,
    });
    this.rpcChannel = this.connection.createChannel({
      name: 'rpc',
      json: true,
      confirm: false,
      setup: async (channel: Parameters<typeof assertTopology>[0]) => {
        await assertTopology(channel);
        await channel.consume(
          DIRECT_REPLY_TO,
          (message) => message && this.onReply(message),
          { noAck: true },
        );
      },
    });
  }

  private brokerUrl(): string {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (url) return url;
    const user = encodeURIComponent(this.config.get<string>('RABBITMQ_USER'));
    const pass = encodeURIComponent(
      this.config.get<string>('RABBITMQ_PASSWORD'),
    );
    const host = this.config.get<string>('RABBITMQ_HOST');
    const port = this.config.get<string>('RABBITMQ_PORT') ?? '5672';
    return `amqp://${user}:${pass}@${host}:${port}`;
  }

  async onApplicationShutdown(): Promise<void> {
    for (const { timer } of this.pending.values()) clearTimeout(timer);
    this.pending.clear();
    await Promise.allSettled(this.consumers.map((ch) => ch.close()));
    await this.rpcChannel?.close();
    await this.publisher?.close();
    await this.connection?.close();
  }

  isConnected(): boolean {
    return this.connection?.isConnected() ?? false;
  }

  async publish<T>(
    exchange: string,
    routingKey: string,
    payload: T,
    options: PublishOptions = {},
  ): Promise<void> {
    try {
      await this.publisher.publish(exchange, routingKey, payload, {
        persistent: options.persistent ?? true,
        contentType: 'application/json',
        type: routingKey,
        messageId: options.messageId,
        headers: options.headers,
        expiration: options.expiration?.toString(),
        timestamp: Math.floor(Date.now() / 1000),
      });
    } catch (err) {
      this.publishFailures.add(1, {
        'messaging.destination.name': exchange,
        'messaging.rabbitmq.destination.routing_key': routingKey,
      });
      throw err;
    }
  }

  async subscribe<T>(
    queue: string,
    handler: MessageHandler<T>,
    prefetch = 10,
  ): Promise<void> {
    const channel = this.connection.createChannel({
      name: `consumer:${queue}`,
      confirm: false,
      setup: assertTopology,
    });
    this.consumers.push(channel);

    await channel.consume(
      queue,
      async (message) => {
        const start = performance.now();
        let outcome = 'ack';
        try {
          const payload = JSON.parse(message.content.toString()) as T;
          await handler(payload, message);
          channel.ack(message);
        } catch (err) {
          const attempt = previousAttempts(message) + 1;
          const retry = attempt < DELIVERY_LIMIT;
          outcome = retry ? 'retry' : 'dead-letter';
          this.logger.error(
            `Failed to handle message from ${queue} (attempt ${attempt}/${DELIVERY_LIMIT}): ${(err as Error).message}`,
            (err as Error).stack,
            RabbitMQService.name,
          );
          if (retry) {
            await new Promise((resolve) =>
              setTimeout(
                resolve,
                Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_MS),
              ),
            );
          }
          channel.nack(message, false, retry);
        } finally {
          this.processDuration.record((performance.now() - start) / 1000, {
            'messaging.destination.name': queue,
            outcome,
          });
        }
      },
      { prefetch },
    );
  }

  async request<T>(
    exchange: string,
    routingKey: string,
    type: string,
    payload: unknown,
    timeoutMs = RPC_TIMEOUT_MS,
  ): Promise<T> {
    const correlationId = randomUUID();
    const start = performance.now();
    let outcome = 'ok';
    try {
      const reply = new Promise<RpcReply>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(correlationId);
          reject(new RpcTimeoutError(type));
        }, timeoutMs);
        this.pending.set(correlationId, { resolve, timer });
      });
      await this.rpcChannel.publish(exchange, routingKey, payload, {
        correlationId,
        replyTo: DIRECT_REPLY_TO,
        type,
        contentType: 'application/json',
        expiration: timeoutMs.toString(),
      });
      const result = await reply;
      if ('error' in result) {
        outcome = 'error';
        throw fromRpcError(result.error);
      }
      return result.data as T;
    } catch (err) {
      if (err instanceof RpcTimeoutError) outcome = 'timeout';
      else if (outcome === 'ok') outcome = 'error';
      throw err;
    } finally {
      this.rpcDuration.record((performance.now() - start) / 1000, {
        'rpc.method': type,
        outcome,
      });
    }
  }

  private onReply(message: ConsumeMessage): void {
    const { correlationId } = message.properties;
    const pending = this.pending.get(correlationId);
    if (!pending) return;
    this.pending.delete(correlationId);
    clearTimeout(pending.timer);
    pending.resolve(JSON.parse(message.content.toString()) as RpcReply);
  }

  async serve(
    queue: string,
    handler: RequestHandler,
    prefetch = 50,
  ): Promise<void> {
    await this.subscribe<unknown>(
      queue,
      async (payload, message) => {
        const { replyTo, correlationId, type } = message.properties;
        let reply: RpcReply;
        try {
          reply = { ok: true, data: (await handler(type, payload)) ?? null };
        } catch (err) {
          const error = toRpcError(err);
          reply = { ok: false, error };
          if (error.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(
              `Command ${type} failed: ${(err as Error).message}`,
              (err as Error).stack,
              RabbitMQService.name,
            );
          }
        }
        if (replyTo) {
          await this.publisher.sendToQueue(replyTo, reply, {
            correlationId,
            contentType: 'application/json',
          });
        }
      },
      prefetch,
    );
  }
}
