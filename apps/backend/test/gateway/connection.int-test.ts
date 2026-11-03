import { Test } from '@nestjs/testing';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { GameGateway } from '../../src/gateway/game.gateway';
import { AuthService, TokenService } from '../../src/auth';
import { GameReadModel } from '../../src/game-read';
import { ClientStore } from '../../src/gateway/ClientStore';
import { AppModule } from '../../src/app.module';
import { LoggerService } from '../../src/infrastructure/logger';
import { EventStream } from '../../src/infrastructure/messaging';
import { Game, Lobby, User } from '@chess/contract';

jest.mock('axios', () => null);

describe('Socket connection (integration)', () => {
  let gateway: GameGateway;
  let authService: AuthService;
  let tokenService: TokenService;
  let views: GameReadModel;
  let store: ClientStore;
  let socket: any;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CACHE_MANAGER)
      .useValue({
        provide: CACHE_MANAGER,
        useValue: {
          get: () => null,
          set: () => jest.fn(),
        },
      })
      .overrideProvider(LoggerService)
      .useValue({
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      })
      .overrideProvider(EventStream)
      .useValue({ subscribe: jest.fn() })
      .compile();
    gateway = moduleRef.get(GameGateway);
    authService = moduleRef.get(AuthService);
    tokenService = moduleRef.get(TokenService);
    views = moduleRef.get(GameReadModel);
    store = moduleRef.get(ClientStore);
    socket = {
      emit: jest.fn(),
      join: jest.fn().mockResolvedValue(undefined),
      data: {},
    };
    gateway.server = {
      emit: jest.fn(),
    } as any;
  });

  describe('anonymous flow', () => {
    beforeEach(() => {
      jest.spyOn(views, 'lobby').mockResolvedValueOnce([]);
      socket.id = 'test';
      socket.handshake = {
        query: '',
      };
    });
    it('anonymous connection without temp token', async () => {
      jest.spyOn(views, 'userGame').mockResolvedValueOnce(null);
      await gateway.handleConnection(socket);
      const cl = store.getClient(socket);
      expect(cl.name).toEqual('Anonymous');
      expect(cl).toHaveProperty('anonymousTempToken');
      expect(cl).toHaveProperty('userId');
      expect(cl.authorized).toBeFalsy();
    });
    it('anonymous connection without temp token - return pending game', async () => {
      jest.spyOn(views, 'userGame').mockResolvedValueOnce({
        gameId: 12345,
        status: 'active',
        opponentId: 1,
      });
      await gateway.handleConnection(socket);
      const cl = store.getClient(socket);
      expect(cl.name).toEqual('Anonymous');
      expect(cl).toHaveProperty('anonymousTempToken');
      expect(cl).toHaveProperty('userId');
      expect(cl.authorized).toBeFalsy();
      expect(socket.emit).toHaveBeenNthCalledWith(1, User.anonymousToken, {
        tempToken: cl.anonymousTempToken,
        userId: cl.userId,
      });
      expect(socket.emit).toHaveBeenNthCalledWith(2, Game.pendingGame, {
        gameId: 12345,
      });
      expect(socket.emit).toHaveBeenNthCalledWith(3, Lobby.update, []);
    });
    it('anonymous connection with temp token', async () => {
      jest.spyOn(views, 'userGame').mockResolvedValueOnce(null);
      socket.id = 'test';
      socket.handshake = {
        query: {
          Authorization: 'Bearer tempToken',
        },
      };
      await gateway.handleConnection(socket);
      const cl = store.getClient(socket);
      expect(cl.name).toEqual('Anonymous');
      expect(cl).toHaveProperty('userId');
      expect(cl.authorized).toBeFalsy();
    });
  });
  describe('authorized flow', () => {
    beforeEach(() => {
      socket.id = 'test';
      socket.handshake = {
        query: {
          Authorization: 'Bearer accessToken',
        },
      };
      jest.spyOn(tokenService, 'parseToken').mockImplementationOnce(() => {
        return {
          id: 12345,
          deviceId: 'devId',
        };
      });
      jest
        .spyOn(authService, 'checkoutUserSession')
        .mockImplementationOnce(async () => {
          return {
            name: 'Danek',
            id: 12345,
            deviceId: 'string',
          };
        });
      jest.spyOn(views, 'lobby').mockResolvedValueOnce([]);
    });
    it('authorized conn', async () => {
      jest.spyOn(views, 'userGame').mockResolvedValueOnce(null);
      await gateway.handleConnection(socket);
      const cl = store.getClient(socket);
      expect(cl.name).toEqual('Danek');
      expect(cl.userId).toEqual(12345);
      expect(cl.authorized).toBeTruthy();
    });
    it('authorized conn with pending game', async () => {
      jest.spyOn(views, 'userGame').mockResolvedValueOnce({
        gameId: 12345,
        status: 'active',
        opponentId: 1,
      });
      await gateway.handleConnection(socket);
      const cl = store.getClient(socket);
      expect(cl.name).toEqual('Danek');
      expect(cl.userId).toEqual(12345);
      expect(cl.authorized).toBeTruthy();
    });
  });
});
