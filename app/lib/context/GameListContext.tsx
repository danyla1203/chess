'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lobby, Game, useWebSocket } from './SocketContext';

type PlayerData = {
  name: string;
  userId: number;
};

export type GameData = {
  id: string;
  spectators: number;
  players: PlayerData[];
  isActive: boolean;
  config: {
    time: number;
    timeIncrement: number;
    side: 'w' | 'b' | 'rand';
  };
};

export type GameList = {
  games: GameData[];
  pendingGame: number | null;
  connect: (gameId: string) => void;
  rejoin: (gameId: number) => void;
};

export const GameListContext = createContext<GameList>({
  games: [],
  connect: () => {
    throw new Error('Game list context is not set');
  },
  rejoin: () => {
    throw new Error('Game list context is not set');
  },
  pendingGame: null,
});

export const useGameList = () => {
  const context = useContext(GameListContext);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

export const GameListProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [games, setGames] = useState<GameData[]>([]);
  const [pendingGame, setPendingGame] = useState<number | null>(null);
  const socket = useWebSocket();
  const router = useRouter();

  const connect = (gameId: string) => {
    router.push(`/game?action=join&id=${gameId}`);
  };
  const rejoin = (gameId: number) => {
    router.push(`/game?action=rejoin&id=${gameId}`);
  };

  useEffect(() => {
    socket.on(Lobby.update, (payload: GameData[]) => {
      setGames(payload);
    });
    socket.on(Game.pendingGame, ({ gameId }: { gameId: number }) => {
      setPendingGame(gameId);
    });
    socket.on(Game.playerReconected, () => {
      setPendingGame(null);
    });
    return () => {
      socket.off(Lobby.update);
    };
  }, []);

  return (
    <GameListContext.Provider value={{ games, pendingGame, connect, rejoin }}>
      {children}
    </GameListContext.Provider>
  );
};
