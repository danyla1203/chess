import type { Channel } from 'amqp-connection-manager';

export const Exchange = {
  GameLifecycle: 'game.lifecycle',
  DeadLetter: 'chess.dlx',
} as const;

export const RoutingKey = {
  GameEnded: 'game.v1.ended',
} as const;

export const Queue = {
  GameEndedPersist: 'core.game-ended',
  DeadLetter: 'chess.dead-letter',
} as const;

export const DELIVERY_LIMIT = 5;

export async function assertTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(Exchange.GameLifecycle, 'topic', {
    durable: true,
  });
  await channel.assertExchange(Exchange.DeadLetter, 'topic', {
    durable: true,
  });

  await channel.assertQueue(Queue.DeadLetter, {
    durable: true,
    arguments: { 'x-queue-type': 'quorum' },
  });
  await channel.bindQueue(Queue.DeadLetter, Exchange.DeadLetter, '#');

  await channel.assertQueue(Queue.GameEndedPersist, {
    durable: true,
    arguments: {
      'x-queue-type': 'quorum',
      'x-delivery-limit': DELIVERY_LIMIT,
      'x-dead-letter-exchange': Exchange.DeadLetter,
    },
  });
  await channel.bindQueue(
    Queue.GameEndedPersist,
    Exchange.GameLifecycle,
    RoutingKey.GameEnded,
  );
}
