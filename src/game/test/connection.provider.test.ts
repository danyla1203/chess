import { Test } from '@nestjs/testing';
import { AuthService, TokenService } from '../../auth';
import { LoggerService } from '../../tools/logger';
import { ConnectionPatchProvider } from '../connection.provider';

jest.mock('../../auth');

describe('Connection provider (unit)', () => {
  let tokenService: TokenService;
  let provider: ConnectionPatchProvider;
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        TokenService,
        LoggerService,
        ConnectionPatchProvider,
      ],
    }).compile();
    tokenService = moduleRef.get(TokenService);
    provider = moduleRef.get(ConnectionPatchProvider);
  });
  describe('process client connection', () => {
    let socket: any;
    beforeEach(() => {
      socket = {
        handshake: {
          query: {},
        },
        emit: jest.fn(),
      };
    });
    it('process without token', async () => {
      jest.spyOn(tokenService, 'parseToken').mockImplementationOnce(() => {
        throw new Error();
      });
      jest
        .spyOn(provider as any, 'createAnonymousToken')
        .mockImplementationOnce(() => {
          return null;
        });
      const res = await provider.processClient(socket);
      expect(res).toBeDefined();
      expect(provider['createAnonymousToken']).toBeCalled();
    });
    it('process with correct token', async () => {
      const tokenPayload = {
        id: 5,
        deviceId: 'string',
      };
      jest.spyOn(tokenService, 'parseToken').mockImplementationOnce(() => {
        return tokenPayload;
      });
      jest.spyOn(provider as any, 'withToken').mockImplementationOnce(() => {
        return null;
      });
      const res = await provider.processClient(socket);
      expect(res).toBeDefined();
      expect(provider['withToken']).toBeCalled();
    });
    it('createAnonymousToken', () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(1);
      jest
        .spyOn(tokenService, 'anonymousToken')
        .mockReturnValueOnce({ token: 'tkn', exp: '1' });
      provider['createAnonymousToken'](socket);
      expect(socket.userId).toEqual(100000);
      expect(socket.name).toEqual('Anonymous');
      expect(socket.anonymousTempToken).toEqual('tkn');
    });
  });
});
