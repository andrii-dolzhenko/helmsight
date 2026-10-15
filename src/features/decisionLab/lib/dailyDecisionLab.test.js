import { describe, expect, it } from 'vitest'
import { createDailySession, getDailyScenarios, getLocalDayKey, getRecommendedCount, isDailySetAvailable } from './dailyDecisionLab.js'
import { DECISION_SCENARIOS } from './scenarios.js'

describe('Decision Lab daily rotation', () => {
  it('has nine unique curated scenarios and four explained options per case', () => {
    expect(DECISION_SCENARIOS).toHaveLength(9)
    expect(new Set(DECISION_SCENARIOS.map(({ id }) => id)).size).toBe(9)
    for (const scenario of DECISION_SCENARIOS) {
      expect(scenario.options).toHaveLength(4)
      expect(scenario.options.some((option) => option.id === scenario.recommendedId)).toBe(true)
      expect(scenario.options.every((option) => option.text && option.feedback && option.detail)).toBe(true)
    }
  })

  it('uses three different daily batches, then repeats every three civil days', () => {
    const dates = ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']
    const batches = dates.map(getDailyScenarios)
    expect(batches.every((items) => items.length === 3)).toBe(true)
    expect(new Set(batches.slice(0, 3).flat().map((item) => item.id)).size).toBe(9)
    expect(batches[3].map((item) => item.id)).toEqual(batches[0].map((item) => item.id))
    expect(getDailyScenarios(dates[0])).toEqual(batches[0])
  })

  it('uses local calendar components, even around local midnight', () => {
    expect(getLocalDayKey(new Date(2026, 9, 15, 23, 59))).toBe('2026-10-15')
    expect(getLocalDayKey(new Date(2026, 9, 16, 0, 1))).toBe('2026-10-16')
    expect(() => getDailyScenarios('2026-02-30')).toThrow('valid local calendar')
    expect(() => getDailyScenarios('2026/10/15')).toThrow('local calendar')
  })

  it('tracks recommended decisions without penalizing alternative reasoning', () => {
    const dayKey = '2026-10-15'
    const scenarios = getDailyScenarios(dayKey)
    const answers = scenarios.map((scenario, index) => ({
      scenarioId: scenario.id,
      optionId: index === 0 ? scenario.options.find((item) => item.id !== scenario.recommendedId).id : scenario.recommendedId,
    }))
    expect(getRecommendedCount({ answers }, scenarios)).toBe(2)
    expect(isDailySetAvailable(createDailySession(dayKey))).toBe(true)
    expect(isDailySetAvailable({ phase: 'complete' })).toBe(false)
  })
})
