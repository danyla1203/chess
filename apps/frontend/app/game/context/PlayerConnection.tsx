import { Game } from '@chess/contract';
import { useWebSocket } from '@/context/SocketContext';
import { useState, useEffect, createContext, useContext } from 'react';
import { useConfigContext } from '.';

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
  const { side } = useConfigContext();
  const [playersInGame, setConnectionStatus] = useState({ w: true, b: true });

  useEffect(() => {
    const opponentSide = side === 'w' ? 'b' : 'w';
    const onDisconnected = () =>
      setConnectionStatus((status) => ({ ...status, [opponentSide]: false }));
    const onReconnected = () =>
      setConnectionStatus((status) => ({ ...status, [opponentSide]: true }));
    socket.on(Game.playerDiconnected, onDisconnected);
    socket.on(Game.playerReconected, onReconnected);
    return () => {
      socket.off(Game.playerDiconnected, onDisconnected);
      socket.off(Game.playerReconected, onReconnected);
    };
  }, [side]);

  return (
    <PlayerConnectionCtx.Provider value={playersInGame}>
      {children}
    </PlayerConnectionCtx.Provider>
  );
};
