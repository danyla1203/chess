import { configureStore } from '@reduxjs/toolkit';
import gameList from './slices/gamelist';
import ws from './slices/ws';
import game from './slices/game';
import user from './slices/user';
import errors from './slices/errors';
import chat from './slices/chat';
import gameTimers from './slices/timers';

export const store = configureStore({
  reducer: {
    ws,
    gameList,
    game,
    user,
    errors,
    chat,
    gameTimers,
  },
});
