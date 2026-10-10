import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GameGateway } from '../../src/gateway/game.gateway';
import { GameClient } from '../../src/gateway/game.client';
import { ConnectionPatchProvider } from '../../src/gateway/connection.provider';
import { ClientStore } from '../../src/gateway/ClientStore';
import { GatewayMetrics } from '../../src/gateway/gateway.metrics';
import { SocketNotifier, userRoom } from '../../src/gateway/socket.notifier';
import { IsBalanceEnough } from '../../src/gateway/guards';
import { Game, GameEnd, Lobby, User, room } from '../../src/game/EmitTypes';
import { Client } from '../../src/game/entities';
import {
  generateClient,
  generateConfig,
  generateSocket,
} from '../game/generators';
import { fakeNotifier } from '../game/fakes';

describe('GameGateway (unit)', () => {
  let gateway: GameGateway;
  let games: Record<string, jest.Mock>;
  let notifier: ReturnType<typeof fakeNotifier>;
  let metrics: { connectionOpened: jest.Mock; connectionClosed: jest.Mock };
  let connService: { processClient: jest.Mock };
  let fetchSockets: jest.Mock;
  let client: Client;
  let socket: any;

  beforeEach(async () => {
    games = {
      lobby: jest.fn().mockResolvedValue([]),
      pendingGame: jest.fn().mockResolvedValue(null),
      cancelLobbyGame: jest.fn().mockResolvedValue(null),
      currentOpponent: jest.fn().mockResolvedValue(null),
      createGame: jest.fn(),
      joinGame: jest.fn(),
      leave: jest.fn(),
      move: jest.fn(),
      chat: jest.fn(),
      surrender: jest.fn(),
      proposeDraw: jest.fn(),
      acceptDraw: jest.fn(),
      rejectDraw: jest.fn(),
      addTime: jest.fn(),
    };
    notifier = fakeNotifier();
    metrics = { connectionOpened: jest.fn(), connectionClosed: jest.fn() };
    connService = { processClient: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        GameGateway,
        ClientStore,
        { provide: GameClient, useValue: games },
        { provide: SocketNotifier, useValue: notifier },
        { provide: GatewayMetrics, useValue: metrics },
        { provide: ConnectionPatchProvider, useValue: connService },
      ],
    })
      .overrideGuard(IsBalanceEnough)
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
      games.lobby.mockResolvedValue([{ id: 3 }]);

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
      games.pendingGame.mockResolvedValue({ id: 9, initData: {} });

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
      games.currentOpponent.mockResolvedValue({ userId: 2 });
      await gateway.handleDisconnect(socket);
      expect(games.cancelLobbyGame).toHaveBeenCalledWith(client);
      expect(notifier.opponentDisconnected).toHaveBeenCalledWith(2);
      expect(notifier.lobbyUpdate).toHaveBeenCalledWith([]);
      expect(metrics.connectionClosed).toHaveBeenCalled();
    });
    it('should keep games when the user has another tab open', async () => {
      fetchSockets.mockResolvedValue([{ id: 'other' }]);
      await gateway.handleDisconnect(socket);
      expect(games.cancelLobbyGame).not.toHaveBeenCalled();
    });
    it('should not touch games while the pod shuts down', async () => {
      gateway.beforeApplicationShutdown();
      await gateway.handleDisconnect(socket);
      expect(fetchSockets).not.toHaveBeenCalled();
      expect(games.cancelLobbyGame).not.toHaveBeenCalled();
    });
  });

  describe('message handlers', () => {
    it('create game', async () => {
      const config = generateConfig('w', 0);
      games.createGame.mockResolvedValue({ id: 5, matchId: 'm' });
      await gateway.createGame(socket, config);
      expect(games.createGame).toHaveBeenCalledWith(client, config);
      expect(notifier.joinGame).toHaveBeenCalledWith(1, 5);
      expect(socket.emit).toHaveBeenCalledWith(Game.created, { gameId: 5 });
      expect(notifier.lobbyUpdate).toHaveBeenCalled();
    });
    it('rejoin', async () => {
      games.pendingGame.mockResolvedValue({ id: 5, initData: { side: 'w' } });
      await gateway.rejoinGame(socket);
      expect(socket.join).toHaveBeenCalledWith(room(5));
      expect(socket.emit).toHaveBeenCalledWith(Game.init, { side: 'w' });
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.playerReconected, {
        opponent: { id: 1, name: client.name },
      });
    });
    it('rejoin without a pending game should throw NotFound', async () => {
      await expect(gateway.rejoinGame(socket)).rejects.toThrow(
        NotFoundException,
      );
    });
    it('join', async () => {
      games.joinGame.mockResolvedValue({
        id: 5,
        players: [
          { userId: 1, initData: { side: 'w' } },
          { userId: 2, initData: { side: 'b' } },
        ],
      });
      await gateway.joinGame(socket, { gameId: 5 });
      expect(notifier.joinGame).toHaveBeenCalledWith(1, 5);
      expect(notifier.joinGame).toHaveBeenCalledWith(2, 5);
      expect(notifier.initData).toHaveBeenCalledWith(2, { side: 'b' });
      expect(notifier.gameStart).toHaveBeenCalledWith([1, 2]);
      expect(notifier.lobbyUpdate).toHaveBeenCalled();
    });
    it('move', async () => {
      const result = { shah: null, mate: null, strike: null };
      games.move.mockResolvedValue({ result, prevCell: 'd2', side: 'w' });
      const turn = { gameId: 5, figure: 'pawn4', cell: 'd4' };
      await gateway.move(socket, turn);
      expect(games.move).toHaveBeenCalledWith(client, turn);
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.boardUpdate, {
        effect: result,
        update: { figure: 'pawn4', cell: 'd4', prevCell: 'd2', side: 'w' },
      });
    });
    it('move rejected by the game service should not notify', async () => {
      games.move.mockRejectedValue(new Error('Not your turn'));
      await expect(
        gateway.move(socket, { gameId: 5, figure: 'pawn4', cell: 'd4' }),
      ).rejects.toThrow('Not your turn');
      expect(notifier.toGame).not.toHaveBeenCalled();
    });
    it('send message in game chat', async () => {
      games.chat.mockResolvedValue({ text: 'hi' });
      await gateway.chatMessage(socket, { gameId: 5, text: 'hi' });
      expect(games.chat).toHaveBeenCalledWith(client, 5, 'hi');
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.message, {
        text: 'hi',
      });
    });
    it('surrender', async () => {
      games.surrender.mockResolvedValue({
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
      games.leave.mockResolvedValue({
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
      games.proposeDraw.mockResolvedValue({ w: true, b: false });
      await gateway.drawPropose(socket, { gameId: 5 });
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.drawPropose, {
        w: true,
        b: false,
      });
    });
    it('accept draw', async () => {
      games.acceptDraw.mockResolvedValue({ id: 5 });
      await gateway.acceptPropose(socket, { gameId: 5 });
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.end, {
        reason: GameEnd.draw,
        game: { id: 5 },
      });
    });
    it('reject draw', async () => {
      games.rejectDraw.mockResolvedValue({ w: false, b: false });
      await gateway.rejectPropose(socket, { gameId: 5 });
      expect(games.rejectDraw).toHaveBeenCalledWith(client, 5);
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.rejectDraw, {
        w: false,
        b: false,
      });
    });
    it('add time to another player', async () => {
      games.addTime.mockResolvedValue({ w: 1, b: 2 });
      await gateway.addTime(socket, { gameId: 5 });
      expect(notifier.toGame).toHaveBeenCalledWith(5, Game.addTime, {
        w: 1,
        b: 2,
      });
    });
  });
});
