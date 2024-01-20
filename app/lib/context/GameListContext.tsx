'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lobby, Game, useWebSocket, Emit } from './SocketContext';

type PlayerData = {
  name: string;
  userId: number;
};

export type GameDataPayload = {
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
export type GameData = {
  id: string;
  key: string;
  time: number;
  inc: number;
  opponent: string;
  sidepick: 'w' | 'b' | 'rand';
};

export type GameList = {
  games: GameData[];
  pendingGame: number | null;
  connect: (gameId: string) => void;
  rejoin: (gameId: number) => void;
  leave: (gameId: number) => void;
};

export const GameListContext = createContext<GameList>({
  games: [],
  connect: () => {
    throw new Error('Game list context is not set');
  },
  rejoin: () => {
    throw new Error('Game list context is not set');
  },
  leave: () => {
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
  const leave = (gameId: number) => {
    socket.volatile.emit(Emit.leave, { gameId });
  };

  useEffect(() => {
    socket.on(Lobby.update, (payload: GameDataPayload[]) => {
      const data = payload.map((g) => {
        const beautyMaxTime = Math.floor(g.config.time / (1000 * 60));
        const beautyTimeIncrement = Math.floor(g.config.timeIncrement / 1000);
        return {
          id: g.id,
          key: g.id,
          opponent: g.players[0].name,
          inc: beautyTimeIncrement,
          time: beautyMaxTime,
          sidepick: g.config.side,
        };
      });
      setGames(data);
    });
    socket.on(Game.pendingGame, ({ gameId }: { gameId: number }) => {
      setPendingGame(gameId);
    });
    socket.on(Game.end, () => {
      setPendingGame(null);
    });
    socket.on(Game.playerReconected, () => {
      setPendingGame(null);
    });
    return () => {
      socket.off(Lobby.update);
    };
  }, []);

  return (
    <GameListContext.Provider
      value={{ leave, games, pendingGame, connect, rejoin }}
    >
      {children}
    </GameListContext.Provider>
  );
};
