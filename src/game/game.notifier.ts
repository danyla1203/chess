import type { GameEnd } from './EmitTypes';

export abstract class GameNotifier {
  abstract gameEnd(
    userId: number,
    winner: boolean,
    game: unknown,
    reason: GameEnd,
  ): void;
}
