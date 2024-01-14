import { CellItem } from './Cell';
import { PlainBoardState, Cell, SelectedCell } from './types';

const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function Board({
  board,
  selectedCell,
  cellClick,
  playingSide,
}: {
  board: PlainBoardState;
  selectedCell: SelectedCell;
  cellClick: (coordinate: Cell) => void;
  playingSide: 'w' | 'b';
}) {
  const result = [];
  for (let i = 0; i < 8; i++) {
    const row = [];
    for (let j = 0; j < 8; j++) {
      const color = (i + j) % 2 === 0 ? 'bg-stone-500' : 'bg-stone-200';
      const cell = `${letters[j]}${i + 1}`;
      const figure = board.w[cell] || board.b[cell];
      const side = board.w[cell] ? 'w' : board.b[cell] ? 'b' : null;
      row.push(
        <CellItem
          highlighted={selectedCell.cell === cell}
          dotted={selectedCell.possibleMoves.find((c) => c === cell)}
          figure={figure}
          coord={cell}
          cellClick={cellClick}
          color={color}
          side={side}
          key={letters[j] + (i + 1)}
        />,
      );
    }
    result.push(row);
  }

  const rendered = result.map((row, i) => (
    <div key={`row-${i}`} className="flex">
      {row}
    </div>
  ));

  return (
    <div className="flex flex-col">
      {playingSide === 'w' ? rendered.reverse() : rendered}
    </div>
  );
}
