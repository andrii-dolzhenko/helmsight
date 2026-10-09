import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { risksService } from './risksService.js'

describe('risksService', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('crypto', { randomUUID: () => 'risk-1' })
  })

  it('persists a risk with deterministic score and severity', async () => {
    const risk = await risksService.create({
      projectId: 'project-1',
      title: 'Vendor delay',
      description: '',
      probability: '4',
      impact: '5',
      owner: 'Alex Morgan',
      responseStrategy: 'mitigate',
      mitigation: 'Prepare fallback supplier.',
      dueDate: '2026-11-01',
      status: 'open',
    })

    expect(risk).toMatchObject({ id: 'risk-1', score: 20, severity: 'critical' })
  })

  it('removes a risk from local persistence', async () => {
    storageAdapter.write('risks', [{ id: 'risk-1', projectId: 'project-1' }])
    await risksService.remove('risk-1')
    expect(storageAdapter.read('risks')).toEqual([])
  })
})
