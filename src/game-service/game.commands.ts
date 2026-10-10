import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Queue, RabbitMQService } from '../messaging';
import { LoggerService } from '../tools/logger';
import { annotateActiveSpan } from '../tools/telemetry';
import { GameService } from '../game/game.service';
import { GameMetrics } from '../game/game.metrics';
import { Client } from '../game/entities';
import type {
  ClientIdentity,
  GameCommandName,
  GameCommandRequest,
  GameCommandResponse,
  GameEndResult,
} from '../game/game.contract';

type Handlers = {
  [K in GameCommandName]: (
    request: GameCommandRequest<K>,
  ) => Promise<GameCommandResponse<K>>;
};

const toClient = (identity: ClientIdentity): Client =>
  Object.assign(new Client(), identity);

@Injectable()
export class GameCommandHandler implements OnApplicationBootstrap {
  private readonly handlers: Handlers = {
    create: async ({ client, config }) => {
      const game = await this.service.createGame(toClient(client), config);
      return { id: game.id, matchId: game.matchId };
    },
    join: async ({ client, gameId }) => {
      const game = await this.service.connectToGame(toClient(client), gameId);
      return {
        id: game.id,
        players: game.players.map((pl) => ({
          userId: pl.userId,
          initData: this.service.getInitedGameData(pl.userId, game),
        })),
      };
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
    opponent: async ({ client }) => {
      const opponent = await this.service.findCurrentOpponent(toClient(client));
      return opponent ? { userId: opponent.userId } : null;
    },
    cancelLobby: async ({ client }) => {
      await this.service.removeInitedGamesBy(toClient(client));
      return null;
    },
    lobby: () => this.service.getLobby(),
    leave: async ({ client }) =>
      this.endResult(await this.service.leaveGame(toClient(client))),
    surrender: async ({ client, gameId }) => {
      await this.requirePlayer(client, gameId);
      return this.endResult(
        await this.service.surrender(gameId, toClient(client)),
      );
    },
    move: async ({ client, turn }) => {
      await this.requirePlayer(client, turn.gameId);
      return this.metrics.trackMove(() =>
        this.service.makeTurn(turn.gameId, client.userId, turn),
      );
    },
    chat: async ({ client, gameId, text }) => {
      await this.requirePlayer(client, gameId);
      return this.service.pushMessage(gameId, text, toClient(client));
    },
    proposeDraw: async ({ client, gameId }) => {
      await this.requirePlayer(client, gameId);
      return this.service.proposeDraw(gameId, toClient(client));
    },
    acceptDraw: async ({ client, gameId }) => {
      await this.requirePlayer(client, gameId);
      return this.service.acceptDraw(gameId, toClient(client));
    },
    rejectDraw: async ({ client, gameId }) => {
      await this.requirePlayer(client, gameId);
      return this.service.rejectDraw(gameId);
    },
    addTime: async ({ client, gameId }) => {
      await this.requirePlayer(client, gameId);
      return this.service.addTimeToAnotherPlayer(gameId, toClient(client));
    },
  };

  constructor(
    private readonly rabbit: RabbitMQService,
    private readonly service: GameService,
    private readonly metrics: GameMetrics,
    private readonly logger: LoggerService,
  ) {}

  onApplicationBootstrap(): void {
    this.rabbit
      .serve(Queue.GameCommands, (type, payload) => this.handle(type, payload))
      .catch((err: Error) =>
        this.logger.error(
          `Cannot serve ${Queue.GameCommands}: ${err.message}`,
          err.stack,
          GameCommandHandler.name,
        ),
      );
  }

  public handle(type: string, payload: unknown): Promise<unknown> {
    const handler = this.handlers[type as GameCommandName] as (
      request: unknown,
    ) => Promise<unknown>;
    if (!handler) {
      throw new BadRequestException(`Unknown command ${type}`);
    }
    const request = payload as { client?: ClientIdentity; gameId?: number };
    annotateActiveSpan({
      'rpc.method': type,
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

  private endResult(result: {
    winner: { userId: number };
    looser: { userId: number };
    gameDto: GameEndResult['gameDto'];
  }): GameEndResult {
    return {
      winner: { userId: result.winner.userId },
      looser: { userId: result.looser.userId },
      gameDto: result.gameDto,
    };
  }
}
