import { context, propagation } from '@opentelemetry/api';

export const EventType = {
  GameEnded: 'game.v1.ended',
} as const;

export type EventTypeName = (typeof EventType)[keyof typeof EventType];

export type IntegrationEvent<T = unknown> = {
  type: EventTypeName;
  messageId: string;
  payload: T;
  trace: Record<string, string>;
};

export function integrationEvent<T>(
  type: EventTypeName,
  messageId: string,
  payload: T,
): IntegrationEvent<T> {
  const trace: Record<string, string> = {};
  propagation.inject(context.active(), trace);
  return { type, messageId, payload, trace };
}
