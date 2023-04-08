import { createSlice } from '@reduxjs/toolkit';

export const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: []
  },
  reducers: {
    setMessages: (state, { payload }) => {
      state.messages = payload.messages;
    },
    pushMessage: (state, { payload }) => {
      const message = {
        id: payload.id,
        text: payload.text,
        date: payload.date,
        user: {
          id: payload.user.id,
          name: payload.user.name
        }
      };
      state.messages.push(message);
    }
  }
});

export const { setMessages, pushMessage } = chatSlice.actions;

export default chatSlice.reducer;
