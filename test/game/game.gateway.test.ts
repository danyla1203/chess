import { Test } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { GameGateway } from '../../src/game/game.gateway';
import { GameService } from '../../src/game/game.service';
import { AuthService, TokenService } from '../../src/auth';
import { LoggerService } from '../../src/tools/logger';
import { ConnectionPatchProvider } from '../../src/game/connection.provider';
import { ClientStore } from '../../src/game/ClientStore';
import { GameModel } from '../../src/game/model';
import { PrismaService } from '../../src/prisma.service';
import { GameAdapter } from '../../src/game/entities/game';
import { Game, Lobby, room } from '../../src/game/EmitTypes';
import { Player } from '../../src/game/entities';
import { generateConfig, generatePlayer } from './generators';

jest.mock('../../src/game/game.service');
jest.mock('../../src/auth');
jest.mock('../../src/game/game.service');

describe('GameGateway (unit)', () => {
  let gateway: GameGateway;
  let service: GameService;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GameGateway,
        GameService,
        AuthService,
        TokenService,
        LoggerService,
        ConnectionPatchProvider,
        ClientStore,
        GameModel,
        PrismaService,
        {
          provide: 'GameAdapterI',
          useClass: GameAdapter,
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(LoggerService)
      .useValue({ log: jest.fn() })
      .compile();
    service = moduleRef.get(GameService);
    gateway = moduleRef.get(GameGateway);
    const emit = jest.fn();
    gateway.server = {
      emit,
      to: jest.fn(() => {
        return {
          emit,
        };
      }),
    } as any;
  });
  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
  it('handleDisconnect', () => {
    const stubClient = {};
    jest
      .spyOn(gateway['clientStore'], 'getClient')
      .mockReturnValue(stubClient as any);
    jest.spyOn(service, 'getLobby').mockImplementationOnce(() => []);
    gateway.handleDisconnect(stubClient as any);
    expect(service.removeInitedGamesBy).toBeCalledWith(stubClient);
    expect(gateway.server.emit).toBeCalledWith(Lobby.update, []);
  });
  describe('message handlers', () => {
    let player: Player;
    let player2: Player;
    let game: any;
    beforeEach(() => {
      player = generatePlayer('w');
      player2 = generatePlayer('b');
      game = {
        id: faker.number.int(5),
        players: [player, player2],
        start: jest.fn(),
        getInitedGameData: jest.fn().mockReturnValue({}),
        makeTurn: jest.fn().mockImplementation(() => {
          return {
            result: {
              shah: null,
              mate: null,
              strike: null,
            },
            prevCell: '',
            side: '',
          };
        }),
      };
      jest.spyOn(service, 'getLobby').mockImplementationOnce(() => []);
    });
    it('create game', async () => {
      const gameId = faker.number.int(5);
      jest.spyOn(service, 'createGame').mockImplementationOnce((): any => {
        return { id: gameId };
      });
      jest
        .spyOn(gateway['clientStore'], 'getClient')
        .mockReturnValue(player.client);
      const cnf = generateConfig();
      await gateway.createGame(player.client.socket, cnf);
      expect(service.createGame).toBeCalledWith(player.client, cnf);
      expect(player.client.join).toBeCalledWith(gameId);
      expect(player.client.gameCreatedEvent).toBeCalled();
      expect(gateway.server.emit).toBeCalledWith(Lobby.update, []);
    });
    it('rejoin', () => {
      jest.spyOn(service, 'findPendingGame').mockImplementationOnce(() => {
        return {
          id: 12345,
          getInitedGameData: jest.fn(() => {
            return {
              id: 12345,
            };
          }),
          players: [player, player2],
        } as any;
      });
      jest
        .spyOn(gateway['clientStore'], 'getClient')
        .mockReturnValue(player.client);
      console.log(player.userId, player.client.userId);
      gateway.rejoinGame(player.client.socket);
      expect(player.client.join).toBeCalledWith(12345);
      expect(player.initedGameDataEvent).toBeCalled();
      expect(gateway.server.to).toBeCalledWith(room(12345));
    });
    it('join', async () => {
      jest.spyOn(service, 'connectToGame').mockImplementationOnce((): any => {
        return game;
      });
      jest
        .spyOn(gateway['clientStore'], 'getClient')
        .mockReturnValue(player2.client);

      await gateway.joinGame(player2.client.socket, { gameId: game.id });
      expect(service.connectToGame).toBeCalled();
      expect(player2.client.join).toBeCalledWith(game.id);

      expect(player2.initedGameDataEvent).toBeCalled();
      expect(player.initedGameDataEvent).toBeCalled();

      expect(gateway.server.to).toBeCalledWith(room(game.id));
      expect(game.start).toBeCalled();
      expect(gateway.server.emit).toBeCalledWith(Lobby.update, []);
    });
    it('move', async () => {
      const turnBody = { gameId: game.id, figure: 'B1', cell: 'a4' };
      jest.spyOn(service, 'findGameById').mockImplementationOnce((): any => {
        return game;
      });
      jest.spyOn(service, 'makeTurn').mockImplementationOnce((): any => {
        return {
          result: { shah: null, mate: null, strike: null },
          prevCell: '',
          side: '',
        };
      });
      jest
        .spyOn(gateway['clientStore'], 'getClient')
        .mockReturnValue(player.client);
      await gateway.move(player.client.socket, turnBody);
      expect(service.makeTurn).toBeCalledWith(
        game.id,
        player.client.userId,
        turnBody,
      );

      expect(gateway.server.to).toBeCalledWith(room(game.id));
      expect(gateway.server.to(room(game.id)).emit).toHaveBeenCalledWith(
        Game.boardUpdate,
        {
          effect: { shah: null, mate: null, strike: null },
          update: { figure: 'B1', cell: 'a4', prevCell: '', side: '' },
        },
      );
    });
    it('send message in game chat', () => {
      jest.spyOn(service, 'findGameById').mockImplementationOnce((): any => {
        return game;
      });
      const message = {};
      jest.spyOn(service, 'pushMessage').mockImplementationOnce((): any => {
        return message;
      });
      jest
        .spyOn(gateway['clientStore'], 'getClient')
        .mockReturnValue(player.client);
      gateway.chatMessage(player.client.socket, {
        gameId: game.id,
        text: 'some text',
      });
      expect(service.pushMessage).toBeCalledWith(
        game.id,
        'some text',
        player.client,
      );
      expect(gateway.server.to).toBeCalledWith(room(game.id));
      expect(gateway.server.to(room(game.id)).emit).toBeCalledWith(
        Game.message,
        message,
      );
    });
    it('surrender', async () => {
      game.winner = player;
      game.looser = player2;
      jest.spyOn(service, 'surrender').mockImplementationOnce(async () => {
        return {
          winner: game.winner,
          looser: game.looser,
          gameDto: { id: 111 },
        } as any;
      });
      await gateway.surrender(player2.client.socket, { gameId: game.id });
      expect(game.winner.gameEndEvent).toBeCalledWith(
        true,
        { id: 111 },
        'surrender',
      );
      expect(game.looser.gameEndEvent).toBeCalledWith(
        false,
        { id: 111 },
        'surrender',
      );
    });
    it('set draw propose', () => {
      const stubDraw: any = {};
      jest.spyOn(service, 'proposeDraw').mockImplementationOnce(() => {
        return stubDraw;
      });
      gateway.drawPropose(player.client.socket, { gameId: game.id });
      expect(gateway.server.to(room(game.id)).emit).toBeCalledWith(
        Game.drawPropose,
        stubDraw,
      );
    });
    it('accept draw', async () => {
      const stubDraw: any = {};
      jest.spyOn(service, 'acceptDraw').mockImplementationOnce(() => {
        return stubDraw;
      });
      await gateway.acceptPropose(player.client.socket, { gameId: game.id });
      expect(gateway.server.to(room(game.id)).emit).toBeCalledWith(Game.end, {
        reason: 'draw',
        game: {},
      });
    });
    it('player leave', async () => {
      game.winner = player;
      game.looser = player2;
      jest.spyOn(service, 'leaveGame').mockImplementationOnce(async () => {
        return {
          winner: game.winner,
          looser: game.looser,
          gameDto: { id: 111 },
        } as any;
      });
      await gateway.leaveGame(player2.client.socket);
      expect(game.winner.gameEndEvent).toBeCalledWith(
        true,
        { id: 111 },
        'playerLeave',
      );
      expect(game.looser.gameEndEvent).toBeCalledWith(
        false,
        { id: 111 },
        'playerLeave',
      );
    });
    it('reject draw', () => {
      const stubDraw: any = {};
      jest.spyOn(service, 'rejectDraw').mockImplementationOnce(() => {
        return stubDraw;
      });
      gateway.rejectPropose({ gameId: game.id });
      expect(gateway.server.to(room(game.id)).emit).toBeCalledWith(
        Game.rejectDraw,
        stubDraw,
      );
    });
    it('add time to another player', () => {
      const result = {};
      jest
        .spyOn(service, 'addTimeToAnotherPlayer')
        .mockImplementationOnce(() => {
          return result;
        });
      gateway.addTime(player.client.socket, { gameId: game.id });
      expect(gateway.server.to(room(game.id)).emit).toBeCalledWith(
        Game.addTime,
        result,
      );
    });
  });
});
