import { PayloadAction, createSlice } from '@reduxjs/toolkit';

interface UpdateTimers {
  w: number;
  b: number;
}

const initialState: UpdateTimers = {
  w: -1,
  b: -1,
};

export const gameTimersSlice = createSlice({
  name: 'gameTimers',
  initialState,
  reducers: {
    updateTimerByServerEvent: (
      state,
      { payload }: PayloadAction<UpdateTimers>,
    ) => {
      state.w = payload.w;
      state.b = payload.b;
    },
    setTimer: (state, { payload }: PayloadAction<{ maxTime: string }>) => {
      state.b = parseInt(payload.maxTime, 10);
      state.w = parseInt(payload.maxTime, 10);
    },
  },
});

export const { updateTimerByServerEvent, setTimer } = gameTimersSlice.actions;

export default gameTimersSlice.reducer;
