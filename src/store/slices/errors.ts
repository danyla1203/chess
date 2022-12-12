import { createSlice } from '@reduxjs/toolkit';
import { loginRequest, signUpRequest } from './user';

const initialState: { errors: any[] } = {
  errors: []
};

export const errorsSlice = createSlice({
  name: 'errors',
  initialState,
  reducers: {
    clearError: (state, { payload }) => {
      state.errors = state.errors.filter((error) => error.code !== payload.code && payload.error !== payload.error);
    },
    addError: (state, { payload }) => {
      state.errors.push(payload);
    }
  },
  extraReducers: (builder) => {
    builder.addCase(loginRequest.rejected, (state, { payload }: any) => {
      state.errors.push(payload);
    });
    builder.addCase(signUpRequest.rejected, (state, { payload }: any) => {
      state.errors.push(payload);
    });
  }
});


export const { clearError, addError } = errorsSlice.actions;

export default errorsSlice.reducer;