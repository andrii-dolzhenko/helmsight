import { describe, expect, it } from 'vitest'
import { DAILY_INSIGHTS, getDailyInsight } from './dailyInsights.js'

describe('daily insights', () => {
  it('keeps the same insight for the same local calendar day', () => {
    expect(getDailyInsight(new Date(2026, 9, 8, 8))).toEqual(
      getDailyInsight(new Date(2026, 9, 8, 23, 59)),
    )
  })

  it('rotates to a different insight on the next calendar day', () => {
    expect(DAILY_INSIGHTS.length).toBeGreaterThan(1)
    expect(getDailyInsight(new Date(2026, 9, 8))).not.toEqual(
      getDailyInsight(new Date(2026, 9, 9)),
    )
  })
})
