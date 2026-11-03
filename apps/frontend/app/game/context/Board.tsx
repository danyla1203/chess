import {
  Emit,
  Game,
  type Figure,
  type Cell,
  type MoveUpdate,
  type PlainBoardState,
  type StrikedData,
  type ShahData,
  type MateData,
} from '@chess/contract';
import { useWebSocket } from '@/context/SocketContext';

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

  const updateBoardState = ({ cell, prevCell, figure, side }: MoveUpdate) => {
    const copy = { ...boardState };
    delete copy[side][prevCell];
    copy[side][cell] = figure;
    setBoardState(copy);
  };
  const removeStrikedFigure = ({ cell, strikedSide }: StrikedData) => {
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
