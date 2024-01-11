'use client';

import { useState, useEffect } from 'react';
import { Game, Emit, useWebSocket } from '@/context/SocketContext';
import { RightMenu } from './RightMenu';
import { Figure, Cell, InitedGameData } from './types';
import { Board } from './Board';

import './chessPieces.scss';
import { useSearchParams } from 'next/navigation';

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

  const moveFigure = (figure: Figure, cell: Cell) => {
    socket.emit(Emit.figureMove, { gameId: initData.gameId, figure, cell });
  };

  return (
    <div className="flex">
      <Board isActive initData={initData} moveFigure={moveFigure} />
      <RightMenu initData={initData} />
    </div>
  );
}
