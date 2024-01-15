import { useConfigContext } from '../context';
import { usePlayerConnection } from '../context/PlayerConnection';
import { useStrikedFigures } from '../context/Striked';
import { TimersController } from './Timers.controller';

function Striked({ figure, side }: { figure: string; side: 'w' | 'b' }) {
  return (
    <div
      className={`w-7 h-7 bg-center bg-cover ${figure.replace(
        /\d/,
        '',
      )} ${side}`}
      key={`${figure}-b`}
    />
  );
}

export function RightMenu() {
  const strikedFigures = useStrikedFigures();
  const { side } = useConfigContext();
  const online = usePlayerConnection()[side];

  const strikedW = strikedFigures.w.map((f) => (
    <Striked side="w" key={f} figure={f} />
  ));
  const strikeB = strikedFigures.b.map((f) => (
    <Striked side="b" key={f} figure={f} />
  ));

  return (
    <div className="w-40 flex flex-col ml-3">
      <div className="flex items-center">
        <div
          className={`mr-1 w-4 h-4 ${
            online ? 'bg-blue-500' : 'bg-red-500'
          } rounded-full`}
        ></div>
        {online ? 'Online' : 'User offline'}
      </div>
      {side === 'w' ? (
        <div className="flex">{strikedW}</div>
      ) : (
        <div className="flex">{strikeB}</div>
      )}
      <TimersController />
      {side === 'w' ? (
        <div className="flex">{strikeB}</div>
      ) : (
        <div className="flex">{strikedW}</div>
      )}
    </div>
  );
}
