import { useEffect, useState } from 'react';
import { useWebSocket, Game } from '@/context/SocketContext';
import { Timer } from './Timers';

export function TimersController({
  maxTime,
  plaingSide,
}: {
  maxTime: number;
  plaingSide: 'w' | 'b';
}) {
  const socket = useWebSocket();
  const [wTime, setWTime] = useState(maxTime);
  const [bTime, setBTime] = useState(maxTime);

  useEffect(() => {
    socket.on(Game.timeTick, ({ w, b }) => {
      setWTime(w);
      setBTime(b);
    });
    socket.on(Game.addTime, ({ w, b }) => {
      setWTime(w);
      setBTime(b);
    });
  }, []);

  return (
    <div>
      {plaingSide === 'b' ? <Timer time={wTime} /> : <Timer time={bTime} />}
      {plaingSide === 'b' ? <Timer time={bTime} /> : <Timer time={wTime} />}
    </div>
  );
}
