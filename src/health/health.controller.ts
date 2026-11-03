import {
  Controller,
  Get,
  Inject,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { REDIS } from '../infrastructure/redis';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<Record<string, string>> {
    const checks: Record<string, string> = {
      redis: await this.redis.ping().then(
        () => 'up',
        () => 'down',
      ),
    };
    if (this.prisma) {
      checks.database = await this.prisma.$queryRaw`SELECT 1`.then(
        () => 'up',
        () => 'down',
      );
    }
    if (Object.values(checks).includes('down')) {
      throw new ServiceUnavailableException(checks);
    }
    return checks;
  }
}
