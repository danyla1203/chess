import * as React from 'react';
import { Board } from './Board';
import { RigthMenu } from './right/RightMenu';
import { GameChat } from './chat/Chat';

import './Game.scss';

export const Game = () => {
  return (
    <div className="game">
      <GameChat />
      <Board />
      <RigthMenu />
    </div>
  );
};