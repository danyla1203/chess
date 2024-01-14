import { useConfigContext } from '../context';
import { useStrikedFigures } from '../context/Striked';
import { TimersController } from './Timers.controller';

export function RightMenu() {
  const strikedFigures = useStrikedFigures();
  const { side } = useConfigContext();
  return (
    <div>
      {side === 'w' ? (
        <div>{strikedFigures.w}</div>
      ) : (
        <div>{strikedFigures.b}</div>
      )}
      <TimersController />
      {side === 'w' ? (
        <div>{strikedFigures.b}</div>
      ) : (
        <div>{strikedFigures.w}</div>
      )}
    </div>
  );
}
