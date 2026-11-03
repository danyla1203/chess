import { Injectable } from '@nestjs/common';
import { Game as GameEvent } from '@chess/contract';
import type { OpponentPresence, ServerToClientEvents } from '@chess/contract';
import { userRoom, room } from '../infrastructure/socket/rooms';
import type { GameNamespace } from '../infrastructure/socket/socket.types';

export { userRoom };

@Injectable()
export class SocketNotifier {
  private server: GameNamespace;

  public bind(server: GameNamespace): void {
    this.server = server;
  }

  public toGame<E extends keyof ServerToClientEvents>(
    gameId: number,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void {
    this.server.to(room(gameId)).emit(event, ...args);
  }

  public opponentDisconnected(
    opponentId: number,
    presence: OpponentPresence,
  ): void {
    this.server
      .to(userRoom(opponentId))
      .emit(GameEvent.playerDiconnected, presence);
  }

  public opponentReconnected(gameId: number, presence: OpponentPresence): void {
    this.toGame(gameId, GameEvent.playerReconected, presence);
  }
}
