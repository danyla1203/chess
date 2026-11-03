import { BadRequestException, Controller } from '@nestjs/common';
import {
  ChatRequest,
  ClientRequest,
  CreateReply,
  CreateRequest,
  Empty,
  GameCommandsController,
  GameCommandsControllerMethods,
  InGameRequest,
  JoinReply,
  MoveRequest,
  PendingReply,
} from '../generated/chess/game/v1/game';
import type { CreateGameDto, InitedGameData } from '../game/dto';
import type {
  ClientIdentity,
  GameCommandName,
  GameCommandRequest,
} from '../game/game.contract';
import { GameCommandHandler } from './game.commands';

const identity = (client: ClientIdentity | undefined): ClientIdentity => {
  if (!client) throw new BadRequestException('client is required');
  return client;
};

const initData = (data: InitedGameData) => ({
  ...data,
  clock: { ...data.clock, running: data.clock.running ?? undefined },
});

@Controller()
@GameCommandsControllerMethods()
export class GameGrpcController implements GameCommandsController {
  constructor(private readonly commands: GameCommandHandler) {}

  private async empty<K extends GameCommandName>(
    type: K,
    request: GameCommandRequest<K>,
  ): Promise<Empty> {
    await this.commands.handle(type, request);
    return {};
  }

  create({ client, config }: CreateRequest): Promise<CreateReply> {
    if (!config) throw new BadRequestException('config is required');
    return this.commands.handle('create', {
      client: identity(client),
      config: config as CreateGameDto,
    });
  }

  join({ client, gameId }: InGameRequest): Promise<JoinReply> {
    return this.commands.handle('join', { client: identity(client), gameId });
  }

  async pending({ client }: ClientRequest): Promise<PendingReply> {
    const game = await this.commands.handle('pending', {
      client: identity(client),
    });
    return game
      ? { game: { id: game.id, initData: initData(game.initData) } }
      : {};
  }

  cancelLobby({ client }: ClientRequest): Promise<Empty> {
    return this.empty('cancelLobby', { client: identity(client) });
  }

  leave({ client }: ClientRequest): Promise<Empty> {
    return this.empty('leave', { client: identity(client) });
  }

  surrender({ client, gameId }: InGameRequest): Promise<Empty> {
    return this.empty('surrender', { client: identity(client), gameId });
  }

  move({ client, turn }: MoveRequest): Promise<Empty> {
    if (!turn) throw new BadRequestException('turn is required');
    return this.empty('move', { client: identity(client), turn });
  }

  chat({ client, gameId, text }: ChatRequest): Promise<Empty> {
    return this.empty('chat', { client: identity(client), gameId, text });
  }

  proposeDraw({ client, gameId }: InGameRequest): Promise<Empty> {
    return this.empty('proposeDraw', { client: identity(client), gameId });
  }

  acceptDraw({ client, gameId }: InGameRequest): Promise<Empty> {
    return this.empty('acceptDraw', { client: identity(client), gameId });
  }

  rejectDraw({ client, gameId }: InGameRequest): Promise<Empty> {
    return this.empty('rejectDraw', { client: identity(client), gameId });
  }

  addTime({ client, gameId }: InGameRequest): Promise<Empty> {
    return this.empty('addTime', { client: identity(client), gameId });
  }
}
