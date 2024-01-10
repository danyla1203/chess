import { useState } from 'react';
import { CellItem } from './Cell';
import { InitedGameData, Cell } from './types';

const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function Board({
  isActive = true,
  initData,
}: {
  isActive: boolean;
  initData: InitedGameData;
}) {
  const [board, setBoard] = useState(initData.board);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);

  const cellClick = (coordinate: Cell) => {
    if (!selectedCell || selectedCell !== coordinate) {
      setSelectedCell(coordinate);
    }
  };

  const result = [];
  for (let i = 0; i < 8; i++) {
    const row = [];
    for (let j = 0; j < 8; j++) {
      const color = (i + j) % 2 === 0 ? 'bg-stone-500' : 'bg-stone-200';
      const name = letters[j] + (i + 1);
      const figure = board.white[name] || board.black[name];
      row.push(
        <CellItem
          highlighted={selectedCell === name}
          figure={figure}
          coord={name}
          cellClick={cellClick}
          color={color}
          key={letters[j] + (i + 1)}
        />,
      );
    }
    result.push(row);
  }
  let rendered = result.map((row, i) => (
    <div key={`board row ${letters[i]}`} className="flex">
      {row.map((cell) => cell)}
    </div>
  ));
  if (initData.side === 'w') rendered = rendered.reverse();

  return <div className="flex flex-col">{rendered}</div>;
}
