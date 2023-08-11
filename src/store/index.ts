import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import gameList from './slices/gamelist';
import ws from './ws';
import game from './game';
import errors from './slices/errors';
import gameTimers from './slices/timers';
import user from './user';

export const store = configureStore({
  reducer: {
    ws,
    gameList,
    game,
    errors,
    user,
    gameTimers,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
type DispatchFunc = () => AppDispatch;
export const useAppDispatch: DispatchFunc = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
