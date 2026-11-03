import { Module } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { GameHistoryConsumer } from './game-history.consumer';
import { GameHistoryModel } from './game-history.model';

@Module({
  providers: [GameHistoryConsumer, GameHistoryModel, PrismaService],
})
export class GameHistoryModule {}
