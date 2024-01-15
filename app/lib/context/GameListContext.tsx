'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lobby, useWebSocket } from './SocketContext';

type PlayerData = {
  id: string;
  name: string;
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
  connect: (gameId: string) => void;
};

export const GameListContext = createContext<GameList>({
  games: [],
  connect: () => {
    throw new Error('Game list context is not set');
  },
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
  const socket = useWebSocket();
  const router = useRouter();

  const connect = (gameId: string) => {
    router.push(`/game?action=join&id=${gameId}`);
  };

  useEffect(() => {
    socket.on(Lobby.update, (payload: GameData[]) => {
      setGames(payload);
    });
    return () => {
      socket.off(Lobby.update);
    };
  }, []);

  return (
    <GameListContext.Provider value={{ games, connect }}>
      {children}
    </GameListContext.Provider>
  );
};
