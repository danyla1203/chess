'use client';

import { useGameList } from '@/context/GameListContext';
import { Button, Spinner } from '@nextui-org/react';

export function PendingGame() {
  const { pendingGame, rejoin, leave } = useGameList();

  if (!pendingGame) return null;

  const startContent = <Spinner color="warning" size="sm" className="mr-2" />;
  const endContent = (
    <Button size="sm" onClick={() => leave(pendingGame)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </Button>
  );

  return (
    <div className="flex flex-col">
      <Button
        color="primary"
        startContent={startContent}
        endContent={endContent}
        onClick={() => rejoin(pendingGame)}
      >
        Pending Game
      </Button>
    </div>
  );
}
