export type Cell = string;
export type Figure = string;

export type PlainBoardState = {
  b: { [key: Cell]: Figure };
  w: { [key: Cell]: Figure };
};

export type InitedGameData = {
  board: PlainBoardState;
  gameId: number;
  side: 'w' | 'b';
  maxTime: number;
  timeIncrement: number;
};

export type SelectedCell = {
  cell: Cell | null;
  possibleMoves: Cell[];
};
