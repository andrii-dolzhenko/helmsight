import { describe, expect, it } from 'vitest'
import { buildProjectDashboard, PROJECT_HEALTH } from './projectDashboard.js'

const today = new Date('2026-10-07T12:00:00.000Z')

describe('buildProjectDashboard', () => {
  it('promotes blocking delivery signals into project health', () => {
    const dashboard = buildProjectDashboard({
      criteria: [],
      risks: [],
      milestones: [
        {
          id: 'late-milestone',
          title: 'Release readiness',
          targetDate: '2026-10-01',
          status: 'inProgress',
          progress: 80,
        },
      ],
      actions: [],
      today,
    })

    expect(dashboard.health).toBe(PROJECT_HEALTH.ATTENTION)
    expect(dashboard.milestones.overdue).toBe(1)
    expect(dashboard.needsAttention[0]).toMatchObject({
      module: 'Milestone',
      state: 'attention',
      route: 'milestones#milestone-late-milestone',
    })
  })

  it('keeps high-but-not-critical exposure at watch when nothing is blocking', () => {
    const dashboard = buildProjectDashboard({
      criteria: [],
      risks: [
        {
          id: 'high-risk',
          title: 'Dependency timing',
          severity: 'high',
          status: 'open',
          dueDate: '2026-12-01',
        },
      ],
      milestones: [],
      actions: [],
      today,
    })

    expect(dashboard.health).toBe(PROJECT_HEALTH.WATCH)
    expect(dashboard.risks.highCritical).toBe(1)
  })

  it('returns not assessed when no control data exists yet', () => {
    const dashboard = buildProjectDashboard({ today })

    expect(dashboard.health).toBe(PROJECT_HEALTH.NOT_ASSESSED)
    expect(dashboard.needsAttention).toEqual([])
  })
})
