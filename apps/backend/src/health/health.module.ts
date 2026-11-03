import { DynamicModule, Module } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { HealthController } from './health.controller';

@Module({})
export class HealthModule {
  static forRoot({ database }: { database: boolean }): DynamicModule {
    return {
      module: HealthModule,
      controllers: [HealthController],
      providers: database ? [PrismaService] : [],
    };
  }
}
