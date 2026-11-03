import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GameService } from '../../src/game/game.service';
import { GameRepository } from '../../src/infrastructure/game/game.repository';
import { GameMetrics } from '../../src/infrastructure/game/game.metrics';
import { GamePublisher } from '../../src/game/game.publisher';
import { GameAdapter } from '../../src/game/game.adapter';
import { GameProcess } from '../../src/domain/game/entities/game/process/game.process';
import { GameEnd } from '@chess/contract';
import { Client } from '../../src/domain/game/entities';
import { EventType } from '../../src/infrastructure/messaging';
import { generateClient, generateConfig } from './generators';
import { InMemoryGameRepository, fakeMetrics, fakePublisher } from './fakes';

describe('GameService (unit)', () => {
  let service: GameService;
  let repo: InMemoryGameRepository;
  let publisher: ReturnType<typeof fakePublisher>;
  let metrics: ReturnType<typeof fakeMetrics>;
  let cl1: Client;
  let cl2: Client;

  beforeEach(async () => {
    repo = new InMemoryGameRepository();
    publisher = fakePublisher();
    metrics = fakeMetrics();
    const moduleRef = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: GameRepository, useValue: repo },
        { provide: GamePublisher, useValue: publisher },
        { provide: GameMetrics, useValue: metrics },
        { provide: 'GameAdapterI', useClass: GameAdapter },
      ],
    }).compile();
    service = moduleRef.get(GameService);
    cl1 = generateClient(true, 1);
    cl2 = generateClient(true, 2);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const startGame = async (bet = 0) => {
    const created = await service.createGame(cl1, generateConfig('w', bet));
    return service.connectToGame(cl2, created.id);
  };

  describe('createGame', () => {
    it('should store a lobby game and record it', async () => {
      const game = await service.createGame(cl1, generateConfig('w', 0));
      expect(game.id).toBe(1);
      expect(game.status).toBe('lobby');
      expect(await repo.lobbyIds()).toStrictEqual(['1']);
      expect(metrics.gameCreated).toHaveBeenCalledWith(game);
      expect(publisher.types()).toStrictEqual(['created']);
    });
    it('should replace the previous lobby game of the same user', async () => {
      const first = await service.createGame(cl1, generateConfig('w', 0));
      const second = await service.createGame(cl1, generateConfig('b', 0));
      expect(await repo.lobbyIds()).toStrictEqual([String(second.id)]);
      expect((await repo.get(first.id)).status).toBe('cancelled');
      expect(publisher.types()).toStrictEqual([
        'created',
        'cancelled',
        'created',
      ]);
    });
    it('should refuse while the user plays an active game', async () => {
      await startGame();
      await expect(
        service.createGame(cl1, generateConfig('w', 0)),
      ).rejects.toThrow(new ConflictException('You are already in game'));
    });
  });

  describe('connectToGame', () => {
    it('should throw NotFound for an unknown game', async () => {
      await expect(service.connectToGame(cl2, 999)).rejects.toThrow(
        new NotFoundException('Game not found'),
      );
    });
    it('should not let the creator join own game', async () => {
      const game = await service.createGame(cl1, generateConfig('w', 0));
      await expect(service.connectToGame(cl1, game.id)).rejects.toThrow(
        new ConflictException('You are already in game'),
      );
    });
    it('should add the second player and start the game', async () => {
      const game = await startGame();
      expect(game.isActive).toBe(true);
      expect(game.players.map((pl) => pl.userId)).toStrictEqual([1, 2]);
      expect(await repo.lobbyIds()).toHaveLength(0);
      expect(publisher.types()).toStrictEqual(['created', 'started']);
    });
    it('should cancel the lobby game the joiner had open', async () => {
      const own = await service.createGame(cl2, generateConfig('w', 0));
      const target = await service.createGame(cl1, generateConfig('w', 0));
      await service.connectToGame(cl2, target.id);
      expect((await repo.get(own.id)).status).toBe('cancelled');
    });
  });

  describe('lookups', () => {
    it('findPendingGame should return the active game of the user', async () => {
      const game = await startGame();
      expect((await service.findPendingGame(cl2)).id).toBe(game.id);
    });
    it('findPendingGame should throw when the user only has a lobby game', async () => {
      await service.createGame(cl1, generateConfig('w', 0));
      await expect(service.findPendingGame(cl1)).rejects.toThrow(
        NotFoundException,
      );
    });
    it('removeInitedGamesBy should cancel a lobby game', async () => {
      const game = await service.createGame(cl1, generateConfig('w', 0));
      await service.removeInitedGamesBy(cl1);
      expect((await repo.get(game.id)).status).toBe('cancelled');
    });
    it('findGameById should hide cancelled games', async () => {
      const game = await service.createGame(cl1, generateConfig('w', 0));
      await service.removeInitedGamesBy(cl1);
      await expect(service.findGameById(game.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('game end', () => {
    it('surrender should end the game and write game.ended to the outbox', async () => {
      const game = await startGame(50);
      const { winner, looser, gameDto } = await service.surrender(game.id, cl1);
      expect(winner.userId).toBe(2);
      expect(looser.userId).toBe(1);
      expect(gameDto.id).toBe(game.id);
      expect(repo.outbox).toHaveLength(1);
      expect(repo.outbox[0]).toMatchObject({
        type: EventType.GameEnded,
        messageId: game.matchId,
        payload: { reason: GameEnd.surrender, isDraw: false },
      });
      expect(metrics.gameEnded).toHaveBeenCalled();
      expect(await repo.findUserGame(1)).toBeNull();
      expect(publisher.published.at(-1).event).toStrictEqual({
        type: 'ended',
        reason: GameEnd.surrender,
      });
    });
    it('surrender twice should fail and not write a second event', async () => {
      const game = await startGame();
      await service.surrender(game.id, cl1);
      await expect(service.surrender(game.id, cl2)).rejects.toThrow(
        new ConflictException('Game is not active'),
      );
      expect(repo.outbox).toHaveLength(1);
    });
    it('leaveGame should make the leaver lose', async () => {
      await startGame();
      const { winner, looser } = await service.leaveGame(cl2);
      expect(winner.userId).toBe(1);
      expect(looser.userId).toBe(2);
      expect(repo.outbox[0].payload).toMatchObject({
        reason: GameEnd.playerLeave,
      });
    });
    it('makeTurn should end the game on mate', async () => {
      const game = await startGame();
      const mate = { matedSide: 'b' as const, byFigure: 'Q' };
      jest
        .spyOn(GameProcess.prototype, 'makeTurn')
        .mockReturnValueOnce({ shah: null, strike: null, mate });

      const move = await service.makeTurn(game.id, 1, {
        gameId: game.id,
        figure: 'Q',
        cell: 'h5',
      });

      expect(move.result.mate).toStrictEqual(mate);
      expect(publisher.types().slice(-2)).toStrictEqual(['moved', 'ended']);
      const stored = await repo.get(game.id);
      expect(stored.status).toBe('ended');
      expect(stored.winner.userId).toBe(1);
      expect(repo.outbox[0].payload).toMatchObject({ reason: GameEnd.mate });
    });
  });

  describe('moves', () => {
    it('should apply a legal move and persist it', async () => {
      const game = await startGame();
      const move = await service.makeTurn(game.id, 1, {
        gameId: game.id,
        figure: 'pawn4',
        cell: 'd4',
      });
      expect(move).toMatchObject({ prevCell: 'd2', side: 'w' });
      expect(publisher.published.at(-1).event).toMatchObject({
        type: 'moved',
        figure: 'pawn4',
        cell: 'd4',
        prevCell: 'd2',
        side: 'w',
      });
      const stored = await repo.get(game.id);
      expect(stored.moves).toHaveLength(1);
      expect(stored.process.turnSide).toBe('b');
    });
    it('should reject a move out of turn', async () => {
      const game = await startGame();
      await expect(
        service.makeTurn(game.id, 2, {
          gameId: game.id,
          figure: 'pawn4',
          cell: 'd5',
        }),
      ).rejects.toThrow(new ConflictException('Not your turn'));
      expect(publisher.types()).not.toContain('moved');
    });
  });

  describe('draw', () => {
    it('proposeDraw should set the proposer side', async () => {
      const game = await startGame();
      expect(await service.proposeDraw(game.id, cl2)).toStrictEqual({
        w: false,
        b: true,
      });
    });
    it('proposeDraw twice should conflict', async () => {
      const game = await startGame();
      await service.proposeDraw(game.id, cl1);
      await expect(service.proposeDraw(game.id, cl1)).rejects.toThrow(
        new ConflictException('Propose already set'),
      );
    });
    it('acceptDraw without a proposal should conflict', async () => {
      const game = await startGame();
      await expect(service.acceptDraw(game.id, cl2)).rejects.toThrow(
        new ConflictException('Draw propose wasnt set'),
      );
    });
    it('acceptDraw should end the game as a draw', async () => {
      const game = await startGame();
      await service.proposeDraw(game.id, cl1);
      const dto = await service.acceptDraw(game.id, cl2);
      expect(dto.id).toBe(game.id);
      expect(publisher.types().slice(-2)).toStrictEqual([
        'drawProposed',
        'ended',
      ]);
      expect(repo.outbox[0].payload).toMatchObject({
        isDraw: true,
        reason: GameEnd.draw,
      });
    });
    it('rejectDraw should clear proposals', async () => {
      const game = await startGame();
      await service.proposeDraw(game.id, cl1);
      expect(await service.rejectDraw(game.id)).toStrictEqual({
        w: false,
        b: false,
      });
      expect((await repo.get(game.id)).draw).toStrictEqual({
        w: false,
        b: false,
      });
    });
  });

  describe('misc', () => {
    it('addTimeToAnotherPlayer should add increment to the opponent', async () => {
      const game = await startGame();
      const clock = await service.addTimeToAnotherPlayer(game.id, cl1);
      expect(clock.b).toBe(game.config.time + game.config.timeIncrement);
      expect(clock.running).toBe('w');
    });
    it('pushMessage should store chat messages', async () => {
      const game = await startGame();
      const message = await service.pushMessage(game.id, 'hi', cl1);
      expect(message).toMatchObject({ text: 'hi', author: { id: 1 } });
      expect(publisher.published.at(-1).event).toStrictEqual({
        type: 'chatPosted',
        message,
      });
      expect((await repo.get(game.id)).chat.messages).toHaveLength(1);
    });
  });

  describe('endByTimeout', () => {
    it('should do nothing while time remains', async () => {
      const game = await startGame();
      await service.endByTimeout(game.id, game.turnStartedAt + 10);
      expect((await repo.get(game.id)).isActive).toBe(true);
      expect(publisher.types()).not.toContain('ended');
    });
    it('should end the game, notify both players and write the outbox', async () => {
      const game = await startGame();
      await service.endByTimeout(game.id, game.deadline() + 1);
      expect((await repo.get(game.id)).endReason).toBe(GameEnd.timeout);
      expect(publisher.published.at(-1).event).toStrictEqual({
        type: 'ended',
        reason: GameEnd.timeout,
      });
      expect(repo.outbox).toHaveLength(1);
    });
  });
});
