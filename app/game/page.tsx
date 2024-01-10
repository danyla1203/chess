'use client';

import { useState } from 'react';
import { Game, useWebSocket } from '@/context/SocketContext';
import { RightMenu } from './RightMenu';
import { InitedGameData } from './types';
import { Board } from './Board';

export default function Page() {
  const [initData, setInitData] = useState<InitedGameData | null>(null);
  const socket = useWebSocket();

  socket.on(Game.init, (payload: InitedGameData) => {
    setInitData(payload);
    socket.removeAllListeners(Game.init);
  });

  if (!initData) return <div>Loading...</div>;

  return (
    <div className="flex">
      <Board isActive initData={initData} />
      <RightMenu initData={initData} />
    </div>
  );
}
