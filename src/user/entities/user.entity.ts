import { Prisma } from '@prisma/client';

export class User {}

export const prismaSelectUserProfile = {
  id: true,
  name: true,
  email: true,
  balance: true,
  winningBalance: true,
  createdAt: true,
};

export class UserProfile {
  id: number;
  name: string;
  email: string;
  balance: number;
  winningBalance: number;
  createdAt: Date;
}
export class InternalAuthorizedUserFields {
  id: number;
  name: string;
  deviceId: string;
}

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
