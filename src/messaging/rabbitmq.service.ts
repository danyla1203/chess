import {
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
import { LoggerService } from '../tools/logger';
import { assertTopology } from './topology';

export type MessageHandler<T> = (
  payload: T,
  message: ConsumeMessage,
) => Promise<void>;

export type PublishOptions = {
  messageId?: string;
  headers?: Record<string, string>;
};

@Injectable()
export class RabbitMQService implements OnModuleInit, OnApplicationShutdown {
  private connection: AmqpConnectionManager;
  private publisher: ChannelWrapper;
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

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit(): void {
    this.connection = amqp.connect([this.config.get<string>('RABBITMQ_URL')], {
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
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled(this.consumers.map((ch) => ch.close()));
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
        persistent: true,
        contentType: 'application/json',
        type: routingKey,
        messageId: options.messageId,
        headers: options.headers,
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
          outcome = 'nack';
          this.logger.error(
            `Failed to handle message from ${queue}: ${(err as Error).message}`,
            (err as Error).stack,
            RabbitMQService.name,
          );
          channel.nack(message, false, true);
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
}
