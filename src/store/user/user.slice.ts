import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { UserProfile, UserState, UserWithTokens } from './action.types';
import {
  confirmCodeAction,
  getUserByRefreshAction,
  googleAuthAction,
  loginAction,
  logoutAction,
  sendVerificationEmailAction,
  signUpAction,
  userGameListAction,
} from './user.thunks';

const initialState: UserState = {
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
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserData: (state, { payload }: PayloadAction<UserProfile>) => {
      state.id = payload.id;
      state.name = payload.name;
      state.email = payload.email || null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      googleAuthAction.fulfilled,
      (state, { payload }: PayloadAction<UserWithTokens>) => {
        if (payload.access) {
          state.id = payload.id;
          state.name = payload.name;
          state.authorized = true;
          state.accessToken = payload.access;
          state.id = payload.id;
          localStorage.setItem('refreshToken', payload.refresh);
        }
        state.email = payload.email;
        state.emailConfirmed = true;
      },
    );
    builder.addCase(googleAuthAction.rejected, (state, { payload }: any) => {
      state.error = { code: payload.code, text: payload.error };
    });

    builder.addCase(
      sendVerificationEmailAction.fulfilled,
      (state, { payload }: PayloadAction<{ email: string }>) => {
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
      (state, { payload }: PayloadAction<UserWithTokens>) => {
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
      (state, { payload }: PayloadAction<UserWithTokens>) => {
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
      (state, { payload }: PayloadAction<UserWithTokens>) => {
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
      (state, { payload }: PayloadAction<{ games: any[] }>) => {
        state.gameHistory = payload.games;
      },
    );
  },
});

export const { setUserData } = userSlice.actions;
export default userSlice.reducer;
