import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { successCriteriaService } from '../api/successCriteriaService.js'

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export const loadSuccessCriteria = createAsyncThunk(
  'successCriteria/loadSuccessCriteria',
  async (_, { rejectWithValue }) => {
    try {
      return await successCriteriaService.list()
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const createSuccessCriterion = createAsyncThunk(
  'successCriteria/createSuccessCriterion',
  async (input, { rejectWithValue }) => {
    try {
      return await successCriteriaService.create(input)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const updateSuccessCriterion = createAsyncThunk(
  'successCriteria/updateSuccessCriterion',
  async ({ criterionId, input }, { rejectWithValue }) => {
    try {
      return await successCriteriaService.update(criterionId, input)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export const deleteSuccessCriterion = createAsyncThunk(
  'successCriteria/deleteSuccessCriterion',
  async (criterionId, { rejectWithValue }) => {
    try {
      return await successCriteriaService.remove(criterionId)
    } catch (error) {
      return rejectWithValue(getErrorMessage(error))
    }
  },
)

export function createSuccessCriteriaInitialState(items = [], status = 'idle') {
  return {
    items,
    status,
    error: null,
    mutationStatus: 'idle',
    mutationError: null,
  }
}

const initialState = createSuccessCriteriaInitialState()

function upsertCriterion(state, criterion) {
  const existingIndex = state.items.findIndex((item) => item.id === criterion.id)

  if (existingIndex === -1) {
    state.items.unshift(criterion)
    return
  }

  state.items[existingIndex] = criterion
}

const successCriteriaSlice = createSlice({
  name: 'successCriteria',
  initialState,
  reducers: {
    clearSuccessCriterionMutationState(state) {
      state.mutationStatus = 'idle'
      state.mutationError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSuccessCriteria.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadSuccessCriteria.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(loadSuccessCriteria.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unable to load success criteria.'
      })

    for (const thunk of [createSuccessCriterion, updateSuccessCriterion]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.mutationStatus = 'loading'
          state.mutationError = null
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.mutationStatus = 'succeeded'
          upsertCriterion(state, action.payload)
        })
        .addCase(thunk.rejected, (state, action) => {
          state.mutationStatus = 'failed'
          state.mutationError = action.payload ?? 'Unable to save success criterion.'
        })
    }

    builder
      .addCase(deleteSuccessCriterion.pending, (state) => {
        state.mutationStatus = 'loading'
        state.mutationError = null
      })
      .addCase(deleteSuccessCriterion.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded'
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
      .addCase(deleteSuccessCriterion.rejected, (state, action) => {
        state.mutationStatus = 'failed'
        state.mutationError = action.payload ?? 'Unable to delete success criterion.'
      })
  },
})

export const { clearSuccessCriterionMutationState } = successCriteriaSlice.actions

export const selectSuccessCriteria = (state) => state.successCriteria.items
export const selectSuccessCriteriaStatus = (state) => state.successCriteria.status
export const selectSuccessCriteriaError = (state) => state.successCriteria.error
export const selectSuccessCriterionMutationStatus = (state) =>
  state.successCriteria.mutationStatus
export const selectSuccessCriterionMutationError = (state) =>
  state.successCriteria.mutationError
export const selectSuccessCriteriaByProject = createSelector(
  [selectSuccessCriteria, (_state, projectId) => projectId],
  (criteria, projectId) => criteria.filter((criterion) => criterion.projectId === projectId),
)
export const selectSuccessCriterionById = (state, criterionId) =>
  state.successCriteria.items.find((criterion) => criterion.id === criterionId)

export default successCriteriaSlice.reducer
