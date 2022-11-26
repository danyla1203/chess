import * as React from 'react';
import { useSelector } from 'react-redux';

export const GameTimer = ({ side, time }: { side: 'w' | 'b', time: number, increment: number}) => {
  const isTicking = useSelector((state: any) => side === state.game.movingSide);
  const isWaiting = useSelector((state: any) => state.game.isWaiting);
  const [ minutes, setMinutes ] = React.useState(Math.round(time / (1000 * 60)));
  const [ seconds, setSeconds ] = React.useState(Math.round((time - minutes * 1000 * 60) / 1000));

  const getTime = () => {
    time -= 1000;
    const newMinuntes = Math.floor(time / (1000 * 60));
    const newSeconds = Math.round((time - newMinuntes * 1000 * 60) / 1000);
    setMinutes(newMinuntes);
    setSeconds(newSeconds);
  };

  React.useEffect(() => {
    if (isTicking && !isWaiting) {
      const interval = setInterval(() => getTime(), 1000);
      return () => clearInterval(interval);
    }
  }, [ isTicking, isWaiting ]);

  const beautySeconds = seconds === 0 ?
    '00':
    seconds < 10 ? `0${seconds}`: seconds;
  const beautyMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return (
    <div className='board__timers__timer'>
      <span className='board__timers__timer-text'>{beautyMinutes}:{beautySeconds}</span>
    </div>
  );
};
