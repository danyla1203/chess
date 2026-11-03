import type { Emit, Game, GameEnd, Lobby, User } from './events';

export type Side = 'w' | 'b';
export type Cell = string;
export type Figure = string;

export type PlainBoardState = {
  b: { [key: string]: string };
  w: { [key: string]: string };
};

export type ClockState = {
  w: number;
  b: number;
  running: Side | null;
  serverNow: number;
};

export type StrikedData = {
  strikedSide: Side;
  figure: string;
  cell: string;
};

export type ShahData = {
  shachedSide: Side;
  byFigure: string;
};

export type MateData = {
  matedSide: Side;
  byFigure: string;
};

export type CompletedMove = {
  mate: null | MateData;
  shah: null | ShahData;
  strike: null | StrikedData;
};

export type DrawAgreement = {
  w: boolean;
  b: boolean;
};

export type InitedGameData = {
  board: PlainBoardState;
  gameId: number;
  side: Side;
  maxTime: number;
  timeIncrement: number;
  clock: ClockState;
};

export type GameConfig = {
  side: Side | 'rand';
  time: number;
  timeIncrement: number;
  bet: number;
};

export type PlayerInfo = {
  userId: number;
  name: string;
  side: Side;
};

export type GameData = {
  id: number;
  players: PlayerInfo[];
  config: GameConfig;
};

export type Move = {
  side: Side;
  figure: Figure;
  from: Cell;
  to: Cell;
  strikedData?: StrikedData;
  shahData?: ShahData;
  mateData?: MateData;
};

export type GameResult = {
  id: number;
  config: GameConfig;
  moves: Move[];
};

export type GameWithWinner = GameResult & {
  winner: PlayerInfo;
  looser: PlayerInfo;
};

export type DrawGame = GameResult & {
  pl1: PlayerInfo;
  pl2: PlayerInfo;
};

export type ChatAuthor = {
  id: number;
  name: string;
};

export type ChatMessage = {
  id: number;
  text: string;
  author: ChatAuthor;
  date: string;
};

export type CreateGame = {
  side: Side | 'rand';
  time: number;
  timeIncrement: number;
  bet: number;
};

export type ConnectToGame = {
  gameId: number;
};

export type GameRef = {
  gameId: number;
};

export type Turn = {
  gameId: number;
  figure: string;
  cell: string;
};

export type SendChatMessage = {
  gameId: number;
  text: string;
};

export type AnonymousTokenPayload = {
  tempToken: string;
  userId: number;
};

export type MoveUpdate = {
  figure: Figure;
  cell: Cell;
  prevCell: Cell;
  side: Side;
};

export type BoardUpdate = {
  effect: CompletedMove;
  update: MoveUpdate;
  clock: ClockState;
};

export type OpponentPresence = {
  opponent: ChatAuthor;
};

export type GameEndDraw = {
  reason: GameEnd.draw;
  game: DrawGame;
};

export type GameEndDecisive = {
  reason: Exclude<GameEnd, GameEnd.draw | GameEnd.mate>;
  winner: boolean;
  game: GameWithWinner;
};

export type GameEndPayload = GameEndDraw | GameEndDecisive;

export type ServerToClientEvents = {
  [User.anonymousToken]: (payload: AnonymousTokenPayload) => void;
  [Lobby.update]: (games: GameData[]) => void;
  [Lobby.added]: (game: GameData) => void;
  [Lobby.removed]: (payload: GameRef) => void;
  [Game.pendingGame]: (payload: GameRef) => void;
  [Game.init]: (data: InitedGameData) => void;
  [Game.boardUpdate]: (payload: BoardUpdate) => void;
  [Game.message]: (message: ChatMessage) => void;
  [Game.drawPropose]: (draw: DrawAgreement) => void;
  [Game.rejectDraw]: (draw: DrawAgreement) => void;
  [Game.addTime]: (clock: ClockState) => void;
  [Game.end]: (payload: GameEndPayload) => void;
  [Game.playerDiconnected]: (payload: OpponentPresence) => void;
  [Game.playerReconected]: (payload: OpponentPresence) => void;
};

export type ClientToServerEvents = {
  [Emit.createGame]: (config: CreateGame) => void;
  [Emit.gameJoin]: (payload: ConnectToGame) => void;
  [Emit.gameRejoin]: () => void;
  [Emit.figureMove]: (turn: Turn) => void;
  [Emit.pushMessage]: (message: SendChatMessage) => void;
  [Emit.addTime]: (payload: GameRef) => void;
  [Emit.surrender]: (payload: GameRef) => void;
  [Emit.drawPropose]: (payload: GameRef) => void;
  [Emit.drawReject]: (payload: GameRef) => void;
  [Emit.drawAccept]: (payload: GameRef) => void;
  [Emit.leave]: () => void;
};
