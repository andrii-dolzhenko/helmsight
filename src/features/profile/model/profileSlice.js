import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { profileService } from '../api/profileService.js'
import { DEMO_PROFILE } from '../lib/profile.js'

export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async (profile, { rejectWithValue }) => {
    try {
      return await profileService.updateProfile(profile)
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)

export function createProfileInitialState(snapshot = null) {
  return {
    ...DEMO_PROFILE,
    ...snapshot,
    saveStatus: 'idle',
    saveError: null,
  }
}

const profileSlice = createSlice({
  name: 'profile',
  initialState: createProfileInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(updateProfile.pending, (state) => {
        state.saveStatus = 'saving'
        state.saveError = null
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        Object.assign(state, action.payload)
        state.saveStatus = 'succeeded'
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.saveStatus = 'failed'
        state.saveError = action.payload ?? action.error.message
      })
  },
})

export const selectProfile = (state) => state.profile
export const selectProfileFirstName = (state) => state.profile.firstName
export const selectProfileSaveStatus = (state) => state.profile.saveStatus
export const selectProfileSaveError = (state) => state.profile.saveError

export default profileSlice.reducer
