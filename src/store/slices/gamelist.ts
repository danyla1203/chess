import { createSlice } from '@reduxjs/toolkit';

type PlayerData = {
  id: string
  name: string
}
export type GameData = {
  id: string,
  spectators: number,
  players: PlayerData[],
  isActive: boolean;
  maxTime: number
  timeIncrement: number
  side: 'w'|'b'|'rand';
}

export const gameList = createSlice({
  name: 'gameList',
  initialState: {
    games: [],
  },
  reducers: {
    setGames: (state, { payload }: any) => {
      console.log(payload);
      state.games = payload.games;
    }
  },
});

export const { setGames } = gameList.actions;

export default gameList.reducer;