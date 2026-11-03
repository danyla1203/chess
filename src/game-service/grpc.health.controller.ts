import { Controller, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import {
  HealthCheckResponse,
  HealthCheckResponse_ServingStatus,
  HealthController,
  HealthControllerMethods,
} from '../generated/grpc/health/v1/health';
import { REDIS } from '../infrastructure/redis';

@Controller()
@HealthControllerMethods()
export class GrpcHealthController implements HealthController {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async check(): Promise<HealthCheckResponse> {
    const up = await this.redis.ping().then(
      () => true,
      () => false,
    );
    return {
      status: up
        ? HealthCheckResponse_ServingStatus.SERVING
        : HealthCheckResponse_ServingStatus.NOT_SERVING,
    };
  }
}
