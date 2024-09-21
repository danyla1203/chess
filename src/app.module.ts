import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GameModule } from './game/game.module';
import { PaymentsModule } from './payments/payments.module';
import { UserModule } from './user/user.module';
import { MailService } from './mail/mail.service';
import { LoggerModule } from './tools/logger';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisClientOptions } from 'redis';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigModule],
      useFactory: async (configService) => ({
        store: redisStore as any,
        url: configService.get('REDIS_URL'),
      }),
      isGlobal: true,
      inject: [ConfigService],
    }),
    LoggerModule,
    AuthModule,
    GameModule,
    PaymentsModule,
    UserModule,
  ],
  controllers: [],
  providers: [MailService],
})
export class AppModule {}
