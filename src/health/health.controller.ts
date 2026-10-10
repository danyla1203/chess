import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RabbitMQService } from '../messaging';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbit: RabbitMQService,
  ) {}

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<Record<string, string>> {
    const checks = {
      database: await this.prisma.$queryRaw`SELECT 1`.then(
        () => 'up',
        () => 'down',
      ),
      rabbitmq: this.rabbit.isConnected() ? 'up' : 'down',
    };
    if (Object.values(checks).includes('down')) {
      throw new ServiceUnavailableException(checks);
    }
    return checks;
  }
}
