import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { DEMO_PROFILE, migrateProfile, validateProfile } from '../lib/profile.js'

const PROFILE_KEY = 'profile'

export const profileService = {
  getSnapshot() {
    const stored = storageAdapter.read(PROFILE_KEY)
    return stored === null ? null : migrateProfile(stored)
  },

  async get() {
    return this.getSnapshot() ?? { ...DEMO_PROFILE }
  },

  async updateProfile(profile) {
    return storageAdapter.write(PROFILE_KEY, validateProfile(profile))
  },
}
