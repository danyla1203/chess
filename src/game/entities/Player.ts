import { Client } from './Client';
import { GameEnd, Game as GameEvent } from '../EmitTypes';
import { InitedGameData } from '../dto';

export class Player {
  side: 'w' | 'b';
  time: number;
  intervalLabel?: NodeJS.Timeout;
  turningPlayer?: boolean;
  client: Client;

  constructor(client: Client, side: 'w' | 'b', allTime: number) {
    this.client = client;
    this.side = side;
    this.time = allTime;
    this.turningPlayer = false;
  }
  public opponentDisconnectedEvent(): void {
    this.client.socket.emit(GameEvent.playerDiconnected);
  }
  public gameEndEvent(winner: boolean, game, reason: GameEnd): void {
    this.client.socket.emit(GameEvent.end, { winner, game, reason });
  }
  public timeTickEvent(sides: { w: number; b: number }): void {
    this.client.socket.emit(GameEvent.timeTick, sides);
  }
  public initedGameDataEvent(data: InitedGameData): void {
    this.client.socket.emit(GameEvent.init, data);
  }

  get name(): string {
    return this.client.name;
  }
  get userId(): number {
    return this.client.userId;
  }
  get authorized(): boolean {
    return this.client.authorized;
  }
}
