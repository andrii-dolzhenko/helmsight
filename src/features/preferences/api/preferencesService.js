import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'

const PREFERENCES_KEY = 'preferences'
const DEFAULT_PREFERENCES = Object.freeze({
  themeMode: 'system',
  projectsViewMode: 'grid',
  risksViewMode: 'grid',
  actionsViewMode: 'grid',
})

const validThemeModes = new Set(['light', 'dark', 'system'])
const validProjectsViewModes = new Set(['grid', 'list'])
const validRisksViewModes = new Set(['grid', 'list'])
const validActionsViewModes = new Set(['grid', 'list'])

function readPreferences() {
  const stored = storageAdapter.read(PREFERENCES_KEY)
  return { ...DEFAULT_PREFERENCES, ...(stored ?? {}) }
}

export const preferencesService = {
  getSnapshot() {
    const stored = storageAdapter.read(PREFERENCES_KEY)

    if (stored === null) {
      return null
    }

    return { ...DEFAULT_PREFERENCES, ...stored }
  },

  async get() {
    return readPreferences()
  },

  async updateThemeMode(themeMode) {
    if (!validThemeModes.has(themeMode)) {
      throw new Error(`Unsupported theme mode: ${themeMode}`)
    }

    const current = await this.get()
    const next = { ...current, themeMode }

    return storageAdapter.write(PREFERENCES_KEY, next)
  },

  async updateProjectsViewMode(projectsViewMode) {
    if (!validProjectsViewModes.has(projectsViewMode)) {
      throw new Error(`Unsupported projects view mode: ${projectsViewMode}`)
    }

    const current = await this.get()
    const next = { ...current, projectsViewMode }

    return storageAdapter.write(PREFERENCES_KEY, next)
  },

  async updateRisksViewMode(risksViewMode) {
    if (!validRisksViewModes.has(risksViewMode)) {
      throw new Error(`Unsupported risks view mode: ${risksViewMode}`)
    }

    const current = await this.get()
    const next = { ...current, risksViewMode }

    return storageAdapter.write(PREFERENCES_KEY, next)
  },

  async updateActionsViewMode(actionsViewMode) {
    if (!validActionsViewModes.has(actionsViewMode)) {
      throw new Error(`Unsupported actions view mode: ${actionsViewMode}`)
    }

    const current = await this.get()
    const next = { ...current, actionsViewMode }

    return storageAdapter.write(PREFERENCES_KEY, next)
  },
}
