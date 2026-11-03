export type GameEndReason =
  'surrender' | 'timeout' | 'draw' | 'mate' | 'playerLeave';

export type GameEndedPlayer = {
  userId: number;
  name: string;
  side: 'w' | 'b';
  authorized: boolean;
  isWinner: boolean;
};

export type GameEndedEvent = {
  matchId: string;
  gameId: number;
  reason: GameEndReason;
  isDraw: boolean;
  endedAt: string;
  config: {
    side: 'w' | 'b' | 'rand';
    time: number;
    timeIncrement: number;
    bet: number;
  };
  moves: unknown[];
  players: GameEndedPlayer[];
};
