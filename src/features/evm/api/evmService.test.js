import { beforeEach, describe, expect, it } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { evmService } from './evmService.js'

const baselineInput = {
  projectId: 'project-1',
  measurementBasis: 'hours',
  currencyCode: 'USD',
  workPackages: [
    { id: 'dev', title: 'Development', startDate: '2026-10-05', endDate: '2026-10-09', budgetValue: 40 },
  ],
}

describe('evmService', () => {
  beforeEach(() => {
    window.localStorage.clear()
    storageAdapter.write('evmMetrics', { baselines: [], snapshots: [] })
  })

  it('saves a baseline and weekly snapshot through the storage boundary', async () => {
    const baseline = await evmService.saveBaseline(baselineInput)
    expect(baseline.workPackages[0].budgetValue).toBe(40)

    const snapshot = await evmService.createSnapshot({
      projectId: 'project-1',
      snapshotDate: '2026-10-09',
      entries: [{ packageId: 'dev', earnedValue: 32, actualValue: 36 }],
    })
    expect(snapshot.entries[0]).toMatchObject({ earnedValue: 32, actualValue: 36 })
  })

  it('rejects cumulative earned value above the approved work-package baseline', async () => {
    await evmService.saveBaseline(baselineInput)
    await evmService.createSnapshot({ projectId: 'project-1', snapshotDate: '2026-10-08', entries: [{ packageId: 'dev', earnedValue: 30, actualValue: 32 }] })

    await expect(evmService.createSnapshot({
      projectId: 'project-1',
      snapshotDate: '2026-10-09',
      entries: [{ packageId: 'dev', earnedValue: 20, actualValue: 22 }],
    })).rejects.toThrow('cannot exceed its approved baseline')
  })
})
