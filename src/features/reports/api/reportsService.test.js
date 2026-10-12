import { beforeEach, describe, expect, it } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { reportsService } from './reportsService.js'

const snapshot = {
  capturedAt: '2026-10-08T12:00:00.000Z',
  projectHealth: { status: 'healthy', label: 'Healthy', reasons: [] },
  metrics: { asOf: null, measurementBasis: null, currencyCode: null, pv: null, ev: null, ac: null, spi: null, cpi: null },
  risks: { totalOpen: 0, high: 0, critical: 0, items: [] },
  milestones: { total: 0, completed: 0, overdue: 0, items: [] },
  successCriteria: { onTrack: 0, atRisk: 0, achieved: 0, missed: 0, items: [] },
  upcomingItems: [],
  attentionSignals: [],
}

const input = {
  projectId: 'project-1',
  periodEnd: '2026-10-08',
  owner: 'Alex Morgan',
  narrative: {
    executiveSummary: 'The project remains aligned with the current delivery plan.',
    achievements: ['Completed the weekly review.'],
    issuesBlockers: [],
    managementAttention: [],
    nextWeekFocus: ['Prepare the next checkpoint.'],
  },
  snapshot,
  dismissedSignalIds: [],
}

describe('reportsService', () => {
  beforeEach(() => {
    window.localStorage.clear()
    storageAdapter.write('weeklyReports', [])
    storageAdapter.write('weeklyReportsDemoSeedVersion', 2)
  })

  it('restores the missing demo report once during the demo-seed migration', async () => {
    storageAdapter.write('weeklyReports', [])
    storageAdapter.write('weeklyReportsDemoSeedVersion', 1)

    const migrated = await reportsService.list()
    expect(migrated.some((report) => report.id === 'demo-report-2026-10-02')).toBe(true)

    storageAdapter.write('weeklyReports', [])
    const afterIntentionalRemoval = await reportsService.list()
    expect(afterIntentionalRemoval).toEqual([])
  })

  it('rejects a non-existent reporting date without saving a report', async () => {
    await expect(
      reportsService.create({
        ...input,
        periodEnd: '2026-02-30',
      }),
    ).rejects.toThrow('Choose a valid Week ending date.')

    expect(storageAdapter.read('weeklyReports')).toEqual([])
  })

  it('creates version one and reuses an existing project/reporting-period record', async () => {
    const created = await reportsService.create(input)
    const duplicate = await reportsService.create(input)

    expect(created.version).toBe(1)
    expect(created.periodStart).toBe('2026-10-02')
    expect(duplicate.id).toBe(created.id)
    expect((await reportsService.list())).toHaveLength(1)
  })

  it('increments version only when an explicit update changes content', async () => {
    const created = await reportsService.create(input)
    const unchanged = await reportsService.update(created.id, input)
    const changed = await reportsService.update(created.id, {
      ...input,
      narrative: { ...input.narrative, executiveSummary: 'Updated weekly delivery summary.' },
    })

    expect(unchanged.version).toBe(1)
    expect(changed.version).toBe(2)
  })

  it('persists report-local dismissed signals and restores them on reload', async () => {
    const created = await reportsService.create({
      ...input,
      dismissedSignalIds: ['evm:spi', 'risk:critical'],
    })

    const reloaded = await reportsService.list()

    expect(created.dismissedSignalIds).toEqual(['evm:spi', 'risk:critical'])
    expect(reloaded[0].dismissedSignalIds).toEqual(['evm:spi', 'risk:critical'])
    expect(reloaded[0].narrative.executiveSummary).toBe(input.narrative.executiveSummary)
    expect(reloaded[0].snapshot.capturedAt).toBe(snapshot.capturedAt)
  })

  it('normalizes older stored reports without dismissed signal state', async () => {
    storageAdapter.write('weeklyReports', [{
      id: 'legacy-report',
      projectId: 'project-1',
      periodStart: '2026-10-02',
      periodEnd: '2026-10-08',
      status: 'draft',
      owner: 'Alex Morgan',
      narrative: input.narrative,
      snapshot,
      version: 1,
      createdAt: '2026-10-08T12:00:00.000Z',
      updatedAt: '2026-10-08T12:00:00.000Z',
      finalizedAt: null,
    }])

    const [legacy] = await reportsService.list()

    expect(legacy.dismissedSignalIds).toEqual([])
    expect(legacy.archivedAt).toBeNull()
  })

  it('rejects required text and entered narrative items shorter than two trimmed characters', async () => {
    await expect(reportsService.create({
      ...input,
      owner: 'A',
    })).rejects.toThrow('at least 2 characters')

    await expect(reportsService.create({
      ...input,
      narrative: { ...input.narrative, executiveSummary: 'A' },
    })).rejects.toThrow('at least 2 characters')

    await expect(reportsService.create({
      ...input,
      narrative: { ...input.narrative, achievements: ['A'] },
    })).rejects.toThrow('at least 2 characters')
  })

  it('finalizes a draft without inflating the saved-content version', async () => {
    const created = await reportsService.create(input)
    const finalized = await reportsService.finalize(created.id)

    expect(finalized.status).toBe('final')
    expect(finalized.version).toBe(1)
    await expect(reportsService.update(finalized.id, input)).rejects.toThrow('read-only')
    await expect(reportsService.remove(finalized.id)).rejects.toThrow('read-only')
  })

  it('reopens a Final report for correction without creating a duplicate', async () => {
    const created = await reportsService.create(input)
    const finalized = await reportsService.finalize(created.id)
    const reopened = await reportsService.reopen(finalized.id)
    const corrected = await reportsService.update(reopened.id, {
      ...input,
      narrative: { ...input.narrative, executiveSummary: 'Corrected after final review.' },
    })
    const refinalized = await reportsService.finalize(corrected.id)

    expect(reopened.id).toBe(finalized.id)
    expect(reopened.periodEnd).toBe(finalized.periodEnd)
    expect(reopened.status).toBe('draft')
    expect(reopened.version).toBe(1)
    expect(reopened.finalizedAt).toBeNull()
    expect(corrected.version).toBe(2)
    expect(refinalized.status).toBe('final')
    expect(refinalized.version).toBe(2)
    expect((await reportsService.list())).toHaveLength(1)
  })

  it('archives and restores a Final report without freeing the reporting period', async () => {
    const created = await reportsService.create(input)
    const finalized = await reportsService.finalize(created.id)
    const archived = await reportsService.archive(finalized.id)
    const duplicate = await reportsService.create(input)

    expect(archived.archivedAt).toBeTruthy()
    expect(duplicate.id).toBe(archived.id)
    await expect(reportsService.reopen(archived.id)).rejects.toThrow('Restore')

    const restored = await reportsService.restore(archived.id)
    expect(restored.id).toBe(archived.id)
    expect(restored.status).toBe('final')
    expect(restored.archivedAt).toBeNull()
    expect((await reportsService.list())).toHaveLength(1)
  })

  it('does not archive Draft reports or restore non-archived reports', async () => {
    const created = await reportsService.create(input)
    await expect(reportsService.archive(created.id)).rejects.toThrow('Only Final')

    const finalized = await reportsService.finalize(created.id)
    await expect(reportsService.restore(finalized.id)).rejects.toThrow('Only archived Final')
  })
})
