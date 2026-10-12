import { beforeEach, describe, expect, it } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { managementActionsService } from '../../managementActions/api/managementActionsService.js'
import { successCriteriaService } from '../../successCriteria/api/successCriteriaService.js'
import { risksService } from '../../risks/api/risksService.js'
import { milestonesService } from '../../milestones/api/milestonesService.js'
import { evmService } from '../../evm/api/evmService.js'
import { meetingsService } from '../../meetings/api/meetingsService.js'
import { reportsService } from '../../reports/api/reportsService.js'

describe('Atlas collection anti-reseeding', () => {
  beforeEach(() => {
    window.localStorage.clear()
    storageAdapter.write('deletedDemoProject:demo-project', true)
  })

  it.each([
    ['managementActions', managementActionsService],
    ['successCriteria', successCriteriaService],
    ['risks', risksService],
    ['milestones', milestonesService],
    ['meetingNotes', meetingsService],
  ])('does not seed %s after Atlas deletion', async (storageKey, service) => {
    expect(await service.list()).toEqual([])
    expect(storageAdapter.read(storageKey)).toEqual([])
  })

  it('does not seed EVM baselines or snapshots after Atlas deletion', async () => {
    const emptyData = {
      baselines: [],
      snapshots: [],
    }

    expect(await evmService.list()).toEqual(emptyData)
    expect(storageAdapter.read('evmMetrics')).toEqual(emptyData)
  })

  it('does not initially seed weekly reports after Atlas deletion', async () => {
    expect(await reportsService.list()).toEqual([])
    expect(storageAdapter.read('weeklyReports')).toEqual([])
  })

  it('does not restore Atlas reports through versioned seeding', async () => {
    const otherReport = {
      id: 'other-project-report',
      projectId: 'other-project',
      periodEnd: '2026-10-09',
      dismissedSignalIds: [],
      archivedAt: null,
    }

    storageAdapter.write('weeklyReports', [otherReport])
    storageAdapter.write('weeklyReportsDemoSeedVersion', 1)

    expect(await reportsService.list()).toEqual([otherReport])
    expect(storageAdapter.read('weeklyReports')).toEqual([otherReport])
    expect(storageAdapter.read('deletedDemoProject:demo-project')).toBe(true)
  })
})
