import { projectsService } from '../../projects/api/projectsService.js'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'

const STORAGE_KEY = 'lessonsLearned'

export const LESSON_CATEGORIES = Object.freeze([
  { value: 'planning', label: 'Planning' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'communication', label: 'Communication' },
  { value: 'stakeholders', label: 'Stakeholders' },
  { value: 'riskManagement', label: 'Risk Management' },
  { value: 'other', label: 'Other' },
])

const VALID_CATEGORIES = new Set(LESSON_CATEGORIES.map((category) => category.value))
const REQUIRED_FIELDS = ['title', 'situation', 'lesson', 'recommendation']

export class LessonsLearnedServiceError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'LessonsLearnedServiceError'
  }
}

function readLessons() {
  const stored = storageAdapter.read(STORAGE_KEY)
  if (stored === null) return []
  if (!Array.isArray(stored)) {
    throw new LessonsLearnedServiceError('Saved lessons learned data is invalid. Reset local data and try again.')
  }
  return stored
}

async function ensureProject(projectId, requireEditable = false) {
  if (typeof projectId !== 'string' || !projectId.trim()) {
    throw new LessonsLearnedServiceError('Project is required.')
  }

  const project = await projectsService.getById(projectId)
  if (!project) throw new LessonsLearnedServiceError('Project not found.')
  if (requireEditable && project.archivedAt) {
    throw new LessonsLearnedServiceError('Lessons in archived projects are read-only.')
  }
  return project
}

function normalizeInput(input, projectId) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new LessonsLearnedServiceError('Lesson details are required.')
  }
  if (input.projectId !== undefined && input.projectId !== projectId) {
    throw new LessonsLearnedServiceError('Lesson belongs to another project.')
  }
  if (!VALID_CATEGORIES.has(input.category)) {
    throw new LessonsLearnedServiceError('Choose a valid lesson category.')
  }

  const fields = {}
  for (const field of REQUIRED_FIELDS) {
    const value = typeof input[field] === 'string' ? input[field].trim() : ''
    if (!value) throw new LessonsLearnedServiceError(`${field} is required.`)
    if (value.length < 2) {
      throw new LessonsLearnedServiceError(`${field} must be at least 2 characters.`)
    }
    fields[field] = value
  }
  return { ...fields, category: input.category }
}

function findOwnedLessonIndex(lessons, projectId, lessonId) {
  const index = lessons.findIndex(
    (item) => item.projectId === projectId && item.id === lessonId,
  )
  if (index === -1) throw new LessonsLearnedServiceError('Lesson not found.')
  return index
}

export const lessonsLearnedService = {
  getSnapshot() {
    const stored = storageAdapter.read(STORAGE_KEY)
    if (stored === null) return null
    if (!Array.isArray(stored)) {
      throw new LessonsLearnedServiceError('Saved lessons learned data is invalid. Reset local data and try again.')
    }
    return stored
  },

  async list(projectId) {
    await ensureProject(projectId)
    return readLessons().filter((item) => item.projectId === projectId)
  },

  async getById(projectId, lessonId) {
    await ensureProject(projectId)
    return readLessons().find(
      (item) => item.projectId === projectId && item.id === lessonId,
    ) ?? null
  },

  async create(projectId, input) {
    await ensureProject(projectId, true)
    const fields = normalizeInput(input, projectId)
    const lessons = readLessons()
    const timestamp = new Date().toISOString()
    const created = {
      id: globalThis.crypto.randomUUID(),
      projectId,
      ...fields,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    storageAdapter.write(STORAGE_KEY, [created, ...lessons])
    return created
  },

  async update(projectId, lessonId, input) {
    await ensureProject(projectId, true)
    const fields = normalizeInput(input, projectId)
    const lessons = readLessons()
    const index = findOwnedLessonIndex(lessons, projectId, lessonId)
    const updated = {
      ...lessons[index],
      ...fields,
      updatedAt: new Date().toISOString(),
    }
    const next = [...lessons]
    next[index] = updated
    storageAdapter.write(STORAGE_KEY, next)
    return updated
  },

  async remove(projectId, lessonId) {
    await ensureProject(projectId, true)
    const lessons = readLessons()
    const index = findOwnedLessonIndex(lessons, projectId, lessonId)
    storageAdapter.write(STORAGE_KEY, lessons.filter((_, itemIndex) => itemIndex !== index))
    return lessonId
  },
}
