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

beforeEach(() => {
  window.localStorage.clear()
  storageAdapter.write('evmMetrics', { baselines: [], snapshots: [] })
})

describe('evmService', () => {
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

describe('EVM calendar date validation', () => {
  it('rejects a baseline with a non-existent calendar date', async () => {
    await expect(
      evmService.saveBaseline({
        ...baselineInput,
        workPackages: [
          {
            ...baselineInput.workPackages[0],
            startDate: '2026-02-30',
            endDate: '2026-03-05',
          },
        ],
      }),
    ).rejects.toThrow('valid start and end date')
  })
})

describe('EVM snapshot date validation', () => {
  const entries = [
    { packageId: 'dev', earnedValue: 10, actualValue: 12 },
  ]

  it('rejects creating a snapshot with a non-existent calendar date', async () => {
    await evmService.saveBaseline(baselineInput)

    await expect(
      evmService.createSnapshot({
        projectId: 'project-1',
        snapshotDate: '2026-02-30',
        entries,
      }),
    ).rejects.toThrow('valid reporting date')
  })

  it('rejects updating a snapshot without a reporting date', async () => {
    await evmService.saveBaseline(baselineInput)
    const snapshot = await evmService.createSnapshot({
      projectId: 'project-1',
      snapshotDate: '2026-10-09',
      entries,
    })

    await expect(
      evmService.updateSnapshot(snapshot.id, {
        entries,
      }),
    ).rejects.toThrow('Reporting date is required.')
  })

  it('rejects updating a snapshot with a non-existent calendar date', async () => {
    await evmService.saveBaseline(baselineInput)
    const snapshot = await evmService.createSnapshot({
      projectId: 'project-1',
      snapshotDate: '2026-10-09',
      entries,
    })

    await expect(
      evmService.updateSnapshot(snapshot.id, {
        snapshotDate: '2026-02-30',
        entries,
      }),
    ).rejects.toThrow('valid reporting date')
  })
})

describe('EVM baseline date boundaries', () => {
  it('accepts a valid leap-day work package', async () => {
    const baseline = await evmService.saveBaseline({
      ...baselineInput,
      workPackages: [
        {
          ...baselineInput.workPackages[0],
          startDate: '2024-02-29',
          endDate: '2024-03-01',
        },
      ],
    })

    expect(baseline.workPackages[0]).toMatchObject({
      startDate: '2024-02-29',
      endDate: '2024-03-01',
    })
  })

  it.each([
    [
      'reversed date range',
      '2026-10-09',
      '2026-10-05',
      'valid start and end date',
    ],
    [
      'weekend-only date range',
      '2026-10-10',
      '2026-10-11',
      'at least one working day',
    ],
    [
      'missing end date',
      '2026-10-05',
      undefined,
      'valid start and end date',
    ],
  ])('rejects %s', async (_scenario, startDate, endDate, message) => {
    await expect(
      evmService.saveBaseline({
        ...baselineInput,
        workPackages: [
          {
            ...baselineInput.workPackages[0],
            startDate,
            endDate,
          },
        ],
      }),
    ).rejects.toThrow(message)
  })
})
