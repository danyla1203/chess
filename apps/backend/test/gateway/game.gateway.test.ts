import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GameGateway } from '../../src/gateway/game.gateway';
import { GameClient } from '../../src/gateway/game.client';
import { ConnectionPatchProvider } from '../../src/gateway/connection.provider';
import { ClientStore } from '../../src/gateway/ClientStore';
import { GatewayMetrics } from '../../src/gateway/gateway.metrics';
import { SocketNotifier, userRoom } from '../../src/gateway/socket.notifier';
import { IsBalanceEnough } from '../../src/gateway/guards';
import { GameReadModel } from '../../src/game-read';
import { Game, Lobby, User } from '@chess/contract';
import { room } from '../../src/infrastructure/socket/rooms';
import { Client } from '../../src/domain/game/entities';
import {
  generateClient,
  generateConfig,
  generateSocket,
} from '../game/generators';
import { fakeNotifier } from '../game/fakes';

describe('GameGateway (unit)', () => {
  let gateway: GameGateway;
  let games: Record<string, jest.Mock>;
  let views: { lobby: jest.Mock; userGame: jest.Mock };
  let notifier: ReturnType<typeof fakeNotifier>;
  let metrics: { connectionOpened: jest.Mock; connectionClosed: jest.Mock };
  let connService: { processClient: jest.Mock };
  let fetchSockets: jest.Mock;
  let client: Client;
  let socket: any;

  beforeEach(async () => {
    games = {
      pendingGame: jest.fn().mockResolvedValue(null),
      cancelLobbyGame: jest.fn().mockResolvedValue(null),
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
    views = {
      lobby: jest.fn().mockResolvedValue([]),
      userGame: jest.fn().mockResolvedValue(null),
    };
    notifier = fakeNotifier();
    metrics = { connectionOpened: jest.fn(), connectionClosed: jest.fn() };
    connService = { processClient: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        GameGateway,
        ClientStore,
        { provide: GameClient, useValue: games },
        { provide: GameReadModel, useValue: views },
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
    it('should register the client, join the user room and send the lobby from the read model', async () => {
      const fresh = generateSocket();
      connService.processClient.mockResolvedValue(client);
      views.lobby.mockResolvedValue([{ id: 3 }]);

      await gateway.handleConnection(fresh);

      expect(fresh.data.client).toBe(client);
      expect(fresh.join).toHaveBeenCalledWith(userRoom(1));
      expect(fresh.emit).toHaveBeenCalledWith(Lobby.update, [{ id: 3 }]);
      expect(metrics.connectionOpened).toHaveBeenCalled();
      expect(games.pendingGame).not.toHaveBeenCalled();
    });
    it('should send an anonymous token and the active game without a command', async () => {
      const anon = generateClient(false, 77);
      anon.anonymousTempToken = 'temp';
      const fresh = generateSocket();
      connService.processClient.mockResolvedValue(anon);
      views.userGame.mockResolvedValue({
        gameId: 9,
        status: 'active',
        opponentId: 2,
      });

      await gateway.handleConnection(fresh);

      expect(views.userGame).toHaveBeenCalledWith(77);
      expect(fresh.emit).toHaveBeenNthCalledWith(1, User.anonymousToken, {
        tempToken: 'temp',
        userId: 77,
      });
      expect(fresh.join).toHaveBeenCalledWith(room(9));
      expect(fresh.emit).toHaveBeenNthCalledWith(2, Game.pendingGame, {
        gameId: 9,
      });
    });
    it('should not report a lobby game as pending', async () => {
      const fresh = generateSocket();
      connService.processClient.mockResolvedValue(client);
      views.userGame.mockResolvedValue({
        gameId: 9,
        status: 'lobby',
        opponentId: null,
      });

      await gateway.handleConnection(fresh);

      expect(fresh.join).not.toHaveBeenCalledWith(room(9));
    });
  });

  describe('handleDisconnect', () => {
    it('should cancel the lobby game when the last socket leaves', async () => {
      views.userGame.mockResolvedValue({
        gameId: 4,
        status: 'lobby',
        opponentId: null,
      });
      await gateway.handleDisconnect(socket);
      expect(games.cancelLobbyGame).toHaveBeenCalledWith(client);
      expect(notifier.opponentDisconnected).not.toHaveBeenCalled();
      expect(metrics.connectionClosed).toHaveBeenCalled();
    });
    it('should warn the opponent of an active game without sending a command', async () => {
      views.userGame.mockResolvedValue({
        gameId: 4,
        status: 'active',
        opponentId: 2,
      });
      await gateway.handleDisconnect(socket);
      expect(games.cancelLobbyGame).not.toHaveBeenCalled();
      expect(notifier.opponentDisconnected).toHaveBeenCalledWith(2, {
        opponent: { id: client.userId, name: client.name },
      });
    });
    it('should send nothing when the user has no game', async () => {
      await gateway.handleDisconnect(socket);
      expect(games.cancelLobbyGame).not.toHaveBeenCalled();
      expect(notifier.opponentDisconnected).not.toHaveBeenCalled();
    });
    it('should keep games when the user has another tab open', async () => {
      fetchSockets.mockResolvedValue([{ id: 'other' }]);
      await gateway.handleDisconnect(socket);
      expect(views.userGame).not.toHaveBeenCalled();
    });
    it('should not touch games while the pod shuts down', async () => {
      gateway.beforeApplicationShutdown();
      await gateway.handleDisconnect(socket);
      expect(fetchSockets).not.toHaveBeenCalled();
      expect(games.cancelLobbyGame).not.toHaveBeenCalled();
    });
  });

  describe('message handlers', () => {
    it('create game sends the command and leaves emits to game-svc', async () => {
      const config = generateConfig('w', 0);
      games.createGame.mockResolvedValue({ id: 5, matchId: 'm' });
      await gateway.createGame(socket, config);
      expect(games.createGame).toHaveBeenCalledWith(client, config);
      expect(socket.emit).not.toHaveBeenCalled();
    });
    it('rejoin', async () => {
      games.pendingGame.mockResolvedValue({ id: 5, initData: { side: 'w' } });
      await gateway.rejoinGame(socket);
      expect(socket.join).toHaveBeenCalledWith(room(5));
      expect(socket.emit).toHaveBeenCalledWith(Game.init, { side: 'w' });
      expect(notifier.opponentReconnected).toHaveBeenCalledWith(5, {
        opponent: { id: 1, name: client.name },
      });
    });
    it('rejoin without a pending game should throw NotFound', async () => {
      await expect(gateway.rejoinGame(socket)).rejects.toThrow(
        NotFoundException,
      );
    });
    it.each([
      ['join', () => gateway.joinGame(socket, { gameId: 5 }), 'joinGame', [5]],
      [
        'move',
        () => gateway.move(socket, { gameId: 5, figure: 'pawn4', cell: 'd4' }),
        'move',
        [{ gameId: 5, figure: 'pawn4', cell: 'd4' }],
      ],
      [
        'chat',
        () => gateway.chatMessage(socket, { gameId: 5, text: 'hi' }),
        'chat',
        [5, 'hi'],
      ],
      [
        'surrender',
        () => gateway.surrender(socket, { gameId: 5 }),
        'surrender',
        [5],
      ],
      ['leave', () => gateway.leaveGame(socket), 'leave', []],
      [
        'draw propose',
        () => gateway.drawPropose(socket, { gameId: 5 }),
        'proposeDraw',
        [5],
      ],
      [
        'draw accept',
        () => gateway.acceptPropose(socket, { gameId: 5 }),
        'acceptDraw',
        [5],
      ],
      [
        'draw reject',
        () => gateway.rejectPropose(socket, { gameId: 5 }),
        'rejectDraw',
        [5],
      ],
      [
        'add time',
        () => gateway.addTime(socket, { gameId: 5 }),
        'addTime',
        [5],
      ],
    ])(
      '%s sends one command and emits nothing itself',
      async (_name, run, command, args) => {
        games[command].mockResolvedValue(null);
        await run();
        expect(games[command]).toHaveBeenCalledWith(client, ...args);
        expect(notifier.toGame).not.toHaveBeenCalled();
        expect(socket.emit).not.toHaveBeenCalled();
      },
    );
    it('a command rejected by the game service propagates to the filter', async () => {
      games.move.mockRejectedValue(new Error('Not your turn'));
      await expect(
        gateway.move(socket, { gameId: 5, figure: 'pawn4', cell: 'd4' }),
      ).rejects.toThrow('Not your turn');
    });
  });
});
