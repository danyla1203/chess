import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameList } from './game.list';
import { GameService } from './game.service';
import { GameModel } from './model';
import { PrismaService } from '../prisma.service';
import { ConnectionPatchProvider } from './connection.provider';
import { ClientStore } from './ClientStore';
import { GameAdapter } from './entities/game';

@Module({
  imports: [],
  providers: [
    GameGateway,
    GameList,
    GameService,
    PrismaService,
    GameModel,
    ConnectionPatchProvider,
    ClientStore,
    {
      provide: 'GameAdapterI',
      useClass: GameAdapter,
    },
  ],
})
export class GameModule {}
