import type {
  CompletedMove,
  CreateGameDto,
  DrawAgreement,
  InitedGameData,
  TimeUpdate,
  TurnBody,
} from './dto';
import type {
  DrawGame,
  GameData,
  GameWithWinner,
  Message,
} from './entities/game';
import type { GameEnd } from './EmitTypes';

export type ClientIdentity = {
  userId: number;
  name: string;
  authorized: boolean;
};

export type GameEndResult = {
  winner: { userId: number };
  looser: { userId: number };
  gameDto: GameWithWinner;
};

type Command<Req, Res> = { req: Req; res: Res };
type InGame = { client: ClientIdentity; gameId: number };

export type GameCommands = {
  create: Command<
    { client: ClientIdentity; config: CreateGameDto },
    { id: number; matchId: string }
  >;
  join: Command<
    InGame,
    { id: number; players: { userId: number; initData: InitedGameData }[] }
  >;
  pending: Command<
    { client: ClientIdentity },
    { id: number; initData: InitedGameData } | null
  >;
  opponent: Command<{ client: ClientIdentity }, { userId: number } | null>;
  cancelLobby: Command<{ client: ClientIdentity }, null>;
  lobby: Command<Record<string, never>, GameData[]>;
  leave: Command<{ client: ClientIdentity }, GameEndResult>;
  surrender: Command<InGame, GameEndResult>;
  move: Command<
    { client: ClientIdentity; turn: TurnBody },
    { result: CompletedMove; prevCell: string; side: 'w' | 'b' }
  >;
  chat: Command<InGame & { text: string }, Message>;
  proposeDraw: Command<InGame, DrawAgreement>;
  acceptDraw: Command<InGame, DrawGame>;
  rejectDraw: Command<InGame, DrawAgreement>;
  addTime: Command<InGame, TimeUpdate>;
};

export type GameCommandName = keyof GameCommands;
export type GameCommandRequest<K extends GameCommandName> =
  GameCommands[K]['req'];
export type GameCommandResponse<K extends GameCommandName> =
  GameCommands[K]['res'];

export type GameNotification =
  | { kind: 'timeTick'; gameId: number; times: TimeUpdate }
  | {
      kind: 'gameEnd';
      userId: number;
      winner: boolean;
      game: unknown;
      reason: GameEnd;
    };
