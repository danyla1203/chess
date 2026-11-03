import {
  Game,
  Emit,
  type BoardUpdate,
  type ClockState,
  type InitedGameData,
} from '@chess/contract';
import { useWebSocket } from '@/context/SocketContext';

import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useConfigContext } from '.';

const RENDER_INTERVAL_MS = 100;

type Anchor = { clock: ClockState; receivedAt: number };
type SideTimes = { w: number; b: number };

const project = ({ clock, receivedAt }: Anchor, at: number): SideTimes => {
  const elapsed = at - receivedAt;
  return {
    w: clock.running === 'w' ? Math.max(0, clock.w - elapsed) : clock.w,
    b: clock.running === 'b' ? Math.max(0, clock.b - elapsed) : clock.b,
  };
};

const TimerContext = createContext({
  w: 0,
  b: 0,
  addTime: () => {
    console.error('No function');
  },
});

export const useTimers = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

export const TimerProvider = ({
  initialClock,
  children,
}: {
  initialClock: ClockState;
  children: React.ReactNode;
}) => {
  const socket = useWebSocket();
  const cnf = useConfigContext();
  const anchor = useRef<Anchor>({ clock: initialClock, receivedAt: 0 });
  const [sideTimes, setTime] = useState<SideTimes>({
    w: initialClock.w,
    b: initialClock.b,
  });

  const render = () => {
    setTime(project(anchor.current, performance.now()));
  };

  const applyClock = (clock?: ClockState) => {
    if (!clock || clock.serverNow < anchor.current.clock.serverNow) return;
    anchor.current = { clock, receivedAt: performance.now() };
    render();
  };

  const stopClock = () => {
    const now = performance.now();
    anchor.current = {
      clock: {
        ...project(anchor.current, now),
        running: null,
        serverNow: anchor.current.clock.serverNow,
      },
      receivedAt: now,
    };
    render();
  };

  const addTime = () => {
    socket.volatile.emit(Emit.addTime, { gameId: cnf.gameId });
  };

  useEffect(() => {
    anchor.current = { ...anchor.current, receivedAt: performance.now() };
    const onBoardUpdate = ({ clock }: BoardUpdate) => applyClock(clock);
    const onInit = ({ clock }: InitedGameData) => applyClock(clock);

    socket.on(Game.boardUpdate, onBoardUpdate);
    socket.on(Game.addTime, applyClock);
    socket.on(Game.init, onInit);
    socket.on(Game.end, stopClock);
    const timer = setInterval(render, RENDER_INTERVAL_MS);
    document.addEventListener('visibilitychange', render);

    return () => {
      socket.off(Game.boardUpdate, onBoardUpdate);
      socket.off(Game.addTime, applyClock);
      socket.off(Game.init, onInit);
      socket.off(Game.end, stopClock);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', render);
    };
  }, []);

  return (
    <TimerContext.Provider value={{ ...sideTimes, addTime }}>
      {children}
    </TimerContext.Provider>
  );
};
