import { beforeEach, describe, expect, it } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { preferencesService } from './preferencesService.js'

describe('preferencesService', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('merges new defaults into an existing preference record', async () => {
    storageAdapter.write('preferences', { themeMode: 'dark' })

    await expect(preferencesService.get()).resolves.toEqual({
      themeMode: 'dark',
      projectsViewMode: 'grid',
      risksViewMode: 'grid',
      actionsViewMode: 'grid',
    })
  })

  it('exposes persisted preferences synchronously for first-render hydration', () => {
    storageAdapter.write('preferences', {
      themeMode: 'dark',
      projectsViewMode: 'list',
      risksViewMode: 'grid',
      actionsViewMode: 'list',
    })

    expect(preferencesService.getSnapshot()).toEqual({
      themeMode: 'dark',
      projectsViewMode: 'list',
      risksViewMode: 'grid',
      actionsViewMode: 'list',
    })
  })

  it('persists projects view mode without replacing other preferences', async () => {
    storageAdapter.write('preferences', {
      themeMode: 'light',
      projectsViewMode: 'grid',
      risksViewMode: 'grid',
      actionsViewMode: 'list',
    })

    await preferencesService.updateProjectsViewMode('list')

    expect(storageAdapter.read('preferences')).toEqual({
      themeMode: 'light',
      projectsViewMode: 'list',
      risksViewMode: 'grid',
      actionsViewMode: 'list',
    })
  })

  it('persists risk register view mode without replacing other preferences', async () => {
    storageAdapter.write('preferences', {
      themeMode: 'dark',
      projectsViewMode: 'grid',
      risksViewMode: 'grid',
      actionsViewMode: 'list',
    })

    await preferencesService.updateRisksViewMode('list')

    expect(storageAdapter.read('preferences')).toEqual({
      themeMode: 'dark',
      projectsViewMode: 'grid',
      risksViewMode: 'list',
      actionsViewMode: 'list',
    })
  })

  it('persists Action Register view mode without replacing other preferences', async () => {
    storageAdapter.write('preferences', {
      themeMode: 'dark',
      projectsViewMode: 'grid',
      risksViewMode: 'list',
      actionsViewMode: 'grid',
    })

    await preferencesService.updateActionsViewMode('list')

    expect(storageAdapter.read('preferences')).toEqual({
      themeMode: 'dark',
      projectsViewMode: 'grid',
      risksViewMode: 'list',
      actionsViewMode: 'list',
    })
  })
})
