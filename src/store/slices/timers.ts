import { createSlice } from '@reduxjs/toolkit';

export const gameTimersSlice = createSlice({
  name: 'gameTimers',
  initialState: {
    w: -1,
    b: -1,
  },
  reducers: {
    updateTimerByServerEvent: (state, { payload }) => {
      state.w = payload.w;
      state.b = payload.b;
    },
    setTimer: (state, { payload }) => {
      state.b = parseInt(payload.maxTime, 10);
      state.w = parseInt(payload.maxTime, 10);
    },
  },
});

export const { updateTimerByServerEvent, setTimer } =
  gameTimersSlice.actions;

export default gameTimersSlice.reducer;
