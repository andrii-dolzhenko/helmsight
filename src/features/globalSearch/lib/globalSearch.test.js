import { describe, expect, it } from 'vitest'
import { buildGlobalSearchIndex, searchGlobalIndex } from './globalSearch.js'

const data = {
  projects: [
    { id: 'active project', name: 'Atlas Delivery', clientContext: 'Northstar', description: 'Migration programme' },
    { id: 'archived', name: 'Archived Project', archivedAt: '2026-10-01T12:00:00Z' },
  ],
  risks: [
    { id: 'r1', projectId: 'active project', title: 'Vendor delay', description: 'Handoff risk' },
    { id: 'r2', projectId: 'archived', title: 'Archived risk' },
  ],
  milestones: [{ id: 'm1', projectId: 'active project', title: 'Migration gate' }],
  actions: [{ id: 'a1', projectId: 'active project', title: 'Confirm handoff', owner: 'Alex' }],
  reports: [
    { id: 'rep1', projectId: 'active project', periodEnd: '2026-10-09', status: 'final' },
    { id: 'rep2', projectId: 'active project', periodEnd: '2026-10-02', archivedAt: '2026-10-03' },
  ],
  meetings: [
    { id: 'mt1', projectId: 'active project', title: 'Pilot readiness', notes: 'Migration handoff' },
    { id: 'mt2', projectId: 'active project', title: 'Old meeting', archivedAt: '2026-10-10' },
  ],
}

describe('global search index', () => {
  it('indexes active cross-project entities with valid destination routes', () => {
    const index = buildGlobalSearchIndex(data)
    expect(index.map((item) => item.type)).toEqual(['projects', 'risks', 'milestones', 'actions', 'reports', 'meetings'])
    expect(index.find((item) => item.type === 'projects').href).toBe('/projects/active%20project')
    expect(index.find((item) => item.type === 'risks').href).toBe('/projects/active%20project/risks/r1')
    expect(index.find((item) => item.type === 'actions').href).toBe('/projects/active%20project/actions#action-a1')
    expect(index.find((item) => item.type === 'reports').href).toBe('/projects/active%20project/reports/rep1')
    expect(index.find((item) => item.type === 'meetings').href).toBe('/projects/active%20project/meetings/mt1')
  })

  it('excludes archived projects, orphan entities and archived reports/notes', () => {
    const index = buildGlobalSearchIndex({ ...data, risks: [...data.risks, { id: 'missing', projectId: 'missing', title: 'Orphan risk' }] })
    expect(index.some((item) => item.title.includes('Archived') || item.title === 'Old meeting' || item.title === 'Orphan risk')).toBe(false)
    expect(index).toHaveLength(6)
  })

  it('groups relevant results and prefers matching titles to descriptions', () => {
    const index = buildGlobalSearchIndex(data)
    expect(searchGlobalIndex(index, 'migration').map((item) => item.type)).toEqual(['projects', 'milestones', 'meetings'])
    expect(searchGlobalIndex(index, 'vendor delay').map((item) => item.title)).toEqual(['Vendor delay'])
    expect(searchGlobalIndex(index, '  HANDOFF ')).toHaveLength(3)
    expect(searchGlobalIndex(index, '')).toEqual([])
  })

  it('handles diacritics, whitespace and per-group limits', () => {
    const index = buildGlobalSearchIndex({ projects: [{ id: 'p', name: 'Café Program' }, { id: 'q', name: 'Café Next' }, { id: 'r', name: 'Café Ops' }] })
    expect(searchGlobalIndex(index, '  cafe  ', 2)).toHaveLength(2)
  })
})
