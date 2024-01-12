import { useState, useEffect } from 'react';
import { CellItem } from './Cell';
import { HighlightedCels } from './SelectCellLogic';
import { PlainBoardState, Cell, SelectedCell, Figure } from './types';

const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const possibleMoves = new HighlightedCels();

export function Board({
  board,
  playingSide,
  moveFigure,
}: {
  board: PlainBoardState;
  playingSide: 'w' | 'b';
  moveFigure: (figure: Figure, cell: Cell) => void;
}) {
  const [selectedCell, setSelectedCell] = useState<SelectedCell>({
    cell: null,
    possibleMoves: [],
  });

  const selectAction = (coordinate: Cell, figure: Figure) => {
    const dottedCels = possibleMoves.createPossibleMoves(figure, coordinate);
    setSelectedCell({ cell: coordinate, possibleMoves: dottedCels });
  };
  const cellClick = (coordinate: Cell) => {
    const { cell, possibleMoves } = selectedCell;
    if (cell && possibleMoves.includes(coordinate)) {
      const figure = board.w[cell] || board.b[cell];
      moveFigure(figure, coordinate);
      setSelectedCell({ cell: null, possibleMoves: [] });
    } else {
      const side = playingSide === 'w' ? board.w : board.b;
      const figure = side[coordinate];
      if (figure) selectAction(coordinate, figure);
    }
  };

  useEffect(() => {
    possibleMoves.setData(board, playingSide);
  }, []);
  useEffect(() => {
    possibleMoves.setUpdatedBoard(board);
  }, [board]);

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
