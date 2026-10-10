import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../tools/logger';
import { TelemetryModule } from '../tools/telemetry';
import { RedisModule } from '../redis';
import { MessagingModule, OutboxModule } from '../messaging';
import { HealthModule } from '../health/health.module';
import { GameService } from '../game/game.service';
import { GameRepository } from '../game/game.repository';
import { GameClock } from '../game/game.clock';
import { GameMetrics } from '../game/game.metrics';
import { GameNotifier } from '../game/game.notifier';
import { GameAdapter } from '../game/entities/game';
import { AmqpGameNotifier } from './amqp.notifier';
import { GameCommandHandler } from './game.commands';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    TelemetryModule,
    RedisModule,
    MessagingModule,
    OutboxModule,
    HealthModule.forRoot({ database: false }),
  ],
  providers: [
    GameService,
    GameRepository,
    GameClock,
    GameMetrics,
    GameCommandHandler,
    { provide: GameNotifier, useClass: AmqpGameNotifier },
    { provide: 'GameAdapterI', useClass: GameAdapter },
  ],
})
export class GameServiceModule {}
