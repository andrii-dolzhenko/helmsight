import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formDraftService } from './formDraftService.js'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('formDraftService', () => {
  it('persists and restores draft values', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-07T08:00:00Z'))

    formDraftService.write('project:new', { name: 'Atlas' })

    expect(formDraftService.read('project:new')).toEqual({
      values: { name: 'Atlas' },
      savedAt: '2026-10-07T08:00:00.000Z',
    })
  })

  it('removes a saved draft after successful completion', () => {
    formDraftService.write('project:new', { name: 'Atlas' })
    formDraftService.remove('project:new')

    expect(formDraftService.read('project:new')).toBeNull()
  })
})
