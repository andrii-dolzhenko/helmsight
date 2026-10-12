import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it } from 'vitest'
import projectsReducer, {
  createProjectsInitialState,
  deleteProject,
} from './projectsSlice.js'
import { projectsService } from '../api/projectsService.js'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'

function createTestStore(projects) {
  return configureStore({
    reducer: { projects: projectsReducer },
    preloadedState: {
      projects: createProjectsInitialState(projects, 'succeeded'),
    },
  })
}

describe('deleteProject Redux integration', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('removes a deleted archived project while preserving other projects', async () => {
    const [atlas] = await projectsService.list()
    const other = {
      id: 'client-project',
      name: 'Client Portal',
      archivedAt: null,
    }

    storageAdapter.write('projects', [atlas, other])
    await projectsService.archive(atlas.id)

    const store = createTestStore(await projectsService.list())

    const deletedId = await store.dispatch(
      deleteProject({
        projectId: atlas.id,
        confirmationName: atlas.name,
      }),
    ).unwrap()

    expect(deletedId).toBe(atlas.id)
    expect(store.getState().projects.items.map((item) => item.id)).toEqual([
      other.id,
    ])
    expect(store.getState().projects.mutationStatus).toBe('succeeded')
    expect(store.getState().projects.mutationError).toBeNull()

    expect(await projectsService.getById(atlas.id)).toBeNull()
    expect(await projectsService.getById(other.id)).not.toBeNull()
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
    expect(storageAdapter.read('deletedDemoProject:demo-project')).toBe(true)
  })

  it('preserves Redux state when deleting an active project is rejected', async () => {
    const projects = await projectsService.list()
    const [atlas] = projects
    const store = createTestStore(projects)

    const result = await store.dispatch(
      deleteProject({
        projectId: atlas.id,
        confirmationName: atlas.name,
      }),
    )

    expect(result.type).toBe(deleteProject.rejected.type)
    expect(result.payload).toMatch(/archived/i)
    expect(store.getState().projects.items).toEqual(projects)
    expect(store.getState().projects.mutationStatus).toBe('failed')
    expect(store.getState().projects.mutationError).toMatch(/archived/i)

    expect(await projectsService.getById(atlas.id)).not.toBeNull()
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
    expect(storageAdapter.read('deletedDemoProject:demo-project')).toBeNull()
  })
})
