import * as React from 'react';
import { useSelector } from 'react-redux';

export const GameTimer = ({ side, time }: { side: 'w' | 'b', time: number, increment: number}) => {
  const isEnded = useSelector((state: any) => state.game.isEnded);
  const isTicking = useSelector((state: any) => side === state.game.movingSide);
  const isWaiting = useSelector((state: any) => state.game.isWaiting);
  const [ minutes, setMinutes ] = React.useState(Math.round(time / (1000 * 60)));
  const [ seconds, setSeconds ] = React.useState(Math.round((time - minutes * 1000 * 60) / 1000));
  const [ intervalMark, setIntervalFunc ] = React.useState<any>();

  const getTime = () => {
    time -= 1000;
    const newMinuntes = Math.floor(time / (1000 * 60));
    const newSeconds = Math.round((time - newMinuntes * 1000 * 60) / 1000);
    setMinutes(newMinuntes);
    setSeconds(newSeconds);
  };

  if (isEnded) clearInterval(intervalMark);

  React.useEffect(() => {
    if (isTicking && !isWaiting) {
      setIntervalFunc(setInterval(() => getTime(), 1000));

      return () => clearInterval(intervalMark);
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
