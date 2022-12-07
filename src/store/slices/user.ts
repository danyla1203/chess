import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

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
    const response = await fetch('http://localhost:3000/login', reqBody);
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
    const response = await fetch('http://localhost:3000/signup', reqBody);
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
    const response = await fetch('http://localhost:3000/me', reqBody);
    if (response.status !== 200) {
      return thunk.rejectWithValue({ code: response.status, error: response.statusText });
    }
    return response.json();
  }
);
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
    const response = await fetch('http://localhost:3000/refresh-token', reqBody);
    if (response.status !== 200) {
      return thunk.rejectWithValue({ code: response.status, error: response.statusText });
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
    accessToken: null,
    error: { code: null, text: null },
  },
  reducers: {
    setUserData: (state, { payload }) => {
      state.id = payload.id;
      state.name = payload.name;
      state.email = payload.email || null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginRequest.fulfilled, (state, { payload }: any) => {
      state.accessToken = payload.access;
      state.authorized = true;
      localStorage.setItem('refreshToken', payload.refresh);
    });
    builder.addCase(loginRequest.rejected, (state, { payload }: any) => {
      state.error.code = payload.code;
      state.error.text = payload.error;
    });
    builder.addCase(userMeRequest.fulfilled, (state, { payload }: any) => {
      state.id = payload.id;
      state.name = payload.name;
      state.email = payload.email;
    });
    builder.addCase(getTokens.fulfilled, (state, { payload }: any) => {
      state.accessToken = payload.access;
      state.authorized = true;
      localStorage.setItem('refreshToken', payload.refresh);
    });
    builder.addCase(getTokens.rejected, (state) => {
      state.accessToken = null;
      state.authorized = false;
      localStorage.removeItem('refreshToken');
    });
    builder.addCase(signUpRequest.fulfilled, (state, { payload }: any) => {
      state.accessToken = payload.access;
      state.authorized = true;
      localStorage.setItem('refreshToken', payload.refresh);
    });
  }
});

export const { setUserData } = userSlice.actions;

export default userSlice.reducer;