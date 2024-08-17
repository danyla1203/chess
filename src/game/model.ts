import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DrawGame, GameWithWinner } from './entities/game';
import { Game, Prisma } from '@prisma/client';
import { LoggerService } from '../tools/logger';

@Injectable()
export class GameModel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  public async getUserBalance(id: number) {
    return (
      await this.prisma.user.findFirst({
        where: { id },
      })
    ).balance;
  }

  public saveDraw({ config, pl1, pl2, moves }: DrawGame): Promise<Game> {
    const jsonMoves = moves as unknown as Prisma.JsonArray;
    return this.prisma.game.create({
      data: {
        isDraw: true,
        maxTime: config.time,
        timeIncrement: config.timeIncrement,
        sideSelecting: config.side,
        moves: jsonMoves,
        bet: config.bet,
        players: {
          create: [
            {
              userId: pl1.userId,
              side: pl1.side,
              isWinner: false,
            },
            {
              userId: pl2.userId,
              side: pl2.side,
              isWinner: false,
            },
          ],
        },
      },
    });
  }
  public async saveGameWithWinner({
    config,
    winner,
    looser,
    moves,
  }: GameWithWinner): Promise<Game> {
    const jsonMoves = moves as unknown as Prisma.JsonArray;
    this.logger.log(
      `Save game with winner. 
      Winner id = ${winner.userId}, 
      Looser id = ${looser.userId}. 
      Bet: ${config.bet}`,
      'GameModel',
    );
    try {
      const gamePromise = this.prisma.game.create({
        data: {
          isDraw: false,
          maxTime: config.time,
          timeIncrement: config.timeIncrement,
          sideSelecting: config.side,
          moves: jsonMoves,
          bet: config.bet,
          players: {
            create: [
              {
                userId: winner.userId,
                side: winner.side,
                isWinner: true,
                balanceChange: config.bet,
              },
              {
                userId: looser.userId,
                side: looser.side,
                isWinner: false,
                balanceChange: -config.bet,
              },
            ],
          },
        },
      });
      const userUpdate1 = this.prisma.user.update({
        where: { id: winner.userId },
        data: {
          winningBalance: { increment: config.bet },
        },
      });
      const userUpdate2 = this.prisma.user.update({
        where: { id: looser.userId },
        data: {
          balance: { decrement: config.bet },
        },
      });
      const [game] = await this.prisma.$transaction(
        [gamePromise, userUpdate1, userUpdate2],
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
      return game;
    } catch (e) {
      throw new BadRequestException('Something went wrong');
    }
  }
}
