import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { annotateActiveSpan } from '../infrastructure/telemetry';
import { GameService } from '../game/game.service';
import { GameMetrics } from '../infrastructure/game/game.metrics';
import { Client } from '../domain/game/entities';
import type {
  ClientIdentity,
  GameCommandName,
  GameCommandRequest,
  GameCommandResponse,
} from '../game/game.contract';

type Handlers = {
  [K in GameCommandName]: (
    request: GameCommandRequest<K>,
  ) => Promise<GameCommandResponse<K>>;
};

const toClient = (identity: ClientIdentity): Client =>
  Object.assign(new Client(), identity);

@Injectable()
export class GameCommandHandler {
  private readonly handlers: Handlers = {
    create: async ({ client, config }) => {
      const game = await this.service.createGame(toClient(client), config);
      return { id: game.id, matchId: game.matchId };
    },
    join: async ({ client, gameId }) => {
      const game = await this.service.connectToGame(toClient(client), gameId);
      return { id: game.id };
    },
    pending: async ({ client }) => {
      const game = await this.service
        .findPendingGame(toClient(client))
        .catch((err: unknown) => {
          if (err instanceof NotFoundException) return null;
          throw err;
        });
      if (!game) return null;
      return {
        id: game.id,
        initData: this.service.getInitedGameData(client.userId, game),
      };
    },
    cancelLobby: async ({ client }) => {
      await this.service.removeInitedGamesBy(toClient(client));
      return null;
    },
    leave: async ({ client }) => {
      await this.service.leaveGame(toClient(client));
      return null;
    },
    surrender: async ({ client, gameId }) => {
      await this.requirePlayer(client, gameId);
      await this.service.surrender(gameId, toClient(client));
      return null;
    },
    move: async ({ client, turn }) => {
      await this.requirePlayer(client, turn.gameId);
      await this.metrics.trackMove(() =>
        this.service.makeTurn(turn.gameId, client.userId, turn),
      );
      return null;
    },
    chat: async ({ client, gameId, text }) => {
      await this.requirePlayer(client, gameId);
      await this.service.pushMessage(gameId, text, toClient(client));
      return null;
    },
    proposeDraw: async ({ client, gameId }) => {
      await this.requirePlayer(client, gameId);
      await this.service.proposeDraw(gameId, toClient(client));
      return null;
    },
    acceptDraw: async ({ client, gameId }) => {
      await this.requirePlayer(client, gameId);
      await this.service.acceptDraw(gameId, toClient(client));
      return null;
    },
    rejectDraw: async ({ client, gameId }) => {
      await this.requirePlayer(client, gameId);
      await this.service.rejectDraw(gameId);
      return null;
    },
    addTime: async ({ client, gameId }) => {
      await this.requirePlayer(client, gameId);
      await this.service.addTimeToAnotherPlayer(gameId, toClient(client));
      return null;
    },
  };

  constructor(
    private readonly service: GameService,
    private readonly metrics: GameMetrics,
  ) {}

  public handle<K extends GameCommandName>(
    type: K,
    payload: GameCommandRequest<K>,
  ): Promise<GameCommandResponse<K>> {
    const handler = this.handlers[type] as (
      request: GameCommandRequest<K>,
    ) => Promise<GameCommandResponse<K>>;
    if (!handler) {
      throw new BadRequestException(`Unknown command ${type}`);
    }
    const request = payload as { client?: ClientIdentity; gameId?: number };
    if (!request.client) {
      throw new BadRequestException('client is required');
    }
    annotateActiveSpan({
      'chess.command': type,
      ...(request.client && { 'enduser.id': request.client.userId }),
      ...(request.gameId && { 'chess.game.id': request.gameId }),
    });
    return handler(payload);
  }

  private async requirePlayer(
    client: ClientIdentity,
    gameId: number,
  ): Promise<void> {
    const game = await this.service.findGameById(gameId);
    if (!game.findPlayer(client.userId)) {
      throw new ForbiddenException('Forbidden resource');
    }
  }
}
