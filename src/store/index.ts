import { configureStore } from '@reduxjs/toolkit';
import gameList from './slices/gamelist';
import wsConnection from './slices/ws';
import game from './slices/game';
import user from './slices/user';
import timers from './slices/timers';
import errors from './slices/errors';
import chat from './slices/chat';

export const store = configureStore({
  reducer: {
    wsConnection,
    gameList,
    game,
    user,
    timers,
    errors,
    chat
  },
});
