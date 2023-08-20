export type Figure = string;
export type Cell = string;
type White = { [index: Figure]: Cell };
export type Black = White;
export interface StrikedData {
  strikedSide: 'w' | 'b';
  figure: Figure;
}
export interface ShahData {
  shachedSide: 'w' | 'b';
  byFigure: Figure;
}
export interface MateData {
  matedSide: 'w' | 'b';
  byFigure: Figure;
}
export type Move = {
  side: 'w' | 'b';
  figure: string;
  from: string;
  to: string;
  strike?: StrikedData;
  shahData?: ShahData;
  mateData?: MateData;
};

export interface CompletedMove {
  mate: null | MateData;
  shah: null | ShahData;
  strike: null | StrikedData;
}

export type Board = {
  white: White;
  black: Black;
};

export type GameState = {
  id: number;
  isEnded: boolean;
  side: 'w' | 'b';
  movingSide: string;
  board: Board;
  time: number;
  timeIncrement: number;
  highlightedCels: Cell[];
  selectedFigure: { figure: Figure; cell: Cell };
  strikedFigures: { black: Figure[]; white: Figure[] };
  shahData: { shachedSide: string; figure: Figure };
  chatMessages: any[];
  opponentOnPage: boolean;
  draw: {
    purposeSent: boolean;
    purposeReceived: boolean;
  };

  frameIndex: number;
  movesHistory: Move[];
  frame: Move;
};
