import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { milestonesService } from '../api/milestonesService.js'

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export const loadMilestones = createAsyncThunk('milestones/loadMilestones', async (_, { rejectWithValue }) => {
  try {
    return await milestonesService.list()
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const createMilestone = createAsyncThunk('milestones/createMilestone', async (input, { rejectWithValue }) => {
  try {
    return await milestonesService.create(input)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const updateMilestone = createAsyncThunk('milestones/updateMilestone', async ({ milestoneId, input }, { rejectWithValue }) => {
  try {
    return await milestonesService.update(milestoneId, input)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const deleteMilestone = createAsyncThunk('milestones/deleteMilestone', async (milestoneId, { rejectWithValue }) => {
  try {
    return await milestonesService.remove(milestoneId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export function createMilestonesInitialState(items = [], status = 'idle') {
  return { items, status, error: null, mutationStatus: 'idle', mutationError: null }
}

const milestonesSlice = createSlice({
  name: 'milestones',
  initialState: createMilestonesInitialState(),
  reducers: {
    clearMilestoneMutationState(state) {
      state.mutationStatus = 'idle'
      state.mutationError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMilestones.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadMilestones.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(loadMilestones.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unable to load milestones.'
      })

    for (const thunk of [createMilestone, updateMilestone]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.mutationStatus = 'loading'
          state.mutationError = null
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.mutationStatus = 'succeeded'
          const index = state.items.findIndex((milestone) => milestone.id === action.payload.id)
          if (index === -1) state.items.unshift(action.payload)
          else state.items[index] = action.payload
        })
        .addCase(thunk.rejected, (state, action) => {
          state.mutationStatus = 'failed'
          state.mutationError = action.payload ?? 'Unable to save milestone.'
        })
    }

    builder
      .addCase(deleteMilestone.pending, (state) => {
        state.mutationStatus = 'loading'
        state.mutationError = null
      })
      .addCase(deleteMilestone.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded'
        state.items = state.items.filter((milestone) => milestone.id !== action.payload)
      })
      .addCase(deleteMilestone.rejected, (state, action) => {
        state.mutationStatus = 'failed'
        state.mutationError = action.payload ?? 'Unable to delete milestone.'
      })
  },
})

export const { clearMilestoneMutationState } = milestonesSlice.actions
export const selectMilestones = (state) => state.milestones.items
export const selectMilestonesStatus = (state) => state.milestones.status
export const selectMilestonesError = (state) => state.milestones.error
export const selectMilestoneMutationStatus = (state) => state.milestones.mutationStatus
export const selectMilestoneMutationError = (state) => state.milestones.mutationError
export const selectMilestonesByProject = createSelector(
  [selectMilestones, (_state, projectId) => projectId],
  (milestones, projectId) => milestones.filter((milestone) => milestone.projectId === projectId),
)
export const selectMilestoneById = (state, milestoneId) => state.milestones.items.find((milestone) => milestone.id === milestoneId)

export default milestonesSlice.reducer
