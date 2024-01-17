'use client';

import { BoardController } from './Board.controller';
import { RightMenu } from './RightMenu';
import { GameProvider } from './context';

import './chessPieces.scss';
import { Chat } from './Chat';

export default function Page() {
  return (
    <div className="h-[calc(100vh-70px)] flex flex-col justify-center">
      <div className="flex items-center justify-center w-full mb-20">
        <GameProvider>
          <Chat />
          <BoardController />
          <RightMenu />
        </GameProvider>
      </div>
    </div>
  );
}
