import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { reportsService } from '../api/reportsService.js'
import { sortReportsByPeriod } from '../lib/weeklyReport.js'

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export const loadReports = createAsyncThunk('reports/loadReports', async (_, { rejectWithValue }) => {
  try {
    return await reportsService.list()
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const createReport = createAsyncThunk('reports/createReport', async (input, { rejectWithValue }) => {
  try {
    return await reportsService.create(input)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const updateReport = createAsyncThunk('reports/updateReport', async ({ reportId, input }, { rejectWithValue }) => {
  try {
    return await reportsService.update(reportId, input)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const finalizeReport = createAsyncThunk('reports/finalizeReport', async (reportId, { rejectWithValue }) => {
  try {
    return await reportsService.finalize(reportId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const reopenReport = createAsyncThunk('reports/reopenReport', async (reportId, { rejectWithValue }) => {
  try {
    return await reportsService.reopen(reportId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const archiveReport = createAsyncThunk('reports/archiveReport', async (reportId, { rejectWithValue }) => {
  try {
    return await reportsService.archive(reportId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const restoreReport = createAsyncThunk('reports/restoreReport', async (reportId, { rejectWithValue }) => {
  try {
    return await reportsService.restore(reportId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export const deleteReport = createAsyncThunk('reports/deleteReport', async (reportId, { rejectWithValue }) => {
  try {
    return await reportsService.remove(reportId)
  } catch (error) {
    return rejectWithValue(getErrorMessage(error))
  }
})

export function createReportsInitialState(items = [], status = 'idle') {
  return {
    items,
    status,
    error: null,
    mutationStatus: 'idle',
    mutationError: null,
  }
}

const slice = createSlice({
  name: 'reports',
  initialState: createReportsInitialState(),
  reducers: {
    clearReportMutationState(state) {
      state.mutationStatus = 'idle'
      state.mutationError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadReports.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadReports.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(loadReports.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unable to load weekly reports.'
      })

    for (const thunk of [createReport, updateReport, finalizeReport, reopenReport, archiveReport, restoreReport]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.mutationStatus = 'loading'
          state.mutationError = null
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.mutationStatus = 'succeeded'
          const index = state.items.findIndex((item) => item.id === action.payload.id)
          if (index === -1) state.items.unshift(action.payload)
          else state.items[index] = action.payload
        })
        .addCase(thunk.rejected, (state, action) => {
          state.mutationStatus = 'failed'
          state.mutationError = action.payload ?? 'Unable to save weekly report.'
        })
    }

    builder
      .addCase(deleteReport.pending, (state) => {
        state.mutationStatus = 'loading'
        state.mutationError = null
      })
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded'
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
      .addCase(deleteReport.rejected, (state, action) => {
        state.mutationStatus = 'failed'
        state.mutationError = action.payload ?? 'Unable to delete weekly report.'
      })
  },
})

export const { clearReportMutationState } = slice.actions
export const selectReports = (state) => state.reports.items
export const selectReportsStatus = (state) => state.reports.status
export const selectReportsError = (state) => state.reports.error
export const selectReportMutationStatus = (state) => state.reports.mutationStatus
export const selectReportMutationError = (state) => state.reports.mutationError
export const selectReportsByProject = createSelector(
  [selectReports, (_state, projectId) => projectId],
  (reports, projectId) => sortReportsByPeriod(reports.filter((report) => report.projectId === projectId)),
)
export const selectReportById = (state, reportId) => state.reports.items.find((item) => item.id === reportId) ?? null

export default slice.reducer
