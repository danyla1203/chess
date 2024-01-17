'use client';

import { useGameList } from '@/context/GameListContext';
import { Button, Spinner } from '@nextui-org/react';

export function PendingGame() {
  const { pendingGame, rejoin } = useGameList();

  if (!pendingGame) return null;

  const startContent = <Spinner color="warning" size="sm" className="mr-2" />;

  return (
    <Button
      color="primary"
      startContent={startContent}
      onClick={() => rejoin(pendingGame)}
    >
      Pending Game
    </Button>
  );
}
