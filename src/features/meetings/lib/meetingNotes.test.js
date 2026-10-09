import { describe, expect, it } from 'vitest'
import { isValidDateKey, sortMeetingNotes } from './meetingNotes.js'

describe('meeting note domain helpers', () => {
  it('validates calendar-only date keys', () => {
    expect(isValidDateKey('2026-10-08')).toBe(true)
    expect(isValidDateKey('2026-02-30')).toBe(false)
    expect(isValidDateKey('08-10-2026')).toBe(false)
  })

  it('sorts meeting notes newest meeting first and then by update time', () => {
    const items = sortMeetingNotes([
      { id: 'a', meetingDate: '2026-10-02', updatedAt: '2026-10-02T12:00:00.000Z' },
      { id: 'b', meetingDate: '2026-10-07', updatedAt: '2026-10-07T09:00:00.000Z' },
      { id: 'c', meetingDate: '2026-10-07', updatedAt: '2026-10-07T11:00:00.000Z' },
    ])

    expect(items.map((item) => item.id)).toEqual(['c', 'b', 'a'])
  })
})
