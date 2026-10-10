import type { Channel } from 'amqp-connection-manager';

export const Exchange = {
  GameLifecycle: 'game.lifecycle',
  GameCommands: 'game.commands',
  GameNotifications: 'game.notifications',
  DeadLetter: 'chess.dlx',
} as const;

export const RoutingKey = {
  GameEnded: 'game.v1.ended',
  GameCommand: 'game.v1.command',
  GameNotification: 'game.v1.notification',
} as const;

export const Queue = {
  GameEndedPersist: 'core.game-ended',
  GameCommands: 'game-svc.commands',
  WsNotifications: 'ws.notifications',
  DeadLetter: 'chess.dead-letter',
} as const;

export const DIRECT_REPLY_TO = 'amq.rabbitmq.reply-to';
export const DELIVERY_LIMIT = 5;
export const NOTIFICATION_TTL_MS = 10000;

export async function assertTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(Exchange.GameLifecycle, 'topic', {
    durable: true,
  });
  await channel.assertExchange(Exchange.GameCommands, 'direct', {
    durable: true,
  });
  await channel.assertExchange(Exchange.GameNotifications, 'direct', {
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

  await channel.assertQueue(Queue.GameCommands, {
    durable: true,
    arguments: {
      'x-queue-type': 'quorum',
      'x-delivery-limit': DELIVERY_LIMIT,
      'x-dead-letter-exchange': Exchange.DeadLetter,
    },
  });
  await channel.bindQueue(
    Queue.GameCommands,
    Exchange.GameCommands,
    RoutingKey.GameCommand,
  );

  await channel.assertQueue(Queue.WsNotifications, {
    durable: true,
    arguments: {
      'x-queue-type': 'quorum',
      'x-single-active-consumer': true,
      'x-message-ttl': NOTIFICATION_TTL_MS,
    },
  });
  await channel.bindQueue(
    Queue.WsNotifications,
    Exchange.GameNotifications,
    RoutingKey.GameNotification,
  );
}
