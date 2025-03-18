import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GameService } from '../../src/game/game.service';
import { GameList } from '../../src/game/game.list';
import { GameModel } from '../../src/game/model';
import { PrismaService } from '../../src/prisma.service';
import {
  generateClient,
  generateConfig,
  generateGameResult,
  generateGameWithWinner,
  generatePlayer,
  getFigureCellState,
} from './generators';
import { Config, Game } from '../../src/game/entities/game';
import { faker } from '@faker-js/faker';
import { Client, Player } from '../../src/game/entities';
import { TokenService } from '../../src/auth';
import { ConnectionPatchProvider } from '../../src/game/connection.provider';
import { LoggerService } from '../../src//tools/logger';
import { GameAdapter } from '../../src/game/entities/game';

jest.mock('../../src/auth');
jest.mock('../../src/game/connection.provider');

describe('GameService (unit)', () => {
  let service: GameService;
  let model: GameModel;
  let list: GameList;
  let cl1: Client;
  let cl2: Client;
  let pl1: Player;
  let pl2: Player;
  let cnf: Config;
  let gm: Game;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GameList,
        GameService,
        GameModel,
        PrismaService,
        TokenService,
        LoggerService,
        ConnectionPatchProvider,
        {
          provide: 'GameAdapterI',
          useClass: GameAdapter,
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    service = moduleRef.get(GameService);
    model = moduleRef.get(GameModel);
    list = moduleRef.get(GameList);

    cl1 = generateClient(true, faker.number.int());
    cl2 = generateClient(true, faker.number.int());
    cnf = generateConfig('w');
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    gm = new Game(cl1, cnf, jest.fn());
    gm.addPlayer(cl2);
    pl1 = gm.players[0];
    pl2 = gm.players[1];
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  it('removeInitedGamesBy - should call list.removeInitedGames', () => {
    const cl = generateClient();
    const mock = jest.spyOn(list, 'removeInitedGames');
    service.removeInitedGamesBy(cl);
    expect(mock).toBeCalledWith(cl);
  });
  describe('save game', () => {
    let saveDrawMock;
    let saveGameWithWinnerMock;
    beforeEach(() => {
      saveDrawMock = jest.spyOn(model, 'saveDraw').mockImplementation();
      saveGameWithWinnerMock = jest
        .spyOn(model, 'saveGameWithWinner')
        .mockImplementation();
    });
    it('shouldnt save game if one of the players is unauthorized', () => {
      const pl1 = generatePlayer('w', false);
      const pl2 = generatePlayer('b', true);
      const result = generateGameResult();
      expect(service['saveGame'](pl1, pl2, result)).resolves.toBeNull();
      expect(service['saveGame'](pl1, pl2, result, true)).resolves.toBeNull();

      pl2.client.authorized = false;
      expect(service['saveGame'](pl1, pl2, result)).resolves.toBeNull();
      expect(service['saveGame'](pl1, pl2, result, true)).resolves.toBeNull();

      pl1.client.authorized = true;
      expect(service['saveGame'](pl1, pl2, result)).resolves.toBeNull();
      expect(service['saveGame'](pl1, pl2, result, true)).resolves.toBeNull();
    });
    it('if saving with winner method should call model.saveGameWithWinner', () => {
      const pl1 = generatePlayer('w', true);
      const pl2 = generatePlayer('b', true);
      const result = generateGameResult();
      service['saveGame'](pl1, pl2, result, true);

      expect(saveGameWithWinnerMock).toBeCalledWith({
        ...result,
        winner: pl1,
        looser: pl2,
      });
    });
    it('if saving draw method should call model.saveDraw', () => {
      const pl1 = generatePlayer('w', true);
      const pl2 = generatePlayer('b', true);
      const result = generateGameResult();
      service['saveGame'](pl1, pl2, result);

      expect(saveDrawMock).toBeCalledWith({
        ...result,
        pl1,
        pl2,
      });
    });
  });
  describe('createGame', () => {
    it('should create and return game entity, add it to lobby', async () => {
      const pl = generateClient();
      const cnf = generateConfig('w', 0);
      const addGameToLobbyMock = jest
        .spyOn(list, 'addGameToLobby')
        .mockImplementation();
      const gm = await service.createGame(pl, cnf);
      expect(gm).toBeInstanceOf(Game);
      expect(addGameToLobbyMock).toBeCalledWith(gm);
    });
  });
  describe('connectToGame', () => {
    it('should throw not found if game isnt in lobby', () => {
      const cl = generateClient();
      jest.spyOn(list, 'findInLobby').mockImplementation(() => null);
      expect(service.connectToGame(cl, -1)).rejects.toThrow(
        new NotFoundException('Game not found'),
      );
    });
    it('should throw err if client already in game', () => {
      jest.spyOn(list, 'findInLobby').mockImplementation(() => gm);
      expect(service.connectToGame(cl1, gm.id)).rejects.toThrow(
        new ConflictException('You are already in game'),
      );
    });
    it('should add player and remove game from lobby on successfull connect', async () => {
      gm.addPlayer = jest.fn();
      jest.spyOn(list, 'findInLobby').mockImplementation(() => gm);
      const remove = jest
        .spyOn(list, 'pushToStartedGames')
        .mockImplementation();
      const result = await service.connectToGame(cl2, gm.id);
      expect(result).toStrictEqual(gm);
      expect(gm.addPlayer).toBeCalledWith(cl2);
      expect(remove).toBeCalledWith(gm.id);
    });
  });
  describe('findGameById', () => {
    afterEach(() => {
      list.games = [];
    });
    it('should throw not found err if game not found', () => {
      expect(() => service.findGameById(-1)).toThrow(
        new NotFoundException('Game not found'),
      );
    });
    it('should return game', () => {
      list.games.push(gm);
      expect(service.findGameById(gm.id)).toStrictEqual(gm);
    });
  });
  describe('getActualGameState', () => {
    it('should return game of state in plain object format', () => {
      expect(service.getActualGameState(gm)).toStrictEqual(
        getFigureCellState(),
      );
    });
  });
  describe('surrender', () => {
    it('should call game.end with winner and return result', async () => {
      gm.winner = pl2;
      gm.looser = pl1;
      jest.spyOn(gm, 'endGame').mockImplementationOnce(() => gm);
      jest.spyOn(service as any, 'saveGame').mockImplementation();
      jest.spyOn(service, 'findGameById').mockImplementationOnce(() => gm);
      const gmResult = generateGameWithWinner(gm);

      const expected = {
        gameDto: gmResult,
        winner: gm.winner,
        looser: gm.looser,
      };
      expect(service.surrender(gm.id, cl1)).resolves.toStrictEqual(expected);
      expect(gm.endGame).toBeCalledWith(pl2, pl1);
    });
  });
  describe('proposeDraw', () => {
    beforeEach(() => {
      jest.spyOn(service, 'findGameById').mockImplementationOnce(() => gm);
    });
    afterEach(() => {
      gm.draw = {
        w: false,
        b: false,
      };
    });
    it('should throw Conflict err if draw already set by user', () => {
      gm.draw = {
        w: true,
        b: false,
      };
      expect(() => service.proposeDraw(gm.id, cl1)).toThrow(
        new ConflictException('Propose already set'),
      );
    });
    it('propose draw from client (white side)', () => {
      expect(service.proposeDraw(gm.id, cl1)).toStrictEqual({
        w: true,
        b: false,
      });
    });
    it('propose draw from client (black side)', () => {
      expect(service.proposeDraw(gm.id, cl2)).toStrictEqual({
        w: false,
        b: true,
      });
    });
  });
  describe('acceptDraw', () => {
    it('should throw Conflict err if draw propose wasnt send', async () => {
      gm.draw = { w: false, b: false };
      jest.spyOn(service, 'findGameById').mockImplementationOnce(() => gm);
      expect(service.acceptDraw(gm.id, cl2)).rejects.toThrow(
        new ConflictException('Draw propose wasnt set'),
      );
    });
    it('should set draw propose and end the game', async () => {
      gm.draw = { w: true, b: false };
      jest.spyOn(service, 'findGameById').mockImplementationOnce(() => gm);
      jest.spyOn(gm, 'setDrawProposeFrom').mockImplementation();
      jest.spyOn(service as any, 'saveGame').mockImplementation();
      jest
        .spyOn(service['adapter'], 'gameWithDrawDto')
        .mockImplementation(() => {
          return { id: gm.id } as any;
        });
      expect(service.acceptDraw(gm.id, cl1)).resolves.toStrictEqual({
        id: gm.id,
      });
    });
  });
  describe('reject draw', () => {
    it('should throw conflict err if draw propose wasnt set', () => {
      jest.spyOn(service, 'findGameById').mockImplementationOnce(() => gm);
      expect(() => service.rejectDraw(gm.id)).toThrow(
        new ConflictException('Draw propose wasnt set'),
      );
    });
    it('should reject draw and sent result', () => {
      jest.spyOn(service, 'findGameById').mockImplementationOnce(() => gm);
      jest.spyOn(gm, 'rejectDraw').mockImplementation();
      gm.draw = {
        w: true,
        b: false,
      };
      expect(service.rejectDraw(gm.id)).toStrictEqual({
        w: false,
        b: false,
      });
      expect(gm.rejectDraw).toBeCalled();
    });
  });
  describe('addTime', () => {
    beforeEach(() => {
      jest.spyOn(service, 'findGameById').mockImplementationOnce(() => gm);
    });
    it('should add time and return updated times', () => {
      const pl1Copy = { ...pl1 };
      const pl2Copy = { ...pl2 };
      expect(service.addTimeToAnotherPlayer(gm.id, cl1)).toStrictEqual({
        [pl1.side]: pl1Copy.time,
        [pl2.side]: pl2Copy.time + gm.config.timeIncrement,
      });
    });
  });
  describe('makeTurn', () => {
    it('should return completed move', async () => {
      const completedMove = {
        result: { shah: null, mate: null, strike: null },
        prevCell: 'b5',
        side: 'w',
      };
      jest.spyOn(gm, 'makeTurn').mockReturnValue(completedMove as any);
      jest.spyOn(service, 'findGameById').mockReturnValueOnce(gm);
      const result = await service.makeTurn(gm.id, 1, {
        figure: 'Q',
        cell: 'b5',
        gameId: gm.id,
      });
      expect(result).toStrictEqual(completedMove);
    });
    it('should call gm.endGame and GameService.saveGame in case of mate', async () => {
      const completedMove = {
        result: {
          shah: null,
          mate: { matedSide: 'b', byFigure: 'Q' },
          strike: null,
        },
        prevCell: 'b5',
        side: 'w',
      };
      jest.spyOn(gm, 'makeTurn').mockReturnValue(completedMove as any);
      jest.spyOn(gm, 'endGame').mockImplementation();
      jest.spyOn(service as any, 'saveGame').mockImplementation(jest.fn());
      jest
        .spyOn(service['adapter'], 'gameWithWinnerDto')
        .mockImplementation(() => {
          return { id: gm.id } as any;
        });
      jest.spyOn(service['list'], 'gameEnd').mockImplementation(jest.fn());
      jest.spyOn(service, 'findGameById').mockReturnValueOnce(gm);
      const result = await service.makeTurn(gm.id, gm.players[0].userId, {
        figure: 'Q',
        cell: 'b5',
        gameId: gm.id,
      });
      expect(result).toStrictEqual(completedMove);
      expect(gm.endGame).toBeCalledWith(gm.players[0], gm.players[1]);
      expect(service['list'].gameEnd).toBeCalledWith(gm.id);
      expect(service['saveGame']).toBeCalledWith(
        gm.players[0],
        gm.players[1],
        { id: gm.id },
        true,
      );
    });
  });
});
