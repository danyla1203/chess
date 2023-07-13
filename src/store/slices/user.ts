import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { config } from '../../config';

export const getTokens = createAsyncThunk(
  '/use-refresh',
  async (refreshToken: string, thunk) => {
    const reqBody = { 
      method: 'PUT',
      body: JSON.stringify({ refreshToken }),
      headers: { 
        accept: 'application/json',
        'Content-Type': 'application/json'
      }
    };
    const response = await fetch(`${config.apiHost}/refresh-token`, reqBody);
    if (response.status !== 200) {
      return thunk.rejectWithValue({ code: response.status, error: response.statusText });
    }
    return response.json();
  }
);

export const loginRequest = createAsyncThunk(
  '/login',
  async (loginData: string, thunk) => {
    const reqBody = { 
      method: 'POST', 
      body: loginData, 
      headers: { 
        accept: 'application/json', 
        'Content-Type': 'application/json' 
      } 
    };
    const response = await fetch(`${config.apiHost}/login`, reqBody);
    if (response.status !== 200) {
      return thunk.rejectWithValue({ code: response.status, error: response.statusText });
    }
    return response.json();
  }
);
export const signUpRequest = createAsyncThunk(
  '/signup',
  async (registraionData: string, thunk) => {
    const reqBody = { 
      method: 'POST', 
      body: registraionData, 
      headers: { 
        accept: 'application/json', 
        'Content-Type': 'application/json' 
      } 
    };
    const response = await fetch(`${config.apiHost}/signup`, reqBody);
    if (response.status !== 200) {
      return thunk.rejectWithValue({ code: response.status, error: response.statusText });
    }
    return response.json();
  }
);
export const logoutRequest = createAsyncThunk(
  '/logout',
  async (_, thunk: any) => {
    const state = thunk.getState();
    const reqBody = { 
      method: 'DELETE', 
      body: thunk.getStore, 
      headers: { 
        accept: 'application/json', 
        'Authorization': `Bearer ${state.user.accessToken}` 
      } 
    };
    const response = await fetch(`${config.apiHost}/logout`, reqBody);
    if (response.status !== 200) {
      return thunk.rejectWithValue({ code: response.status, error: response.statusText });
    }
    return response.json();
  }
);

export const userMeRequest = createAsyncThunk(
  '/me',
  async (accessToken: string, thunk) => {
    const reqBody = { 
      method: 'GET', 
      headers: { 
        accept: 'application/json',
        'Authorization': `Bearer ${accessToken}` 
      }
    };
    const response = await fetch(`${config.apiHost}/me`, reqBody);
    if (response.status !== 200) {
      return thunk.rejectWithValue({ code: response.status, error: response.statusText });
    }
    return response.json();
  }
);

export const userGameList = createAsyncThunk(
  '/user/game/list',
  async (accessToken: string, thunk) => {
    const reqBody = { 
      method: 'GET', 
      headers: { 
        accept: 'application/json',
        'Authorization': `Bearer ${accessToken}` 
      }
    };
    const response = await fetch(`${config.apiHost}/user/games`, reqBody);
    if (response.status !== 200) {
      return thunk.rejectWithValue({ code: response.status, error: response.statusText });
    }
    return response.json();
  }
);

export const sendVerificationEmail = createAsyncThunk(
  '/user/send-verification-email',
  async (email: string, thunk) => {
    const reqBody = {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 
        accept: 'application/json', 
        'Content-Type': 'application/json' 
      }
    };

    const response = await fetch(`${config.apiHost}/send-verification-mail`, reqBody);
    if (response.status !== 200) {
      return thunk.rejectWithValue({
        code: response.status,
        error: response.statusText,
      });
    }
    return { email, data: await response.json() };
  }
);

export const confirmCode = createAsyncThunk(
  '/user/confirm-code',
  async (data: any, thunk) => {
    const reqBody = {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 
        accept: 'application/json', 
        'Content-Type': 'application/json' 
      } 
    };

    const response = await fetch(`${config.apiHost}/verify-email`, reqBody);
    if (response.status !== 200) {
      return thunk.rejectWithValue({
        code: response.status,
        error: response.statusText,
      });
    }
    return response.json();
  }
);

export const googleAuth = createAsyncThunk(
  '/user/google/oauth',
  async (code: string, thunk) => {
    const reqBody = {
      method: 'POST',
      body: JSON.stringify({ code }),
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };

    const response = await fetch(`${config.apiHost}/google/oauth`, reqBody);
    if (response.status !== 200) {
      return thunk.rejectWithValue({
        code: response.status,
        error: response.statusText,
      });
    }
    return response.json();
  }
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
    emailConfirmed: false
  },
  reducers: {
    setUserData: (state, { payload }) => {
      state.id = payload.id;
      state.name = payload.name;
      state.email = payload.email || null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(googleAuth.fulfilled, (state, { payload }) => {
      state.email = payload.email;
      state.name = payload.name;
      state.emailConfirmed = true;
    });
    builder.addCase(sendVerificationEmail.fulfilled, (state, { payload }) => {
      state.email = payload.email;
      state.confirmationEmailSended = true;
    });
    builder.addCase(sendVerificationEmail.rejected, (state) => {
      state.error = { code: 400, text: 'Something went wrong' };
      state.confirmationEmailSended = false;
    });

    builder.addCase(confirmCode.fulfilled, (state) => {
      state.emailConfirmed = true;
    });

    builder.addCase(userMeRequest.fulfilled, (state, { payload }: any) => {
      state.id = payload.id;
      state.name = payload.name;
      state.email = payload.email;
    });

    builder.addCase(loginRequest.fulfilled, (state, { payload }: any) => {
      state.accessToken = payload.access;
      state.authorized = true;
      localStorage.setItem('refreshToken', payload.refresh);
    });
    
    builder.addCase(getTokens.fulfilled, (state, { payload }: any) => {
      state.accessToken = payload.access;
      state.authorized = true;
      state.isGetTokenLoaded = true;
      localStorage.setItem('refreshToken', payload.refresh);
    });
    builder.addCase(getTokens.rejected, (state) => {
      state.accessToken = null;
      state.authorized = false;
      state.isGetTokenLoaded = true;
      localStorage.removeItem('refreshToken');
    });

    builder.addCase(signUpRequest.fulfilled, (state, { payload }: any) => {
      state.accessToken = payload.access;
      state.authorized = true;
      localStorage.setItem('refreshToken', payload.refresh);
    });

    builder.addCase(logoutRequest.fulfilled, (state, { payload }) => {
      state.accessToken = null;
      state.authorized = false;
      state.emailConfirmed = false;
      state.email = null;
      state.name = payload.name;
      state.id = payload.id;
    });

    builder.addCase(userGameList.fulfilled, (state, { payload }) => {
      state.gameHistory = payload.items;
    });
  }
});

export const { setUserData } = userSlice.actions;

export default userSlice.reducer;