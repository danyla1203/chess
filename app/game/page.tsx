'use client';

import { BoardController } from './Board.controller';
import { RightMenu } from './RightMenu';
import { GameProvider } from './context';

import './chessPieces.scss';

export default function Page() {
  return (
    <div className="flex">
      <GameProvider>
        <BoardController />
        <RightMenu />
      </GameProvider>
    </div>
  );
}
