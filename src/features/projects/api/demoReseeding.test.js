import { beforeEach, describe, expect, it } from 'vitest'
import { projectsService } from './projectsService.js'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'

describe('Atlas demo reseeding protection', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('does not recreate Atlas after its persistent deletion marker is set', async () => {
    storageAdapter.write('deletedDemoProject:demo-project', true)

    expect(await projectsService.list()).toEqual([])
    expect(storageAdapter.read('projects')).toEqual([])
    expect(storageAdapter.read('deletedDemoProject:demo-project')).toBe(true)
  })

  it('still initializes Atlas when no deletion marker exists', async () => {
    const projects = await projectsService.list()

    expect(projects.some((project) => project.id === 'demo-project')).toBe(true)
  })
})
