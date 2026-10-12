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

  it('lists only keys inside the HelmSight namespace', () => {
    storageAdapter.write('draft:project:new', { name: 'New project' })
    storageAdapter.write('draft:risk:p1:new', { title: 'Risk' })
    storageAdapter.write('preferences', { themeMode: 'dark' })

    window.localStorage.setItem('external:draft:risk:p1:new', 'external')
    window.localStorage.setItem(
      'helmsight:p0:v2:draft:risk:p1:new',
      'other-version',
    )

    expect(storageAdapter.listKeys('draft:').sort()).toEqual([
      'draft:project:new',
      'draft:risk:p1:new',
    ])

    expect(window.localStorage.getItem('external:draft:risk:p1:new'))
      .toBe('external')
  })

  it('matches project-specific draft prefixes without including similar IDs', () => {
    storageAdapter.write('draft:risk:p1:new', { title: 'Target' })
    storageAdapter.write('draft:risk:p10:new', { title: 'Other' })
    storageAdapter.write('draft:project:new', { name: 'New project' })

    expect(storageAdapter.listKeys('draft:risk:p1:')).toEqual([
      'draft:risk:p1:new',
    ])

    expect(storageAdapter.listKeys('draft:risk:missing:')).toEqual([])
    expect(storageAdapter.read('draft:risk:p10:new')).toEqual({
      title: 'Other',
    })
  })

})
