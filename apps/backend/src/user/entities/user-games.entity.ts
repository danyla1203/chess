import { Prisma } from '@prisma/client';

export class UserGames {
  id: number;
  maxTime: number;
  timeIncrement: number;
  sideSelecting: string;
  isDraw: boolean;
  moves: Prisma.JsonValue;
  bet: number;
  createdAt: Date;
  players: {
    userId: number;
    side: string;
    isWinner: boolean;
    user: {
      id: number;
      name: string;
    };
  }[];
}
