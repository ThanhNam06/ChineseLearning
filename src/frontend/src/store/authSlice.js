import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    session: null,
    profile: null,
    loading: true,
  },
  reducers: {
    setAuth: (state, action) => {
      state.user = action.payload.user;
      state.session = action.payload.session;
      state.loading = false;
    },
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    updateExp: (state, action) => {
      if (state.profile) {
        state.profile.exp += action.payload;
      }
    },
    clearAuth: (state) => {
      state.user = null;
      state.session = null;
      state.profile = null;
      state.loading = false;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  },
});

export const { setAuth, setProfile, updateExp, clearAuth, setLoading } = authSlice.actions;
export default authSlice.reducer;
