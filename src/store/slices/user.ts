import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
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
} from '../request/auth';
import { getProfile, userGameList } from '../request/user';

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
    if (tokens.err) thunk.rejectWithValue(loginData);

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

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    id: null,
    name: null,
    email: null,
    authorized: false,
    isGetTokenLoaded: false,
    accessToken: null,
    error: { code: null, text: null },
    gameHistory: [],
    confirmationEmailSended: null,
    emailConfirmed: false,
  },
  reducers: {
    setUserData: (state, { payload }) => {
      state.id = payload.id;
      state.name = payload.name;
      state.email = payload.email || null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      googleAuthAction.fulfilled,
      (state, { payload }) => {
        if (payload.access) {
          state.authorized = true;
          state.accessToken = payload.access;
          state.id = payload.id;
          localStorage.setItem('refreshToken', payload.refresh);
        }
        state.email = payload.email;
        state.name = payload.name;
        state.emailConfirmed = true;
      },
    );
    builder.addCase(
      googleAuthAction.rejected,
      (state, { payload }: any) => {
        state.error = { code: payload.code, text: payload.error };
      },
    );

    builder.addCase(
      sendVerificationEmailAction.fulfilled,
      (state, { payload }) => {
        state.email = payload.email;
        state.confirmationEmailSended = true;
      },
    );
    builder.addCase(sendVerificationEmailAction.rejected, (state) => {
      state.error = { code: 400, text: 'Something went wrong' };
      state.confirmationEmailSended = false;
    });

    builder.addCase(confirmCodeAction.fulfilled, (state) => {
      state.emailConfirmed = true;
    });

    builder.addCase(
      loginAction.fulfilled,
      (state, { payload }: any) => {
        state.accessToken = payload.access;
        state.name = payload.name;
        state.email = payload.email;
        state.id = payload.id;
        state.authorized = true;
        localStorage.setItem('refreshToken', payload.refresh);
      },
    );

    builder.addCase(
      getUserByRefreshAction.fulfilled,
      (state, { payload }: any) => {
        state.accessToken = payload.access;
        state.authorized = true;
        state.isGetTokenLoaded = true;
        state.id = payload.id;
        state.name = payload.name;
        state.email = payload.email;
        localStorage.setItem('refreshToken', payload.refresh);
      },
    );
    builder.addCase(getUserByRefreshAction.rejected, (state) => {
      state.accessToken = null;
      state.authorized = false;
      state.isGetTokenLoaded = true;
      localStorage.removeItem('refreshToken');
    });

    builder.addCase(
      signUpAction.fulfilled,
      (state, { payload }: any) => {
        state.accessToken = payload.access;
        state.authorized = true;
        state.id = payload.id;
        state.name = payload.name;
        state.email = payload.email;
        localStorage.setItem('refreshToken', payload.refresh);
      },
    );

    builder.addCase(logoutAction.fulfilled, (state) => {
      state.accessToken = null;
      state.authorized = false;
      state.emailConfirmed = false;
      state.email = null;
      state.name = 'Anonymous';
    });

    builder.addCase(
      userGameListAction.fulfilled,
      (state, { payload }) => {
        state.gameHistory = payload.games;
      },
    );
  },
});

export const { setUserData } = userSlice.actions;

export default userSlice.reducer;
