import * as React from 'react';
import { useAppSelector } from '../../../store';

export function GameTimer({ side }: { side: 'w' | 'b' }) {
  const time = useAppSelector((state) =>
    side === 'w' ? state.gameTimers.w : state.gameTimers.b,
  );
  const minutes = Math.floor(time / (1000 * 60));
  const seconds = Math.round((time - minutes * 1000 * 60) / 1000);

  let beautySeconds;
  if (seconds === 0) beautySeconds = '00';
  else beautySeconds = seconds < 10 ? `0${seconds}` : seconds;

  const beautyMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const ended = beautyMinutes === '00' && beautySeconds === '00';
  return (
    <div className={`game__right-menu__timers__timer ended_${ended}`}>
      <span className="game__right-menu__timers__timer-text">
        {beautyMinutes}:{beautySeconds}
      </span>
    </div>
  );
}
