import * as React from 'react';
import { useWebSocket } from '../lib/context/SocketContext';

export function CellItem({
  highlighted,
  figure = null,
  cellClick,
  color,
  coord,
}: any) {
  const socket = useWebSocket();
  let classbase = 'size-20';
  if (highlighted) classbase = `${classbase} bg-slate-400`;
  else classbase = `${classbase} ${color}`;
  return (
    <div onClick={() => cellClick(coord)} className={classbase}>
      <span className="board__row__cell-dot">{figure}</span>
    </div>
  );
}
