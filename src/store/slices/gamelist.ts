import { createSlice } from '@reduxjs/toolkit';

type PlayerData = {
  id: string
}
export type GameData = {
  id: string,
  spectators: number,
  players: PlayerData[],
  isActive: boolean;
}

export const gameList = createSlice({
  name: 'gameList',
  initialState: {
    games: [],
  },
  reducers: {
    setGames: (state, { payload }) => {
      state.games = payload;
    }
  },
});

export const { setGames } = gameList.actions;

export default gameList.reducer;