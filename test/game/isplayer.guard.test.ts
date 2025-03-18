import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { IsPlayer } from '../../src/game/guards';
import { GameService } from '../../src/game/game.service';
import { Game } from '../../src/game/entities/game';

describe('IsPlayer (unit)', () => {
  let guard: IsPlayer;
  let gameService: GameService;

  beforeEach(async () => {
    const gameServiceMock = {
      findGameById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IsPlayer,
        {
          provide: GameService,
          useValue: gameServiceMock,
        },
      ],
    }).compile();

    guard = module.get<IsPlayer>(IsPlayer);
    gameService = module.get<GameService>(GameService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when the player is in the game', () => {
    const wsContextMock: ExecutionContext = {
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue({ id: '11' }),
        getData: jest.fn().mockReturnValue({ gameId: 'gameId' }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(gameService, 'findGameById').mockReturnValue({
      id: 1,
      players: [{ client: { socket: { id: '11' } } } as any],
    } as Game);

    const result = guard.canActivate(wsContextMock);
    expect(result).toBe(true);
  });

  it('should deny access when the player is not in the game', () => {
    const wsContextMock: ExecutionContext = {
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue({ id: 'id' }),
        getData: jest.fn().mockReturnValue({ gameId: 'gameId' }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(gameService, 'findGameById').mockReturnValue({
      id: 1,
      players: [{ id: '-1', client: { socket: { id: 'anotherId' } } } as any],
    } as Game);

    const result = guard.canActivate(wsContextMock);
    expect(result).toBe(false);
  });
});
