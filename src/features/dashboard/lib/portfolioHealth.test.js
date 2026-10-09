import { describe, expect, it } from 'vitest'
import { buildPortfolioProjectHealth, summarizePortfolioHealth } from './portfolioHealth.js'

const TODAY = new Date('2026-10-08T12:00:00.000Z')

describe('portfolio project health', () => {
  it('derives active-project health from canonical project-control data only', () => {
    const health = buildPortfolioProjectHealth({
      projects: [
        { id: 'attention-project', archivedAt: null },
        { id: 'healthy-project', archivedAt: null },
        { id: 'archived-project', archivedAt: '2026-10-01T10:00:00.000Z' },
      ],
      risks: [
        {
          id: 'critical-risk',
          projectId: 'attention-project',
          title: 'Critical dependency',
          probability: 5,
          impact: 4,
          score: 20,
          severity: 'critical',
          dueDate: '2026-10-20',
          status: 'open',
        },
      ],
      criteria: [
        {
          id: 'healthy-criterion',
          projectId: 'healthy-project',
          title: 'Adoption',
          baseline: 0,
          target: 80,
          currentValue: 85,
          unit: 'percentage',
          targetDate: '2026-11-30',
          direction: 'atLeast',
          metricType: 'manual',
        },
      ],
      today: TODAY,
    })

    expect(health['attention-project']).toMatchObject({
      status: 'attention',
      label: 'Needs attention',
    })
    expect(health['healthy-project']).toMatchObject({
      status: 'healthy',
      label: 'Healthy',
    })
    expect(health['archived-project']).toBeUndefined()
  })

  it('summarizes portfolio health without persisting duplicate state', () => {
    expect(summarizePortfolioHealth({
      a: { status: 'attention' },
      b: { status: 'watch' },
      c: { status: 'healthy' },
      d: { status: 'notAssessed' },
    })).toEqual({ attention: 1, watch: 1, healthy: 1, notAssessed: 1 })
  })
})
