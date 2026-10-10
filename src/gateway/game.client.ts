import { Injectable } from '@nestjs/common';
import { Exchange, RabbitMQService, RoutingKey } from '../messaging';
import type {
  ClientIdentity,
  GameCommandName,
  GameCommandRequest,
  GameCommandResponse,
} from '../game/game.contract';
import type { CreateGameDto, TurnBody } from '../game/dto';
import type { Client } from '../game/entities';

const identity = ({ userId, name, authorized }: Client): ClientIdentity => ({
  userId,
  name,
  authorized,
});

@Injectable()
export class GameClient {
  constructor(private readonly rabbit: RabbitMQService) {}

  private call<K extends GameCommandName>(
    type: K,
    request: GameCommandRequest<K>,
  ): Promise<GameCommandResponse<K>> {
    return this.rabbit.request<GameCommandResponse<K>>(
      Exchange.GameCommands,
      RoutingKey.GameCommand,
      type,
      request,
    );
  }

  createGame(client: Client, config: CreateGameDto) {
    return this.call('create', { client: identity(client), config });
  }

  joinGame(client: Client, gameId: number) {
    return this.call('join', { client: identity(client), gameId });
  }

  pendingGame(client: Client) {
    return this.call('pending', { client: identity(client) });
  }

  currentOpponent(client: Client) {
    return this.call('opponent', { client: identity(client) });
  }

  cancelLobbyGame(client: Client) {
    return this.call('cancelLobby', { client: identity(client) });
  }

  lobby() {
    return this.call('lobby', {});
  }

  leave(client: Client) {
    return this.call('leave', { client: identity(client) });
  }

  surrender(client: Client, gameId: number) {
    return this.call('surrender', { client: identity(client), gameId });
  }

  move(client: Client, turn: TurnBody) {
    return this.call('move', { client: identity(client), turn });
  }

  chat(client: Client, gameId: number, text: string) {
    return this.call('chat', { client: identity(client), gameId, text });
  }

  proposeDraw(client: Client, gameId: number) {
    return this.call('proposeDraw', { client: identity(client), gameId });
  }

  acceptDraw(client: Client, gameId: number) {
    return this.call('acceptDraw', { client: identity(client), gameId });
  }

  rejectDraw(client: Client, gameId: number) {
    return this.call('rejectDraw', { client: identity(client), gameId });
  }

  addTime(client: Client, gameId: number) {
    return this.call('addTime', { client: identity(client), gameId });
  }
}
