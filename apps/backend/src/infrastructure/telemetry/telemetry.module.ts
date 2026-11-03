import { Global, Module } from '@nestjs/common';
import { TelemetryShutdown } from './telemetry.shutdown';

@Global()
@Module({
  providers: [TelemetryShutdown],
})
export class TelemetryModule {}
