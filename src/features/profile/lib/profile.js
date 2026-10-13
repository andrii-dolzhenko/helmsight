export const DEMO_PROFILE = Object.freeze({
  firstName: 'Andrii',
  lastName: 'Dolzhenko',
  role: 'Project Manager',
  avatarDataUrl: null,
})

export const PROFILE_FIELD_MAX_LENGTH = 60
export const PHOTO_MAX_FILE_SIZE = 5 * 1024 * 1024
export const PHOTO_DATA_URL_MAX_LENGTH = 450_000
export const PHOTO_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])

export const normalizeProfileText = (value) => typeof value === 'string'
  ? value.trim().replace(/\s+/gu, ' ')
  : ''

export function getProfileInitials(firstName, lastName = '') {
  const first = Array.from(normalizeProfileText(firstName))[0] ?? ''
  const last = Array.from(normalizeProfileText(lastName))[0] ?? ''
  return (first + last).toLocaleUpperCase() || 'PM'
}

export function getProfileFullName(profile) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}

export function migrateProfile(stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    throw new Error('The locally saved profile is invalid.')
  }

  if (typeof stored.displayName === 'string' && typeof stored.firstName !== 'string') {
    const parts = normalizeProfileText(stored.displayName).split(' ')
    return {
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' '),
      role: DEMO_PROFILE.role,
      avatarDataUrl: null,
    }
  }

  if (typeof stored.firstName !== 'string' || typeof stored.lastName !== 'string' || typeof stored.role !== 'string') {
    throw new Error('The locally saved profile is invalid.')
  }

  return {
    firstName: stored.firstName,
    lastName: stored.lastName,
    role: stored.role,
    avatarDataUrl: isPhotoDataUrl(stored.avatarDataUrl) ? stored.avatarDataUrl : null,
  }
}

export function isPhotoDataUrl(value) {
  return typeof value === 'string' &&
    value.length <= PHOTO_DATA_URL_MAX_LENGTH &&
    /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
}

export function validateProfile(profile) {
  const firstName = normalizeProfileText(profile.firstName)
  const lastName = normalizeProfileText(profile.lastName)
  const role = normalizeProfileText(profile.role)

  if (!firstName || Array.from(firstName).length > PROFILE_FIELD_MAX_LENGTH) {
    throw new Error('First name is required and must be 60 characters or fewer.')
  }
  if (Array.from(lastName).length > PROFILE_FIELD_MAX_LENGTH) {
    throw new Error('Last name must be 60 characters or fewer.')
  }
  if (Array.from(role).length < 2 || Array.from(role).length > PROFILE_FIELD_MAX_LENGTH) {
    throw new Error('Role must be between 2 and 60 characters.')
  }
  if (profile.avatarDataUrl !== null && !isPhotoDataUrl(profile.avatarDataUrl)) {
    throw new Error('The profile photo must be a valid processed image.')
  }
  return { firstName, lastName, role, avatarDataUrl: profile.avatarDataUrl }
}
