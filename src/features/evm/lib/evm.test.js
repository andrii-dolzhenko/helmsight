import { describe, expect, it } from 'vitest'
import {
  calculateBaselineBAC,
  calculateEvmMetrics,
  calculatePackagePV,
  buildEvmHistory,
  countWorkingDaysInclusive,
} from './evm.js'

const baseline = {
  measurementBasis: 'hours',
  currencyCode: 'USD',
  workPackages: [
    { id: 'dev', title: 'Development', startDate: '2026-10-05', endDate: '2026-10-09', budgetValue: 40 },
    { id: 'qa', title: 'QA', startDate: '2026-10-12', endDate: '2026-10-16', budgetValue: 20 },
  ],
}

describe('EVM calculations', () => {
  it('distributes planned value linearly across working days', () => {
    expect(countWorkingDaysInclusive('2026-10-05', '2026-10-09')).toBe(5)
    expect(calculatePackagePV(baseline.workPackages[0], '2026-10-07')).toBe(24)
    expect(calculateBaselineBAC(baseline)).toBe(60)
  })

  it('calculates cumulative full EVM metrics from weekly increments', () => {
    const metrics = calculateEvmMetrics(baseline, [
      { snapshotDate: '2026-10-09', entries: [{ packageId: 'dev', earnedValue: 32, actualValue: 36 }, { packageId: 'qa', earnedValue: 0, actualValue: 0 }] },
      { snapshotDate: '2026-10-16', entries: [{ packageId: 'dev', earnedValue: 8, actualValue: 6 }, { packageId: 'qa', earnedValue: 20, actualValue: 24 }] },
    ])

    expect(metrics).toMatchObject({ bac: 60, pv: 60, ev: 60, ac: 66, sv: 0, cv: -6 })
    expect(metrics.cpi).toBeCloseTo(60 / 66)
    expect(metrics.spi).toBe(1)
    expect(metrics.eac).toBeCloseTo(66)
  })

  it('builds cumulative historical points for value and performance charts', () => {
    const snapshots = [
      { snapshotDate: '2026-10-09', entries: [{ packageId: 'dev', earnedValue: 32, actualValue: 36 }, { packageId: 'qa', earnedValue: 0, actualValue: 0 }] },
      { snapshotDate: '2026-10-16', entries: [{ packageId: 'dev', earnedValue: 8, actualValue: 6 }, { packageId: 'qa', earnedValue: 20, actualValue: 24 }] },
    ]

    const history = buildEvmHistory(baseline, snapshots)

    expect(history).toHaveLength(2)
    expect(history[0]).toMatchObject({ snapshotDate: '2026-10-09', pv: 40, ev: 32, ac: 36 })
    expect(history[0].spi).toBeCloseTo(0.8)
    expect(history[0].cpi).toBeCloseTo(32 / 36)
    expect(history[1]).toMatchObject({ snapshotDate: '2026-10-16', pv: 60, ev: 60, ac: 66 })
    expect(history[1].spi).toBe(1)
    expect(history[1].cpi).toBeCloseTo(60 / 66)
  })

  it('keeps story points in schedule tracking mode without cost indices', () => {
    const storyBaseline = { ...baseline, measurementBasis: 'storyPoints' }
    const metrics = calculateEvmMetrics(storyBaseline, [
      { snapshotDate: '2026-10-09', entries: [{ packageId: 'dev', earnedValue: 30 }, { packageId: 'qa', earnedValue: 0 }] },
    ])

    expect(metrics.ev).toBe(30)
    expect(metrics.spi).toBeCloseTo(30 / 40)
    expect(metrics.ac).toBeNull()
    expect(metrics.cpi).toBeNull()
    expect(metrics.eac).toBeNull()
  })
})
