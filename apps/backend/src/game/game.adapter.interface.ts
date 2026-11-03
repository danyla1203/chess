import type { InitedGameData, PlainBoardState } from '@chess/contract';
import { DrawGame, Game, GameWithWinner } from '../domain/game/entities/game';

export interface GameAdapterI {
  initedGameDataDto: (userId: number, game: Game) => InitedGameData;
  gameWithWinnerDto: (game: Game) => GameWithWinner;
  gameWithDrawDto: (game: Game) => DrawGame;
  plainBoardState: (game: Game) => PlainBoardState;
}
