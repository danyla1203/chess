import type { GameEnd } from './EmitTypes';
import type { TimeUpdate } from './dto';

export abstract class GameNotifier {
  abstract timeTick(gameId: number, times: TimeUpdate): void;

  abstract gameEnd(
    userId: number,
    winner: boolean,
    game: unknown,
    reason: GameEnd,
  ): void;
}
