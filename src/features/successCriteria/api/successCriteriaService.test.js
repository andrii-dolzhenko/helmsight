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

  describe('target date validation', () => {
    const validInput = {
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
    }

    it.each([
      ['empty string', ''],
      ['null', null],
      ['undefined', undefined],
    ])('accepts an optional target date represented by %s', async (_label, targetDate) => {
      const created = await successCriteriaService.create({
        ...validInput,
        targetDate,
      })

      expect(created.targetDate).toBe(targetDate)
      expect((await successCriteriaService.list()).some(
        (criterion) => criterion.id === created.id,
      )).toBe(true)
    })

    it('rejects an invalid target date on create without saving a criterion', async () => {
      const before = await successCriteriaService.list()

      await expect(
        successCriteriaService.create({
          ...validInput,
          targetDate: '2026-02-30',
        }),
      ).rejects.toThrow('Choose a valid target date.')

      expect(await successCriteriaService.list()).toEqual(before)
    })

    it('rejects an invalid target date on update without changing the stored criterion', async () => {
      const created = await successCriteriaService.create(validInput)

      await expect(
        successCriteriaService.update(created.id, {
          ...validInput,
          targetDate: '2026-02-30',
        }),
      ).rejects.toThrow('Choose a valid target date.')

      const stored = (await successCriteriaService.list()).find(
        (criterion) => criterion.id === created.id,
      )

      expect(stored.targetDate).toBe('2027-02-01')
    })
  })
})
