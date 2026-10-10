import { Test } from '@nestjs/testing';
import { GameGateway } from '../../src/game/game.gateway';
import { GameService } from '../../src/game/game.service';
import { ConnectionPatchProvider } from '../../src/game/connection.provider';
import { ClientStore } from '../../src/game/ClientStore';
import { GameMetrics } from '../../src/game/game.metrics';
import { GameNotifier, userRoom } from '../../src/game/game.notifier';
import { IsBalanceEnough, IsPlayer } from '../../src/game/guards';
import { Game, GameEnd, Lobby, User, room } from '../../src/game/EmitTypes';
import { Client } from '../../src/game/entities';
import {
  generateClient,
  generateConfig,
  generateSocket,
  startedGame,
} from './generators';
import { fakeMetrics, fakeNotifier } from './fakes';

describe('GameGateway (unit)', () => {
  let gateway: GameGateway;
  let service: Record<string, jest.Mock>;
  let notifier: ReturnType<typeof fakeNotifier>;
  let metrics: ReturnType<typeof fakeMetrics>;
  let connService: { processClient: jest.Mock };
  let fetchSockets: jest.Mock;
  let client: Client;
  let socket: any;

  beforeEach(async () => {
    service = {
      getLobby: jest.fn().mockResolvedValue([]),
      findPendingGame: jest.fn().mockRejectedValue(new Error('none')),
      removeInitedGamesBy: jest.fn().mockResolvedValue(undefined),
      findCurrentOpponent: jest.fn().mockResolvedValue(null),
      createGame: jest.fn(),
      connectToGame: jest.fn(),
      leaveGame: jest.fn(),
      makeTurn: jest.fn(),
      pushMessage: jest.fn(),
      surrender: jest.fn(),
      proposeDraw: jest.fn(),
      acceptDraw: jest.fn(),
      rejectDraw: jest.fn(),
      addTimeToAnotherPlayer: jest.fn(),
      getInitedGameData: jest.fn((userId: number) => ({ userId })),
    };
    notifier = fakeNotifier();
    metrics = fakeMetrics();
    connService = { processClient: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        GameGateway,
        ClientStore,
        { provide: GameService, useValue: service },
        { provide: GameNotifier, useValue: notifier },
        { provide: GameMetrics, useValue: metrics },
        { provide: ConnectionPatchProvider, useValue: connService },
      ],
    })
      .overrideGuard(IsBalanceEnough)
      .useValue({ canActivate: () => true })
      .overrideGuard(IsPlayer)
      .useValue({ canActivate: () => true })
      .compile();
    gateway = moduleRef.get(GameGateway);
    fetchSockets = jest.fn().mockResolvedValue([]);
    gateway.server = { in: jest.fn(() => ({ fetchSockets })) } as any;

    client = generateClient(true, 1);
    socket = generateSocket(client);
  });

  it('afterInit should bind the notifier to the namespace', () => {
    const server = {} as any;
    gateway.afterInit(server);
    expect(notifier.bind).toHaveBeenCalledWith(server);
  });

  describe('handleConnection', () => {
    it('should register the client, join the user room and send the lobby', async () => {
      const fresh = generateSocket();
      connService.processClient.mockResolvedValue(client);
      service.getLobby.mockResolvedValue([{ id: 3 }]);

      await gateway.handleConnection(fresh);

      expect(fresh.data.client).toBe(client);
      expect(fresh.join).toHaveBeenCalledWith(userRoom(1));
      expect(fresh.emit).toHaveBeenCalledWith(Lobby.update, [{ id: 3 }]);
      expect(metrics.connectionOpened).toHaveBeenCalled();
    });
    it('should send an anonymous token and the pending game', async () => {
      const anon = generateClient(false, 77);
      anon.anonymousTempToken = 'temp';
      const fresh = generateSocket();
      connService.processClient.mockResolvedValue(anon);
      service.findPendingGame.mockResolvedValue({ id: 9 });

      await gateway.handleConnection(fresh);

      expect(fresh.emit).toHaveBeenNthCalledWith(1, User.anonymousToken, {
        tempToken: 'temp',
        userId: 77,
      });
      expect(fresh.join).toHaveBeenCalledWith(room(9));
      expect(fresh.emit).toHaveBeenNthCalledWith(2, Game.pendingGame, {
        gameId: 9,
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should cancel lobby games and warn the opponent when the last socket leaves', async () => {
      service.findCurrentOpponent.mockResolvedValue({ userId: 2 });
      await gateway.handleDisconnect(socket);
      expect(service.removeInitedGamesBy).toHaveBeenCalledWith(client);
      expect(notifier.opponentDisconnected).toHaveBeenCalledWith(2);
      expect(notifier.lobbyUpdate).toHaveBeenCalledWith([]);
      expect(metrics.connectionClosed).toHaveBeenCalled();
    });
    it('should keep games when the user has another tab open', async () => {
      fetchSockets.mockResolvedValue([{ id: 'other' }]);
      await gateway.handleDisconnect(socket);
      expect(service.removeInitedGamesBy).not.toHaveBeenCalled();
    });
    it('should not touch games while the pod shuts down', async () => {
      gateway.beforeApplicationShutdown();
      await gateway.handleDisconnect(socket);
      expect(fetchSockets).not.toHaveBeenCalled();
      expect(service.removeInitedGamesBy).not.toHaveBeenCalled();
    });
  });

  describe('message handlers', () => {
    it('create game', async () => {
      const config = generateConfig('w', 0);
      service.createGame.mockResolvedValue({ id: 5, matchId: 'm' });
      await gateway.createGame(socket, config);
      expect(service.createGame).toHaveBeenCalledWith(client, config);
      expect(notifier.joinGame).toHaveBeenCalledWith(1, 5);
      expect(socket.emit).toHaveBeenCalledWith(Game.created, { gameId: 5 });
      expect(notifier.lobbyUpdate).toHaveBeenCalled();
    });
    it('rejoin', async () => {
      service.findPendingGame.mockResolvedValue({ id: 5 });
      await gateway.rejoinGame(socket);
      expect(socket.join).toHaveBeenCalledWith(room(5));
      expect(socket.emit).toHaveBeenCalledWith(Game.init, { userId: 1 });
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.playerReconected, {
        opponent: { id: 1, name: client.name },
      });
    });
    it('join', async () => {
      const game = startedGame();
      service.connectToGame.mockResolvedValue(game);
      await gateway.joinGame(socket, { gameId: game.id });
      const ids = game.players.map((pl) => pl.userId);
      for (const id of ids) {
        expect(notifier.joinGame).toHaveBeenCalledWith(id, game.id);
        expect(notifier.initData).toHaveBeenCalledWith(id, { userId: id });
      }
      expect(notifier.gameStart).toHaveBeenCalledWith(ids);
      expect(notifier.lobbyUpdate).toHaveBeenCalled();
    });
    it('move', async () => {
      const result = { shah: null, mate: null, strike: null };
      service.makeTurn.mockResolvedValue({ result, prevCell: 'd2', side: 'w' });
      const turn = { gameId: 5, figure: 'pawn4', cell: 'd4' };
      await gateway.move(socket, turn);
      expect(metrics.trackMove).toHaveBeenCalled();
      expect(service.makeTurn).toHaveBeenCalledWith(5, 1, turn);
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.boardUpdate, {
        effect: result,
        update: { figure: 'pawn4', cell: 'd4', prevCell: 'd2', side: 'w' },
      });
    });
    it('send message in game chat', async () => {
      service.pushMessage.mockResolvedValue({ text: 'hi' });
      await gateway.chatMessage(socket, { gameId: 5, text: 'hi' });
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.message, {
        text: 'hi',
      });
    });
    it('surrender', async () => {
      service.surrender.mockResolvedValue({
        winner: { userId: 2 },
        looser: { userId: 1 },
        gameDto: { id: 5 },
      });
      await gateway.surrender(socket, { gameId: 5 });
      expect(notifier.gameEnd).toHaveBeenCalledWith(
        2,
        true,
        { id: 5 },
        GameEnd.surrender,
      );
      expect(notifier.gameEnd).toHaveBeenCalledWith(
        1,
        false,
        { id: 5 },
        GameEnd.surrender,
      );
    });
    it('player leave', async () => {
      service.leaveGame.mockResolvedValue({
        winner: { userId: 2 },
        looser: { userId: 1 },
        gameDto: { id: 5 },
      });
      await gateway.leaveGame(socket);
      expect(notifier.gameEnd).toHaveBeenCalledWith(
        1,
        false,
        { id: 5 },
        GameEnd.playerLeave,
      );
    });
    it('set draw propose', async () => {
      service.proposeDraw.mockResolvedValue({ w: true, b: false });
      await gateway.drawPropose(socket, { gameId: 5 });
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.drawPropose, {
        w: true,
        b: false,
      });
    });
    it('accept draw', async () => {
      service.acceptDraw.mockResolvedValue({ id: 5 });
      await gateway.acceptPropose(socket, { gameId: 5 });
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.end, {
        reason: GameEnd.draw,
        game: { id: 5 },
      });
    });
    it('reject draw', async () => {
      service.rejectDraw.mockResolvedValue({ w: false, b: false });
      await gateway.rejectPropose({ gameId: 5 });
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.rejectDraw, {
        w: false,
        b: false,
      });
    });
    it('add time to another player', async () => {
      service.addTimeToAnotherPlayer.mockResolvedValue({ w: 1, b: 2 });
      await gateway.addTime(socket, { gameId: 5 });
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.addTime, {
        w: 1,
        b: 2,
      });
    });
  });
});
