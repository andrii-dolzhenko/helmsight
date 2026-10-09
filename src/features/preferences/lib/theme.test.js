import { describe, expect, it } from 'vitest'
import { resolveTheme } from './theme.js'

describe('resolveTheme', () => {
  it('keeps an explicit light theme', () => {
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('keeps an explicit dark theme', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('resolves system mode from the OS preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})
