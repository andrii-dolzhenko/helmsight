import { beforeEach, describe, expect, it } from 'vitest'
import {
  storageAdapter,
  storageNamespace,
} from './storageAdapter.js'

describe('storageAdapter', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('writes and reads a namespaced value', () => {
    storageAdapter.write('preferences', { themeMode: 'dark' })

    expect(storageAdapter.read('preferences')).toEqual({ themeMode: 'dark' })
    expect(window.localStorage.getItem(`${storageNamespace}:preferences`)).toBe(
      '{"themeMode":"dark"}',
    )
  })

  it('returns null for a missing key', () => {
    expect(storageAdapter.read('missing')).toBeNull()
  })
})
