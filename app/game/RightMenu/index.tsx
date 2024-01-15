import { useConfigContext } from '../context';
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

  const strikedW = strikedFigures.w.map((f) => (
    <Striked side="w" key={f} figure={f} />
  ));
  const strikeB = strikedFigures.b.map((f) => (
    <Striked side="b" key={f} figure={f} />
  ));

  return (
    <div className="w-40 flex flex-col ml-3">
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
