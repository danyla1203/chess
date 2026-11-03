import type { PlayerSnapshot } from './game/game.types';

type Identity = { userId: number; name: string; authorized: boolean };

export class Player {
  userId: number;
  name: string;
  authorized: boolean;
  side: 'w' | 'b';
  time: number;

  constructor(identity: Identity, side: 'w' | 'b', allTime: number) {
    this.userId = identity.userId;
    this.name = identity.name;
    this.authorized = identity.authorized;
    this.side = side;
    this.time = allTime;
  }

  public toSnapshot(): PlayerSnapshot {
    return {
      userId: this.userId,
      name: this.name,
      authorized: this.authorized,
      side: this.side,
      time: this.time,
    };
  }

  public static fromSnapshot(snapshot: PlayerSnapshot): Player {
    return new Player(snapshot, snapshot.side, snapshot.time);
  }
}
