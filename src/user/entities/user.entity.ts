import { Prisma } from '@prisma/client';

export class User {}

export const prismaSelectUserProfile = {
  id: true,
  name: true,
  email: true,
  balance: true,
  winningBalance: true,
};

export class UserProfile {
  id: number;
  name: string;
  email: string;
  balance: number;
  winningBalance: number;
}
export class PublicUserFields {
  id: number;
  name: string;
}

export class UserGames {
  id: number;
  maxTime: number;
  timeIncrement: number;
  sideSelecting: string;
  isDraw: boolean;
  moves: Prisma.JsonValue;
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
