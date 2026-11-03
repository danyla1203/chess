import type { Cell, OpponentReconnected, Side } from '@chess/contract';

export type OpponentLeavePayload = OpponentReconnected['opponent'] & {
  side: Side;
};

export type SelectedCell = {
  cell: Cell | null;
  possibleMoves: Cell[];
};

export type ResultPlayer = {
  userId: number;
  name: string;
};

export type RestructedGameResult = {
  id: number;
  key: number;
  cnf: {
    inc: number;
    time: number;
  };
  result:
    | { pl1: ResultPlayer; pl2: ResultPlayer }
    | { winner: ResultPlayer; looser: ResultPlayer };
};
