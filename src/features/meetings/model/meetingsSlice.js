import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { meetingsService } from '../api/meetingsService.js'
import { sortMeetingNotes } from '../lib/meetingNotes.js'

function message(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export const loadMeetings = createAsyncThunk('meetings/load', async (_, { rejectWithValue }) => {
  try { return await meetingsService.list() } catch (error) { return rejectWithValue(message(error)) }
})

export const createMeetingNote = createAsyncThunk('meetings/create', async (input, { rejectWithValue }) => {
  try { return await meetingsService.create(input) } catch (error) { return rejectWithValue(message(error)) }
})

export const updateMeetingNote = createAsyncThunk('meetings/update', async ({ meetingId, input }, { rejectWithValue }) => {
  try { return await meetingsService.update(meetingId, input) } catch (error) { return rejectWithValue(message(error)) }
})

export const deleteMeetingNote = createAsyncThunk('meetings/delete', async (meetingId, { rejectWithValue }) => {
  try { return await meetingsService.remove(meetingId) } catch (error) { return rejectWithValue(message(error)) }
})

export function createMeetingsInitialState(items = [], status = 'idle') {
  return { items, status, error: null, mutationStatus: 'idle', mutationError: null }
}

const slice = createSlice({
  name: 'meetings',
  initialState: createMeetingsInitialState(),
  reducers: {
    clearMeetingMutationState(state) {
      state.mutationStatus = 'idle'
      state.mutationError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMeetings.pending, (state) => { state.status = 'loading'; state.error = null })
      .addCase(loadMeetings.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload })
      .addCase(loadMeetings.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload ?? 'Unable to load meeting notes.' })

    for (const thunk of [createMeetingNote, updateMeetingNote]) {
      builder
        .addCase(thunk.pending, (state) => { state.mutationStatus = 'loading'; state.mutationError = null })
        .addCase(thunk.fulfilled, (state, action) => {
          state.mutationStatus = 'succeeded'
          const index = state.items.findIndex((item) => item.id === action.payload.id)
          if (index === -1) state.items.unshift(action.payload)
          else state.items[index] = action.payload
        })
        .addCase(thunk.rejected, (state, action) => { state.mutationStatus = 'failed'; state.mutationError = action.payload ?? 'Unable to save meeting note.' })
    }

    builder
      .addCase(deleteMeetingNote.pending, (state) => { state.mutationStatus = 'loading'; state.mutationError = null })
      .addCase(deleteMeetingNote.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded'
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
      .addCase(deleteMeetingNote.rejected, (state, action) => { state.mutationStatus = 'failed'; state.mutationError = action.payload ?? 'Unable to delete meeting note.' })
  },
})

export const { clearMeetingMutationState } = slice.actions
export const selectMeetings = (state) => state.meetings.items
export const selectMeetingsStatus = (state) => state.meetings.status
export const selectMeetingsError = (state) => state.meetings.error
export const selectMeetingMutationStatus = (state) => state.meetings.mutationStatus
export const selectMeetingMutationError = (state) => state.meetings.mutationError
export const selectMeetingsByProject = createSelector(
  [selectMeetings, (_state, projectId) => projectId],
  (items, projectId) => sortMeetingNotes(items.filter((item) => item.projectId === projectId)),
)
export const selectMeetingById = (state, meetingId) => state.meetings.items.find((item) => item.id === meetingId) ?? null

export default slice.reducer
