import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';
import { Game as GameEvent, GameEnd, Lobby, room } from './EmitTypes';
import { InitedGameData, TimeUpdate } from './dto';
import { GameData } from './entities/game';

export const userRoom = (userId: number) => `user:${userId}`;

@Injectable()
export class GameNotifier {
  private server: Namespace;

  public bind(server: Namespace): void {
    this.server = server;
  }

  public lobbyUpdate(lobby: GameData[]): void {
    this.server.emit(Lobby.update, lobby);
  }

  public toGame(gameId: number, event: string, payload?: unknown): void {
    if (payload === undefined) {
      this.server.to(room(gameId)).emit(event);
    } else {
      this.server.to(room(gameId)).emit(event, payload);
    }
  }

  public joinGame(userId: number, gameId: number): void {
    this.server.in(userRoom(userId)).socketsJoin(room(gameId));
  }

  public gameCreated(userId: number, gameId: number): void {
    this.server.to(userRoom(userId)).emit(GameEvent.created, { gameId });
  }

  public gameStart(userIds: number[]): void {
    this.server.to(userIds.map(userRoom)).emit(GameEvent.start);
  }

  public initData(userId: number, data: InitedGameData): void {
    this.server.to(userRoom(userId)).emit(GameEvent.init, data);
  }

  public gameEnd(
    userId: number,
    winner: boolean,
    game: unknown,
    reason: GameEnd,
  ): void {
    this.server
      .to(userRoom(userId))
      .emit(GameEvent.end, { winner, game, reason });
  }

  public timeTick(gameId: number, times: TimeUpdate): void {
    this.server.to(room(gameId)).emit(GameEvent.timeTick, times);
  }

  public opponentDisconnected(userId: number): void {
    this.server.to(userRoom(userId)).emit(GameEvent.playerDiconnected);
  }
}
