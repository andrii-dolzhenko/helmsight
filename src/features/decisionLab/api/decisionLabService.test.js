import { beforeEach, describe, expect, it } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { decisionLabService, DecisionLabError } from './decisionLabService.js'
import { getDailyScenarios } from '../lib/dailyDecisionLab.js'

const day = new Date(2026, 9, 15, 16)
const nextDay = new Date(2026, 9, 16, 8)

describe('Decision Lab saved sessions', () => {
  beforeEach(() => window.localStorage.clear())

  it('persists each answer and feedback; resumes from the exact phase', () => {
    const scenarios = getDailyScenarios('2026-10-15')
    expect(decisionLabService.getToday(day)).toEqual({ dayKey: '2026-10-15', phase: 'question', answers: [] })
    const first = decisionLabService.submit(scenarios[0].recommendedId, day)
    expect(first.phase).toBe('feedback')
    expect(decisionLabService.getToday(day)).toEqual(first)
    expect(() => decisionLabService.submit(scenarios[0].recommendedId, day)).toThrow(DecisionLabError)
    expect(decisionLabService.advance(day).phase).toBe('question')
    expect(decisionLabService.getToday(day).answers).toHaveLength(1)
  })

  it('completes once, keeps review data, and starts a different batch tomorrow', () => {
    const scenarios = getDailyScenarios('2026-10-15')
    for (const scenario of scenarios) {
      decisionLabService.submit(scenario.recommendedId, day)
      decisionLabService.advance(day)
    }
    expect(decisionLabService.getToday(day).phase).toBe('complete')
    expect(decisionLabService.getToday(day).answers).toHaveLength(3)
    expect(() => decisionLabService.advance(day)).toThrow(DecisionLabError)
    expect(() => decisionLabService.submit(scenarios[0].recommendedId, day)).toThrow(DecisionLabError)
    expect(decisionLabService.getToday(nextDay).answers).toEqual([])
    expect(getDailyScenarios('2026-10-16').map(({ id }) => id)).not.toEqual(scenarios.map(({ id }) => id))
    expect(decisionLabService.getToday(day).phase).toBe('complete')
  })

  it('does not overwrite malformed storage or accept fabricated choices', () => {
    const scenarios = getDailyScenarios('2026-10-15')
    expect(() => decisionLabService.submit('forged-option', day)).toThrow(DecisionLabError)
    expect(decisionLabService.getToday(day).answers).toHaveLength(0)
    storageAdapter.write('decisionLab:sessions:v1', { version: 1, sessions: { '2026-10-15': { dayKey: '2026-10-15', answers: [{ scenarioId: 'elsewhere', optionId: 'forged' }], phase: 'feedback' } } })
    expect(() => decisionLabService.getToday(day)).toThrow(DecisionLabError)
    expect(storageAdapter.read('decisionLab:sessions:v1').sessions['2026-10-15'].answers[0].scenarioId).toBe('elsewhere')
    storageAdapter.write('decisionLab:sessions:v1', { version: 1, sessions: { '2026-10-15': { dayKey: '2026-10-15', answers: [{ scenarioId: scenarios[0].id, optionId: scenarios[0].recommendedId }], phase: 'question' } } })
    expect(decisionLabService.getToday(day).answers).toHaveLength(1)
  })
})
