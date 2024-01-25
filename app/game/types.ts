export type Cell = string;
export type Figure = string;

export type PlainBoardState = {
  b: { [key: Cell]: Figure };
  w: { [key: Cell]: Figure };
};

export type OpponentLeavePayload = {
  id: number;
  side: 'w' | 'b';
  name: string;
};
export type Move = {
  figure: Figure;
  cell: Cell;
  prevCell: Cell;
  side: 'w' | 'b';
};
export type MateData = {
  matedSide: 'w' | 'b';
  byFigure: string;
};
export type ShahData = {
  shachedSide: 'w' | 'b';
  byFigure: string;
};
export type Message = {
  id: number;
  text: string;
  author: Author;
  date: string;
};
export type Author = {
  id: number;
  name: string;
};
export type StrikeData = {
  figure: Figure;
  strikedSide: 'w' | 'b';
  cell: Cell;
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
export type Config = {
  side: 'w' | 'b' | 'rand';
  time: number;
  timeIncrement: number;
};
export type Player = {
  side: 'w' | 'b';
  time: number;
  turningPlayer: boolean;
  id: string;
  name: string;
  authorized: boolean;
  userId: number;
};

export type GameResult = {
  id: number;
  config: Config;
  moves: Move[];
};
export type GameWithWinner = GameResult & {
  winner: Player;
  looser: Player;
};
export type DrawGame = GameResult & {
  pl1: Player;
  pl2: Player;
};

type WinnerLooser = {
  winner: Player;
  looser: Player;
};
type Draw = {
  pl1: Player;
  pl2: Player;
};

export type RestructedGameResult = {
  id: number;
  key: number;
  cnf: {
    inc: number;
    time: number;
  };
  result: Draw | WinnerLooser;
};
