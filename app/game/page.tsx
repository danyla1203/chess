'use client';

import { useState } from 'react';
import { Game, Emit, useWebSocket } from '@/context/SocketContext';
import { RightMenu } from './RightMenu';
import { Figure, Cell, InitedGameData } from './types';
import { Board } from './Board';

import './chessPieces.scss';

export default function Page() {
  const [initData, setInitData] = useState<InitedGameData | null>(null);
  const socket = useWebSocket();

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
