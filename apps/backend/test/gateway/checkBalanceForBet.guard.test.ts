import { Test, TestingModule } from '@nestjs/testing';

import { IsBalanceEnough } from '../../src/gateway/guards';
import { ClientStore } from '../../src/gateway/ClientStore';
import { BalanceModel } from '../../src/gateway/balance.model';

describe('IsBalanceEnough', () => {
  let guard: IsBalanceEnough;
  let gameModel: BalanceModel;
  let mockClient: any;
  let mockExecutionContext: any;

  beforeEach(async () => {
    mockClient = {
      userId: 1,
      authorized: true,
      socket: { id: 'socket1' },
    };
    mockExecutionContext = {
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockClient.socket),
        getData: jest.fn().mockReturnValue({ bet: 100 }),
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsBalanceEnough,
        {
          provide: ClientStore,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockClient),
          },
        },
        {
          provide: BalanceModel,
          useValue: {
            getUserBalance: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<IsBalanceEnough>(IsBalanceEnough);
    gameModel = module.get<BalanceModel>(BalanceModel);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when the bet is zero', async () => {
    mockExecutionContext.switchToWs().getData['mockReturnValue']({ bet: 0 });
    const result = await guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
  });

  it('should deny access if the client is not authorized', async () => {
    mockClient.authorized = false;
    const result = await guard.canActivate(mockExecutionContext);
    expect(result).toBe(false);
  });

  it('should deny access if the client has insufficient balance', async () => {
    gameModel.getUserBalance = jest.fn().mockResolvedValue(50);
    const result = await guard.canActivate(mockExecutionContext);
    expect(gameModel.getUserBalance).toHaveBeenCalledWith(mockClient.userId);
    expect(result).toBe(false);
  });

  it('should allow access if the client has sufficient balance', async () => {
    gameModel.getUserBalance = jest.fn().mockResolvedValue(200);
    const result = await guard.canActivate(mockExecutionContext);
    expect(gameModel.getUserBalance).toHaveBeenCalledWith(mockClient.userId);
    expect(result).toBe(true);
  });
});
