import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { GameModel } from './model';
import { PrismaService } from '../prisma.service';
import { ConnectionPatchProvider } from './connection.provider';
import { ClientStore } from './ClientStore';
import { GameAdapter } from './entities/game';
import { GameMetrics } from './game.metrics';
import { GameRepository } from './game.repository';
import { GameNotifier } from './game.notifier';
import { GameClock } from './game.clock';

@Module({
  imports: [],
  providers: [
    GameGateway,
    GameService,
    PrismaService,
    GameModel,
    ConnectionPatchProvider,
    ClientStore,
    GameMetrics,
    GameRepository,
    GameNotifier,
    GameClock,
    {
      provide: 'GameAdapterI',
      useClass: GameAdapter,
    },
  ],
})
export class GameModule {}
