import type { InitedGameData } from '@chess/contract';
import type { CreateGameDto, TurnBody } from './dto';

export type ClientIdentity = {
  userId: number;
  name: string;
  authorized: boolean;
};

type Command<Req, Res> = { req: Req; res: Res };
type InGame = { client: ClientIdentity; gameId: number };

export type GameCommands = {
  create: Command<
    { client: ClientIdentity; config: CreateGameDto },
    { id: number; matchId: string }
  >;
  join: Command<InGame, { id: number }>;
  pending: Command<
    { client: ClientIdentity },
    { id: number; initData: InitedGameData } | null
  >;
  cancelLobby: Command<{ client: ClientIdentity }, null>;
  leave: Command<{ client: ClientIdentity }, null>;
  surrender: Command<InGame, null>;
  move: Command<{ client: ClientIdentity; turn: TurnBody }, null>;
  chat: Command<InGame & { text: string }, null>;
  proposeDraw: Command<InGame, null>;
  acceptDraw: Command<InGame, null>;
  rejectDraw: Command<InGame, null>;
  addTime: Command<InGame, null>;
};

export type GameCommandName = keyof GameCommands;
export type GameCommandRequest<K extends GameCommandName> =
  GameCommands[K]['req'];
export type GameCommandResponse<K extends GameCommandName> =
  GameCommands[K]['res'];
