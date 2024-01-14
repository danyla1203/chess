'use client';

import { BoardController } from './Board.controller';
import { RightMenu } from './RightMenu';
import { GameProvider } from './context';

import './chessPieces.scss';
import { Chat } from './Chat';

export default function Page() {
  return (
    <div className="flex">
      <GameProvider>
        <Chat />
        <BoardController />
        <RightMenu />
      </GameProvider>
    </div>
  );
}
