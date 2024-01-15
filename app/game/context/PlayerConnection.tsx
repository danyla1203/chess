import { Game, useWebSocket } from '@/context/SocketContext';
import { OpponentLeavePayload } from '../types';
import { useState, useEffect, createContext, useContext } from 'react';

const PlayerConnectionCtx = createContext({
  w: true,
  b: true,
});

export const usePlayerConnection = () => {
  const context = useContext(PlayerConnectionCtx);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

export const PlayerConnectionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const socket = useWebSocket();
  const [playersInGame, setConnectionStatus] = useState({ w: true, b: true });

  useEffect(() => {
    socket.on(
      Game.playerLeave,
      ({ opponent }: { opponent: OpponentLeavePayload }) => {
        const copy = { ...playersInGame };
        copy[opponent.side] = false;
        setConnectionStatus(copy);
      },
    );
    return () => {
      socket.off(Game.playerLeave);
    };
  }, []);

  return (
    <PlayerConnectionCtx.Provider value={playersInGame}>
      {children}
    </PlayerConnectionCtx.Provider>
  );
};
