import * as React from 'react';
import { useSelector } from 'react-redux';
import { Board } from './Board';

export const GamePage = () => {
  const isWaiting = useSelector((state: any) => state.game.isWaiting);

  if (isWaiting || isWaiting === null) {
    return (
      <div>Loading</div>
    );
  }
  return (
    <div className='game'>
      <Board />
    </div>
  );
};