import { describe, expect, it } from 'vitest'
import { deriveAttentionDrivers, deriveGlobalOverview } from './globalOverview.js'

const TODAY = new Date(2026, 9, 14, 12)

const project = (id, name, archivedAt = null) => ({
  id,
  name,
  archivedAt,
})

const action = (id, projectId, overrides = {}) => ({
  id,
  projectId,
  title: `Action ${id}`,
  status: 'in-progress',
  priority: 'high',
  dueDate: null,
  ...overrides,
})

describe('deriveGlobalOverview', () => {
  it('returns a valid empty portfolio summary', () => {
    const result = deriveGlobalOverview({ today: TODAY })

    expect(result.activeCount).toBe(0)
    expect(result.activeProjects).toEqual([])
    expect(result.projectsNeedingAttention).toEqual([])
    expect(result.signals).toEqual([])
    expect(result.healthSummary).toEqual({
      attention: 0,
      watch: 0,
      healthy: 0,
      notAssessed: 0,
    })
  })

  it('excludes archived projects and their signals', () => {
    const result = deriveGlobalOverview({
      today: TODAY,
      projects: [
        project('zeta', 'Zeta'),
        project('archived', 'Archived', '2026-10-01T10:00:00.000Z'),
        project('alpha', 'Alpha'),
      ],
      actions: [
        action('old', 'archived', { dueDate: '2026-09-01' }),
      ],
    })

    expect(result.activeCount).toBe(2)
    expect(result.activeProjects.map((item) => item.name)).toEqual([
      'Alpha',
      'Zeta',
    ])
    expect(result.healthSummary.notAssessed).toBe(2)
    expect(result.signals).toEqual([])
  })

  it('prioritizes attention, watch and healthy projects', () => {
    const result = deriveGlobalOverview({
      today: TODAY,
      projects: [
        project('healthy', 'Healthy Project'),
        project('watch', 'Watch Project'),
        project('urgent', 'Urgent Project'),
      ],
      actions: [
        action('overdue', 'urgent', {
          title: 'Resolve overdue issue',
          dueDate: '2026-09-01',
        }),
        action('critical', 'watch', {
          title: 'Review critical action',
          priority: 'critical',
        }),
        action('completed', 'healthy', {
          status: 'done',
        }),
      ],
    })

    expect(result.activeProjects.map((item) => item.id)).toEqual([
      'urgent',
      'watch',
      'healthy',
    ])

    expect(result.healthSummary).toEqual({
      attention: 1,
      watch: 1,
      healthy: 1,
      notAssessed: 0,
    })

    expect(result.projectsNeedingAttention.map((item) => item.id)).toEqual([
      'urgent',
      'watch',
    ])

    expect(result.signals.map((item) => item.state)).toEqual([
      'attention',
      'watch',
    ])
  })

  it('lists only future non-completed milestones from active projects within 30 days', () => {
    const result = deriveGlobalOverview({
      today: TODAY,
      projects: [project('one', 'First'), project('archived', 'Old', '2026-10-01')],
      milestones: [
        { id: 'now', projectId: 'one', title: 'Today', targetDate: '2026-10-14', status: 'planned' },
        { id: 'next', projectId: 'one', title: 'Next week', targetDate: '2026-10-21', status: 'planned' },
        { id: 'past', projectId: 'one', title: 'Past', targetDate: '2026-10-01', status: 'planned' },
        { id: 'done', projectId: 'one', title: 'Finished', targetDate: '2026-10-20', status: 'completed' },
        { id: 'later', projectId: 'one', title: 'Much later', targetDate: '2027-01-01', status: 'planned' },
        { id: 'old', projectId: 'archived', title: 'Archived', targetDate: '2026-10-18', status: 'planned' },
      ],
    })
    expect(result.upcomingMilestones.map((item) => item.id)).toEqual(['now', 'next'])
    expect(result.upcomingMilestones[0].href).toBe('/projects/one/milestones#milestone-now')
  })

  it('preserves project context and actionable signal routes', () => {
    const result = deriveGlobalOverview({
      today: TODAY,
      projects: [project('delivery', 'Delivery Project')],
      actions: [
        action('later', 'delivery', {
          title: 'Later overdue action',
          dueDate: '2026-10-01',
        }),
        action('earlier', 'delivery', {
          title: 'Earlier overdue action',
          dueDate: '2026-09-01',
        }),
      ],
    })

    expect(result.signals.map((item) => item.id)).toEqual([
      'action:earlier',
      'action:later',
    ])

    expect(result.signals[0]).toMatchObject({
      projectId: 'delivery',
      projectName: 'Delivery Project',
      state: 'attention',
      href: '/projects/delivery/actions#action-earlier',
    })

    expect(result.activeProjects[0].href).toBe('/projects/delivery')
  })
})


describe('deriveAttentionDrivers', () => {
  it('groups only real signals by module and urgency without duplicating counts', () => {
    const drivers = deriveAttentionDrivers([
      { module: 'Risk', state: 'attention' },
      { module: 'Risk', state: 'watch' },
      { module: 'Action', state: 'watch' },
      { module: 'Metrics', state: 'attention' },
    ])
    expect(drivers.find((source) => source.module === 'Risk')).toMatchObject({ attention: 1, watch: 1, total: 2 })
    expect(drivers.find((source) => source.module === 'Action')).toMatchObject({ attention: 0, watch: 1, total: 1 })
    expect(drivers.find((source) => source.module === 'Milestone')).toMatchObject({ total: 0 })
    expect(drivers.reduce((sum, driver) => sum + driver.total, 0)).toBe(4)
  })
})
