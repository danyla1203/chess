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
import { WsValidationFilter } from '../tools/WsValidationFilter';
import { CreateGameDto, TurnBody, ChatMessage } from '../game/dto';
import type { ConnectToGameDto } from '../game/dto';
import { Game, GameEnd, Lobby, User, room } from '../game/EmitTypes';
import { annotateActiveSpan } from '../tools/telemetry';
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

  private async broadcastLobby(): Promise<void> {
    this.notifier.lobbyUpdate(await this.games.lobby());
  }

  async handleDisconnect(socket: Socket) {
    this.metrics.connectionClosed();
    const client = this.clientStore.getClient(socket);
    if (!client || this.shuttingDown) return;

    const otherSockets = await this.server
      .in(userRoom(client.userId))
      .fetchSockets();
    if (otherSockets.length > 0) return;

    await this.games.cancelLobbyGame(client);
    const opponent = await this.games.currentOpponent(client);
    if (opponent) {
      this.notifier.opponentDisconnected(opponent.userId);
    }
    await this.broadcastLobby();
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
    const pending = await this.games.pendingGame(client);
    if (pending) {
      await socket.join(room(pending.id));
      socket.emit(Game.pendingGame, { gameId: pending.id });
    }

    socket.emit(Lobby.update, await this.games.lobby());
  }

  @SubscribeMessage('create')
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
    this.notifier.joinGame(client.userId, game.id);
    socket.emit(Game.created, { gameId: game.id });

    await this.broadcastLobby();
  }

  @SubscribeMessage('rejoin')
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

  @SubscribeMessage('leave')
  async leaveGame(@ConnectedSocket() socket: Socket): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const { winner, looser, gameDto } = await this.games.leave(client);
    this.notifier.gameEnd(winner.userId, true, gameDto, GameEnd.playerLeave);
    this.notifier.gameEnd(looser.userId, false, gameDto, GameEnd.playerLeave);
  }

  @SubscribeMessage('join')
  @UseGuards(IsBalanceEnough)
  async joinGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: ConnectToGameDto,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    annotateActiveSpan({
      'chess.game.id': gameId,
      'enduser.id': client.userId,
    });
    const game = await this.games.joinGame(client, gameId);

    for (const player of game.players) {
      this.notifier.joinGame(player.userId, game.id);
      this.notifier.initData(player.userId, player.initData);
    }
    this.notifier.gameStart(game.players.map((pl) => pl.userId));
    await this.broadcastLobby();
  }

  @SubscribeMessage('move')
  async move(
    @ConnectedSocket() socket: Socket,
    @MessageBody() turn: TurnBody,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    annotateActiveSpan({
      'chess.game.id': turn.gameId,
      'enduser.id': client.userId,
    });
    const { result, prevCell, side, clock } = await this.games.move(
      client,
      turn,
    );
    this.notifier.toGame(turn.gameId, Game.boardUpdate, {
      effect: result,
      update: { figure: turn.figure, cell: turn.cell, prevCell, side },
      clock,
    });
  }

  @SubscribeMessage('chat-message')
  async chatMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId, text }: ChatMessage,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const message = await this.games.chat(client, gameId, text);
    this.notifier.toGame(gameId, Game.message, message);
  }

  @SubscribeMessage('surrender')
  async surrender(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    annotateActiveSpan({ 'chess.game.id': gameId });
    const client = this.clientStore.getClient(socket);
    const { winner, looser, gameDto } = await this.games.surrender(
      client,
      gameId,
    );
    this.notifier.gameEnd(winner.userId, true, gameDto, GameEnd.surrender);
    this.notifier.gameEnd(looser.userId, false, gameDto, GameEnd.surrender);
  }

  @SubscribeMessage('draw_propose')
  async drawPropose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const propose = await this.games.proposeDraw(client, gameId);
    this.notifier.toGame(gameId, Game.drawPropose, propose);
  }

  @SubscribeMessage('draw_accept')
  async acceptPropose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const game = await this.games.acceptDraw(client, gameId);
    this.notifier.toGame(gameId, Game.end, { reason: GameEnd.draw, game });
  }

  @SubscribeMessage('draw_reject')
  async rejectPropose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const result = await this.games.rejectDraw(client, gameId);
    this.notifier.toGame(gameId, Game.rejectDraw, result);
  }

  @SubscribeMessage('add_time')
  async addTime(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const result = await this.games.addTime(client, gameId);
    this.notifier.toGame(gameId, Game.addTime, result);
  }
}
