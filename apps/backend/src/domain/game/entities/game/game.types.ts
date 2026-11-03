import type { Cell, Figure, ShahData, GameConfig, Move } from '@chess/contract';

export type {
  Cell,
  Figure,
  Move,
  GameData,
  GameResult,
  GameWithWinner,
  DrawGame,
} from '@chess/contract';
export type Config = GameConfig;
export type Figures = Map<Figure, Cell>;

export type FiguresCellState = {
  black: Map<Figure, Cell>;
  white: Map<Figure, Cell>;
};

export type FiguresSet = {
  w: Set<Figure>;
  b: Set<Figure>;
};

export type Board = {
  board: Figures;
  opponent: Figures;
};
export type CellUpdate = {
  prevCell: Cell;
  newCell: Cell;
};

export type GameStatus = 'lobby' | 'active' | 'ended' | 'cancelled';

export type PlayerSnapshot = {
  userId: number;
  name: string;
  authorized: boolean;
  side: 'w' | 'b';
  time: number;
};

export type GameStateSnapshot = {
  white: [Figure, Cell][];
  black: [Figure, Cell][];
  sideToTurn: 'w' | 'b';
  shahData: null | ShahData;
  possibleShahes: { w: Figure[]; b: Figure[] };
  strikeAroundKn: { w: Figure[]; b: Figure[] };
};

export type ChatMessageSnapshot = {
  id: number;
  text: string;
  author: { id: number; name: string };
  date: string;
};

export type GameSnapshot = {
  id: number;
  matchId: string;
  status: GameStatus;
  endReason: string | null;
  config: Config;
  players: PlayerSnapshot[];
  turnStartedAt: number | null;
  createdAt: number;
  state: GameStateSnapshot;
  moves: Move[];
  chat: ChatMessageSnapshot[];
  draw: { w: boolean; b: boolean };
  winnerId: number | null;
  looserId: number | null;
};
