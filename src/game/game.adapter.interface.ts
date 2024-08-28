import { InitedGameData, PlainBoardState } from './dto';
import { DrawGame, Game, GameWithWinner } from './entities/game';

export interface GameAdapterI {
  initedGameDataDto: (userId: number, game: Game) => InitedGameData;
  gameWithWinnerDto: (game: Game) => GameWithWinner;
  gameWithDrawDto: (game: Game) => DrawGame;
  plainBoardState: (game: Game) => PlainBoardState;
}
