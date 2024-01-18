import { Emit, Game, useWebSocket } from '@/context/SocketContext';
import {
  Figure,
  Cell,
  Move,
  PlainBoardState,
  StrikeData,
  ShahData,
  MateData,
} from '../types';

import { useState, useEffect, createContext, useContext } from 'react';
import { useConfigContext } from '.';

type Board = {
  boardState: PlainBoardState;
  moveFigure: (_figure: Figure, _cell: Cell) => void;
  shahData: ShahData | null;
  mateData: MateData | null;
};

const BoardContext = createContext<Board>({
  boardState: {
    w: {},
    b: {},
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  moveFigure: (_figure: Figure, _cell: Cell) => {},
  shahData: null,
  mateData: null,
});

export const useBoard = () => {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('No context provided');
  }
  return context;
};

export const BoardProvider = ({
  initBoard,
  children,
}: {
  initBoard: PlainBoardState;
  children: React.ReactNode;
}) => {
  const socket = useWebSocket();
  const cnf = useConfigContext();
  const [boardState, setBoardState] = useState(initBoard);
  const [shahData, setShah] = useState<ShahData | null>(null);
  const [mateData, setMate] = useState<MateData | null>(null);

  const moveFigure = (figure: Figure, cell: Cell) => {
    socket.volatile.emit(Emit.figureMove, {
      gameId: cnf.gameId,
      figure,
      cell,
    });
  };

  const updateBoardState = ({ cell, prevCell, figure, side }: Move) => {
    const copy = { ...boardState };
    delete copy[side][prevCell];
    copy[side][cell] = figure;
    setBoardState(copy);
  };
  const removeStrikedFigure = ({ cell, strikedSide }: StrikeData) => {
    const copy = { ...boardState };
    delete copy[strikedSide][cell];
    setBoardState(copy);
  };

  useEffect(() => {
    socket.on(Game.boardUpdate, (newState) => {
      const { shah, mate, strike } = newState.effect;

      if (mate) setMate(mate);

      if (shah) setShah(shah);
      else setShah(null);
      if (strike) removeStrikedFigure(strike);

      updateBoardState(newState.update);
    });
    return () => {
      socket.off(Game.boardUpdate);
    };
  }, []);

  return (
    <BoardContext.Provider
      value={{ boardState, moveFigure, shahData, mateData }}
    >
      {children}
    </BoardContext.Provider>
  );
};
