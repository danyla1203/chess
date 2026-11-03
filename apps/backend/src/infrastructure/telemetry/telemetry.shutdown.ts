import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { shutdownTelemetry } from './otel';

@Injectable()
export class TelemetryShutdown implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await shutdownTelemetry();
  }
}
