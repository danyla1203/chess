import * as React from 'react';
import { useSelector } from 'react-redux';

export const GameTimer = ({ side }: { side: 'w' | 'b' }) => {
  const time = useSelector((state: any) => side === 'w' ? state.game.timers.w : state.game.timers.b);
  const minutes = Math.floor(time / (1000 * 60));
  const seconds = Math.round((time - minutes * 1000 * 60) / 1000);

  const beautySeconds = seconds === 0 ?
    '00':
    seconds < 10 ? `0${seconds}`: seconds;
  const beautyMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return (
    <div className='game__right-menu__timers__timer'>
      <span className='game__right-menu__timers__timer-text'>{beautyMinutes}:{beautySeconds}</span>
    </div>
  );
};
