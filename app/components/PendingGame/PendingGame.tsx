'use client';

import { useGameList } from '@/context/GameListContext';

export function PendingGame() {
  const { pendingGame, rejoin } = useGameList();

  if (!pendingGame) return null;

  return (
    <div
      className="cursor-pointer flex items-center justify-center absolute shadow-md top-0 left-1/2 p-4 px-10 transform -translate-x-1/2 bg-yellow-300"
      onClick={() => rejoin(pendingGame)}
    >
      <div className="mr-3 animate-spin rounded-full h-6 w-6 border-t-2 border-amber-600 border-r-2 border-b-2 border-gray-300"></div>
      Pending Game
    </div>
  );
}
