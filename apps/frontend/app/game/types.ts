import type { Cell } from '@chess/contract';

export type SelectedCell = {
  cell: Cell | null;
  possibleMoves: Cell[];
};
