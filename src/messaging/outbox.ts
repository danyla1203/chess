import { context, propagation } from '@opentelemetry/api';

export type OutboxMessage = {
  exchange: string;
  routingKey: string;
  messageId: string;
  payload: unknown;
  trace: Record<string, string>;
};

export function outboxMessage(
  exchange: string,
  routingKey: string,
  messageId: string,
  payload: unknown,
): OutboxMessage {
  const trace: Record<string, string> = {};
  propagation.inject(context.active(), trace);
  return { exchange, routingKey, messageId, payload, trace };
}
