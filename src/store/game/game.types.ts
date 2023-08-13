export type Figure = string;
export type Cell = string;
type White = { [index: Figure]: Cell };
export type Black = White;

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
};
