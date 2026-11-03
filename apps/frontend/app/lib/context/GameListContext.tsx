'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lobby,
  Game,
  Emit,
  type GameData as LobbyGame,
  type GameConfig,
} from '@chess/contract';
import { useWebSocket } from './SocketContext';

export type GameData = {
  id: string;
  key: string;
  cnf: {
    time: number;
    inc: number;
  };
  sidepick: GameConfig['side'];
  opponent: string;
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

const toGameData = (g: LobbyGame): GameData => ({
  id: String(g.id),
  key: String(g.id),
  sidepick: g.config.side,
  cnf: {
    inc: Math.floor(g.config.timeIncrement / 1000),
    time: Math.floor(g.config.time / (1000 * 60)),
  },
  opponent: g.players[0].name,
});

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
  const leave = (_gameId: number) => {
    socket.volatile.emit(Emit.leave);
  };

  useEffect(() => {
    socket.on(Lobby.update, (payload) => {
      setGames(payload.map(toGameData));
    });
    socket.on(Lobby.added, (payload) => {
      const game = toGameData(payload);
      setGames((games) => [...games.filter((g) => g.id !== game.id), game]);
    });
    socket.on(Lobby.removed, ({ gameId }) => {
      setGames((games) => games.filter((g) => g.id !== String(gameId)));
    });
    socket.on(Game.pendingGame, ({ gameId }) => {
      setPendingGame(gameId);
    });
    socket.on(Game.end, () => {
      setPendingGame(null);
    });
    socket.on(Game.playerReconected, () => {
      setPendingGame(null);
    });
    const onInit = () => setPendingGame(null);
    socket.on(Game.init, onInit);
    return () => {
      socket.off(Game.init, onInit);
      socket.off(Lobby.update);
      socket.off(Lobby.added);
      socket.off(Lobby.removed);
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
