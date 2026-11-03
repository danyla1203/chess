import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../infrastructure/logger';
import { TelemetryModule } from '../infrastructure/telemetry';
import { RedisModule } from '../infrastructure/redis';
import { HealthModule } from '../health/health.module';
import { GameService } from '../game/game.service';
import { GameRepository } from '../infrastructure/game/game.repository';
import { GameClock } from '../infrastructure/game/game.clock';
import { GameMetrics } from '../infrastructure/game/game.metrics';
import { GamePublisher } from '../game/game.publisher';
import { GameAdapter } from '../game/game.adapter';
import { SocketEventPublisher } from './socket.publisher';
import { socketEmitterProvider } from './socket.emitter';
import { GameCommandHandler } from './game.commands';
import { GameGrpcController } from './game.grpc.controller';
import { GrpcHealthController } from './grpc.health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    TelemetryModule,
    RedisModule,
    HealthModule.forRoot({ database: false }),
  ],
  controllers: [GameGrpcController, GrpcHealthController],
  providers: [
    GameService,
    GameRepository,
    GameClock,
    GameMetrics,
    GameCommandHandler,
    socketEmitterProvider,
    { provide: GamePublisher, useClass: SocketEventPublisher },
    { provide: 'GameAdapterI', useClass: GameAdapter },
  ],
})
export class GameServiceModule {}
