import { createSlice } from '@reduxjs/toolkit';
import { ws } from './WsHandler';

export const wsSlice = createSlice({
  name: 'ws',
  initialState: {
    socketId: null,
    isConnected: false,
  },
  reducers: {
    setConnectStatus: (state, { payload }) => {
      state.socketId = payload;
      state.isConnected = true;
    },
    connect: (_, { payload }) => {
      ws.connect(payload);
    },
    sendMessage: (_, { payload }) => {
      ws.send(payload.event, payload.body);
    },
    close: () => {
      ws.close();
    },
  },
});

export const { setConnectStatus, connect, sendMessage, close } =
  wsSlice.actions;
export default wsSlice.reducer;
