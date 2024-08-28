import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  WebSocketServer,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WsValidationFilter } from '../tools/WsValidationFilter';
import { GameService } from './game.service';
import { ConnectToGameDto, CreateGameDto, TurnBody, ChatMessage } from './dto';
import { Game, GameEnd, Lobby, room } from './EmitTypes';
import { ConnectionPatchProvider } from './connection.provider';
import { ClientStore } from './ClientStore';
import { IsBalanceEnough, IsPlayer } from './guards';

@WebSocketGateway({ namespace: 'game', cors: true, transports: ['websocket'] })
@UsePipes(new ValidationPipe())
@UseFilters(new WsValidationFilter())
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly service: GameService,
    private readonly connService: ConnectionPatchProvider,
    private readonly clientStore: ClientStore,
  ) {}

  @WebSocketServer()
  server: Server;

  handleDisconnect(socket: Socket) {
    const client = this.clientStore.getClient(socket.id);
    this.service.removeInitedGamesBy(client);
    const opponent = this.service.findCurrentOpponent(client);
    if (opponent) {
      opponent.opponentDisconnectedEvent();
    }
    const lobby = this.service.getLobby();
    this.server.emit(Lobby.update, lobby);
  }

  async handleConnection(socket: Socket) {
    const client = await this.connService.processClient(socket);
    this.clientStore.setClient(socket.id, client);
    if (!client.authorized) {
      client.anonymouseTokenEvent();
    }
    try {
      const game = this.service.findPendingGame(client);
      client.pendingGameEvent(game.id);
    } catch (e) {}

    client.lobbyUpdateEvent(this.service.getLobby());
  }

  @SubscribeMessage('create')
  @UseGuards(IsBalanceEnough)
  async createGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() config: CreateGameDto,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket.id);
    const game = await this.service.createGame(client, config);
    client.join(game.id);
    client.gameCreatedEvent(game);

    const lobby = this.service.getLobby();
    this.server.emit(Lobby.update, lobby);
  }

  @SubscribeMessage('rejoin')
  rejoinGame(@ConnectedSocket() socket: Socket): void {
    const client = this.clientStore.getClient(socket.id);
    const game = this.service.findPendingGame(client);
    client.join(game.id);
    const player = game.players.find((pl) => pl.userId === client.userId);
    player.initedGameDataEvent(
      this.service.getInitedGameData(client.userId, game),
    );
    this.server.to(room(game.id)).emit(Game.playerReconected, {
      opponent: {
        id: client.userId,
        name: client.name,
      },
    });
  }
  @SubscribeMessage('leave')
  async leaveGame(@ConnectedSocket() socket: Socket): Promise<void> {
    const client = this.clientStore.getClient(socket.id);
    const { winner, looser, gameDto } = await this.service.leaveGame(client);
    winner.gameEndEvent(true, gameDto, GameEnd.playerLeave);
    looser.gameEndEvent(false, gameDto, GameEnd.playerLeave);
  }
  @SubscribeMessage('join')
  @UseGuards(IsBalanceEnough)
  async joinGame(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: ConnectToGameDto,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket.id);
    const game = await this.service.connectToGame(client, gameId);
    client.join(game.id);

    for (const player of game.players) {
      player.initedGameDataEvent(
        this.service.getInitedGameData(player.userId, game),
      );
    }
    this.server.to(room(game.id)).emit(Game.start);
    game.start();
    const lobby = this.service.getLobby();
    this.server.emit(Lobby.update, lobby);
  }

  @SubscribeMessage('move')
  @UseGuards(IsPlayer)
  async move(
    @ConnectedSocket() socket: Socket,
    @MessageBody() turn: TurnBody,
  ): Promise<void> {
    const client = this.clientStore.getClient(socket.id);
    const { result, prevCell, side } = await this.service.makeTurn(
      turn.gameId,
      client.userId,
      turn,
    );
    this.server.to(room(turn.gameId)).emit(Game.boardUpdate, {
      effect: result,
      update: { figure: turn.figure, cell: turn.cell, prevCell, side },
    });
  }

  @SubscribeMessage('chat-message')
  @UseGuards(IsPlayer)
  chatMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId, text }: ChatMessage,
  ): void {
    const client = this.clientStore.getClient(socket.id);
    const message = this.service.pushMessage(gameId, text, client);
    this.server.to(room(gameId)).emit(Game.message, message);
  }

  @SubscribeMessage('surrender')
  @UseGuards(IsPlayer)
  async surrender(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    const client = this.clientStore.getClient(socket.id);
    const { winner, looser, gameDto } = await this.service.surrender(
      gameId,
      client,
    );
    winner.gameEndEvent(true, gameDto, GameEnd.surrender);
    looser.gameEndEvent(false, gameDto, GameEnd.surrender);
  }

  @SubscribeMessage('draw_propose')
  @UseGuards(IsPlayer)
  drawPropose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): void {
    const client = this.clientStore.getClient(socket.id);
    const propose = this.service.proposeDraw(gameId, client);
    this.server.to(room(gameId)).emit(Game.drawPropose, propose);
  }

  @SubscribeMessage('draw_accept')
  @UseGuards(IsPlayer)
  async acceptPropose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): Promise<void> {
    const client = this.clientStore.getClient(socket.id);
    const game = await this.service.acceptDraw(gameId, client);
    this.server.to(room(gameId)).emit(Game.end, { reason: GameEnd.draw, game });
  }

  @SubscribeMessage('draw_reject')
  @UseGuards(IsPlayer)
  rejectPropose(@MessageBody() { gameId }: { gameId: number }): void {
    const result = this.service.rejectDraw(gameId);
    this.server.to(room(gameId)).emit(Game.rejectDraw, result);
  }

  @SubscribeMessage('add_time')
  @UseGuards(IsPlayer)
  addTime(
    @ConnectedSocket() socket: Socket,
    @MessageBody() { gameId }: { gameId: number },
  ): void {
    const client = this.clientStore.getClient(socket.id);
    const result = this.service.addTimeToAnotherPlayer(gameId, client);
    this.server.to(room(gameId)).emit(Game.addTime, result);
  }
}
