import { describe, expect, it } from 'vitest'
import {
  calculateRiskScore,
  getRiskSeverity,
  isRiskDueSoon,
  isRiskOverdue,
} from './risks.js'

describe('risk business rules', () => {
  it('calculates probability × impact score and severity deterministically', () => {
    expect(calculateRiskScore(4, 5)).toBe(20)
    expect(getRiskSeverity(4)).toBe('low')
    expect(getRiskSeverity(9)).toBe('medium')
    expect(getRiskSeverity(16)).toBe('high')
    expect(getRiskSeverity(20)).toBe('critical')
  })

  it('rejects invalid probability and impact values', () => {
    expect(calculateRiskScore(0, 5)).toBeNull()
    expect(calculateRiskScore(3, 6)).toBeNull()
    expect(calculateRiskScore('x', 2)).toBeNull()
  })

  it('derives due-soon and overdue operational states', () => {
    const today = new Date('2026-10-07T09:00:00.000Z')
    const baseRisk = { status: 'open', dueDate: '2026-10-15' }

    expect(isRiskDueSoon(baseRisk, today)).toBe(true)
    expect(isRiskOverdue({ ...baseRisk, dueDate: '2026-10-01' }, today)).toBe(true)
    expect(isRiskDueSoon({ ...baseRisk, status: 'closed' }, today)).toBe(false)
  })
})
