'use client';

import { Cell, Figure, SelectedCell } from './types';
import { Board } from './Board';
import { useBoard } from './context/Board';
import { useConfigContext } from './context';
import { HighlightedCels } from './SelectCellLogic';
import { useEffect, useState } from 'react';

const possibleMoves = new HighlightedCels();

export function BoardController() {
  const { boardState, moveFigure, shahData } = useBoard();
  const cnf = useConfigContext();

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
      const figure = boardState.w[cell] || boardState.b[cell];
      moveFigure(figure, coordinate);
      setSelectedCell({ cell: null, possibleMoves: [] });
    } else {
      const side = cnf.side === 'w' ? boardState.w : boardState.b;
      const figure = side[coordinate];
      if (figure) selectAction(coordinate, figure);
    }
  };

  useEffect(() => {
    possibleMoves.setData(boardState, cnf.side);
  }, []);
  useEffect(() => {
    possibleMoves.setUpdatedBoard(boardState);
  }, [boardState]);

  return (
    <Board
      playingSide={cnf.side}
      cellClick={cellClick}
      board={boardState}
      selectedCell={selectedCell}
      shah={shahData}
    />
  );
}
