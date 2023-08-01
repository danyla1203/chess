import { createSlice } from '@reduxjs/toolkit';
import { ws } from '../WsHandler';

export const wsSlice = createSlice({
  name: 'ws',
  initialState: {
    isConnected: false,
  },
  reducers: {
    setConnectStatus: (state) => {
      state.isConnected = true;
    },
    connect: (_, { payload }) => {
      ws.connect(payload);
    },
    sendMessage: (_, { payload }) => {
      ws.send(payload.event, payload.data);
    },
    close: () => {
      ws.close();
    }
    
  },
});

export const { setConnectStatus, connect, sendMessage, close } = wsSlice.actions;

export default wsSlice.reducer;