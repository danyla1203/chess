import { Game, type Figure, type StrikedData } from '@chess/contract';
import { useWebSocket } from '@/context/SocketContext';

import { useState, useEffect, createContext, useContext } from 'react';

type StrikedContext = {
  w: Figure[];
  b: Figure[];
};

const StrikedContext = createContext<StrikedContext>({
  w: [],
  b: [],
});

export const useStrikedFigures = () => {
  const context = useContext(StrikedContext);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

export const StrikedProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const socket = useWebSocket();
  const [striked, setStrikedFigures] = useState<StrikedContext>({
    w: [],
    b: [],
  });

  const updateStrikedFigures = ({ figure, strikedSide }: StrikedData) => {
    const copy = { ...striked };
    copy[strikedSide].push(figure);
    setStrikedFigures(copy);
  };

  useEffect(() => {
    socket.on(Game.boardUpdate, ({ effect }) => {
      if (effect.strike) updateStrikedFigures(effect.strike);
    });
  }, []);

  return (
    <StrikedContext.Provider value={striked}>
      {children}
    </StrikedContext.Provider>
  );
};
