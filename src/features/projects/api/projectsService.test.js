import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { projectsService } from './projectsService.js'

describe('projectsService', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('crypto', { randomUUID: () => 'test-project-id' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('seeds the local workspace with a deterministic demo project', async () => {
    const projects = await projectsService.list()

    expect(projects).toHaveLength(1)
    expect(projects[0]).toMatchObject({
      id: 'demo-project',
      name: 'Atlas Modernization',
      archivedAt: null,
    })
  })

  it('creates, updates, archives, restores, and persists a project', async () => {
    const created = await projectsService.create({
      name: '  Client Portal  ',
      description: '  Delivery workspace  ',
      clientContext: '  Acme Group  ',
      startDate: '2026-10-10',
      targetEndDate: '2027-01-20',
      status: 'planning',
    })

    expect(created.name).toBe('Client Portal')

    const updated = await projectsService.update(created.id, {
      ...created,
      name: 'Client Portal Relaunch',
      status: 'active',
    })
    expect(updated.status).toBe('active')

    const archived = await projectsService.archive(created.id)
    expect(archived.archivedAt).not.toBeNull()

    const restored = await projectsService.restore(created.id)
    expect(restored.archivedAt).toBeNull()

    const persisted = await projectsService.getById(created.id)
    expect(persisted).toMatchObject({
      name: 'Client Portal Relaunch',
      status: 'active',
      archivedAt: null,
    })
  })

  it('exposes existing project data synchronously without seeding a new workspace', async () => {
    expect(projectsService.getSnapshot()).toBeNull()

    const projects = await projectsService.list()

    expect(projectsService.getSnapshot()).toEqual(projects)
  })

  it('updates the project timestamp when an archived project is restored', async () => {
    vi.useFakeTimers()

    try {
      vi.setSystemTime(new Date('2026-10-06T10:00:00.000Z'))
      const created = await projectsService.create({
        name: 'Recovery Project',
        description: 'Restore timestamp validation.',
        clientContext: 'Northstar Telecom',
        startDate: '2026-10-01',
        targetEndDate: '2026-12-20',
        status: 'active',
      })

      vi.setSystemTime(new Date('2026-10-06T11:00:00.000Z'))
      const archived = await projectsService.archive(created.id)

      vi.setSystemTime(new Date('2026-10-06T12:00:00.000Z'))
      const restored = await projectsService.restore(created.id)

      expect(archived.archivedAt).toBe('2026-10-06T11:00:00.000Z')
      expect(restored.archivedAt).toBeNull()
      expect(restored.updatedAt).toBe('2026-10-06T12:00:00.000Z')
    } finally {
      vi.useRealTimers()
    }
  })

  it('hydrates governance for existing demo data and persists governance updates', async () => {
    window.localStorage.setItem(
      'helmsight:p0:v1:projects',
      JSON.stringify([
        {
          id: 'demo-project',
          name: 'Atlas Modernization',
          description: 'Legacy stored project without governance.',
          clientContext: 'Northstar Telecom',
          startDate: '2026-08-04',
          targetEndDate: '2027-02-27',
          status: 'active',
          archivedAt: null,
          createdAt: '2026-08-04T09:00:00.000Z',
          updatedAt: '2026-10-06T12:00:00.000Z',
        },
      ]),
    )

    const [project] = await projectsService.list()
    expect(project.governance.charter.purpose).toContain('Modernize')
    expect(project.governance.stakeholders.length).toBeGreaterThan(0)
    expect(project.governance.charter.primaryObjective).toContain('modernization')
    expect(project.governance.charter.deliverables.length).toBeGreaterThan(0)

    const updated = await projectsService.updateGovernance(project.id, {
      ...project.governance,
      charter: {
        ...project.governance.charter,
        purpose: 'Updated governance purpose',
      },
    })

    expect(updated.governance.charter.purpose).toBe('Updated governance purpose')
    expect((await projectsService.getById(project.id)).governance.charter.purpose).toBe(
      'Updated governance purpose',
    )
  })

  it('migrates v1 demo governance to the expanded v2 schema without losing saved values', async () => {
    window.localStorage.setItem(
      'helmsight:p0:v1:projects',
      JSON.stringify([
        {
          id: 'demo-project',
          name: 'Atlas Modernization',
          description: 'Legacy governance schema.',
          clientContext: 'Northstar Telecom',
          startDate: '2026-08-04',
          targetEndDate: '2027-02-27',
          status: 'active',
          archivedAt: null,
          createdAt: '2026-08-04T09:00:00.000Z',
          updatedAt: '2026-10-06T12:00:00.000Z',
          governance: {
            charter: {
              purpose: 'User-edited legacy purpose',
              sponsor: 'Maya Chen',
              projectManager: 'Alex Morgan',
              objectives: ['Keep control visible'],
              inScope: ['Delivery workspace'],
              version: 2,
            },
            stakeholders: [
              {
                id: 'demo-stakeholder-sponsor',
                name: 'Maya Chen',
                role: 'Executive sponsor',
                influence: 'high',
                interest: 'high',
                engagement: 'leading',
              },
            ],
            communications: [],
          },
        },
      ]),
    )

    const [project] = await projectsService.list()

    expect(project.governance.schemaVersion).toBe(2)
    expect(project.governance.charter.purpose).toBe('User-edited legacy purpose')
    expect(project.governance.charter.primaryObjective).toBeTruthy()
    expect(project.governance.stakeholders[0].organization).toBe('Northstar Telecom')
  })

  it('rejects edits to archived projects without altering persisted data, then allows edits after restore', async () => {
    const [project] = await projectsService.list()
    const archived = await projectsService.archive(project.id)
    const before = window.localStorage.getItem('helmsight:p0:v1:projects')

    await expect(
      projectsService.update(project.id, {
        ...project,
        name: 'Unauthorized archived edit',
      }),
    ).rejects.toThrow('Archived projects are read-only')

    expect(window.localStorage.getItem('helmsight:p0:v1:projects')).toBe(before)
    expect(await projectsService.getById(project.id)).toEqual(archived)

    await projectsService.restore(project.id)
    const updated = await projectsService.update(project.id, {
      ...project,
      name: 'Edited after restore',
    })
    expect(updated.name).toBe('Edited after restore')
    expect(updated.archivedAt).toBeNull()
    expect((await projectsService.getById(project.id)).name).toBe('Edited after restore')
  })

  it('keeps governance read-only for archived projects', async () => {
    const [project] = await projectsService.list()
    await projectsService.archive(project.id)

    await expect(
      projectsService.updateGovernance(project.id, project.governance),
    ).rejects.toThrow('Archived projects are read-only')
  })

})
