import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import {
  BeforeApplicationShutdown,
  NotFoundException,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WsValidationFilter } from '../infrastructure/socket/WsValidationFilter';
import { CreateGameDto, TurnBody, ChatMessage } from '../game/dto';
import { Emit, Game, Lobby, User } from '@chess/contract';
import type { ConnectToGame } from '@chess/contract';
import { room } from '../infrastructure/socket/rooms';
import { GameReadModel } from '../game-read';
import { annotateActiveSpan } from '../infrastructure/telemetry';
import { ConnectionPatchProvider } from './connection.provider';
import { ClientStore } from './ClientStore';
import { IsBalanceEnough } from './guards';
import { GatewayMetrics } from './gateway.metrics';
import { SocketNotifier, userRoom } from './socket.notifier';
import { GameClient } from './game.client';

@WebSocketGateway({ namespace: 'game', cors: true, transports: ['websocket'] })
@UsePipes(new ValidationPipe())
@UseFilters(new WsValidationFilter())
export class GameGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    BeforeApplicationShutdown
{
  private shuttingDown = false;

  constructor(
    private readonly games: GameClient,
    private readonly views: GameReadModel,
    private readonly connService: ConnectionPatchProvider,
    private readonly clientStore: ClientStore,
    private readonly metrics: GatewayMetrics,
    private readonly notifier: SocketNotifier,
  ) {}

  @WebSocketServer()
  server: Namespace;

  afterInit(server: Namespace): void {
    this.notifier.bind(server);
  }

  beforeApplicationShutdown(): void {
    this.shuttingDown = true;
  }

  async handleDisconnect(socket: Socket) {
    this.metrics.connectionClosed();
    const client = this.clientStore.getClient(socket);
    if (!client || this.shuttingDown) return;

    const otherSockets = await this.server
      .in(userRoom(client.userId))
      .fetchSockets();
    if (otherSockets.length > 0) return;

    const view = await this.views.userGame(client.userId);
    if (view?.status === 'lobby') {
      await this.games.cancelLobbyGame(client);
    } else if (view?.status === 'active' && view.opponentId) {
      this.notifier.opponentDisconnected(view.opponentId);
    }
  }

  async handleConnection(socket: Socket) {
    this.metrics.connectionOpened();
    const client = await this.connService.processClient(socket);
    this.clientStore.setClient(socket, client);
    await socket.join(userRoom(client.userId));
    if (!client.authorized) {
      socket.emit(User.anonymousToken, {
        tempToken: client.anonymousTempToken,
        userId: client.userId,
      });
    }
    const view = await this.views.userGame(client.userId);
    if (view?.status === 'active') {
      await socket.join(room(view.gameId));
      socket.emit(Game.pendingGame, { gameId: view.gameId });
    }

    socket.emit(Lobby.update, await this.views.lobby());
  }

  @SubscribeMessage(Emit.createGame)
  @UseGuards(IsBalanceEnough)
  async createGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() config: CreateGameDto,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const game = await this.games.createGame(client, config);
    annotateActiveSpan({
      'chess.game.id': game.id,
      'chess.match.id': game.matchId,
      'enduser.id': client.userId,
    });
  }

  @SubscribeMessage(Emit.gameRejoin)
  async rejoinGame(@ConnectedSocket() socket: Socket): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const pending = await this.games.pendingGame(client);
    if (!pending) throw new NotFoundException('Game not found');
    await socket.join(room(pending.id));
    socket.emit(Game.init, pending.initData);
    this.notifier.toGame(pending.id, Game.playerReconected, {
      opponent: {
        id: client.userId,
        name: client.name,
      },
    });
  }

  @SubscribeMessage(Emit.leave)
  async leaveGame(@ConnectedSocket() socket: Socket): Promise<void> {
    await this.games.leave(this.clientStore.getClient(socket));
  }

  @SubscribeMessage(Emit.gameJoin)
  @UseGuards(IsBalanceEnough)
  async joinGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: ConnectToGame,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    annotateActiveSpan({
      'chess.game.id': gameId,
      'enduser.id': client.userId,
    });
    await this.games.joinGame(client, gameId);
  }

  @SubscribeMessage(Emit.figureMove)
  async move(
    @ConnectedSocket() socket: Socket,
    @MessageBody() turn: TurnBody,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    annotateActiveSpan({
      'chess.game.id': turn.gameId,
      'enduser.id': client.userId,
    });
    await this.games.move(client, turn);
  }

  @SubscribeMessage(Emit.pushMessage)
  async chatMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId, text }: ChatMessage,
  ): Promise<void> {
    await this.games.chat(this.clientStore.getClient(socket), gameId, text);
  }

  @SubscribeMessage(Emit.surrender)
  async surrender(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    annotateActiveSpan({ 'chess.game.id': gameId });
    await this.games.surrender(this.clientStore.getClient(socket), gameId);
  }

  @SubscribeMessage(Emit.drawPropose)
  async drawPropose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    await this.games.proposeDraw(this.clientStore.getClient(socket), gameId);
  }

  @SubscribeMessage(Emit.drawAccept)
  async acceptPropose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    await this.games.acceptDraw(this.clientStore.getClient(socket), gameId);
  }

  @SubscribeMessage(Emit.drawReject)
  async rejectPropose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    await this.games.rejectDraw(this.clientStore.getClient(socket), gameId);
  }

  @SubscribeMessage(Emit.addTime)
  async addTime(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    await this.games.addTime(this.clientStore.getClient(socket), gameId);
  }
}
