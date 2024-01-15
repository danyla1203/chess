import { Timer } from './Timers';
import { useConfigContext } from '../context';
import { useTimers } from '../context/Timer';

export function TimersController() {
  const { w, b } = useTimers();
  const { side } = useConfigContext();

  return (
    <div className="h-32 flex flex-col justify-around">
      {side === 'b' ? <Timer time={w} /> : <Timer time={b} />}
      {side === 'b' ? <Timer time={b} /> : <Timer time={w} />}
    </div>
  );
}
