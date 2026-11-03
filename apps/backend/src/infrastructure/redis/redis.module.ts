import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS } from './redis.token';
import { RedisShutdown } from './redis.shutdown';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('REDIS_URL'), {
          maxRetriesPerRequest: 3,
        }),
    },
    RedisShutdown,
  ],
  exports: [REDIS],
})
export class RedisModule {}
