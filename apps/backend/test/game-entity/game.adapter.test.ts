import { Test, TestingModule } from '@nestjs/testing';

import { Game } from '../../src/domain/game/entities/game';
import { GameAdapter } from '../../src/game/game.adapter';
import { InitedGameData, PlainBoardState } from '@chess/contract';

describe('GameAdapter', () => {
  let gameAdapter: GameAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameAdapter],
    }).compile();

    gameAdapter = module.get<GameAdapter>(GameAdapter);
  });

  describe('plainBoardState', () => {
    it('should return the plain board state', () => {
      const mockGame = {
        process: {
          state: {
            white: new Map([
              ['a1', 'R1'],
              ['b1', 'K2'],
            ]),
            black: new Map([
              ['a8', 'R2'],
              ['b8', 'K2'],
            ]),
          },
        },
      };

      const expectedPlainState: PlainBoardState = {
        w: {
          R1: 'a1',
          K2: 'b1',
        },
        b: {
          R2: 'a8',
          K2: 'b8',
        },
      };

      const result = gameAdapter.plainBoardState(mockGame as Game);
      expect(result).toEqual(expectedPlainState);
    });
  });

  describe('initedGameDataDto', () => {
    it('should return initialized game data', () => {
      const clock = { w: 10, b: 10, running: 'w', serverNow: 5 };
      const mockGame: any = {
        id: 1,
        clockState: () => clock,
        players: [
          { userId: 1, side: 'w' },
          { userId: 2, side: 'b' },
        ],
        config: {
          time: 10,
          timeIncrement: 2,
        },
        process: {
          state: {
            w: new Map([
              ['a1', 'R1'],
              ['b1', 'K1'],
            ]),
            b: new Map([
              ['a8', 'R1'],
              ['b8', 'K1'],
            ]),
          },
        },
      };

      const expectedInitedGameData: InitedGameData = {
        board: {
          w: {
            R1: 'a1',
            K1: 'b1',
          },
          b: {
            R1: 'a8',
            K1: 'b8',
          },
        },
        gameId: 1,
        side: 'w',
        maxTime: 10,
        timeIncrement: 2,
        clock: { w: 10, b: 10, running: 'w', serverNow: 5 },
      };

      const result = gameAdapter.initedGameDataDto(1, mockGame);
      expect(result).toEqual(expectedInitedGameData);
    });
  });

  describe('gameWithDrawDto', () => {
    it('should return game result with players when draw is true', () => {
      const mockGame = {
        id: 1,
        moves: [],
        config: { time: 10, timeIncrement: 2 },
        players: [
          { userId: 1, name: 'Player 1', side: 'w' },
          { userId: 2, name: 'Player 2', side: 'b' },
        ],
      };

      const expectedDrawResult = {
        id: 1,
        moves: [],
        config: { time: 10, timeIncrement: 2 },
        pl1: { userId: 1, name: 'Player 1', side: 'w' },
        pl2: { userId: 2, name: 'Player 2', side: 'b' },
      };

      const result = gameAdapter.gameWithDrawDto(mockGame as Game);
      expect(result).toEqual(expectedDrawResult);
    });
  });

  describe('gameWithWinnerDto', () => {
    it('should return game result with winner and looser when draw is false', () => {
      const mockGame = {
        id: 1,
        moves: [],
        config: { time: 10, timeIncrement: 2 },
        winner: { userId: 1, name: 'Player 1', side: 'w' },
        looser: { userId: 2, name: 'Player 2', side: 'b' },
      };

      const expectedGameResult = {
        id: 1,
        moves: [],
        config: { time: 10, timeIncrement: 2 },
        winner: { userId: 1, name: 'Player 1', side: 'w' },
        looser: { userId: 2, name: 'Player 2', side: 'b' },
      };

      const result = gameAdapter.gameWithWinnerDto(mockGame as Game);
      expect(result).toEqual(expectedGameResult);
    });
  });
});
