import { Game } from '@chess/contract';
import { useWebSocket } from '@/context/SocketContext';
import { type OpponentLeavePayload } from '../types';
import { useState, useEffect, createContext, useContext } from 'react';

type OpponentEvent = { opponent: OpponentLeavePayload };

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
    const onDisconnected = ({ opponent }: OpponentEvent) => {
      const copy = { ...playersInGame };
      copy[opponent.side] = false;
      setConnectionStatus(copy);
    };
    const onReconnected = ({ opponent }: OpponentEvent) => {
      const copy = { ...playersInGame };
      copy[opponent.side] = true;
      setConnectionStatus(copy);
    };
    socket.on(Game.playerDiconnected, onDisconnected as () => void);
    socket.on(Game.playerReconected, onReconnected as (p: unknown) => void);
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
