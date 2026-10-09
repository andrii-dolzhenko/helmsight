import { beforeEach, describe, expect, it } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { milestonesService } from './milestonesService.js'

describe('milestonesService', () => {
  beforeEach(() => window.localStorage.clear())

  it('seeds demo milestones and persists a created milestone', async () => {
    const initial = await milestonesService.list()
    expect(initial.some((item) => item.projectId === 'demo-project')).toBe(true)

    const created = await milestonesService.create({
      projectId: 'demo-project',
      title: 'Launch readiness review',
      description: '',
      targetDate: '2026-12-12',
      status: 'planned',
      progress: 10,
    })

    expect(created).toMatchObject({ title: 'Launch readiness review', progress: 10 })
    expect(storageAdapter.read('milestones').some((item) => item.id === created.id)).toBe(true)
  })

  it('forces completed milestones to 100 percent progress', async () => {
    const created = await milestonesService.create({
      projectId: 'demo-project',
      title: 'Complete checkpoint',
      description: '',
      targetDate: '2026-12-12',
      status: 'completed',
      progress: 20,
    })

    expect(created.progress).toBe(100)
  })
})
