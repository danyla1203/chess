import { Timer } from './Timers';
import { useConfigContext } from '../context';
import { useTimers } from '../context/Timer';

export function TimersController() {
  const { w, b } = useTimers();
  const { side } = useConfigContext();

  return (
    <div>
      {side === 'b' ? <Timer time={w} /> : <Timer time={b} />}
      {side === 'b' ? <Timer time={b} /> : <Timer time={w} />}
    </div>
  );
}
