import { useState, useEffect, useContext, createContext } from 'react';

import { useWebSocket, Game, Emit } from '@/context/SocketContext';
import { InitedGameData } from '../types';
import { useSearchParams } from 'next/navigation';
import { TimerProvider } from './Timer';
import { BoardProvider } from './Board';
import { StrikedProvider } from './Striked';
import { ChatProvider } from './Chat';

const GameContext = createContext<InitedGameData>({
  board: { w: {}, b: {} },
  gameId: 0,
  side: 'w',
  maxTime: 0,
  timeIncrement: 0,
});

export const useConfigContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [initData, setInitData] = useState<InitedGameData | null>(null);
  const socket = useWebSocket();
  const params = useSearchParams();

  useEffect(() => {
    if (params.get('action') === 'join') {
      const gameId = parseInt(params.get('id') as string);
      socket.volatile.emit(Emit.gameJoin, { gameId });
    }
    socket.on(Game.init, (payload: InitedGameData) => {
      setInitData(payload);
      socket.removeAllListeners(Game.init);
    });
  }, []);

  if (!initData) return <div>Loading...</div>;

  return (
    <GameContext.Provider value={initData}>
      <BoardProvider initBoard={initData.board}>
        <StrikedProvider>
          <TimerProvider maxTime={initData.maxTime}>
            <ChatProvider>{children}</ChatProvider>
          </TimerProvider>
        </StrikedProvider>
      </BoardProvider>
    </GameContext.Provider>
  );
}
