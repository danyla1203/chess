import { Test } from '@nestjs/testing';
import { User } from '@prisma/client';
import { GameHistoryModel } from '../../src/game-history/game-history.model';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { generateGameEndedEvent } from './generators';

describe('GameHistoryModel (integration)', () => {
  let model: GameHistoryModel;
  let prisma: PrismaService;
  let winner: User;
  let looser: User;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [GameHistoryModel, PrismaService],
    }).compile();
    model = moduleRef.get(GameHistoryModel);
    prisma = moduleRef.get(PrismaService);

    winner = await prisma.user.findFirst({ where: { balance: { gt: 100 } } });
    looser = await prisma.user.findFirst({
      where: { NOT: { id: winner.id }, balance: { gt: 100 } },
    });
  });

  it('should save a game with winner and move the bet', async () => {
    const event = generateGameEndedEvent({}, winner.id, looser.id);

    await expect(model.save(event)).resolves.toBe('saved');

    const game = await prisma.game.findUnique({
      where: { matchId: event.matchId },
      include: { players: true },
    });
    const winnerInGame = game.players.find((pl) => pl.userId === winner.id);
    const looserInGame = game.players.find((pl) => pl.userId === looser.id);
    expect(winnerInGame.isWinner).toBe(true);
    expect(winnerInGame.balanceChange).toEqual(event.config.bet);
    expect(looserInGame.balanceChange).toEqual(-event.config.bet);

    const winnerAfter = await prisma.user.findUnique({
      where: { id: winner.id },
    });
    const looserAfter = await prisma.user.findUnique({
      where: { id: looser.id },
    });
    expect(winnerAfter.winningBalance).toEqual(
      winner.winningBalance + event.config.bet,
    );
    expect(looserAfter.balance).toEqual(looser.balance - event.config.bet);
  });

  it('should save a draw without balance changes', async () => {
    const event = generateGameEndedEvent(
      { isDraw: true, reason: 'draw' },
      winner.id,
      looser.id,
    );
    event.players[0].isWinner = false;

    await expect(model.save(event)).resolves.toBe('saved');

    const looserAfter = await prisma.user.findUnique({
      where: { id: looser.id },
    });
    expect(looserAfter.balance).toEqual(looser.balance);
  });

  it('should report a redelivered match as duplicate and not charge twice', async () => {
    const event = generateGameEndedEvent({}, winner.id, looser.id);
    await model.save(event);

    await expect(model.save(event)).resolves.toBe('duplicate');

    const looserAfter = await prisma.user.findUnique({
      where: { id: looser.id },
    });
    expect(looserAfter.balance).toEqual(looser.balance - event.config.bet);
  });
});
