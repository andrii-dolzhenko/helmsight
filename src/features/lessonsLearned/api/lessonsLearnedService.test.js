import { beforeEach, describe, expect, it } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import {
  LESSON_CATEGORIES,
  LessonsLearnedServiceError,
  lessonsLearnedService,
} from './lessonsLearnedService.js'

const input = {
  title: '  Clarify rollout handoff  ',
  category: 'communication',
  situation: '  Support was informed late.  ',
  lesson: '  Share the rollout timeline early.  ',
  recommendation: '  Review the handoff at planning.  ',
}

const projects = [
  { id: 'p1', archivedAt: null },
  { id: 'p2', archivedAt: null },
  { id: 'archived', archivedAt: '2026-10-14T10:00:00.000Z' },
]

describe('lessonsLearnedService', () => {
  beforeEach(() => {
    window.localStorage.clear()
    storageAdapter.write('projects', projects)
  })

  it('starts empty without manufacturing demo lessons', async () => {
    expect(lessonsLearnedService.getSnapshot()).toBeNull()
    expect(await lessonsLearnedService.list('p1')).toEqual([])
    expect(storageAdapter.read('lessonsLearned')).toBeNull()
  })

  it('creates, normalizes and persists a project-owned lesson', async () => {
    const created = await lessonsLearnedService.create('p1', input)
    expect(created).toEqual(expect.objectContaining({
      id: expect.any(String),
      projectId: 'p1',
      title: 'Clarify rollout handoff',
      category: 'communication',
      situation: 'Support was informed late.',
      lesson: 'Share the rollout timeline early.',
      recommendation: 'Review the handoff at planning.',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    }))
    expect(lessonsLearnedService.getSnapshot()).toEqual([created])
    expect(await lessonsLearnedService.getById('p1', created.id)).toEqual(created)
    expect(await lessonsLearnedService.list('p1')).toEqual([created])
    expect(LESSON_CATEGORIES).toHaveLength(6)
  })

  it('updates fields but preserves identity, ownership and original timestamp', async () => {
    const created = await lessonsLearnedService.create('p1', input)
    const updated = await lessonsLearnedService.update('p1', created.id, {
      ...input,
      title: 'Handoff checklist',
      category: 'planning',
      id: 'forged-id',
      createdAt: '1999-01-01T00:00:00.000Z',
    })
    expect(updated.id).toBe(created.id)
    expect(updated.projectId).toBe('p1')
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.title).toBe('Handoff checklist')
    expect(updated.category).toBe('planning')
  })

  it('isolates list, detail, update and deletion by project', async () => {
    const first = await lessonsLearnedService.create('p1', input)
    const second = await lessonsLearnedService.create('p2', { ...input, title: 'Second project' })
    expect(await lessonsLearnedService.list('p2')).toEqual([second])
    expect(await lessonsLearnedService.getById('p2', first.id)).toBeNull()
    await expect(lessonsLearnedService.update('p2', first.id, input))
      .rejects.toThrow('Lesson not found.')
    await expect(lessonsLearnedService.remove('p2', first.id))
      .rejects.toThrow('Lesson not found.')
    expect(await lessonsLearnedService.list('p1')).toEqual([first])
    expect(await lessonsLearnedService.list('p2')).toEqual([second])
    await lessonsLearnedService.remove('p1', first.id)
    expect(await lessonsLearnedService.list('p1')).toEqual([])
    expect(await lessonsLearnedService.list('p2')).toEqual([second])
  })

  it('allows archived project reads but blocks all archived writes', async () => {
    const lesson = await lessonsLearnedService.create('p1', input)
    storageAdapter.write('projects', [
      { id: 'p1', archivedAt: '2026-10-14T10:00:00.000Z' }, ...projects.slice(1),
    ])
    expect(await lessonsLearnedService.list('p1')).toEqual([lesson])
    expect(await lessonsLearnedService.getById('p1', lesson.id)).toEqual(lesson)
    await expect(lessonsLearnedService.create('p1', input)).rejects.toThrow(/read-only/)
    await expect(lessonsLearnedService.update('p1', lesson.id, input)).rejects.toThrow(/read-only/)
    await expect(lessonsLearnedService.remove('p1', lesson.id)).rejects.toThrow(/read-only/)
    expect(await lessonsLearnedService.list('p1')).toEqual([lesson])
  })

  it('rejects unknown projects and forged project ownership', async () => {
    await expect(lessonsLearnedService.create('missing', input)).rejects.toThrow('Project not found.')
    await expect(lessonsLearnedService.list('missing')).rejects.toThrow('Project not found.')
    await expect(lessonsLearnedService.create('p1', { ...input, projectId: 'p2' }))
      .rejects.toThrow('Lesson belongs to another project.')
    expect(lessonsLearnedService.getSnapshot()).toBeNull()
  })

  it('validates required content and categories without persisting invalid data', async () => {
    await expect(lessonsLearnedService.create('p1', { ...input, category: 'unknown' }))
      .rejects.toThrow('Choose a valid lesson category.')
    for (const field of ['title', 'situation', 'lesson', 'recommendation']) {
      await expect(lessonsLearnedService.create('p1', { ...input, [field]: '   ' }))
        .rejects.toThrow(`${field} is required.`)
    }
    await expect(lessonsLearnedService.create('p1', null))
      .rejects.toBeInstanceOf(LessonsLearnedServiceError)
    expect(storageAdapter.read('lessonsLearned')).toBeNull()
  })

  it('requires at least two trimmed characters on create and update', async () => {
    for (const field of ['title', 'situation', 'lesson', 'recommendation']) {
      await expect(lessonsLearnedService.create('p1', { ...input, [field]: ' x ' }))
        .rejects.toThrow(`${field} must be at least 2 characters.`)
    }
    expect(storageAdapter.read('lessonsLearned')).toBeNull()

    const shortButValid = {
      ...input,
      title: ' AB ',
      situation: ' CD ',
      lesson: ' EF ',
      recommendation: ' GH ',
    }
    const saved = await lessonsLearnedService.create('p1', shortButValid)
    expect(saved).toMatchObject({ title: 'AB', situation: 'CD', lesson: 'EF', recommendation: 'GH' })
    for (const field of ['title', 'situation', 'lesson', 'recommendation']) {
      await expect(lessonsLearnedService.update('p1', saved.id, { ...input, [field]: ' y ' }))
        .rejects.toThrow(`${field} must be at least 2 characters.`)
    }
    expect(await lessonsLearnedService.getById('p1', saved.id)).toEqual(saved)
  })

  it('detects invalid persisted collections rather than resetting them', async () => {
    storageAdapter.write('lessonsLearned', { invalid: true })
    expect(() => lessonsLearnedService.getSnapshot()).toThrow(LessonsLearnedServiceError)
    await expect(lessonsLearnedService.list('p1')).rejects.toThrow(LessonsLearnedServiceError)
  })
})
