import type { CompletedMove, GameEnd } from '@chess/contract';
import type { Message } from './game.chat';
import type { Cell, Figure } from './game.types';

export type GameDomainEvent =
  | { type: 'created' }
  | { type: 'started' }
  | { type: 'cancelled' }
  | {
      type: 'moved';
      figure: Figure;
      cell: Cell;
      prevCell: Cell;
      side: 'w' | 'b';
      result: CompletedMove;
    }
  | { type: 'chatPosted'; message: Message }
  | { type: 'drawProposed' }
  | { type: 'drawRejected' }
  | { type: 'timeAdded' }
  | { type: 'ended'; reason: GameEnd };
