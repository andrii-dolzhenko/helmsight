import { describe, expect, it } from 'vitest'
import {
  calculateGrossMargin,
  calculateProfitMargin,
  calculateRoi,
  evaluateSuccessCriterion,
  SUCCESS_CRITERIA_STATUS,
} from './successCriteria.js'

describe('Success Criteria business rules', () => {
  it('calculates ROI, gross margin, and profit margin deterministically', () => {
    expect(calculateRoi(1_500_000, 1_000_000)).toBe(50)
    expect(calculateGrossMargin(1_000_000, 650_000)).toBe(35)
    expect(calculateProfitMargin(220_000, 1_000_000)).toBe(22)
  })

  it('returns null for invalid financial denominators', () => {
    expect(calculateRoi(100, 0)).toBeNull()
    expect(calculateGrossMargin(0, 100)).toBeNull()
    expect(calculateProfitMargin(100, 0)).toBeNull()
  })

  it('derives achieved, missed, at-risk, and on-track states', () => {
    const baseCriterion = {
      unit: 'percentage',
      target: 80,
      currentValue: 70,
      direction: 'atLeast',
    }

    expect(
      evaluateSuccessCriterion(
        { ...baseCriterion, currentValue: 82, targetDate: '2026-11-30' },
        new Date('2026-10-06T12:00:00'),
      ),
    ).toBe(SUCCESS_CRITERIA_STATUS.ACHIEVED)

    expect(
      evaluateSuccessCriterion(
        { ...baseCriterion, targetDate: '2026-10-05' },
        new Date('2026-10-06T12:00:00'),
      ),
    ).toBe(SUCCESS_CRITERIA_STATUS.MISSED)

    expect(
      evaluateSuccessCriterion(
        { ...baseCriterion, targetDate: '2026-10-18' },
        new Date('2026-10-06T12:00:00'),
      ),
    ).toBe(SUCCESS_CRITERIA_STATUS.AT_RISK)

    expect(
      evaluateSuccessCriterion(
        { ...baseCriterion, targetDate: '2026-12-18' },
        new Date('2026-10-06T12:00:00'),
      ),
    ).toBe(SUCCESS_CRITERIA_STATUS.ON_TRACK)
  })
})
