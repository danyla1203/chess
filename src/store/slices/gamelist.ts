import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { sendMessage } from '../ws';
import { startGame } from '../game';

type PlayerData = {
  id: string;
  name: string;
};

export type GameData = {
  id: string;
  spectators: number;
  players: PlayerData[];
  isActive: boolean;
  maxTime: number;
  timeIncrement: number;
  side: 'w' | 'b' | 'rand';
};

export const gameListSlice = createSlice({
  name: 'gameList',
  initialState: {
    games: [],
    isWaitingForPlayer: null,
  },
  reducers: {
    setGames: (state, { payload }: PayloadAction<GameData[]>) => {
      state.games = payload;
    },

    waitingForPlayer: (state) => {
      state.isWaitingForPlayer = true;
    },

    playerFound: (state) => {
      state.isWaitingForPlayer = false;
    },
  },
});

export const { setGames, waitingForPlayer, playerFound } =
  gameListSlice.actions;

export const createGameAction = (config) => {
  return (dispatch) => {
    dispatch(sendMessage({ event: 'create', body: config }));
  };
};
export const startGameAction = () => {
  return (dispatch) => {
    dispatch(playerFound());
    dispatch(startGame());
  };
};

export default gameListSlice.reducer;
