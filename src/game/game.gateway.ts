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
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WsValidationFilter } from '../tools/WsValidationFilter';
import { GameService } from './game.service';
import { CreateGameDto, TurnBody, ChatMessage } from './dto';
import type { ConnectToGameDto } from './dto';
import { Game, GameEnd, Lobby, User, room } from './EmitTypes';
import { ConnectionPatchProvider } from './connection.provider';
import { ClientStore } from './ClientStore';
import { IsBalanceEnough, IsPlayer } from './guards';
import { GameMetrics } from './game.metrics';
import { GameNotifier, userRoom } from './game.notifier';
import { annotateActiveSpan } from '../tools/telemetry';

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
    private readonly service: GameService,
    private readonly connService: ConnectionPatchProvider,
    private readonly clientStore: ClientStore,
    private readonly metrics: GameMetrics,
    private readonly notifier: GameNotifier,
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
    this.notifier.lobbyUpdate(await this.service.getLobby());
  }

  async handleDisconnect(socket: Socket) {
    this.metrics.connectionClosed();
    const client = this.clientStore.getClient(socket);
    if (!client || this.shuttingDown) return;

    const otherSockets = await this.server
      .in(userRoom(client.userId))
      .fetchSockets();
    if (otherSockets.length > 0) return;

    await this.service.removeInitedGamesBy(client);
    const opponent = await this.service.findCurrentOpponent(client);
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
    const pending = await this.service
      .findPendingGame(client)
      .catch(() => null);
    if (pending) {
      await socket.join(room(pending.id));
      socket.emit(Game.pendingGame, { gameId: pending.id });
    }

    socket.emit(Lobby.update, await this.service.getLobby());
  }

  @SubscribeMessage('create')
  @UseGuards(IsBalanceEnough)
  async createGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() config: CreateGameDto,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const game = await this.service.createGame(client, config);
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
    const game = await this.service.findPendingGame(client);
    await socket.join(room(game.id));
    socket.emit(Game.init, this.service.getInitedGameData(client.userId, game));
    this.notifier.toGame(game.id, Game.playerReconected, {
      opponent: {
        id: client.userId,
        name: client.name,
      },
    });
  }

  @SubscribeMessage('leave')
  async leaveGame(@ConnectedSocket() socket: Socket): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const { winner, looser, gameDto } = await this.service.leaveGame(client);
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
    const game = await this.service.connectToGame(client, gameId);

    for (const player of game.players) {
      this.notifier.joinGame(player.userId, game.id);
      this.notifier.initData(
        player.userId,
        this.service.getInitedGameData(player.userId, game),
      );
    }
    this.notifier.gameStart(game.players.map((pl) => pl.userId));
    await this.broadcastLobby();
  }

  @SubscribeMessage('move')
  @UseGuards(IsPlayer)
  async move(
    @ConnectedSocket() socket: Socket,
    @MessageBody() turn: TurnBody,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    annotateActiveSpan({
      'chess.game.id': turn.gameId,
      'enduser.id': client.userId,
    });
    const { result, prevCell, side } = await this.metrics.trackMove(() =>
      this.service.makeTurn(turn.gameId, client.userId, turn),
    );
    this.notifier.toGame(turn.gameId, Game.boardUpdate, {
      effect: result,
      update: { figure: turn.figure, cell: turn.cell, prevCell, side },
    });
  }

  @SubscribeMessage('chat-message')
  @UseGuards(IsPlayer)
  async chatMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId, text }: ChatMessage,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const message = await this.service.pushMessage(gameId, text, client);
    this.notifier.toGame(gameId, Game.message, message);
  }

  @SubscribeMessage('surrender')
  @UseGuards(IsPlayer)
  async surrender(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    annotateActiveSpan({ 'chess.game.id': gameId });
    const client = this.clientStore.getClient(socket);
    const { winner, looser, gameDto } = await this.service.surrender(
      gameId,
      client,
    );
    this.notifier.gameEnd(winner.userId, true, gameDto, GameEnd.surrender);
    this.notifier.gameEnd(looser.userId, false, gameDto, GameEnd.surrender);
  }

  @SubscribeMessage('draw_propose')
  @UseGuards(IsPlayer)
  async drawPropose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const propose = await this.service.proposeDraw(gameId, client);
    this.notifier.toGame(gameId, Game.drawPropose, propose);
  }

  @SubscribeMessage('draw_accept')
  @UseGuards(IsPlayer)
  async acceptPropose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const game = await this.service.acceptDraw(gameId, client);
    this.notifier.toGame(gameId, Game.end, { reason: GameEnd.draw, game });
  }

  @SubscribeMessage('draw_reject')
  @UseGuards(IsPlayer)
  async rejectPropose(
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    const result = await this.service.rejectDraw(gameId);
    this.notifier.toGame(gameId, Game.rejectDraw, result);
  }

  @SubscribeMessage('add_time')
  @UseGuards(IsPlayer)
  async addTime(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    const client = this.clientStore.getClient(socket);
    const result = await this.service.addTimeToAnotherPlayer(gameId, client);
    this.notifier.toGame(gameId, Game.addTime, result);
  }
}
