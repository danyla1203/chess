'use client';

import { useGameList } from '@/context/GameListContext';

export function PendingGame() {
  const { pendingGame, rejoin } = useGameList();

  if (!pendingGame) return null;

  return (
    <div
      className="cursor-pointer flex items-center justify-center shadow-md p-2 px-4 bg-yellow-300"
      onClick={() => rejoin(pendingGame)}
    >
      <div className="mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-amber-600 border-r-2 border-b-2 border-gray-300"></div>
      Pending Game
    </div>
  );
}
