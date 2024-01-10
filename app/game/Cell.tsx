import * as React from 'react';
import { useWebSocket } from '../lib/context/SocketContext';

export function CellItem({
  highlighted,
  figure = null,
  cellClick,
  color,
  coord,
  side,
  dotted,
}: any) {
  const socket = useWebSocket();

  let classbase = 'figure size-20';

  if (highlighted) classbase += ` bg-slate-400`;
  else classbase += ` ${color}`;

  if (figure) classbase += ` ${figure.replace(/\d/, '')} ${side}`;
  return (
    <div onClick={() => cellClick(coord)} className={classbase}>
      <span className="board__row__cell-dot">{dotted ? '*' : ''}</span>
    </div>
  );
}
