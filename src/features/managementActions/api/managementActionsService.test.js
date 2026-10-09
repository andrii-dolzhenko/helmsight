import { beforeEach, describe, expect, it } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { managementActionsService } from './managementActionsService.js'

describe('managementActionsService', () => {
  beforeEach(() => window.localStorage.clear())

  it('creates, updates, and deletes a management action', async () => {
    await managementActionsService.list()
    const created = await managementActionsService.create({ projectId: 'p1', title: 'Owner follow-up', description: '', owner: 'Alex', dueDate: '2026-10-20', priority: 'high', status: 'notStarted', source: 'manual' })
    expect(created.status).toBe('notStarted')
    const updated = await managementActionsService.update(created.id, { ...created, title: 'Updated follow-up', status: 'inProgress' })
    expect(updated.title).toBe('Updated follow-up')
    expect(updated.status).toBe('inProgress')
    await managementActionsService.remove(created.id)
    expect((await managementActionsService.list()).some((item) => item.id === created.id)).toBe(false)
  })

  it('migrates legacy open actions to not started for existing local data', () => {
    storageAdapter.write('managementActions', [{ id: 'legacy', projectId: 'p1', title: 'Legacy', description: '', owner: 'Alex', dueDate: '2026-10-20', priority: 'medium', status: 'open', source: 'manual' }])

    expect(managementActionsService.getSnapshot()).toEqual([
      expect.objectContaining({ id: 'legacy', status: 'notStarted' }),
    ])
    expect(storageAdapter.read('managementActions')[0].status).toBe('notStarted')
  })
})
