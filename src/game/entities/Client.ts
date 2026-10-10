import { Socket } from 'socket.io';
import { Game as GameEvent, Lobby, room, User } from '../EmitTypes';
import { Game, GameData } from './game';

export class Client {
  authorized: boolean;
  name: string;
  userId: number;
  socket: Socket;
  anonymousTempToken?: string;

  constructor(socket: Socket) {
    this.socket = socket;
  }
  public lobbyUpdateEvent(lobby: GameData[]): void {
    this.socket.emit(Lobby.update, lobby);
  }
  public anonymouseTokenEvent(): void {
    this.socket.emit(User.anonymousToken, {
      tempToken: this.anonymousTempToken,
      userId: this.userId,
    });
  }
  public pendingGameEvent(gameId: number): void {
    this.socket.emit(GameEvent.pendingGame, { gameId });
  }
  public gameCreatedEvent(game: Game): void {
    this.socket.emit(GameEvent.created, { gameId: game.id });
  }
  public join(gameId: number): void {
    void this.socket.join(room(gameId));
  }
}
