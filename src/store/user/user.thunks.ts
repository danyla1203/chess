import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  Login,
  Signup,
  Verify,
  confirmEmailRequest,
  googleAuthRequest,
  loginRequest,
  logoutRequest,
  sendVerificationMail,
  signupRequest,
  useRefresh,
} from './auth.requests';
import { getProfile, userGameList } from './user.requests';

export const getUserByRefreshAction = createAsyncThunk(
  '/use-refresh',
  async (token: string, thunk) => {
    const tokens = await useRefresh(token);
    if (tokens.err) thunk.rejectWithValue(tokens);

    const userData = await getProfile(tokens.data.access);
    if (userData.err) thunk.rejectWithValue(userData);

    return {
      ...userData.data,
      ...tokens.data,
    };
  },
);

export const loginAction = createAsyncThunk(
  '/login',
  async (loginData: Login, thunk) => {
    const tokens = await loginRequest(loginData);
    if (tokens.err) {
      return thunk.rejectWithValue(tokens);
    }
    const userData = await getProfile(tokens.data.access);
    if (userData.err) thunk.rejectWithValue(userData);
    return {
      ...userData.data,
      ...tokens.data,
    };
  },
);
export const signUpAction = createAsyncThunk(
  '/signup',
  async (registraionData: Signup, thunk) => {
    const tokens = await signupRequest(registraionData);
    if (tokens.err) thunk.rejectWithValue(registraionData);

    const userData = await getProfile(tokens.data.access);
    if (userData.err) thunk.rejectWithValue(userData);
    return { ...tokens.data, ...userData.data };
  },
);
export const logoutAction = createAsyncThunk(
  '/logout',
  async (_, thunk: any) => {
    const state = thunk.getState();
    const logout = await logoutRequest(state.user.accessToken);
    if (logout.err) thunk.rejectWithValue(logout);
    return logout.data;
  },
);

export const userGameListAction = createAsyncThunk(
  '/user/game/list',
  async (accessToken: string, thunk) => {
    const games = await userGameList(accessToken);
    if (games.err) thunk.rejectWithValue(games);
    return games.data;
  },
);

export const sendVerificationEmailAction = createAsyncThunk(
  '/auth/send-verification-email',
  async (email: string, thunk) => {
    const req = await sendVerificationMail({ email });
    if (req.err) thunk.rejectWithValue(req);
    return req.data;
  },
);

export const confirmCodeAction = createAsyncThunk(
  '/user/confirm-code',
  async (data: Verify, thunk) => {
    const req = await confirmEmailRequest(data);
    if (req.err) thunk.rejectWithValue(req);
    return req.data;
  },
);

export const googleAuthAction = createAsyncThunk(
  '/user/google/oauth',
  async (code: string, thunk) => {
    const req = await googleAuthRequest(code);
    if (req.err) thunk.rejectWithValue(req);
    if (!req.data.access) return req.data;

    const userData = await getProfile(req.data.access);
    if (userData.err) thunk.rejectWithValue(userData);
    return { ...req.data, ...userData.data };
  },
);
