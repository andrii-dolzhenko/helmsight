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

describe('Success Criteria calendar-day boundaries across DST', () => {
  const criterion = {
    unit: 'percentage',
    target: 80,
    currentValue: 70,
    direction: 'atLeast',
  }

  it.each([
    [
      'marks yesterday as missed after the spring DST transition',
      '2026-03-30T12:00:00',
      '2026-03-29',
      SUCCESS_CRITERIA_STATUS.MISSED,
    ],
    [
      'marks a deadline exactly 14 calendar days away as at risk after the autumn DST transition',
      '2026-10-25T12:00:00',
      '2026-11-08',
      SUCCESS_CRITERIA_STATUS.AT_RISK,
    ],
  ])('%s', (_description, today, targetDate, expected) => {
    expect(
      evaluateSuccessCriterion(
        { ...criterion, targetDate },
        new Date(today),
      ),
    ).toBe(expected)
  })
})

describe('Success Criteria early-year calendar boundaries', () => {
  it('treats the transition from year 0099 to 0100 as one calendar day', () => {
    const criterion = {
      unit: 'percentage',
      target: 80,
      currentValue: 70,
      direction: 'atLeast',
      targetDate: '0100-01-01',
    }

    expect(
      evaluateSuccessCriterion(
        criterion,
        new Date('0099-12-31T12:00:00'),
      ),
    ).toBe(SUCCESS_CRITERIA_STATUS.AT_RISK)
  })
})
