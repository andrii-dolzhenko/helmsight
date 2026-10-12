import { describe, expect, it } from 'vitest'
import { isValidCalendarDate } from './calendarDate.js'

describe('isValidCalendarDate', () => {
  it.each([
    '2026-10-12',
    '2024-02-29',
    '2000-02-29',
    '2026-12-31',
    '0001-01-01',
  ])('accepts valid calendar date %s', (value) => {
    expect(isValidCalendarDate(value)).toBe(true)
  })

  it.each([
    '2026-02-30',
    '2026-02-29',
    '1900-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-10-00',
    '0000-01-01',
    '2026-1-02',
    '2026-10-2',
    '2026-10-12T00:00:00',
    ' 2026-10-12 ',
    '',
    null,
    undefined,
    20261012,
  ])('rejects invalid calendar date %s', (value) => {
    expect(isValidCalendarDate(value)).toBe(false)
  })
})
