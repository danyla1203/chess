import { createSlice } from '@reduxjs/toolkit';

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
  },
  reducers: {
    setGames: (state, { payload }: any) => {
      state.games = payload;
    },
  },
});

export const { setGames } = gameListSlice.actions;

export default gameListSlice.reducer;
