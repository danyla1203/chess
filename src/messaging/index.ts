export { MessagingModule } from './messaging.module';
export { OutboxModule } from './outbox.module';
export { RabbitMQService } from './rabbitmq.service';
export type { MessageHandler, PublishOptions } from './rabbitmq.service';
export { Exchange, RoutingKey, Queue, DELIVERY_LIMIT } from './topology';
export type {
  GameEndReason,
  GameEndedEvent,
  GameEndedPlayer,
} from './contracts';
export { outboxMessage } from './outbox';
export type { OutboxMessage } from './outbox';
export type { RequestHandler } from './rabbitmq.service';
export { RpcTimeoutError, fromRpcError, toRpcError } from './rpc';
export type { RpcError, RpcReply } from './rpc';
export { NOTIFICATION_TTL_MS } from './topology';
