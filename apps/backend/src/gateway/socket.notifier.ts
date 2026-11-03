import { Injectable } from '@nestjs/common';
import type { Namespace } from 'socket.io';
import { Game as GameEvent } from '@chess/contract';
import { userRoom, room } from '../infrastructure/socket/rooms';

export { userRoom };

@Injectable()
export class SocketNotifier {
  private server: Namespace;

  public bind(server: Namespace): void {
    this.server = server;
  }

  public toGame(gameId: number, event: string, payload?: unknown): void {
    if (payload === undefined) {
      this.server.to(room(gameId)).emit(event);
    } else {
      this.server.to(room(gameId)).emit(event, payload);
    }
  }

  public opponentDisconnected(userId: number): void {
    this.server.to(userRoom(userId)).emit(GameEvent.playerDiconnected);
  }
}
