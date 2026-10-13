import { beforeEach, describe, expect, it } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { profileService } from './profileService.js'
import { DEMO_PROFILE } from '../lib/profile.js'

const profile = { firstName: 'Alex', lastName: 'Morgan', role: 'Delivery Manager', avatarDataUrl: null }

describe('profileService', () => {
  beforeEach(() => window.localStorage.clear())

  it('uses the demo profile without persisting it automatically', async () => {
    expect(profileService.getSnapshot()).toBeNull()
    await expect(profileService.get()).resolves.toEqual(DEMO_PROFILE)
    expect(storageAdapter.read('profile')).toBeNull()
  })

  it('persists valid names and role', async () => {
    await expect(profileService.updateProfile({ ...profile, firstName: '  Alex   ' }))
      .resolves.toEqual(profile)
    expect(profileService.getSnapshot()).toEqual(profile)
  })

  it('reads old display names and migrates on the next save', async () => {
    storageAdapter.write('profile', { displayName: 'Alex Morgan' })
    expect(profileService.getSnapshot()).toEqual({ ...profile, role: 'Project Manager' })
    await profileService.updateProfile(profile)
    expect(storageAdapter.read('profile')).toEqual(profile)
  })

  it('rejects invalid updates without modifying saved data', async () => {
    await profileService.updateProfile(profile)
    await expect(profileService.updateProfile({ ...profile, firstName: ' ' })).rejects.toThrow(/First name/)
    expect(profileService.getSnapshot()).toEqual(profile)
  })
})
