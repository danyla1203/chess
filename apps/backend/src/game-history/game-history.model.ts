import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import type { GameEndedEvent } from '../infrastructure/messaging';

export type SaveResult = 'saved' | 'duplicate';

@Injectable()
export class GameHistoryModel {
  constructor(private readonly prisma: PrismaService) {}

  public async save(event: GameEndedEvent): Promise<SaveResult> {
    const { config, isDraw } = event;
    const winner = event.players.find((pl) => pl.isWinner);
    const looser = event.players.find((pl) => !pl.isWinner);

    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.game.create({
        data: {
          matchId: event.matchId,
          isDraw,
          maxTime: config.time,
          timeIncrement: config.timeIncrement,
          sideSelecting: config.side,
          moves: event.moves as Prisma.JsonArray,
          bet: config.bet,
          players: {
            create: event.players.map((pl) => ({
              userId: pl.userId,
              side: pl.side,
              isWinner: !isDraw && pl.isWinner,
              balanceChange: isDraw
                ? 0
                : pl.isWinner
                  ? config.bet
                  : -config.bet,
            })),
          },
        },
      }),
    ];
    if (!isDraw) {
      ops.push(
        this.prisma.user.update({
          where: { id: winner.userId },
          data: { winningBalance: { increment: config.bet } },
        }),
        this.prisma.user.update({
          where: { id: looser.userId },
          data: { balance: { decrement: config.bet } },
        }),
      );
    }

    try {
      await this.prisma.$transaction(ops, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
      return 'saved';
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return 'duplicate';
      }
      throw e;
    }
  }
}
