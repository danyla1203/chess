import * as React from 'react';

export function CellItem({
  highlighted,
  figure = null,
  cellClick,
  color,
  coord,
  side,
  dotted,
}: any) {
  let classbase = 'figure size-20 flex justify-center items-center';

  if (highlighted) classbase += ` bg-slate-400`;
  else classbase += ` ${color}`;

  if (figure) classbase += ` ${figure.replace(/\d/, '')} ${side}`;
  return (
    <div onClick={() => cellClick(coord)} className={classbase}>
      {dotted ? <span className="w-5 h-5 rounded-full bg-slate-400" /> : null}
    </div>
  );
}
