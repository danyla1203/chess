import { createSlice } from '@reduxjs/toolkit';
import { HighlightedCels } from './HighlightedCell';
import { GameState } from './game.types';
import { sendMessage } from '../ws';

const possibleMovesLogic = new HighlightedCels();

const initialState: GameState = {
  id: null,
  isWaiting: null,
  isEnded: false,
  side: null,
  movingSide: 'w',
  board: null,
  time: null,
  timeIncrement: null,
  highlightedCels: [],
  selectedFigure: { figure: null, cell: null },
  strikedFigures: { black: [], white: [] },
  shahData: { shachedSide: null, figure: null },
  chatMessages: [],
  opponentOnPage: null,
  draw: {
    purposeSent: false,
    purposeReceived: false,
  },
};

export const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    initGameData: (state, { payload }: any) => {
      state.chatMessages = [];
      state.selectedFigure = { figure: null, cell: null };
      state.strikedFigures = { black: [], white: [] };
      state.shahData = { shachedSide: null, figure: null };
      state.highlightedCels = [];
      state.isEnded = false;
      state.side = payload.side;

      possibleMovesLogic.setData(payload.board, payload.side);
      state.board = {
        white: payload.board.white,
        black: payload.board.black,
      };
      state.timeIncrement = parseInt(payload.timeIncrement, 10);
      state.id = payload.gameId;
    },

    endGame: (state) => {
      state.isEnded = true;
      state.chatMessages.push({
        id: -1,
        text: 'Game over!',
        date: new Date(),
        author: { name: 'System' },
      });
      state.draw = {
        purposeSent: false,
        purposeReceived: false,
      };
    },
    startGame: (state) => {
      state.isWaiting = false;
      state.opponentOnPage = true;
    },
    userLeave: (state: any) => {
      state.opponentOnPage = false;
    },
    createGame: (state: any) => {
      state.isWaiting = true;
    },
    selectFigure: (state, { payload }) => {
      const { figure, cell } = payload;
      if (!figure) return;

      const possibleMoves = possibleMovesLogic.createPossibleMoves(
        figure,
        cell,
      );
      state.highlightedCels = possibleMoves;
      if (possibleMoves.length >= 1) {
        state.selectedFigure = { figure, cell };
      }
    },
    updateBoard: (state, { payload }) => {
      possibleMovesLogic.setUpdatedBoard(payload);
      state.board = {
        white: payload.white,
        black: payload.black,
      };
      state.highlightedCels = [];
      state.selectedFigure = { figure: null, cell: null };
      state.shahData = { shachedSide: null, figure: null };
      state.movingSide = state.movingSide === 'w' ? 'b' : 'w';
    },
    addStrikedFigure: (state, { payload }) => {
      const { figure, strikedSide } = payload;
      const strikedArr =
        strikedSide === 'w'
          ? state.strikedFigures.white
          : state.strikedFigures.black;
      strikedArr.push(figure);
    },
    setShah: (state, { payload }) => {
      state.shahData.figure = payload.byFigure;
      state.shahData.shachedSide = payload.shachedSide;
    },
    addMessage: (state, { payload }: any) => {
      state.chatMessages.push(payload);
    },
    drawPurposeReceived: (state) => {
      state.draw.purposeReceived = true;
    },
    purposeSended: (state) => {
      state.draw.purposeSent = true;
    },
    purposeRejected: (state) => {
      state.draw.purposeSent = false;
      state.draw.purposeReceived = false;
    },
  },
});

export const {
  initGameData,
  startGame,
  selectFigure,
  updateBoard,
  addStrikedFigure,
  drawPurposeReceived,
  setShah,
  createGame,
  endGame,
  addMessage,
  userLeave,
  purposeSended,
  purposeRejected,
} = gameSlice.actions;

export const plusTime = () => {
  return (dispatch, getState) => {
    const { id } = getState().game;
    dispatch(sendMessage({ event: 'add_time', body: { gameId: id } }));
  };
};
export const surrenderAction = () => {
  return (dispatch, getState) => {
    const { id } = getState().game;
    dispatch(sendMessage({ event: 'surrender', body: { gameId: id } }));
  };
};
export const sendDrawPurpose = () => {
  return (dispatch, getState) => {
    const { id } = getState().game;
    dispatch(sendMessage({ event: 'draw_purpose', body: { gameId: id } }));
    dispatch(purposeSended());
  };
};
export const acceptDrawPurpose = () => {
  return (dispatch, getState) => {
    const { id } = getState().game;
    dispatch(sendMessage({ event: 'draw_accept', body: { gameId: id } }));
  };
};
export const rejectDrawPurpose = () => {
  return (dispatch, getState) => {
    const { id } = getState().game;
    dispatch(sendMessage({ event: 'draw_reject', body: { gameId: id } }));
  };
};

export default gameSlice.reducer;
