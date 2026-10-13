import { describe, expect, it } from 'vitest'
import { deriveGlobalActionsView } from './globalActions.js'

const today = new Date(2026, 9, 13, 12)

const projects = [
  { id: 'active', name: 'Active Delivery', archivedAt: null },
  { id: 'archived', name: 'Archived Delivery', archivedAt: '2026-10-01T12:00:00Z' },
]

const actions = [
  { id: 'overdue', projectId: 'active', status: 'notStarted', priority: 'critical', dueDate: '2026-10-12' },
  { id: 'soon', projectId: 'active', status: 'inProgress', priority: 'medium', dueDate: '2026-10-20' },
  { id: 'finished', projectId: 'active', status: 'done', priority: 'low', dueDate: '2026-10-01' },
  { id: 'later', projectId: 'active', status: 'notStarted', priority: 'high', dueDate: '2026-11-05' },
  { id: 'archived-action', projectId: 'archived', status: 'notStarted', priority: 'high', dueDate: '2026-10-10' },
  { id: 'orphan', projectId: 'missing', status: 'notStarted', priority: 'critical', dueDate: '2026-10-09' },
]

function derive(overrides = {}) {
  return deriveGlobalActionsView({ projects, actions, today, ...overrides })
}

describe('Global Actions portfolio derivation', () => {
  it('excludes archived and missing projects by default', () => {
    const view = derive()

    expect(view.visibleActions.map((action) => action.id)).toEqual([
      'overdue', 'soon', 'later', 'finished',
    ])
    expect(view.summary).toEqual({
      active: 3,
      critical: 1,
      attention: 2,
      done: 1,
    })
  })

  it('does not change summary counts for register-only filters', () => {
    const view = derive({ status: 'done', priority: 'low' })

    expect(view.visibleActions.map((action) => action.id)).toEqual(['finished'])
    expect(view.summary.active).toBe(3)
    expect(view.summary.done).toBe(1)
    expect(view.scopedCount).toBe(4)
  })

  it('combines status, priority and attention filters', () => {
    const view = derive({
      status: 'inProgress',
      priority: 'medium',
      attention: 'dueSoon',
    })

    expect(view.visibleActions.map((action) => action.id)).toEqual(['soon'])
    expect(derive({ attention: 'overdue' }).visibleActions.map(
      (action) => action.id,
    )).toEqual(['overdue'])
  })

  it('includes archived projects only when requested', () => {
    const view = derive({ includeArchived: true })

    expect(view.eligibleProjects).toHaveLength(2)
    expect(view.visibleActions.map((action) => action.id)).toContain('archived-action')
    expect(view.summary.active).toBe(4)
    expect(view.summary.attention).toBe(3)
  })

  it('recalculates summary for a selected project', () => {
    const view = derive({
      includeArchived: true,
      projectId: 'archived',
    })

    expect(view.visibleActions.map((action) => action.id)).toEqual(['archived-action'])
    expect(view.summary).toEqual({
      active: 1,
      critical: 0,
      attention: 1,
      done: 0,
    })
  })

  it('never exposes actions belonging to missing projects', () => {
    const view = derive({ includeArchived: true })

    expect(view.visibleActions.some((action) => action.id === 'orphan')).toBe(false)
    expect(view.projectById.has('missing')).toBe(false)
  })

  it('returns zero counts for an empty portfolio', () => {
    const view = derive({ projects: [], actions: [] })

    expect(view.visibleActions).toEqual([])
    expect(view.summary).toEqual({
      active: 0,
      critical: 0,
      attention: 0,
      done: 0,
    })
  })
})
