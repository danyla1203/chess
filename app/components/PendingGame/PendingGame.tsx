'use client';

import { useGameList } from '@/context/GameListContext';

export function PendingGame() {
  const { pendingGame, rejoin } = useGameList();

  if (!pendingGame) return null;

  return <div onClick={() => rejoin(pendingGame)}>Pending Game</div>;
}
