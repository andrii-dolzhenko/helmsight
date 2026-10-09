import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { evmService } from '../api/evmService.js'

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export const loadEvm = createAsyncThunk('evm/loadEvm', async (_, { rejectWithValue }) => {
  try {
    return await evmService.list()
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const saveEvmBaseline = createAsyncThunk('evm/saveEvmBaseline', async (input, { rejectWithValue }) => {
  try {
    return await evmService.saveBaseline(input)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const createEvmSnapshot = createAsyncThunk('evm/createEvmSnapshot', async (input, { rejectWithValue }) => {
  try {
    return await evmService.createSnapshot(input)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const updateEvmSnapshot = createAsyncThunk('evm/updateEvmSnapshot', async ({ snapshotId, input }, { rejectWithValue }) => {
  try {
    return await evmService.updateSnapshot(snapshotId, input)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const deleteEvmSnapshot = createAsyncThunk('evm/deleteEvmSnapshot', async (snapshotId, { rejectWithValue }) => {
  try {
    return await evmService.removeSnapshot(snapshotId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export function createEvmInitialState(data = { baselines: [], snapshots: [] }, status = 'idle') {
  return {
    baselines: data.baselines ?? [],
    snapshots: data.snapshots ?? [],
    status,
    error: null,
    mutationStatus: 'idle',
    mutationError: null,
  }
}

const evmSlice = createSlice({
  name: 'evm',
  initialState: createEvmInitialState(),
  reducers: {
    clearEvmMutationState(state) {
      state.mutationStatus = 'idle'
      state.mutationError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadEvm.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadEvm.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.baselines = action.payload.baselines
        state.snapshots = action.payload.snapshots
      })
      .addCase(loadEvm.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unable to load EVM metrics.'
      })

    builder
      .addCase(saveEvmBaseline.pending, mutationPending)
      .addCase(saveEvmBaseline.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded'
        const index = state.baselines.findIndex((item) => item.projectId === action.payload.projectId)
        if (index === -1) state.baselines.push(action.payload)
        else state.baselines[index] = action.payload
      })
      .addCase(saveEvmBaseline.rejected, mutationRejected)

    for (const thunk of [createEvmSnapshot, updateEvmSnapshot]) {
      builder
        .addCase(thunk.pending, mutationPending)
        .addCase(thunk.fulfilled, (state, action) => {
          state.mutationStatus = 'succeeded'
          const index = state.snapshots.findIndex((item) => item.id === action.payload.id)
          if (index === -1) state.snapshots.push(action.payload)
          else state.snapshots[index] = action.payload
        })
        .addCase(thunk.rejected, mutationRejected)
    }

    builder
      .addCase(deleteEvmSnapshot.pending, mutationPending)
      .addCase(deleteEvmSnapshot.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded'
        state.snapshots = state.snapshots.filter((item) => item.id !== action.payload)
      })
      .addCase(deleteEvmSnapshot.rejected, mutationRejected)
  },
})

function mutationPending(state) {
  state.mutationStatus = 'loading'
  state.mutationError = null
}

function mutationRejected(state, action) {
  state.mutationStatus = 'failed'
  state.mutationError = action.payload ?? 'Unable to save EVM data.'
}

export const { clearEvmMutationState } = evmSlice.actions
export const selectEvmStatus = (state) => state.evm.status
export const selectEvmError = (state) => state.evm.error
export const selectEvmMutationStatus = (state) => state.evm.mutationStatus
export const selectEvmMutationError = (state) => state.evm.mutationError
export const selectEvmBaselineByProject = (state, projectId) => state.evm.baselines.find((item) => item.projectId === projectId) ?? null
export const selectEvmSnapshots = (state) => state.evm.snapshots
export const selectEvmSnapshotsByProject = createSelector(
  [selectEvmSnapshots, (_state, projectId) => projectId],
  (snapshots, projectId) => snapshots.filter((item) => item.projectId === projectId),
)
export const selectEvmSnapshotById = (state, snapshotId) => state.evm.snapshots.find((item) => item.id === snapshotId) ?? null

export default evmSlice.reducer
