import { Emit, Game, useWebSocket } from '@/context/SocketContext';
import { useConfigContext } from '.';
import { useContext, useEffect, useState, createContext } from 'react';

type DrawState = null | 'waiting' | 'accepted' | 'incoming';

type Interactions = {
  drawState: DrawState;
  drawPurpose: () => void;
  drawAccept: () => void;
  drawReject: () => void;
  surrender: () => void;
};

const PlayersGameInteraction = createContext<Interactions>({
  drawState: null,
  drawPurpose: () => {
    console.log('Context isnt set');
  },
  drawAccept: () => {
    console.log('Context isnt set');
  },
  drawReject: () => {
    console.log('Context isnt set');
  },
  surrender: () => {
    console.log('Context isnt set');
  },
});

export const useInteractions = () => {
  const ctx = useContext(PlayersGameInteraction);
  if (!ctx) {
    throw new Error('No context provided');
  }
  return ctx;
};

export const PlayersGameInteractionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [drawState, setDrawState] = useState<DrawState>(null);
  const socket = useWebSocket();
  const cnf = useConfigContext();
  const surrender = () => {
    socket.volatile.emit(Emit.surrender, {
      gameId: cnf.gameId,
    });
  };
  const drawPurpose = () => {
    console.log('purp');
    socket.volatile.emit(Emit.drawPurpose, {
      gameId: cnf.gameId,
    });
    setDrawState('waiting');
  };
  const drawAccept = () => {
    socket.volatile.emit(Emit.drawAccept, {
      gameId: cnf.gameId,
    });
    setDrawState('accepted');
  };
  const drawReject = () => {
    socket.volatile.emit(Emit.drawReject, {
      gameId: cnf.gameId,
    });
  };

  useEffect(() => {
    socket.on(Game.drawPurpose, () => {
      setDrawState('incoming');
    });
    socket.on(Game.rejectDraw, () => {
      setDrawState(null);
    });
    return () => {
      socket.off(Game.drawPurpose);
      socket.off(Game.rejectDraw);
    };
  }, []);
  return (
    <PlayersGameInteraction.Provider
      value={{ drawState, surrender, drawAccept, drawPurpose, drawReject }}
    >
      {children}
    </PlayersGameInteraction.Provider>
  );
};
