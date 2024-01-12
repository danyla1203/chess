'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Game, Emit, useWebSocket } from '@/context/SocketContext';
import { RightMenu } from './RightMenu';
import { InitedGameData } from './types';
import { BoardController } from './Board.controller';

import './chessPieces.scss';

export default function Page() {
  const [initData, setInitData] = useState<InitedGameData | null>(null);
  const params = useSearchParams();
  const socket = useWebSocket();

  useEffect(() => {
    if (params.get('action') === 'join') {
      const gameId = parseInt(params.get('id') as string);
      socket.volatile.emit(Emit.gameJoin, { gameId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  socket.on(Game.init, (payload: InitedGameData) => {
    setInitData(payload);
    socket.removeAllListeners(Game.init);
  });

  if (!initData) return <div>Loading...</div>;

  return (
    <div className="flex">
      <BoardController initData={initData} />
      <RightMenu initData={initData} />
    </div>
  );
}
