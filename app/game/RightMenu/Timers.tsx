import { useState } from 'react';
import { useWebSocket, Game } from '@/context/SocketContext';
import { InitedGameData } from '../types';

export function Timers({ initData }: { initData: InitedGameData }) {
  const socket = useWebSocket();
  const [wTime, setWTime] = useState(initData.maxTime);
  const [bTime, setBTime] = useState(initData.maxTime);

  socket.on(Game.timeTick, ({ w, b }) => {
    setWTime(w);
    setBTime(b);
  });
  socket.on(Game.addTime, ({ w, b }) => {
    setWTime(w);
    setBTime(b);
  });

  return (
    <div>
      {initData.side === 'b' ? <div>{wTime}</div> : <div>{bTime}</div>}
      {initData.side === 'b' ? <div>{bTime}</div> : <div>{wTime}</div>}
    </div>
  );
}
