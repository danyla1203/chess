import * as React from 'react';
import { useSelector } from 'react-redux';
import { Board } from './Board';

export const GamePage = () => {
  const game = useSelector((state: any) => state.game);

  if (!game.id) {
    return (
      <div>Loading</div>
    );
  }
  return (
    <div id='game'>
      { game.id }
      <Board />
    </div>
  );
};