import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GameModule } from './game/game.module';
import { PaymentsModule } from './payments/payments.module';
import { UserModule } from './user/user.module';
import { MailService } from './mail/mail.service';
import { LoggerModule } from './tools/logger';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { TelemetryModule } from './tools/telemetry';
import { MessagingModule } from './messaging';
import { RedisModule } from './redis';
import { GameHistoryModule } from './game-history/game-history.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        stores: [new KeyvRedis(configService.get<string>('REDIS_URL'))],
      }),
      isGlobal: true,
      inject: [ConfigService],
    }),
    LoggerModule,
    TelemetryModule,
    RedisModule,
    MessagingModule,
    HealthModule,
    AuthModule,
    GameModule,
    PaymentsModule,
    UserModule,
    GameHistoryModule,
  ],
  controllers: [],
  providers: [MailService],
})
export class AppModule {}
