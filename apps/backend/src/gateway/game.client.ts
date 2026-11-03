import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Metadata, status } from '@grpc/grpc-js';
import type { CallOptions, ServiceError } from '@grpc/grpc-js';
import { metrics } from '@opentelemetry/api';
import { firstValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';
import {
  GAME_COMMANDS_SERVICE_NAME,
  GameCommandsClient,
  InitData,
} from '../generated/chess/game/v1/game';
import { COMMAND_DEADLINE_MS, fromGrpcError } from '../infrastructure/grpc';
import type {
  ClientIdentity,
  GameCommandResponse,
} from '../game/game.contract';
import type { InitedGameData } from '@chess/contract';
import type { CreateGameDto, TurnBody } from '../game/dto';
import type { Client } from '../domain/game/entities';

export const GAME_SVC = Symbol('GAME_SVC');

const identity = ({ userId, name, authorized }: Client): ClientIdentity => ({
  userId,
  name,
  authorized,
});

const initedGameData = (data: InitData): InitedGameData => ({
  board: { w: data.board?.w ?? {}, b: data.board?.b ?? {} },
  gameId: data.gameId,
  side: data.side as InitedGameData['side'],
  maxTime: data.maxTime,
  timeIncrement: data.timeIncrement,
  clock: {
    w: data.clock?.w ?? 0,
    b: data.clock?.b ?? 0,
    running: (data.clock?.running as 'w' | 'b' | undefined) ?? null,
    serverNow: data.clock?.serverNow ?? 0,
  },
});

type Method = keyof GameCommandsClient;
type Request<M extends Method> = Parameters<GameCommandsClient[M]>[0];
type Reply<M extends Method> =
  ReturnType<GameCommandsClient[M]> extends Observable<infer R> ? R : never;
type Unary<M extends Method> = (
  request: Request<M>,
  metadata: Metadata,
  options: CallOptions,
) => Observable<Reply<M>>;

const outcomeOf = (err: unknown): string => {
  switch ((err as Partial<ServiceError>).code) {
    case status.DEADLINE_EXCEEDED:
      return 'timeout';
    case status.UNAVAILABLE:
      return 'unavailable';
    default:
      return 'error';
  }
};

@Injectable()
export class GameClient implements OnModuleInit {
  private service: GameCommandsClient;
  private readonly duration = metrics
    .getMeter('chess.rpc')
    .createHistogram('chess.rpc.client.duration', {
      unit: 's',
      description: 'Round trip of a gRPC command from core to game-svc',
      advice: {
        explicitBucketBoundaries: [
          0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 5,
        ],
      },
    });
  deadlineMs = COMMAND_DEADLINE_MS;

  constructor(@Inject(GAME_SVC) private readonly grpc: ClientGrpc) {}

  onModuleInit(): void {
    this.service = this.grpc.getService<GameCommandsClient>(
      GAME_COMMANDS_SERVICE_NAME,
    );
  }

  private async call<M extends Method>(
    method: M,
    request: Request<M>,
  ): Promise<Reply<M>> {
    const invoke = this.service[method] as unknown as Unary<M>;
    const start = performance.now();
    let outcome = 'ok';
    try {
      return await firstValueFrom(
        invoke(request, new Metadata(), {
          deadline: Date.now() + this.deadlineMs,
        }),
      );
    } catch (err) {
      outcome = outcomeOf(err);
      throw fromGrpcError(err, method);
    } finally {
      this.duration.record((performance.now() - start) / 1000, {
        'rpc.system': 'grpc',
        'rpc.method': method,
        outcome,
      });
    }
  }

  private async send<M extends Method>(
    method: M,
    request: Request<M>,
  ): Promise<null> {
    await this.call(method, request);
    return null;
  }

  createGame(client: Client, config: CreateGameDto) {
    return this.call('create', { client: identity(client), config });
  }

  joinGame(client: Client, gameId: number) {
    return this.call('join', { client: identity(client), gameId });
  }

  async pendingGame(client: Client): Promise<GameCommandResponse<'pending'>> {
    const { game } = await this.call('pending', { client: identity(client) });
    if (!game?.initData) return null;
    return { id: game.id, initData: initedGameData(game.initData) };
  }

  cancelLobbyGame(client: Client) {
    return this.send('cancelLobby', {
      client: identity(client),
    });
  }

  leave(client: Client) {
    return this.send('leave', { client: identity(client) });
  }

  surrender(client: Client, gameId: number) {
    return this.send('surrender', {
      client: identity(client),
      gameId,
    });
  }

  move(client: Client, turn: TurnBody) {
    return this.send('move', { client: identity(client), turn });
  }

  chat(client: Client, gameId: number, text: string) {
    return this.send('chat', {
      client: identity(client),
      gameId,
      text,
    });
  }

  proposeDraw(client: Client, gameId: number) {
    return this.send('proposeDraw', {
      client: identity(client),
      gameId,
    });
  }

  acceptDraw(client: Client, gameId: number) {
    return this.send('acceptDraw', {
      client: identity(client),
      gameId,
    });
  }

  rejectDraw(client: Client, gameId: number) {
    return this.send('rejectDraw', {
      client: identity(client),
      gameId,
    });
  }

  addTime(client: Client, gameId: number) {
    return this.send('addTime', {
      client: identity(client),
      gameId,
    });
  }
}
