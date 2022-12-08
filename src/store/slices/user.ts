import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

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

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    id: null,
    name: null,
    email: null,
  },
  reducers: {
    setUserData: (state, { payload }) => {
      state.id = payload.id;
      state.name = payload.name;
      state.email = payload.email || null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(userMeRequest.fulfilled, (state, { payload }: any) => {
      state.id = payload.id;
      state.name = payload.name;
      state.email = payload.email;
    });
  }
});

export const { setUserData } = userSlice.actions;

export default userSlice.reducer;