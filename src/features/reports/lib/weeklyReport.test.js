import { describe, expect, it } from 'vitest'
import { buildWeeklyReportSnapshot, getReportPeriod, getVisibleAttentionSignals } from './weeklyReport.js'

const baseline = {
  projectId: 'project-1',
  measurementBasis: 'hours',
  currencyCode: 'USD',
  workPackages: [
    {
      id: 'wp-1',
      title: 'Delivery',
      startDate: '2026-09-28',
      endDate: '2026-10-09',
      budgetValue: 100,
    },
  ],
}

function buildInput(overrides = {}) {
  return {
    projectId: 'project-1',
    periodEnd: '2026-10-08',
    capturedAt: '2026-10-08T12:00:00.000Z',
    criteria: [],
    risks: [],
    milestones: [],
    actions: [],
    baseline,
    evmSnapshots: [
      {
        id: 'snapshot-1',
        projectId: 'project-1',
        snapshotDate: '2026-10-02',
        entries: [{ packageId: 'wp-1', earnedValue: 35, actualValue: 42 }],
      },
      {
        id: 'snapshot-future',
        projectId: 'project-1',
        snapshotDate: '2026-10-09',
        entries: [{ packageId: 'wp-1', earnedValue: 20, actualValue: 20 }],
      },
    ],
    ...overrides,
  }
}

describe('weekly report domain', () => {
  it('derives a seven-day reporting period from week ending', () => {
    expect(getReportPeriod('2026-10-08')).toEqual({
      periodStart: '2026-10-02',
      periodEnd: '2026-10-08',
    })
  })

  it('uses the latest EVM snapshot on or before the report period end', () => {
    const snapshot = buildWeeklyReportSnapshot(buildInput())

    expect(snapshot.metrics.asOf).toBe('2026-10-02')
    expect(snapshot.metrics.ev).toBe(35)
    expect(snapshot.metrics.ac).toBe(42)
    expect(snapshot.metrics.spi).not.toBeNull()
    expect(snapshot.metrics.cpi).toBeCloseTo(35 / 42)
  })

  it('prioritizes critical and high operational risks and caps the report list', () => {
    const risks = [
      { id: 'medium', projectId: 'project-1', title: 'Medium', status: 'open', severity: 'medium', score: 9, dueDate: '2026-10-10' },
      { id: 'critical', projectId: 'project-1', title: 'Critical', status: 'open', severity: 'critical', score: 20, dueDate: '2026-10-20' },
      { id: 'high', projectId: 'project-1', title: 'High', status: 'monitoring', severity: 'high', score: 16, dueDate: '2026-10-12' },
      { id: 'closed', projectId: 'project-1', title: 'Closed', status: 'closed', severity: 'critical', score: 25, dueDate: '2026-10-01' },
    ]

    const snapshot = buildWeeklyReportSnapshot(buildInput({ risks }))

    expect(snapshot.risks.totalOpen).toBe(3)
    expect(snapshot.risks.critical).toBe(1)
    expect(snapshot.risks.high).toBe(1)
    expect(snapshot.risks.items.map((item) => item.id)).toEqual(['critical', 'high', 'medium'])
  })


  it('filters report-local dismissed attention signals without mutating the snapshot', () => {
    const snapshot = {
      attentionSignals: [
        { id: 'signal-1', title: 'First' },
        { id: 'signal-2', title: 'Second' },
      ],
    }

    const visible = getVisibleAttentionSignals(snapshot, ['signal-1'])

    expect(visible.map((item) => item.id)).toEqual(['signal-2'])
    expect(snapshot.attentionSignals).toHaveLength(2)
  })

  it('builds the upcoming seven-day window from actions and milestones', () => {
    const snapshot = buildWeeklyReportSnapshot(buildInput({
      actions: [
        { id: 'a1', projectId: 'project-1', title: 'Action', status: 'inProgress', dueDate: '2026-10-10', owner: 'Alex', priority: 'high' },
        { id: 'a2', projectId: 'project-1', title: 'Later action', status: 'notStarted', dueDate: '2026-10-20', owner: 'Alex', priority: 'medium' },
      ],
      milestones: [
        { id: 'm1', projectId: 'project-1', title: 'Milestone', status: 'planned', targetDate: '2026-10-15', progress: 10 },
      ],
    }))

    expect(snapshot.upcomingItems.map((item) => item.title)).toEqual(['Action', 'Milestone'])
  })
})

describe('weekly report calendar date validation', () => {
  it('rejects a non-existent reporting period end date', () => {
    expect(getReportPeriod('2026-02-30')).toBeNull()
  })
})
