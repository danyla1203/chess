import { useState, useEffect } from 'react';
import { CellItem } from './Cell';
import { HighlightedCels } from './SelectCellLogic';
import { InitedGameData, Cell, SelectedCell, Figure } from './types';
import { Game, useWebSocket } from '@/context/SocketContext';

const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const possibleMoves = new HighlightedCels();

export function Board({
  isActive = true,
  initData,
  moveFigure,
}: {
  isActive: boolean;
  initData: InitedGameData;
  moveFigure: (figure: Figure, cell: Cell) => void;
}) {
  const socket = useWebSocket();
  const [board, setBoard] = useState(initData.board);
  const [selectedCell, setSelectedCell] = useState<SelectedCell>({
    cell: null,
    possibleMoves: [],
  });

  socket.on(Game.boardUpdate, (payload) => {
    const { figure, cell, prevCell, side } = payload;
    if (side === 'w') {
      const copy = { ...board.white };
      copy[cell] = figure;
      delete copy[prevCell];
      setBoard({ black: board.black, white: copy });
    } else {
      const copy = { ...board.black };
      copy[cell] = figure;
      delete copy[prevCell];
      setBoard({ black: copy, white: board.white });
    }
    possibleMoves.setData(board, initData.side);
  });

  const selectAction = (coordinate: Cell, figure: Figure) => {
    const dottedCels = possibleMoves.createPossibleMoves(figure, coordinate);
    setSelectedCell({ cell: coordinate, possibleMoves: dottedCels });
  };

  const cellClick = (coordinate: Cell) => {
    const { cell, possibleMoves } = selectedCell;
    if (cell && possibleMoves.includes(coordinate)) {
      const figure = board.white[cell] || board.black[cell];
      moveFigure(figure, coordinate);
      setSelectedCell({ cell: null, possibleMoves: [] });
    } else {
      const side = initData.side === 'w' ? board.white : board.black;
      const figure = side[coordinate];
      if (figure) selectAction(coordinate, figure);
    }
  };

  useEffect(() => {
    possibleMoves.setData(initData.board, initData.side);
  }, []);

  const result = [];
  for (let i = 0; i < 8; i++) {
    const row = [];
    for (let j = 0; j < 8; j++) {
      const color = (i + j) % 2 === 0 ? 'bg-stone-500' : 'bg-stone-200';
      const cell = `${letters[j]}${i + 1}`;
      const figure = board.white[cell] || board.black[cell];
      row.push(
        <CellItem
          highlighted={selectedCell.cell === cell}
          dotted={selectedCell.possibleMoves.find((c) => c === cell)}
          figure={figure}
          coord={cell}
          cellClick={cellClick}
          color={color}
          side={board.white[cell] ? 'w' : 'b'}
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
      {initData.side === 'w' ? rendered.reverse() : rendered}
    </div>
  );
}
