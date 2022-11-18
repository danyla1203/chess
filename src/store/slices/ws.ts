import { createSlice } from '@reduxjs/toolkit';

export const wsSlice = createSlice({
  name: 'wsConn',
  initialState: {
    isConnected: false
  },
  reducers: {
    setConnectStatus: (state) => {
      state.isConnected = true;
    }
  },
});

export const { setConnectStatus } = wsSlice.actions;

export default wsSlice.reducer;