import { Game, useWebSocket } from '@/context/SocketContext';

import { useState, useEffect, createContext, useContext } from 'react';

const TimerContext = createContext({
  w: 0,
  b: 0,
});

export const useTimers = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

export const TimerProvider = ({
  maxTime,
  children,
}: {
  maxTime: number;
  children: React.ReactNode;
}) => {
  const socket = useWebSocket();
  const [sideTimes, setTime] = useState({ w: maxTime, b: maxTime });

  const updateTimers = (newState: { w: number; b: number }) => {
    setTime(newState);
  };

  useEffect(() => {
    socket.on(Game.timeTick, (newState) => {
      updateTimers(newState);
    });
    socket.on(Game.addTime, (newState) => {
      updateTimers(newState);
    });
    return () => {
      socket.off(Game.timeTick);
      socket.off(Game.addTime);
    };
  }, []);

  return (
    <TimerContext.Provider value={sideTimes}>{children}</TimerContext.Provider>
  );
};
