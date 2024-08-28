import { Test } from '@nestjs/testing';
import { GameService } from '../game.service';
import { AppModule } from '../../app.module';
import { Config, Game } from '../entities/game';
import {
  generateClient,
  generateConfig,
  generateGameResult,
} from './generators';
import { Client, Player } from '../entities';
import { TurnBody } from '../dto';
import { GameList } from '../game.list';
import { PrismaService } from '../../prisma.service';
import { User } from '@prisma/client';

jest.mock('axios', () => null);

describe('GameService (integration)', () => {
  let service: GameService;
  let lobby: GameList;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    service = moduleRef.get<GameService>(GameService);
    lobby = moduleRef.get<GameList>(GameList);
    prisma = moduleRef.get<PrismaService>(PrismaService);
  });

  describe('saveGame', () => {
    let game: Game;
    let cl1: Client;
    let cl2: Client;
    let config: Config;
    let userInDb1: User;
    let userInDb2: User;
    beforeEach(async () => {
      userInDb1 = await prisma.user.findFirst({
        where: { balance: { gt: 100 } },
      });
      userInDb2 = await prisma.user.findFirst({
        where: { NOT: { id: userInDb1.id }, balance: { gt: 100 } },
      });
      cl1 = generateClient(true, userInDb1.id);
      config = generateConfig('w', 90);
      game = new Game(cl1, config, jest.fn());
      lobby.addGameToLobby(game);
      cl2 = generateClient(true, userInDb2.id);
      game.addPlayer(cl2);
      lobby.pushToStartedGames(game.id);
      game.start();
    });
    it('should return null if one of the players isnt authorized', async () => {
      const pl1 = game.players[0];
      const pl2 = game.players[1];
      pl1.client.authorized = false;
      pl2.client.authorized = true;
      game.endGame(pl1, pl2);
      await service['saveGame'](pl1, pl2, generateGameResult(), true);
    });
    it('should save game with winner', async () => {
      const [pl1, pl2] = game.players;

      const shouldWin = pl1.userId === cl1.userId ? pl1 : pl2;
      const shouldLose = pl1.userId === cl2.userId ? pl1 : pl2;

      game.endGame(shouldWin, shouldLose);
      const returnedGame = await service['saveGame'](
        shouldWin,
        shouldLose,
        generateGameResult(game.config),
        true,
      );

      const gameInDb = await prisma.game.findFirst({
        include: {
          players: {
            include: {
              user: true,
            },
          },
        },
        where: {
          id: returnedGame.id,
        },
      });
      const [userInGame1, userInGame2] = gameInDb.players;
      expect(userInGame1).toBeTruthy();
      expect(userInGame2).toBeTruthy();
      expect(gameInDb).toBeTruthy();

      const winner = userInGame1.isWinner ? userInGame1 : userInGame2;
      const looser = !userInGame1.isWinner ? userInGame1 : userInGame2;

      expect(winner.balanceChange).toEqual(game.config.bet);
      expect(looser.balanceChange).toEqual(-game.config.bet);

      const prevUserWinner =
        userInDb1.id === winner.userId ? userInDb1 : userInDb2;
      const prevUserLooser =
        userInDb1.id === looser.userId ? userInDb1 : userInDb2;
      expect(winner.user.balance).toEqual(prevUserWinner.balance);
      expect(looser.user.balance).toEqual(prevUserLooser.balance - config.bet);
    });
  });

  describe('makeTurn', () => {
    let game: Game;
    let cl1: Client;
    let cl2: Client;
    beforeEach(async () => {
      const userInDb1 = await prisma.user.findFirst({
        where: { balance: { gt: 100 } },
      });
      const userInDb2 = await prisma.user.findFirst({
        where: { NOT: { id: userInDb1.id }, balance: { gt: 100 } },
      });
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      cl1 = generateClient(true, userInDb1.id);
      const config = generateConfig('w', 90);
      game = new Game(cl1, config, jest.fn());
      lobby.addGameToLobby(game);
      cl2 = generateClient(true, userInDb2.id);
      game.addPlayer(cl2);
      lobby.pushToStartedGames(game.id);
      game.start();
    });
    afterAll(() => {
      jest.useRealTimers();
    });

    it('should return completed move', async () => {
      const turnBody: TurnBody = {
        figure: 'pawn1',
        cell: 'a4',
        gameId: game.id,
      };
      const completedMove = await service.makeTurn(
        game.id,
        cl1.userId,
        turnBody,
      );
      expect(completedMove).toStrictEqual({
        result: { shah: null, mate: null, strike: null },
        prevCell: 'a2',
        side: 'w',
      });
    });
    it('should return completed move, and save game in case of mate', async () => {
      jest.spyOn(game, 'makeTurn').mockReturnValue({
        result: {
          shah: null,
          mate: { byFigure: 'Q', matedSide: 'b' },
          strike: null,
        },
        prevCell: 'b3',
        side: 'w',
      });
      jest.spyOn(service as any, 'saveGame').mockImplementationOnce(jest.fn());
      const turnBody: TurnBody = {
        figure: 'Q',
        cell: 'b7',
        gameId: game.id,
      };
      const completedMove = await service.makeTurn(
        game.id,
        cl1.userId,
        turnBody,
      );
      expect(completedMove).toStrictEqual({
        result: {
          shah: null,
          mate: { byFigure: 'Q', matedSide: 'b' },
          strike: null,
        },
        prevCell: 'b3',
        side: 'w',
      });
      expect(game.isActive).toBeFalsy();
      expect(game.winner.userId).toEqual(cl1.userId);
      expect(game.looser.userId).toEqual(cl2.userId);

      const gameInStartedGames = lobby.games.find((g) => g.id === game.id);
      expect(gameInStartedGames).toBeUndefined();

      expect(service['saveGame']).toBeCalled();
    });
  });

  describe('add time to another player', () => {
    let game: Game;
    let cl1: Client;
    let cl2: Client;
    beforeEach(async () => {
      const userInDb1 = await prisma.user.findFirst({
        where: { balance: { gt: 100 } },
      });
      const userInDb2 = await prisma.user.findFirst({
        where: { NOT: { id: userInDb1.id }, balance: { gt: 100 } },
      });
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      cl1 = generateClient(true, userInDb1.id);
      const config = generateConfig('w', 90);
      game = new Game(cl1, config, jest.fn());
      lobby.addGameToLobby(game);
      cl2 = generateClient(true, userInDb2.id);
      game.addPlayer(cl2);
      lobby.pushToStartedGames(game.id);
      game.start();
    });
    afterAll(() => {
      jest.useRealTimers();
    });

    it('should add time to another player', () => {
      const [pl1, pl2] = game.players;
      const playerWhoGave = pl1.userId === cl1.userId ? pl1 : pl2;
      const playerWhoReceived = pl1.userId !== cl1.userId ? pl1 : pl2;
      const prevTime = playerWhoReceived.time;
      const prevTime2 = playerWhoGave.time;
      const updatedTimes = service.addTimeToAnotherPlayer(game.id, cl1);

      expect(playerWhoReceived.time).toEqual(
        prevTime + game.config.timeIncrement,
      );
      expect(playerWhoGave.time).toEqual(prevTime2);
      expect(updatedTimes).toStrictEqual({
        [playerWhoGave.side]: playerWhoGave.time,
        [playerWhoReceived.side]: playerWhoReceived.time,
      });
    });
  });
  describe('draw propose, draw accept, and draw reject logic', () => {
    let game: Game;
    let cl1: Client;
    let cl2: Client;
    let pl1: Player;
    let pl2: Player;
    beforeEach(async () => {
      const userInDb1 = await prisma.user.findFirst({});
      const userInDb2 = await prisma.user.findFirst({
        where: { NOT: { id: userInDb1.id } },
      });
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      cl1 = generateClient(true, userInDb1.id);
      const config = generateConfig('w');
      game = new Game(cl1, config, jest.fn());
      lobby.addGameToLobby(game);
      cl2 = generateClient(true, userInDb2.id);
      game.addPlayer(cl2);
      lobby.pushToStartedGames(game.id);
      pl1 = game.players.find((pl) => pl.userId == cl1.userId);
      pl2 = game.players.find((pl) => pl.userId == cl2.userId);
      game.start();
    });
    afterAll(() => {
      jest.useRealTimers();
    });

    describe('draw propose', () => {
      it('should set draw propose', () => {
        const drawProposeResult = service.proposeDraw(game.id, cl1);
        expect(game.draw[pl1.side]).toBeTruthy();
        expect(game.draw[pl2.side]).toBeFalsy();
        expect(drawProposeResult).toStrictEqual({
          [pl1.side]: true,
          [pl2.side]: false,
        });
      });
      it('should throw error if draw propose already sent', () => {
        game.draw[pl1.side] = true;
        expect(() => service.proposeDraw(game.id, cl1)).toThrowError();
      });
    });
    describe('accept draw', () => {
      it('should accept draw', async () => {
        const spy = jest.spyOn(service as any, 'saveGame');
        service.proposeDraw(game.id, cl1);
        await service.acceptDraw(game.id, cl2);
        expect(spy).toBeCalled();
        expect(game.isActive).toBeFalsy();
        const pendingGame = lobby.games.find((g) => g.id === game.id);
        expect(pendingGame).toBeUndefined();
      });
      it('should throw error with draw propose dont exist', async () => {
        expect(service.acceptDraw(game.id, cl2)).rejects.toThrowError();
      });
    });
    describe('reject draw', () => {
      it('should reject draw propose', () => {
        service.proposeDraw(game.id, cl1);
        const result = service.rejectDraw(game.id);
        expect(result).toStrictEqual({ w: false, b: false });
        expect(game.draw).toStrictEqual({ w: false, b: false });
      });
      it('should throw error with draw propose dont exist', () => {
        expect(() => service.rejectDraw(game.id)).toThrowError();
      });
    });
  });
  describe('surrender', () => {
    let game: Game;
    let cl1: Client;
    let cl2: Client;
    let pl1: Player;
    let pl2: Player;
    beforeEach(async () => {
      const userInDb1 = await prisma.user.findFirst({});
      const userInDb2 = await prisma.user.findFirst({
        where: { NOT: { id: userInDb1.id } },
      });
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      cl1 = generateClient(true, userInDb1.id);
      const config = generateConfig('w');
      game = new Game(cl1, config, jest.fn());
      lobby.addGameToLobby(game);
      cl2 = generateClient(true, userInDb2.id);
      game.addPlayer(cl2);
      lobby.pushToStartedGames(game.id);
      pl1 = game.players.find((pl) => pl.userId == cl1.userId);
      pl2 = game.players.find((pl) => pl.userId === cl2.userId);
      game.start();
    });
    afterAll(() => {
      jest.useRealTimers();
    });

    it('should end game if player decided to surrender', async () => {
      const spy = jest.spyOn(service as any, 'saveGame');
      const result = await service.surrender(game.id, cl2);

      expect(game.isActive).toBeFalsy();
      const pendingGame = lobby.games.find((g) => g.id === game.id);
      expect(pendingGame).toBeUndefined();
      expect(spy).toBeCalled();
      expect(result).toHaveProperty(['winner'], pl1);
      expect(result).toHaveProperty(['looser'], pl2);
    });
  });
  describe('should end the game if one of the player leaves', () => {
    let game: Game;
    let cl1: Client;
    let cl2: Client;
    let pl1: Player;
    let pl2: Player;
    beforeEach(async () => {
      const userInDb1 = await prisma.user.findFirst({});
      const userInDb2 = await prisma.user.findFirst({
        where: { NOT: { id: userInDb1.id } },
      });
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      cl1 = generateClient(true, userInDb1.id);
      const config = generateConfig('w');
      game = new Game(cl1, config, jest.fn());
      lobby.addGameToLobby(game);
      cl2 = generateClient(true, userInDb2.id);
      game.addPlayer(cl2);
      lobby.pushToStartedGames(game.id);
      pl1 = game.players.find((pl) => pl.userId == cl1.userId);
      pl2 = game.players.find((pl) => pl.userId === cl2.userId);
      game.start();
    });
    afterAll(() => {
      jest.useRealTimers();
    });
    it('should end the game if one of the player leaves', async () => {
      const spy = jest.spyOn(service as any, 'saveGame');
      const result = await service.leaveGame(cl2);

      expect(game.isActive).toBeFalsy();
      const pendingGame = lobby.games.find((g) => g.id === game.id);
      expect(pendingGame).toBeUndefined();
      expect(spy).toBeCalled();
      expect(result).toHaveProperty(['winner'], pl1);
      expect(result).toHaveProperty(['looser'], pl2);
    });
  });
});
