import { Module } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { GameGateway } from './game.gateway';
import { ConnectionPatchProvider } from './connection.provider';
import { ClientStore } from './ClientStore';
import { BalanceModel } from './balance.model';
import { GatewayMetrics } from './gateway.metrics';
import { SocketNotifier } from './socket.notifier';
import { GameClient } from './game.client';
import { GameReadModule } from '../game-read';
import { GameSvcClientModule } from './game-svc.client.module';

@Module({
  imports: [GameReadModule, GameSvcClientModule],
  providers: [
    GameGateway,
    ConnectionPatchProvider,
    ClientStore,
    BalanceModel,
    PrismaService,
    GatewayMetrics,
    SocketNotifier,
    GameClient,
  ],
})
export class GatewayModule {}
