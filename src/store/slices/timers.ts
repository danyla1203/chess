import { createSlice } from '@reduxjs/toolkit';

export const timersSlice = createSlice({
  name: 'timers',
  initialState: {
    whiteTimer: null,
    blackTimer: null,
  },
  reducers: {
    setTimers: (state, { payload }: any) => {
      state.blackTimer = payload.payload.maxTime;
      state.whiteTimer = payload.payload.maxTime;
    },
    updateTimer: (state, { payload }: any) => {
      payload === 'w' ? state.whiteTimer -= 1000 : state.blackTimer -= 1000;
    },
    updateTimerByServerEvent: (state, { payload }: any) => {
      payload.side === 'w' ? 
        state.whiteTimer = payload.timeRemain : 
        state.blackTimer = payload.timeRemain;
    }
  }
});

export const { setTimers, updateTimer, updateTimerByServerEvent } = timersSlice.actions;

export default timersSlice.reducer;