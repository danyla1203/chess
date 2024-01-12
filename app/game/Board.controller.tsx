import { useState, useEffect } from 'react';
import { InitedGameData, Cell, Figure } from './types';
import { Emit, Game, useWebSocket } from '@/context/SocketContext';
import { Board } from './Board';

export function BoardController({ initData }: { initData: InitedGameData }) {
  const socket = useWebSocket();
  const [board, setBoard] = useState(initData.board);

  const moveFigure = (figure: Figure, cell: Cell) => {
    socket.volatile.emit(Emit.figureMove, {
      gameId: initData.gameId,
      figure,
      cell,
    });
  };

  useEffect(() => {
    socket.removeAllListeners(Game.boardUpdate);
    socket.removeAllListeners(Game.strike);
    socket.on(
      Game.boardUpdate,
      (payload: {
        side: 'w' | 'b';
        figure: Figure;
        cell: Cell;
        prevCell: Cell;
      }) => {
        const { side, figure, cell, prevCell } = payload;
        const copy = { ...board[side] };
        delete copy[prevCell];
        copy[cell] = figure;
        const copyBoard = { ...board };
        copyBoard[side] = copy;
        setBoard(copyBoard);
      },
    );
    socket.on(
      Game.strike,
      ({ strikedSide, cell }: { strikedSide: 'w' | 'b'; cell: Cell }) => {
        delete board[strikedSide][cell];
        setBoard(board);
      },
    );
  }, [board]);

  return (
    <Board board={board} playingSide={initData.side} moveFigure={moveFigure} />
  );
}
