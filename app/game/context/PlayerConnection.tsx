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
      Game.playerDiconnected,
      ({ opponent }: { opponent: OpponentLeavePayload }) => {
        const copy = { ...playersInGame };
        copy[opponent.side] = false;
        setConnectionStatus(copy);
      },
    );
    socket.on(
      Game.playerReconected,
      ({ opponent }: { opponent: OpponentLeavePayload }) => {
        const copy = { ...playersInGame };
        copy[opponent.side] = true;
        setConnectionStatus(copy);
      },
    );
    return () => {
      socket.off(Game.playerDiconnected);
      socket.off(Game.playerReconected);
    };
  }, []);

  return (
    <PlayerConnectionCtx.Provider value={playersInGame}>
      {children}
    </PlayerConnectionCtx.Provider>
  );
};
