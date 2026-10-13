import { describe, expect, it } from 'vitest'
import { getProfileInitials, migrateProfile, validateProfile } from './profile.js'

const valid = { firstName: 'Alex', lastName: 'Morgan', role: 'Project Manager', avatarDataUrl: null }

describe('profile utilities', () => {
  it('derives initials from separate fields and uses PM for missing names', () => {
    expect(getProfileInitials('Andrii', 'Dolzhenko')).toBe('AD')
    expect(getProfileInitials('Alex', 'Morgan')).toBe('AM')
    expect(getProfileInitials('Samantha')).toBe('S')
    expect(getProfileInitials('')).toBe('PM')
  })

  it('migrates the previous displayName format without writing to storage', () => {
    expect(migrateProfile({ displayName: 'Alex Morgan' })).toEqual(valid)
    expect(migrateProfile({ displayName: '' }).firstName).toBe('')
  })

  it('normalizes names and validates role and required first name', () => {
    expect(validateProfile({ ...valid, firstName: '  Alex   B.  ' }).firstName).toBe('Alex B.')
    expect(() => validateProfile({ ...valid, firstName: '  ' })).toThrow(/First name is required/)
    expect(() => validateProfile({ ...valid, role: 'A' })).toThrow(/Role/)
    expect(() => validateProfile({ ...valid, lastName: 'X'.repeat(61) })).toThrow(/Last name/)
  })
})
