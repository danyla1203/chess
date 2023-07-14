import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateTimer } from '../../../store/slices/timers';

export const GameTimer = ({ side }: { side: 'w' | 'b' }) => {
  const time = useSelector((state: any) => side === 'w' ? state.timers.whiteTimer : state.timers.blackTimer);
  const isEnded = useSelector((state: any) => state.game.isEnded);
  const isTicking = useSelector((state: any) => side === state.game.movingSide);
  const isWaiting = useSelector((state: any) => state.game.isWaiting);
  const [ intervalMark, setIntervalFunc ] = React.useState<any>();
  const dispatch = useDispatch<any>();

  const getTime = () => {
    dispatch(updateTimer(side as any) as any);
  };

  const minutes = Math.floor(time / (1000 * 60));
  const seconds = Math.round((time - minutes * 1000 * 60) / 1000);

  if (isEnded || (minutes <= 0 && seconds <= 0)) clearInterval(intervalMark);

  React.useEffect(() => {
    if (isTicking && !isWaiting) {
      setIntervalFunc(setInterval(() => getTime(), 1000));
    } else if (!isWaiting && !isTicking) clearInterval(intervalMark);
  }, [ isTicking, isWaiting ]);

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