import { describe, expect, it } from 'vitest'
import { EVM_PERFORMANCE_STATE as STATE } from '../../features/evm/lib/evm.js'
import { deriveGlobalMetricsView, deriveProjectEvmPerformance, METRICS_SORT } from './globalMetrics.js'

const projects = [
  { id: 'red', name: 'Atlas', archivedAt: null },
  { id: 'green', name: 'Brava', archivedAt: null },
  { id: 'story', name: 'Cora', archivedAt: null },
  { id: 'missing', name: 'Delta', archivedAt: null },
  { id: 'archived', name: 'Echo', archivedAt: '2026-10-11T10:00:00Z' },
]
const baseline = (projectId, measurementBasis = 'hours') => ({
  projectId,
  measurementBasis,
  currencyCode: 'USD',
  workPackages: [{ id: `wp-${projectId}`, startDate: '2026-10-01', endDate: '2026-10-01', budgetValue: 100 }],
})
const baselines = [baseline('red'), baseline('green', 'currency'), baseline('story', 'storyPoints'), baseline('archived')]
const snapshot = (projectId, earnedValue, actualValue = 100) => ({
  id: `snapshot-${projectId}`, projectId, snapshotDate: '2026-10-02',
  entries: [{ packageId: `wp-${projectId}`, earnedValue, actualValue }],
})
const snapshots = [snapshot('red', 90), snapshot('green', 100), snapshot('story', 100), snapshot('archived', 97)]
const derive = (overrides = {}) => deriveGlobalMetricsView({ projects, baselines, snapshots, ...overrides })

describe('Global Metrics EVM portfolio derivation', () => {
  it('uses actual project EVM indexes and the worst available index, with no unit summation', () => {
    const view = derive()
    expect(view.summary).toEqual({ reporting: 3, attention: 1, watch: 0, missing: 1 })
    expect(view.visibleRecords.map(({ projectId }) => projectId)).toEqual(['red', 'green', 'story', 'missing'])
    const red = view.visibleRecords[0]
    expect(red.spi).toBeCloseTo(0.9)
    expect(red.cpi).toBeCloseTo(0.9)
    expect(red.performance).toBe(STATE.PRESSURE)
    expect(view.visibleRecords.find((item) => item.projectId === 'green').performance).toBe(STATE.HEALTHY)
  })

  it('marks missing baseline or snapshots as unassessed rather than healthy', () => {
    const project = { id: 'x', name: 'Missing' }
    expect(deriveProjectEvmPerformance(project, null, []).performance).toBe(STATE.NOT_AVAILABLE)
    expect(deriveProjectEvmPerformance(project, baseline('x'), []).performance).toBe(STATE.NOT_AVAILABLE)
  })

  it('does not show CPI on story points even if source entries provide actual values', () => {
    const result = deriveProjectEvmPerformance(projects[2], baseline('story', 'storyPoints'), [snapshot('story', 100, 80)])
    expect(result.spi).toBe(1)
    expect(result.cpi).toBeNull()
    expect(result.performance).toBe(STATE.HEALTHY)
  })

  it('handles zero denominators without inventing index values', () => {
    const project = { id: 'zero', name: 'Zero' }
    const late = {
      ...baseline('zero'),
      workPackages: [{ id: 'wp-zero', startDate: '2026-11-01', endDate: '2026-11-02', budgetValue: 100 }],
    }
    const result = deriveProjectEvmPerformance(project, late, [snapshot('zero', 0, 0)])
    expect(result.spi).toBeNull()
    expect(result.cpi).toBeNull()
    expect(result.performance).toBe(STATE.NOT_AVAILABLE)
  })

  it('includes archived projects only on demand and excludes orphan snapshot records', () => {
    expect(derive().scopedCount).toBe(4)
    const view = derive({ includeArchivedProjects: true, snapshots: [...snapshots, snapshot('orphan', 100)] })
    expect(view.scopedCount).toBe(5)
    expect(view.summary.watch).toBe(1)
    expect(view.visibleRecords.map((item) => item.projectId)).not.toContain('orphan')
  })

  it('project scope affects KPIs while text, basis and performance filters only change register results', () => {
    const scoped = derive({ projectId: 'green' })
    expect(scoped.summary).toEqual({ reporting: 1, attention: 0, watch: 0, missing: 0 })
    const filtered = derive({ query: 'Atlas', measurementBasis: 'hours', performance: STATE.PRESSURE })
    expect(filtered.visibleRecords.map((item) => item.projectId)).toEqual(['red'])
    expect(filtered.summary).toEqual(derive().summary)
    expect(derive({ measurementBasis: 'missing' }).visibleRecords.map((item) => item.projectId)).toEqual(['missing'])
  })

  it('sorts deterministic priority first and supports oldest indices or alphabetical order', () => {
    expect(derive({ sort: METRICS_SORT.PROJECT }).visibleRecords.map((item) => item.project.name)).toEqual(['Atlas', 'Brava', 'Cora', 'Delta'])
    expect(derive({ sort: METRICS_SORT.SPI }).visibleRecords[0].projectId).toBe('red')
    expect(derive({ sort: METRICS_SORT.SNAPSHOT }).visibleRecords.at(-1).projectId).toBe('missing')
  })

  it('uses the latest calendar-valid snapshot and ignores a future invalid date', () => {
    const redBaseline = baseline('red')
    const records = [
      { ...snapshot('red', 10), snapshotDate: '2026-10-03', id: 'newer' },
      { ...snapshot('red', 20), snapshotDate: '2026-10-99', id: 'invalid' },
    ]
    const result = deriveProjectEvmPerformance(projects[0], redBaseline, records)
    expect(result.snapshotDate).toBe('2026-10-03')
    expect(result.spi).toBeCloseTo(0.1)
  })
})
