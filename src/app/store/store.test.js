import { beforeEach, describe, expect, it } from 'vitest'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { createAppPreloadedState } from './store.js'

describe('app store preload', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('hydrates saved display preferences and project data before the first React render', () => {
    storageAdapter.write('profile', { displayName: 'Alex Morgan' })
    storageAdapter.write('preferences', {
      themeMode: 'dark',
      projectsViewMode: 'list',
      risksViewMode: 'list',
      actionsViewMode: 'list',
    })
    storageAdapter.write('projects', [
      {
        id: 'project-1',
        name: 'Saved Project',
        archivedAt: null,
      },
    ])
    storageAdapter.write('successCriteria', [
      {
        id: 'criterion-1',
        projectId: 'project-1',
        title: 'Saved criterion',
      },
    ])
    storageAdapter.write('risks', [
      {
        id: 'risk-1',
        projectId: 'project-1',
        title: 'Saved risk',
      },
    ])
    storageAdapter.write('milestones', [
      {
        id: 'milestone-1',
        projectId: 'project-1',
        title: 'Saved milestone',
      },
    ])
    storageAdapter.write('managementActions', [
      {
        id: 'action-1',
        projectId: 'project-1',
        title: 'Saved action',
        status: 'notStarted',
      },
    ])
    storageAdapter.write('evmMetrics', {
      baselines: [{ projectId: 'project-1', measurementBasis: 'hours', currencyCode: 'USD', workPackages: [] }],
      snapshots: [{ id: 'snapshot-1', projectId: 'project-1', snapshotDate: '2026-10-02', entries: [] }],
    })
    storageAdapter.write('weeklyReports', [
      {
        id: 'report-1',
        projectId: 'project-1',
        periodStart: '2026-09-26',
        periodEnd: '2026-10-02',
        status: 'final',
        version: 2,
      },
    ])
    storageAdapter.write('meetingNotes', [
      {
        id: 'meeting-1',
        projectId: 'project-1',
        title: 'Saved meeting',
        meetingDate: '2026-10-08',
        version: 2,
      },
    ])

    const preloadedState = createAppPreloadedState()

    expect(preloadedState.profile).toMatchObject({ firstName: 'Alex', lastName: 'Morgan' })
    expect(preloadedState.preferences).toMatchObject({
      themeMode: 'dark',
      projectsViewMode: 'list',
      risksViewMode: 'list',
      actionsViewMode: 'list',
      status: 'succeeded',
    })
    expect(preloadedState.projects).toMatchObject({
      status: 'succeeded',
      items: [{ id: 'project-1', name: 'Saved Project', archivedAt: null }],
    })
    expect(preloadedState.successCriteria).toMatchObject({
      status: 'succeeded',
      items: [{ id: 'criterion-1', projectId: 'project-1', title: 'Saved criterion' }],
    })
    expect(preloadedState.risks).toMatchObject({
      status: 'succeeded',
      items: [{ id: 'risk-1', projectId: 'project-1', title: 'Saved risk' }],
    })
    expect(preloadedState.milestones).toMatchObject({
      status: 'succeeded',
      items: [{ id: 'milestone-1', projectId: 'project-1', title: 'Saved milestone' }],
    })
    expect(preloadedState.managementActions).toMatchObject({
      status: 'succeeded',
      items: [{ id: 'action-1', projectId: 'project-1', title: 'Saved action', status: 'notStarted' }],
    })
    expect(preloadedState.evm).toMatchObject({
      status: 'succeeded',
      baselines: [{ projectId: 'project-1', measurementBasis: 'hours' }],
      snapshots: [{ id: 'snapshot-1', projectId: 'project-1', snapshotDate: '2026-10-02' }],
    })
    expect(preloadedState.reports).toMatchObject({
      status: 'succeeded',
      items: [{ id: 'report-1', projectId: 'project-1', periodEnd: '2026-10-02', status: 'final', version: 2 }],
    })
    expect(preloadedState.meetings).toMatchObject({
      status: 'succeeded',
      items: [{ id: 'meeting-1', projectId: 'project-1', meetingDate: '2026-10-08', version: 2 }],
    })
  })
})
