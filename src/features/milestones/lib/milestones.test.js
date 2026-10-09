import { describe, expect, it } from 'vitest'
import {
  getMilestoneScheduleState,
  MILESTONE_SCHEDULE_STATE,
  normalizeProgress,
  sortMilestonesByTargetDate,
} from './milestones.js'

describe('milestone business rules', () => {
  const today = new Date('2026-10-07T10:00:00.000Z')

  it('derives completed, overdue, due-soon, and on-track schedule states', () => {
    expect(getMilestoneScheduleState({ status: 'completed', targetDate: '2026-09-01' }, today)).toBe(MILESTONE_SCHEDULE_STATE.COMPLETED)
    expect(getMilestoneScheduleState({ status: 'inProgress', targetDate: '2026-10-01' }, today)).toBe(MILESTONE_SCHEDULE_STATE.OVERDUE)
    expect(getMilestoneScheduleState({ status: 'planned', targetDate: '2026-10-18' }, today)).toBe(MILESTONE_SCHEDULE_STATE.DUE_SOON)
    expect(getMilestoneScheduleState({ status: 'planned', targetDate: '2026-11-18' }, today)).toBe(MILESTONE_SCHEDULE_STATE.ON_TRACK)
  })

  it('validates progress boundaries', () => {
    expect(normalizeProgress(0)).toBe(0)
    expect(normalizeProgress(100)).toBe(100)
    expect(normalizeProgress(-1)).toBeNull()
    expect(normalizeProgress(101)).toBeNull()
  })

  it('sorts roadmap entries by target date', () => {
    const sorted = sortMilestonesByTargetDate([
      { id: 'later', targetDate: '2026-12-01' },
      { id: 'first', targetDate: '2026-10-10' },
    ])
    expect(sorted.map((item) => item.id)).toEqual(['first', 'later'])
  })
})
