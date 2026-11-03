import { ClockState } from '../../domain/game/ClockState';
import { PlainBoardState } from './PlainBoardState';

export type InitedGameData = {
  board: PlainBoardState;
  gameId: number;
  side: 'w' | 'b';
  maxTime: number;
  timeIncrement: number;
  clock: ClockState;
};
