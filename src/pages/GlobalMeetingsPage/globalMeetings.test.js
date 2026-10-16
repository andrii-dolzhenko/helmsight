import { describe, expect, it } from 'vitest'
import { deriveGlobalMeetingsView, MEETING_SORT } from './globalMeetings.js'

const projects = [
  { id: 'p1', name: 'Atlas', archivedAt: null },
  { id: 'p2', name: 'Beacon', archivedAt: '2026-10-01T10:00:00.000Z' },
]
const meetings = [
  { id: 'm1', projectId: 'p1', title: 'Kickoff', meetingDate: '2026-10-02', updatedAt: '2026-10-02T12:00:00.000Z' },
  { id: 'm2', projectId: 'p1', title: 'Risk Review', meetingDate: '2026-10-05', updatedAt: '2026-10-05T12:00:00.000Z', archivedAt: '2026-10-07T12:00:00.000Z' },
  { id: 'm3', projectId: 'p2', title: 'Planning', meetingDate: '2026-10-04', updatedAt: '2026-10-08T12:00:00.000Z' },
  { id: 'm4', projectId: 'p2', title: 'Retrospective', meetingDate: '2026-09-01', archivedAt: '2026-10-08T12:00:00.000Z' },
  { id: 'orphan', projectId: 'deleted', title: 'Orphan', meetingDate: '2026-10-06' },
]
const getView = (overrides = {}) => deriveGlobalMeetingsView({ projects, meetings, ...overrides })

const ids = (view) => view.visibleMeetings.map((meeting) => meeting.id)

describe('Global Meetings portfolio projection', () => {
  it('scopes by active projects and excludes orphan notes by default', () => {
    const view = getView()
    expect(view.summary).toEqual({ total: 2, current: 1, archived: 1 })
    expect(ids(view)).toEqual(['m1'])
    expect(view.eligibleProjects).toHaveLength(1)
  })

  it('includes archived projects but never changes note lifecycle implicitly', () => {
    const view = getView({ includeArchivedProjects: true })
    expect(view.summary).toEqual({ total: 4, current: 2, archived: 2 })
    expect(ids(view)).toEqual(['m3', 'm1'])
    expect(ids(getView({ includeArchivedProjects: true, lifecycle: 'archived' })))
      .toEqual(['m2', 'm4'])
  })

  it('keeps archived notes from active projects independent of project archival', () => {
    expect(ids(getView({ lifecycle: 'archived' }))).toEqual(['m2'])
    expect(ids(getView({ projectId: 'p2', includeArchivedProjects: true, lifecycle: 'archived' })))
      .toEqual(['m4'])
  })

  it('searches meeting title and project name case-insensitively without changing KPIs', () => {
    const titleView = getView({ query: '  KICK  ' })
    expect(ids(titleView)).toEqual(['m1'])
    expect(titleView.summary.total).toBe(2)
    const projectView = getView({ query: 'beAC', includeArchivedProjects: true })
    expect(ids(projectView)).toEqual(['m3'])
    expect(projectView.summary.total).toBe(4)
    expect(ids(getView({ query: 'no matching title' }))).toEqual([])
  })

  it('sorts by meeting date ascending or descending and last updated without fabricated timestamps', () => {
    expect(ids(getView({ includeArchivedProjects: true, sort: MEETING_SORT.NEWEST })))
      .toEqual(['m3', 'm1'])
    expect(ids(getView({ includeArchivedProjects: true, sort: MEETING_SORT.OLDEST })))
      .toEqual(['m1', 'm3'])
    expect(ids(getView({ includeArchivedProjects: true, sort: MEETING_SORT.RECENTLY_UPDATED })))
      .toEqual(['m3', 'm1'])
  })

  it('uses stable ID fallback on ties for deterministic pagination', () => {
    const view = deriveGlobalMeetingsView({ projects, meetings: [
      { id: 'b', projectId: 'p1', meetingDate: '2026-10-04' },
      { id: 'a', projectId: 'p1', meetingDate: '2026-10-04' },
    ] })
    expect(ids(view)).toEqual(['a', 'b'])
  })

  it('does not mutate source arrays or objects', () => {
    const source = [...meetings]
    getView({ includeArchivedProjects: true, lifecycle: 'archived' })
    expect(meetings).toEqual(source)
    expect(meetings[0]).toBe(source[0])
  })
})
