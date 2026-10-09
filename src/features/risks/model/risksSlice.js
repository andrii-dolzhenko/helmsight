import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { risksService } from '../api/risksService.js'

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export const loadRisks = createAsyncThunk('risks/loadRisks', async (_, { rejectWithValue }) => {
  try {
    return await risksService.list()
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const createRisk = createAsyncThunk('risks/createRisk', async (input, { rejectWithValue }) => {
  try {
    return await risksService.create(input)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const updateRisk = createAsyncThunk('risks/updateRisk', async ({ riskId, input }, { rejectWithValue }) => {
  try {
    return await risksService.update(riskId, input)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const deleteRisk = createAsyncThunk('risks/deleteRisk', async (riskId, { rejectWithValue }) => {
  try {
    return await risksService.remove(riskId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export function createRisksInitialState(items = [], status = 'idle') {
  return { items, status, error: null, mutationStatus: 'idle', mutationError: null }
}

const risksSlice = createSlice({
  name: 'risks',
  initialState: createRisksInitialState(),
  reducers: {
    clearRiskMutationState(state) {
      state.mutationStatus = 'idle'
      state.mutationError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadRisks.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadRisks.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(loadRisks.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unable to load risks.'
      })

    for (const thunk of [createRisk, updateRisk]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.mutationStatus = 'loading'
          state.mutationError = null
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.mutationStatus = 'succeeded'
          const index = state.items.findIndex((risk) => risk.id === action.payload.id)
          if (index === -1) state.items.unshift(action.payload)
          else state.items[index] = action.payload
        })
        .addCase(thunk.rejected, (state, action) => {
          state.mutationStatus = 'failed'
          state.mutationError = action.payload ?? 'Unable to save risk.'
        })
    }

    builder
      .addCase(deleteRisk.pending, (state) => {
        state.mutationStatus = 'loading'
        state.mutationError = null
      })
      .addCase(deleteRisk.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded'
        state.items = state.items.filter((risk) => risk.id !== action.payload)
      })
      .addCase(deleteRisk.rejected, (state, action) => {
        state.mutationStatus = 'failed'
        state.mutationError = action.payload ?? 'Unable to delete risk.'
      })
  },
})

export const { clearRiskMutationState } = risksSlice.actions
export const selectRisks = (state) => state.risks.items
export const selectRisksStatus = (state) => state.risks.status
export const selectRisksError = (state) => state.risks.error
export const selectRiskMutationStatus = (state) => state.risks.mutationStatus
export const selectRiskMutationError = (state) => state.risks.mutationError
export const selectRisksByProject = createSelector(
  [selectRisks, (_state, projectId) => projectId],
  (risks, projectId) => risks.filter((risk) => risk.projectId === projectId),
)
export const selectRiskById = (state, riskId) => state.risks.items.find((risk) => risk.id === riskId)

export default risksSlice.reducer
