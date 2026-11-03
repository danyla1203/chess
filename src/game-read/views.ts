import type { GameData } from '../domain/game/entities/game';

export type LobbyView = GameData;

export type UserView = {
  gameId: number;
  status: 'lobby' | 'active';
  opponentId: number | null;
};
