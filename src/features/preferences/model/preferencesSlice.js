import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { preferencesService } from '../api/preferencesService.js'

export const loadPreferences = createAsyncThunk(
  'preferences/load',
  async (_, { rejectWithValue }) => {
    try {
      return await preferencesService.get()
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)

export const updateThemeMode = createAsyncThunk(
  'preferences/updateThemeMode',
  async (themeMode, { rejectWithValue }) => {
    try {
      return await preferencesService.updateThemeMode(themeMode)
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)

export const updateProjectsViewMode = createAsyncThunk(
  'preferences/updateProjectsViewMode',
  async (projectsViewMode, { rejectWithValue }) => {
    try {
      return await preferencesService.updateProjectsViewMode(projectsViewMode)
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)


export const updateRisksViewMode = createAsyncThunk(
  'preferences/updateRisksViewMode',
  async (risksViewMode, { rejectWithValue }) => {
    try {
      return await preferencesService.updateRisksViewMode(risksViewMode)
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)


export const updateActionsViewMode = createAsyncThunk(
  'preferences/updateActionsViewMode',
  async (actionsViewMode, { rejectWithValue }) => {
    try {
      return await preferencesService.updateActionsViewMode(actionsViewMode)
    } catch (error) {
      return rejectWithValue(error.message)
    }
  },
)

export function createPreferencesInitialState(snapshot = null, status = 'idle') {
  return {
    themeMode: snapshot?.themeMode ?? 'system',
    projectsViewMode: snapshot?.projectsViewMode ?? 'grid',
    risksViewMode: snapshot?.risksViewMode ?? 'grid',
    actionsViewMode: snapshot?.actionsViewMode ?? 'grid',
    status,
    error: null,
    projectsViewModeError: null,
    risksViewModeError: null,
    actionsViewModeError: null,
  }
}

const initialState = createPreferencesInitialState()

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadPreferences.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadPreferences.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.themeMode = action.payload.themeMode
        state.projectsViewMode = action.payload.projectsViewMode
        state.risksViewMode = action.payload.risksViewMode
        state.actionsViewMode = action.payload.actionsViewMode
      })
      .addCase(loadPreferences.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? action.error.message
      })
      .addCase(updateThemeMode.pending, (state) => {
        state.error = null
      })
      .addCase(updateThemeMode.fulfilled, (state, action) => {
        state.themeMode = action.payload.themeMode
      })
      .addCase(updateThemeMode.rejected, (state, action) => {
        state.error = action.payload ?? action.error.message
      })
      .addCase(updateProjectsViewMode.pending, (state) => {
        state.projectsViewModeError = null
      })
      .addCase(updateProjectsViewMode.fulfilled, (state, action) => {
        state.projectsViewMode = action.payload.projectsViewMode
        state.projectsViewModeError = null
      })
      .addCase(updateProjectsViewMode.rejected, (state, action) => {
        state.projectsViewModeError = action.payload ?? action.error.message
      })

      .addCase(updateRisksViewMode.pending, (state) => {
        state.risksViewModeError = null
      })
      .addCase(updateRisksViewMode.fulfilled, (state, action) => {
        state.risksViewMode = action.payload.risksViewMode
        state.risksViewModeError = null
      })
      .addCase(updateRisksViewMode.rejected, (state, action) => {
        state.risksViewModeError = action.payload ?? action.error.message
      })

      .addCase(updateActionsViewMode.pending, (state) => {
        state.actionsViewModeError = null
      })
      .addCase(updateActionsViewMode.fulfilled, (state, action) => {
        state.actionsViewMode = action.payload.actionsViewMode
        state.actionsViewModeError = null
      })
      .addCase(updateActionsViewMode.rejected, (state, action) => {
        state.actionsViewModeError = action.payload ?? action.error.message
      })
  },
})

export const selectThemeMode = (state) => state.preferences.themeMode
export const selectProjectsViewMode = (state) => state.preferences.projectsViewMode
export const selectRisksViewMode = (state) => state.preferences.risksViewMode
export const selectActionsViewMode = (state) => state.preferences.actionsViewMode
export const selectPreferencesStatus = (state) => state.preferences.status
export const selectPreferencesError = (state) => state.preferences.error
export const selectProjectsViewModeError = (state) =>
  state.preferences.projectsViewModeError
export const selectRisksViewModeError = (state) => state.preferences.risksViewModeError
export const selectActionsViewModeError = (state) => state.preferences.actionsViewModeError

export default preferencesSlice.reducer
