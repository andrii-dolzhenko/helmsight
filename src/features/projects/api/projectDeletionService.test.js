import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectsService } from './projectsService.js'
import { projectDeletionService } from './projectDeletionService.js'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'

describe('projectDeletionService', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('rejects permanent deletion of an active project without creating a journal', async () => {
    const [project] = await projectsService.list()

    await expect(
      projectDeletionService.deleteArchivedProject({
        projectId: project.id,
        confirmationName: project.name,
      }),
    ).rejects.toThrow(/archived/i)

    expect(await projectsService.getById(project.id)).not.toBeNull()
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
  })

  it('rejects deletion of a missing project without changing storage', async () => {
    const projects = await projectsService.list()

    await expect(
      projectDeletionService.deleteArchivedProject({
        projectId: 'missing-project',
        confirmationName: 'Missing Project',
      }),
    ).rejects.toThrow('Project not found.')

    expect(await projectsService.list()).toEqual(projects)
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
  })

  it.each([
    ['different letter case', 'atlas modernization'],
    ['trailing whitespace', 'Atlas Modernization '],
  ])('rejects an archived project name with %s', async (_, confirmationName) => {
    const [project] = await projectsService.list()
    const archived = await projectsService.archive(project.id)

    await expect(
      projectDeletionService.deleteArchivedProject({
        projectId: project.id,
        confirmationName,
      }),
    ).rejects.toThrow('Enter the exact project name')

    expect(await projectsService.getById(project.id)).toEqual(archived)
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
  })

  it('preserves project data when the deletion journal cannot be persisted', async () => {
    const [project] = await projectsService.list()
    const archived = await projectsService.archive(project.id)
    const risks = [{ id: 'target-risk', projectId: project.id }]
    const lessons = [{ id: 'target-lesson', projectId: project.id }]
    storageAdapter.write('risks', risks)
    storageAdapter.write('lessonsLearned', lessons)

    const originalWrite = storageAdapter.write.bind(storageAdapter)
    const writeSpy = vi.spyOn(storageAdapter, 'write').mockImplementation((key, value) => {
      if (key === 'pendingProjectDeletion') {
        throw new Error('Journal write failed')
      }
      return originalWrite(key, value)
    })

    try {
      await expect(
        projectDeletionService.deleteArchivedProject({
          projectId: project.id,
          confirmationName: project.name,
        }),
      ).rejects.toThrow('Journal write failed')

      expect(writeSpy).toHaveBeenCalledWith(
        'pendingProjectDeletion',
        expect.objectContaining({ projectId: project.id }),
      )
      expect(await projectsService.getById(project.id)).toEqual(archived)
      expect(storageAdapter.read('risks')).toEqual(risks)
      expect(storageAdapter.read('lessonsLearned')).toEqual(lessons)
      expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
    } finally {
      writeSpy.mockRestore()
    }
  })

  it('deletes an archived project and its related risks without touching other projects', async () => {
    const [demoProject] = await projectsService.list()
    const target = {
      id: 'target-project',
      name: 'Client Portal',
      status: 'active',
      archivedAt: null,
    }

    storageAdapter.write('projects', [demoProject, target])
    await projectsService.archive(target.id)

    const risks = [
      { id: 'target-risk', projectId: target.id },
      { id: 'demo-risk', projectId: demoProject.id },
    ]
    storageAdapter.write('risks', risks)

    await projectDeletionService.deleteArchivedProject({
      projectId: target.id,
      confirmationName: target.name,
    })

    expect(await projectsService.getById(target.id)).toBeNull()
    expect(await projectsService.getById(demoProject.id)).not.toBeNull()
    expect(storageAdapter.read('risks')).toEqual([risks[1]])
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
  })

  it('rejects invalid lessons storage before writing a deletion journal', async () => {
    const [project] = await projectsService.list()
    const archived = await projectsService.archive(project.id)
    storageAdapter.write('lessonsLearned', { invalid: true })

    await expect(
      projectDeletionService.deleteArchivedProject({
        projectId: project.id,
        confirmationName: project.name,
      }),
    ).rejects.toThrow('Invalid stored collection: lessonsLearned')

    expect(await projectsService.getById(project.id)).toEqual(archived)
    expect(storageAdapter.read('lessonsLearned')).toEqual({ invalid: true })
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
  })

  it('persists the deletion journal before destructive mutations', async () => {
    const [project] = await projectsService.list()
    await projectsService.archive(project.id)

    const targetDraft = `draft:risk:${project.id}:new`
    storageAdapter.write(targetDraft, { title: 'Target draft' })
    storageAdapter.write('draft:project:new', { name: 'Global draft' })

    const changes = []
    const originalWrite = storageAdapter.write.bind(storageAdapter)
    const originalRemove = storageAdapter.remove.bind(storageAdapter)

    const writeSpy = vi.spyOn(storageAdapter, 'write').mockImplementation((key, value) => {
      changes.push({ operation: 'write', key, value })
      return originalWrite(key, value)
    })

    const removeSpy = vi.spyOn(storageAdapter, 'remove').mockImplementation((key) => {
      changes.push({ operation: 'remove', key })
      return originalRemove(key)
    })

    try {
      await projectDeletionService.deleteArchivedProject({
        projectId: project.id,
        confirmationName: project.name,
      })

      const journalIndex = changes.findIndex(
        ({ operation, key }) =>
          operation === 'write' && key === 'pendingProjectDeletion',
      )

      expect(journalIndex).toBeGreaterThanOrEqual(0)
      expect(changes[journalIndex].value).toEqual(
        expect.objectContaining({
          version: 1,
          projectId: project.id,
          projectName: project.name,
          draftKeys: [targetDraft],
        }),
      )

      const destructiveKeys = new Set([
        'projects',
        'successCriteria',
        'risks',
        'milestones',
        'managementActions',
        'evmMetrics',
        'weeklyReports',
        'meetingNotes',
        'lessonsLearned',
      ])

      const firstDestructiveIndex = changes.findIndex(
        ({ operation, key }) =>
          (operation === 'write' && destructiveKeys.has(key)) ||
          (operation === 'remove' && key === targetDraft),
      )

      const markerIndex = changes.findIndex(
        ({ operation, key, value }) =>
          operation === 'write' &&
          key === 'deletedDemoProject:demo-project' &&
          value === true,
      )

      expect(markerIndex).toBeGreaterThan(journalIndex)
      expect(firstDestructiveIndex).toBeGreaterThan(markerIndex)
      expect(storageAdapter.read('deletedDemoProject:demo-project')).toBe(true)
      expect(storageAdapter.read(targetDraft)).toBeNull()
      expect(storageAdapter.read('draft:project:new')).toEqual({
        name: 'Global draft',
      })
    } finally {
      writeSpy.mockRestore()
      removeSpy.mockRestore()
    }
  })

  it('recovers an interrupted deletion without affecting other projects', async () => {
    const [demoProject] = await projectsService.list()
    const target = {
      id: 'target-project',
      name: 'Client Portal',
      archivedAt: null,
    }

    storageAdapter.write('projects', [demoProject, target])
    await projectsService.archive(target.id)

    const risks = [
      { id: 'target-risk', projectId: target.id },
      { id: 'demo-risk', projectId: demoProject.id },
    ]
    storageAdapter.write('risks', risks)

    const lessons = [
      { id: 'target-lesson', projectId: target.id },
      { id: 'demo-lesson', projectId: demoProject.id },
    ]
    storageAdapter.write('lessonsLearned', lessons)

    const removedDraft = `draft:risk:${target.id}:old`
    const remainingDraft = `draft:risk:${target.id}:new`
    const lessonDraft = `draft:lesson-learned:${target.id}:new`
    const otherLessonDraft = `draft:lesson-learned:${demoProject.id}:new`

    storageAdapter.write(remainingDraft, { title: 'Unsaved risk' })
    storageAdapter.write(lessonDraft, { title: 'Unsaved lesson' })
    storageAdapter.write(otherLessonDraft, { title: 'Other lesson' })
    storageAdapter.write('draft:project:new', { name: 'Global draft' })

    storageAdapter.write('pendingProjectDeletion', {
      version: 1,
      projectId: target.id,
      projectName: target.name,
      draftKeys: [removedDraft, remainingDraft, lessonDraft],
      createdAt: new Date().toISOString(),
    })

    await projectDeletionService.recoverPendingDeletion()

    expect(await projectsService.getById(target.id)).toBeNull()
    expect(await projectsService.getById(demoProject.id)).not.toBeNull()
    expect(storageAdapter.read('risks')).toEqual([risks[1]])
    expect(storageAdapter.read('lessonsLearned')).toEqual([lessons[1]])
    expect(storageAdapter.read(remainingDraft)).toBeNull()
    expect(storageAdapter.read(lessonDraft)).toBeNull()
    expect(storageAdapter.read(otherLessonDraft)).toEqual({ title: 'Other lesson' })
    expect(storageAdapter.read('draft:project:new')).toEqual({
      name: 'Global draft',
    })
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()

    await projectDeletionService.recoverPendingDeletion()

    expect(await projectsService.getById(demoProject.id)).not.toBeNull()
    expect(storageAdapter.read('risks')).toEqual([risks[1]])
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
  })

  it('preserves Atlas when the anti-reseed marker write fails', async () => {
    const [project] = await projectsService.list()
    const archived = await projectsService.archive(project.id)
    const risks = [{ id: 'atlas-risk', projectId: project.id }]
    storageAdapter.write('risks', risks)

    const originalWrite = storageAdapter.write.bind(storageAdapter)
    const writeSpy = vi.spyOn(storageAdapter, 'write').mockImplementation(
      (key, value) => {
        if (key === 'deletedDemoProject:demo-project') {
          throw new Error('Demo marker write failed')
        }
        return originalWrite(key, value)
      },
    )

    try {
      await expect(
        projectDeletionService.deleteArchivedProject({
          projectId: project.id,
          confirmationName: project.name,
        }),
      ).rejects.toThrow('Demo marker write failed')

      expect(writeSpy).toHaveBeenCalledWith(
        'deletedDemoProject:demo-project',
        true,
      )
      expect(storageAdapter.read('pendingProjectDeletion')).toEqual(
        expect.objectContaining({ projectId: project.id }),
      )
      expect(storageAdapter.read('deletedDemoProject:demo-project')).toBeNull()
      expect(await projectsService.getById(project.id)).toEqual(archived)
      expect(storageAdapter.read('risks')).toEqual(risks)
    } finally {
      writeSpy.mockRestore()
    }
  })

  it('recovers safely after a partial cascade write failure', async () => {
    const [project] = await projectsService.list()
    const archived = await projectsService.archive(project.id)

    const criteria = [
      { id: 'atlas-criterion', projectId: project.id },
      { id: 'other-criterion', projectId: 'other-project' },
    ]
    const risks = [
      { id: 'atlas-risk', projectId: project.id },
      { id: 'other-risk', projectId: 'other-project' },
    ]

    storageAdapter.write('successCriteria', criteria)
    storageAdapter.write('risks', risks)

    const originalWrite = storageAdapter.write.bind(storageAdapter)
    let failRiskWrite = true

    const writeSpy = vi.spyOn(storageAdapter, 'write').mockImplementation(
      (key, value) => {
        if (key === 'risks' && failRiskWrite) {
          failRiskWrite = false
          throw new Error('Risk storage write failed')
        }
        return originalWrite(key, value)
      },
    )

    try {
      await expect(
        projectDeletionService.deleteArchivedProject({
          projectId: project.id,
          confirmationName: project.name,
        }),
      ).rejects.toThrow('Risk storage write failed')

      expect(storageAdapter.read('pendingProjectDeletion')).toEqual(
        expect.objectContaining({ projectId: project.id }),
      )
      expect(storageAdapter.read('deletedDemoProject:demo-project')).toBe(true)
      expect(await projectsService.getById(project.id)).toEqual(archived)
      expect(storageAdapter.read('successCriteria')).toEqual([criteria[1]])
      expect(storageAdapter.read('risks')).toEqual(risks)
    } finally {
      writeSpy.mockRestore()
    }

    await projectDeletionService.recoverPendingDeletion()

    expect(await projectsService.getById(project.id)).toBeNull()
    expect(storageAdapter.read('successCriteria')).toEqual([criteria[1]])
    expect(storageAdapter.read('risks')).toEqual([risks[1]])
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()

    await projectDeletionService.recoverPendingDeletion()

    expect(storageAdapter.read('risks')).toEqual([risks[1]])
  })

  it('recovers if the lessons collection fails during the cascade', async () => {
    const [project] = await projectsService.list()
    const archived = await projectsService.archive(project.id)
    const lessons = [
      { id: 'target-lesson', projectId: project.id },
      { id: 'other-lesson', projectId: 'other-project' },
    ]
    storageAdapter.write('lessonsLearned', lessons)
    const lessonDraft = `draft:lesson-learned:${project.id}:new`
    storageAdapter.write(lessonDraft, { title: 'Draft lesson' })

    const originalWrite = storageAdapter.write.bind(storageAdapter)
    let failOnce = true
    const writeSpy = vi.spyOn(storageAdapter, 'write').mockImplementation(
      (key, value) => {
        if (key === 'lessonsLearned' && failOnce) {
          failOnce = false
          throw new Error('Lesson storage write failed')
        }
        return originalWrite(key, value)
      },
    )

    try {
      await expect(
        projectDeletionService.deleteArchivedProject({
          projectId: project.id,
          confirmationName: project.name,
        }),
      ).rejects.toThrow('Lesson storage write failed')

      expect(await projectsService.getById(project.id)).toEqual(archived)
      expect(storageAdapter.read('lessonsLearned')).toEqual(lessons)
      expect(storageAdapter.read(lessonDraft)).not.toBeNull()
      expect(storageAdapter.read('pendingProjectDeletion')).toEqual(
        expect.objectContaining({
          projectId: project.id,
          draftKeys: [lessonDraft],
        }),
      )
    } finally {
      writeSpy.mockRestore()
    }

    await projectDeletionService.recoverPendingDeletion()

    expect(await projectsService.getById(project.id)).toBeNull()
    expect(storageAdapter.read('lessonsLearned')).toEqual([lessons[1]])
    expect(storageAdapter.read(lessonDraft)).toBeNull()
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()

    await projectDeletionService.recoverPendingDeletion()
    expect(storageAdapter.read('lessonsLearned')).toEqual([lessons[1]])
  })

  it('deletes every owned collection and draft without affecting unrelated data', async () => {
    const [atlas] = await projectsService.list()
    const otherProject = {
      id: 'demo-project-extra',
      name: 'Other Project',
      archivedAt: null,
    }

    storageAdapter.write('projects', [atlas, otherProject])
    await projectsService.archive(atlas.id)

    const collectionKeys = [
      'successCriteria',
      'risks',
      'milestones',
      'managementActions',
      'weeklyReports',
      'meetingNotes',
      'lessonsLearned',
    ]

    for (const key of collectionKeys) {
      storageAdapter.write(key, [
        { id: `${key}-atlas`, projectId: atlas.id },
        { id: `${key}-other`, projectId: otherProject.id },
      ])
    }

    storageAdapter.write('evmMetrics', {
      baselines: [
        { projectId: atlas.id, workPackages: [] },
        { projectId: otherProject.id, workPackages: [] },
      ],
      snapshots: [
        { projectId: atlas.id, entries: [] },
        { projectId: otherProject.id, entries: [] },
      ],
    })

    const ownedDrafts = [
      `draft:project:${atlas.id}:edit`,
      `draft:risk:${atlas.id}:new`,
      `draft:milestone:${atlas.id}:m1`,
      `draft:successCriterion:${atlas.id}:new`,
      `draft:management-action:${atlas.id}:a1`,
      `draft:evm-baseline:${atlas.id}`,
      `draft:evm-snapshot:${atlas.id}:new`,
      `draft:meeting-note:${atlas.id}:m1`,
      `draft:weekly-report:${atlas.id}:report-1`,
      `draft:weekly-report:${atlas.id}:new:2026-10-09`,
      `draft:lesson-learned:${atlas.id}:new`,
      `draft:lesson-learned:${atlas.id}:lesson-1`,
    ]

    for (const key of ownedDrafts) {
      storageAdapter.write(key, { saved: true })
    }

    const preservedDrafts = [
      'draft:project:new',
      `draft:risk:${otherProject.id}:new`,
      `draft:lesson-learned:${otherProject.id}:new`,
      `draft:unknown:${atlas.id}:new`,
    ]

    for (const key of preservedDrafts) {
      storageAdapter.write(key, { preserved: true })
    }

    storageAdapter.write('preferences', { themeMode: 'dark' })
    storageAdapter.write('weeklyReportsDemoSeedVersion', 1)

    await projectDeletionService.deleteArchivedProject({
      projectId: atlas.id,
      confirmationName: atlas.name,
    })

    expect(await projectsService.getById(atlas.id)).toBeNull()
    expect(await projectsService.getById(otherProject.id)).not.toBeNull()

    for (const key of collectionKeys) {
      expect(storageAdapter.read(key)).toEqual([
        { id: `${key}-other`, projectId: otherProject.id },
      ])
    }

    expect(storageAdapter.read('evmMetrics')).toEqual({
      baselines: [
        { projectId: otherProject.id, workPackages: [] },
      ],
      snapshots: [
        { projectId: otherProject.id, entries: [] },
      ],
    })

    for (const key of ownedDrafts) {
      expect(storageAdapter.read(key)).toBeNull()
    }

    for (const key of preservedDrafts) {
      expect(storageAdapter.read(key)).toEqual({ preserved: true })
    }

    expect(storageAdapter.read('preferences')).toEqual({
      themeMode: 'dark',
    })
    expect(storageAdapter.read('weeklyReportsDemoSeedVersion')).toBe(1)
    expect(storageAdapter.read('deletedDemoProject:demo-project')).toBe(true)
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
  })

  it('recovers when the final parent project write fails', async () => {
    const [project] = await projectsService.list()
    const archived = await projectsService.archive(project.id)
    storageAdapter.write('risks', [
      { id: 'atlas-risk', projectId: project.id },
    ])

    const originalWrite = storageAdapter.write.bind(storageAdapter)
    const writeSpy = vi.spyOn(storageAdapter, 'write').mockImplementation(
      (key, value) => {
        if (key === 'projects') {
          throw new Error('Parent project write failed')
        }
        return originalWrite(key, value)
      },
    )

    try {
      await expect(
        projectDeletionService.deleteArchivedProject({
          projectId: project.id,
          confirmationName: project.name,
        }),
      ).rejects.toThrow('Parent project write failed')

      expect(await projectsService.getById(project.id)).toEqual(archived)
      expect(storageAdapter.read('risks')).toEqual([])
      expect(storageAdapter.read('pendingProjectDeletion')).toEqual(
        expect.objectContaining({ projectId: project.id }),
      )
      expect(storageAdapter.read('deletedDemoProject:demo-project')).toBe(true)
    } finally {
      writeSpy.mockRestore()
    }

    await projectDeletionService.recoverPendingDeletion()

    expect(await projectsService.getById(project.id)).toBeNull()
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
  })

  it('recovers when journal cleanup fails after deleting the project', async () => {
    const [project] = await projectsService.list()
    await projectsService.archive(project.id)

    const originalRemove = storageAdapter.remove.bind(storageAdapter)
    const removeSpy = vi.spyOn(storageAdapter, 'remove').mockImplementation(
      (key) => {
        if (key === 'pendingProjectDeletion') {
          throw new Error('Journal cleanup failed')
        }
        return originalRemove(key)
      },
    )

    try {
      await expect(
        projectDeletionService.deleteArchivedProject({
          projectId: project.id,
          confirmationName: project.name,
        }),
      ).rejects.toThrow('Journal cleanup failed')

      expect(await projectsService.getById(project.id)).toBeNull()
      expect(storageAdapter.read('pendingProjectDeletion')).toEqual(
        expect.objectContaining({ projectId: project.id }),
      )
    } finally {
      removeSpy.mockRestore()
    }

    await projectDeletionService.recoverPendingDeletion()

    expect(await projectsService.getById(project.id)).toBeNull()
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
  })

  it.each([
    ['unsupported version', { version: 99 }],
    ['foreign project draft', {
      draftKeys: ['draft:risk:other-project:new'],
    }],
    ['foreign lesson draft', {
      draftKeys: ['draft:lesson-learned:other-project:new'],
    }],
  ])('rejects an invalid journal without modifying project data: %s', async (_, override) => {
    const [project] = await projectsService.list()
    const archived = await projectsService.archive(project.id)
    const risks = [{ id: 'atlas-risk', projectId: project.id }]
    storageAdapter.write('risks', risks)
    storageAdapter.write('draft:risk:other-project:new', {
      title: 'Keep this draft',
    })

    const journal = {
      version: 1,
      projectId: project.id,
      projectName: project.name,
      draftKeys: [],
      createdAt: new Date().toISOString(),
      ...override,
    }

    storageAdapter.write('pendingProjectDeletion', journal)

    await expect(
      projectDeletionService.recoverPendingDeletion(),
    ).rejects.toThrow('Invalid pending project deletion journal.')

    expect(await projectsService.getById(project.id)).toEqual(archived)
    expect(storageAdapter.read('risks')).toEqual(risks)
    expect(storageAdapter.read('draft:risk:other-project:new')).toEqual({
      title: 'Keep this draft',
    })
    expect(storageAdapter.read('pendingProjectDeletion')).toEqual(journal)
    expect(storageAdapter.read('deletedDemoProject:demo-project')).toBeNull()
  })

  it('blocks another deletion while a pending journal exists', async () => {
    const [atlas] = await projectsService.list()
    const other = {
      id: 'other-project',
      name: 'Other Project',
      archivedAt: null,
    }

    storageAdapter.write('projects', [atlas, other])

    await projectsService.archive(atlas.id)
    const archivedOther = await projectsService.archive(other.id)

    const journal = {
      version: 1,
      projectId: atlas.id,
      projectName: atlas.name,
      draftKeys: [],
      createdAt: new Date().toISOString(),
    }

    storageAdapter.write('pendingProjectDeletion', journal)

    const risks = [
      { id: 'other-risk', projectId: other.id },
    ]
    storageAdapter.write('risks', risks)

    await expect(
      projectDeletionService.deleteArchivedProject({
        projectId: other.id,
        confirmationName: other.name,
      }),
    ).rejects.toThrow('A previous project deletion requires recovery.')

    expect(await projectsService.getById(other.id)).toEqual(archivedOther)
    expect(storageAdapter.read('risks')).toEqual(risks)
    expect(storageAdapter.read('pendingProjectDeletion')).toEqual(journal)
    expect(storageAdapter.read('deletedDemoProject:demo-project')).toBeNull()
  })

})
