import { Test } from '@nestjs/testing';
import { AuthService, TokenService } from '../../auth';
import { LoggerService } from '../../tools/logger';
import { ConnectionPatchProvider } from '../connection.provider';
import { PublicUserFields } from '../../user/entities';

jest.mock('../../auth');

describe('Connection provider (unit)', () => {
  let tokenService: TokenService;
  let authService: AuthService;
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
    authService = moduleRef.get(AuthService);
    tokenService = moduleRef.get(TokenService);
    provider = moduleRef.get(ConnectionPatchProvider);
  });
  describe('process client connection', () => {
    let client: any;
    beforeEach(() => {
      client = {
        handshake: {
          query: {},
        },
        emit: jest.fn(),
      };
    });
    it('conn without token', async () => {
      jest.spyOn(authService, 'validateCreds').mockImplementationOnce(() => {
        throw new Error();
      });
      jest.spyOn(provider as any, 'withoutToken').mockImplementation();
      const res = await provider.processClient(client);
      expect(res).toBeDefined();
      expect(provider['withoutToken']).toBeCalledWith(client);
    });
    it('connection with correct token', async () => {
      jest
        .spyOn(authService, 'validateCreds')
        .mockImplementationOnce(async () => {
          return {
            name: 'Name',
            id: 5,
            balance: 0,
            email: 'email@gmail.com',
          };
        });
      const tokenPayload = {
        id: 5,
        deviceId: 'string',
      };
      jest.spyOn(tokenService, 'parseToken').mockImplementationOnce(() => {
        return tokenPayload;
      });
      jest.spyOn(provider as any, 'withToken').mockImplementation(() => {
        client.authorized = true;
      });
      const res = await provider.processClient(client);
      expect(res.authorized).toBeTruthy();
      expect(res).toBeDefined();
      expect(provider['withToken']).toBeCalledWith(tokenPayload, client);
    });
    it('anonymous method', () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(1);
      jest
        .spyOn(tokenService, 'anonymousToken')
        .mockReturnValueOnce({ token: 'tkn', exp: '1' });
      provider['withoutToken'](client);
      expect(client.userId).toEqual(100000);
      expect(client.name).toEqual('Anonymous');
      expect(client.token).toEqual('tkn');
    });
    it('anonymousSession', () => {
      const payload = {
        name: 'Anonymous',
        userId: -1,
      };
      provider['anonymousPatch'](payload, client);
      expect(client.name).toEqual(payload.name);
      expect(client.userId).toEqual(payload.userId);
    });
    it('authorized', async () => {
      const payload = {
        id: -1,
        name: 'Danek',
      } as PublicUserFields;
      await provider['authorizedPatch'](payload, client);
      expect(client.name).toEqual('Danek');
      expect(client.authorized).toBeTruthy();
      expect(client.userId).toEqual(-1);
    });
  });
});
