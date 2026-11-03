import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { GatewayModule } from './gateway/gateway.module';
import { PaymentsModule } from './payments/payments.module';
import { UserModule } from './user/user.module';
import { MailService } from './infrastructure/mail/mail.service';
import { LoggerModule } from './infrastructure/logger';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { TelemetryModule } from './infrastructure/telemetry';
import { MessagingModule } from './infrastructure/messaging';
import { RedisModule } from './infrastructure/redis';
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
    HealthModule.forRoot({ database: true }),
    AuthModule,
    GatewayModule,
    PaymentsModule,
    UserModule,
    GameHistoryModule,
  ],
  controllers: [],
  providers: [MailService],
})
export class AppModule {}
