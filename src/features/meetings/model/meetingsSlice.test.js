import { beforeEach, describe, expect, it } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import meetingsReducer, {
  archiveMeetingNote,
  createMeetingNote,
  loadMeetings,
  restoreMeetingNote,
  selectMeetingById,
  selectMeetingMutationError,
  selectMeetingMutationStatus,
} from './meetingsSlice.js'

const INPUT = {
  projectId: 'project-1',
  title: 'Weekly delivery sync',
  meetingDate: '2026-10-08',
  owner: 'Alex Morgan',
  participants: ['Maya Chen'],
  notes: 'Reviewed project delivery and remaining dependencies.',
  decisions: ['Keep the approved delivery baseline.'],
  followUps: [],
}

function createStore() {
  return configureStore({
    reducer: { meetings: meetingsReducer },
  })
}

describe('Meeting Notes Redux lifecycle', () => {
  beforeEach(() => window.localStorage.clear())

  it('archives and restores a note while preserving its content version', async () => {
    const store = createStore()
    await store.dispatch(loadMeetings()).unwrap()
    const created = await store.dispatch(createMeetingNote(INPUT)).unwrap()

    const archived = await store.dispatch(archiveMeetingNote(created.id)).unwrap()

    expect(archived.archivedAt).toEqual(expect.any(String))
    expect(selectMeetingById(store.getState(), created.id)).toEqual(archived)
    expect(archived.version).toBe(created.version)
    expect(archived.updatedAt).toBe(created.updatedAt)
    expect(selectMeetingMutationStatus(store.getState())).toBe('succeeded')

    const restored = await store.dispatch(restoreMeetingNote(created.id)).unwrap()

    expect(restored.archivedAt).toBeNull()
    expect(restored.version).toBe(created.version)
    expect(restored.updatedAt).toBe(created.updatedAt)
    expect(selectMeetingById(store.getState(), created.id)).toEqual(restored)
    expect(selectMeetingMutationStatus(store.getState())).toBe('succeeded')
  })

  it('reports lifecycle errors without changing Redux meeting records', async () => {
    const store = createStore()
    await store.dispatch(loadMeetings()).unwrap()
    const before = store.getState().meetings.items

    const result = await store.dispatch(archiveMeetingNote('missing-id'))

    expect(result.type).toBe(archiveMeetingNote.rejected.type)
    expect(selectMeetingMutationStatus(store.getState())).toBe('failed')
    expect(selectMeetingMutationError(store.getState())).toMatch(/not found/i)
    expect(store.getState().meetings.items).toEqual(before)
  })
})
