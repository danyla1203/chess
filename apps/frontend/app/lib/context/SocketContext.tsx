'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { io, type Socket } from 'socket.io-client';
import {
  User,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@chess/contract';
import { getAnonymousGames } from '../utils';
import { useUserState } from './UserContext';
import { Loader } from '@chess/ui';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const WebSocketContext = createContext<GameSocket | null>(null);

export const useWebSocket = (): GameSocket => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

const createSocket = (token: string | null): GameSocket =>
  io(`${process.env.NEXT_PUBLIC_WS_HOST}/game?Authorization=${token}`, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
  });

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { updateUser } = useUserState();
  console.warn(process.env.NEXT_PUBLIC_WS_HOST);
  const authConnection = (accessToken: string) => createSocket(accessToken);

  const anonConnection = () => {
    const anonToken = localStorage.getItem('anon-token');
    const socket = createSocket(anonToken);
    socket.on(User.anonymousToken, ({ tempToken, userId }) => {
      if (tempToken !== anonToken) {
        localStorage.removeItem('anon-games');
      }
      const gamesStats = getAnonymousGames(userId);
      updateUser({
        userId,
        name: 'Anonymous',
        balance: 0,
        invoices: [],
        winningBalance: 0,
        isAuthorized: false,
        createdAt: '',
        ...gamesStats,
      });
      localStorage.setItem('anon-token', tempToken);
    });
    return socket;
  };

  useEffect(() => {
    // TODO: Potential XSS vulnerability, change it in future
    const accessToken = localStorage.getItem('accessToken');
    let newSocket: GameSocket;
    if (!accessToken) newSocket = anonConnection();
    else newSocket = authConnection(accessToken);

    const onConnect = () => setConnectionError(null);
    const onConnectError = (err: Error) => {
      console.error('WebSocket connection error:', err);
      if (!newSocket.active) {
        setConnectionError(err.message || 'Connection rejected by server');
      }
    };
    const onReconnectFailed = () => {
      setConnectionError('Unable to reach the game server');
    };

    newSocket.on('connect', onConnect);
    newSocket.on('connect_error', onConnectError);
    newSocket.io.on('reconnect_failed', onReconnectFailed);

    setSocket(newSocket);
    return () => {
      newSocket.off('connect', onConnect);
      newSocket.off('connect_error', onConnectError);
      newSocket.io.off('reconnect_failed', onReconnectFailed);
      newSocket.disconnect();
    };
  }, []);

  const retry = () => {
    setConnectionError(null);
    socket?.connect();
  };

  if (!socket) {
    return <Loader />;
  }

  if (connectionError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-lg font-semibold">Connection lost</p>
        <p className="text-default-500">{connectionError}</p>
        <Button color="primary" onPress={retry}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <WebSocketContext.Provider value={socket}>
      {children}
    </WebSocketContext.Provider>
  );
};
