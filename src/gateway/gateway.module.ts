import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GameGateway } from './game.gateway';
import { ConnectionPatchProvider } from './connection.provider';
import { ClientStore } from './ClientStore';
import { BalanceModel } from './balance.model';
import { GatewayMetrics } from './gateway.metrics';
import { SocketNotifier } from './socket.notifier';
import { GameClient } from './game.client';
import { NotificationConsumer } from './notification.consumer';

@Module({
  providers: [
    GameGateway,
    ConnectionPatchProvider,
    ClientStore,
    BalanceModel,
    PrismaService,
    GatewayMetrics,
    SocketNotifier,
    GameClient,
    NotificationConsumer,
  ],
})
export class GatewayModule {}
