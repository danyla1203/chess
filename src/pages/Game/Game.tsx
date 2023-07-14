import * as React from 'react';
import { useSelector } from 'react-redux';
import { Board } from './Board';
import { RigthMenu } from './right/RightMenu';
import { GameChat } from './chat/Chat';

import './Game.scss';

export const GamePage = () => {
  const isWaiting = useSelector((state: any) => state.game.isWaiting);

  if (isWaiting || isWaiting === null) {
    return (
      <div>Loading</div>
    );
  }

  return (
    <div className="game">
      <GameChat />
      <Board />
      <RigthMenu />
    </div>
  );
};