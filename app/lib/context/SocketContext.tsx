'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export enum Lobby {
  update = 'lobby:update',
}
export enum Game {
  pendingGame = 'game:pending-one',
  created = 'game:created',
  init = 'game:init-data',
  start = 'game:start',
  shah = 'game:shah',
  mate = 'game:mate',
  draw = 'game:draw',
  rejectDraw = 'game:draw_rejected',
  addTime = 'game:add-time',
  timeTick = 'game:time',
  end = 'game:end',
  strike = 'game:strike',
  boardUpdate = 'game:board-update',
  message = 'game:chat-message',
  surrender = 'game:surrender',
  drawPurpose = 'game:draw_purpose',
  playerLeave = 'game:opponent-leave',
  playerReconected = 'game:player-reconnected',
}
export enum User {
  anonymousToken = 'user:anon-token',
}

export enum Emit {
  createGame = 'create',
  gameJoin = 'join',
  gameRejoin = 'rejoin',
  figureMove = 'move',
  pushMessage = 'chat-message',
  addTime = 'add_time',
}

export const WebSocketContext = createContext<Socket | null>(null);

export const useWebSocket = (): Socket => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  const authConnection = (accessToken: string) => {
    return io(`ws://localhost:8080/game?Authorization=${accessToken}`, {
      transports: ['websocket'],
      retries: 3,
    });
  };

  const anonConnection = () => {
    const anonToken = localStorage.getItem('anon-token');
    const socket = io(`ws://localhost:8080/game?Authorization=${anonToken}`, {
      transports: ['websocket'],
      retries: 3,
    });
    socket.on(User.anonymousToken, (token: string) => {
      localStorage.setItem('anon-token', token);
    });
    return socket;
  };

  useEffect(() => {
    // TODO: Potential XSS vulnerability, change it in future
    const accessToken = localStorage.getItem('accessToken');
    let newSocket: Socket;
    if (!accessToken) newSocket = anonConnection();
    else newSocket = authConnection(accessToken);

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);
  if (!socket) {
    return <div>Loading...</div>;
  }

  socket.io.on('error', (e) => {
    console.log(e);
  });

  return (
    <WebSocketContext.Provider value={socket}>
      {children}
    </WebSocketContext.Provider>
  );
};
