import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { managementActionsService } from '../api/managementActionsService.js'

function message(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export const loadManagementActions = createAsyncThunk('managementActions/load', async (_, { rejectWithValue }) => {
  try { return await managementActionsService.list() } catch (error) { return rejectWithValue(message(error)) }
})
export const createManagementAction = createAsyncThunk('managementActions/create', async (input, { rejectWithValue }) => {
  try { return await managementActionsService.create(input) } catch (error) { return rejectWithValue(message(error)) }
})
export const updateManagementAction = createAsyncThunk('managementActions/update', async ({ actionId, input }, { rejectWithValue }) => {
  try { return await managementActionsService.update(actionId, input) } catch (error) { return rejectWithValue(message(error)) }
})
export const deleteManagementAction = createAsyncThunk('managementActions/delete', async (actionId, { rejectWithValue }) => {
  try { return await managementActionsService.remove(actionId) } catch (error) { return rejectWithValue(message(error)) }
})

export function createManagementActionsInitialState(items = [], status = 'idle') {
  return { items, status, error: null, mutationStatus: 'idle', mutationError: null }
}

const slice = createSlice({
  name: 'managementActions',
  initialState: createManagementActionsInitialState(),
  reducers: {
    clearManagementActionMutationState(state) {
      state.mutationStatus = 'idle'
      state.mutationError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadManagementActions.pending, (state) => { state.status = 'loading'; state.error = null })
      .addCase(loadManagementActions.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload })
      .addCase(loadManagementActions.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload ?? 'Unable to load management actions.' })
    for (const thunk of [createManagementAction, updateManagementAction]) {
      builder
        .addCase(thunk.pending, (state) => { state.mutationStatus = 'loading'; state.mutationError = null })
        .addCase(thunk.fulfilled, (state, action) => {
          state.mutationStatus = 'succeeded'
          const index = state.items.findIndex((item) => item.id === action.payload.id)
          if (index === -1) state.items.unshift(action.payload)
          else state.items[index] = action.payload
        })
        .addCase(thunk.rejected, (state, action) => { state.mutationStatus = 'failed'; state.mutationError = action.payload ?? 'Unable to save management action.' })
    }
    builder
      .addCase(deleteManagementAction.pending, (state) => { state.mutationStatus = 'loading'; state.mutationError = null })
      .addCase(deleteManagementAction.fulfilled, (state, action) => { state.mutationStatus = 'succeeded'; state.items = state.items.filter((item) => item.id !== action.payload) })
      .addCase(deleteManagementAction.rejected, (state, action) => { state.mutationStatus = 'failed'; state.mutationError = action.payload ?? 'Unable to delete management action.' })
  },
})

export const { clearManagementActionMutationState } = slice.actions
export const selectManagementActions = (state) => state.managementActions.items
export const selectManagementActionsStatus = (state) => state.managementActions.status
export const selectManagementActionsError = (state) => state.managementActions.error
export const selectManagementActionMutationStatus = (state) => state.managementActions.mutationStatus
export const selectManagementActionMutationError = (state) => state.managementActions.mutationError
export const selectManagementActionsByProject = createSelector(
  [selectManagementActions, (_state, projectId) => projectId],
  (items, projectId) => items.filter((item) => item.projectId === projectId),
)
export const selectManagementActionById = (state, actionId) => state.managementActions.items.find((item) => item.id === actionId)

export default slice.reducer
