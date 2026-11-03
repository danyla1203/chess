import { trace } from '@opentelemetry/api';
import type { Attributes } from '@opentelemetry/api';

export function annotateActiveSpan(attributes: Attributes): void {
  trace.getActiveSpan()?.setAttributes(attributes);
}
