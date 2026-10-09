import { beforeEach, describe, expect, it, vi } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { successCriteriaService } from './successCriteriaService.js'

describe('successCriteriaService', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('crypto', {
      randomUUID: () => 'criterion-1',
    })
  })

  it('creates a calculated ROI criterion with a deterministic current value', async () => {
    const criterion = await successCriteriaService.create({
      projectId: 'project-1',
      title: 'ROI target',
      description: 'Validate business value.',
      metricType: 'roi',
      baseline: '0',
      target: '25',
      targetDate: '2027-02-01',
      calculationInputs: {
        financialBenefit: '1500000',
        investmentCost: '1000000',
      },
    })

    expect(criterion).toMatchObject({
      id: 'criterion-1',
      category: 'financial',
      metricType: 'roi',
      currentValue: 50,
      unit: 'percentage',
      direction: 'atLeast',
    })
  })

  it('removes a criterion from local persistence', async () => {
    storageAdapter.write('successCriteria', [
      {
        id: 'criterion-1',
        projectId: 'project-1',
        title: 'Remove me',
      },
    ])

    await successCriteriaService.remove('criterion-1')

    expect(storageAdapter.read('successCriteria')).toEqual([])
  })
})
