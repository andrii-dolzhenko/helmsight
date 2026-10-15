import { ProjectsServiceError, projectsService } from './projectsService.js'
import { collectProjectDraftKeys } from './projectDeletionDraftKeys.js'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'

const JOURNAL_KEY = 'pendingProjectDeletion'
const DEMO_PROJECT_ID = 'demo-project'

const COLLECTION_KEYS = [
  'successCriteria',
  'risks',
  'milestones',
  'managementActions',
  'weeklyReports',
  'meetingNotes',
  'lessonsLearned',
]

const DRAFT_TYPES = [
  'risk',
  'milestone',
  'successCriterion',
  'management-action',
  'evm-snapshot',
  'meeting-note',
  'weekly-report',
  'lesson-learned',
]

function isOwnedDraftKey(key, projectId) {
  if (
    key === `draft:project:${projectId}:edit` ||
    key === `draft:evm-baseline:${projectId}`
  ) {
    return true
  }

  return DRAFT_TYPES.some((type) =>
    key.startsWith(`draft:${type}:${projectId}:`),
  )
}

function validateJournal(journal) {
  if (
    !journal ||
    journal.version !== 1 ||
    typeof journal.projectId !== 'string' ||
    !journal.projectId ||
    typeof journal.projectName !== 'string' ||
    !Array.isArray(journal.draftKeys) ||
    !journal.draftKeys.every((key) =>
      typeof key === 'string' &&
      isOwnedDraftKey(key, journal.projectId),
    ) ||
    new Set(journal.draftKeys).size !== journal.draftKeys.length ||
    typeof journal.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(journal.createdAt))
  ) {
    throw new ProjectsServiceError('Invalid pending project deletion journal.')
  }
}

function writeVerified(key, value) {
  storageAdapter.write(key, value)

  if (JSON.stringify(storageAdapter.read(key)) !== JSON.stringify(value)) {
    throw new ProjectsServiceError(`Failed to verify storage write: ${key}`)
  }
}

function removeVerified(key) {
  storageAdapter.remove(key)

  if (storageAdapter.read(key) !== null) {
    throw new ProjectsServiceError(`Failed to verify storage removal: ${key}`)
  }
}

function prepareDeletion(projectId) {
  const projects = storageAdapter.read('projects')

  if (!Array.isArray(projects)) {
    throw new ProjectsServiceError('Invalid stored projects data.')
  }

  const currentProject = projects.find((project) => project.id === projectId)

  if (currentProject && !currentProject.archivedAt) {
    throw new ProjectsServiceError(
      'Only archived projects can be permanently deleted.',
    )
  }

  const collectionWrites = []

  for (const key of COLLECTION_KEYS) {
    const records = storageAdapter.read(key)

    if (records === null) {
      continue
    }

    if (!Array.isArray(records)) {
      throw new ProjectsServiceError(`Invalid stored collection: ${key}`)
    }

    collectionWrites.push([
      key,
      records.filter((record) => record.projectId !== projectId),
    ])
  }

  const evmMetrics = storageAdapter.read('evmMetrics')

  if (evmMetrics !== null) {
    if (
      !evmMetrics ||
      typeof evmMetrics !== 'object' ||
      Array.isArray(evmMetrics) ||
      !Array.isArray(evmMetrics.baselines) ||
      !Array.isArray(evmMetrics.snapshots)
    ) {
      throw new ProjectsServiceError('Invalid stored EVM data.')
    }

    collectionWrites.push([
      'evmMetrics',
      {
        ...evmMetrics,
        baselines: evmMetrics.baselines.filter(
          (baseline) => baseline.projectId !== projectId,
        ),
        snapshots: evmMetrics.snapshots.filter(
          (snapshot) => snapshot.projectId !== projectId,
        ),
      },
    ])
  }

  return {
    collectionWrites,
    remainingProjects: projects.filter(
      (project) => project.id !== projectId,
    ),
  }
}

function completeDeletion(journal) {
  validateJournal(journal)

  if (journal.projectId === DEMO_PROJECT_ID) {
    writeVerified('deletedDemoProject:demo-project', true)
  }

  const plan = prepareDeletion(journal.projectId)

  for (const [key, value] of plan.collectionWrites) {
    writeVerified(key, value)
  }

  for (const key of journal.draftKeys) {
    removeVerified(key)
  }

  // Parent is deliberately deleted after all related data.
  writeVerified('projects', plan.remainingProjects)

  const verification = prepareDeletion(journal.projectId)

  if (
    verification.remainingProjects.length !==
    (storageAdapter.read('projects') || []).length
  ) {
    throw new ProjectsServiceError('Project deletion verification failed.')
  }

  for (const key of COLLECTION_KEYS) {
    const records = storageAdapter.read(key)

    if (records?.some((record) => record.projectId === journal.projectId)) {
      throw new ProjectsServiceError(`Project records remain in ${key}.`)
    }
  }

  const evmMetrics = storageAdapter.read('evmMetrics')

  if (
    evmMetrics?.baselines.some(
      (item) => item.projectId === journal.projectId,
    ) ||
    evmMetrics?.snapshots.some(
      (item) => item.projectId === journal.projectId,
    )
  ) {
    throw new ProjectsServiceError('Project EVM records remain.')
  }

  for (const key of journal.draftKeys) {
    if (storageAdapter.read(key) !== null) {
      throw new ProjectsServiceError(`Project draft remains: ${key}`)
    }
  }

  removeVerified(JOURNAL_KEY)
}

export const projectDeletionService = {
  async deleteArchivedProject({ projectId, confirmationName }) {
    if (storageAdapter.read(JOURNAL_KEY) !== null) {
      throw new ProjectsServiceError(
        'A previous project deletion requires recovery.',
      )
    }

    const project = await projectsService.getById(projectId)

    if (!project) {
      throw new ProjectsServiceError('Project not found.')
    }

    if (!project.archivedAt) {
      throw new ProjectsServiceError(
        'Only archived projects can be permanently deleted.',
      )
    }

    if (project.name !== confirmationName) {
      throw new ProjectsServiceError(
        'Enter the exact project name to confirm deletion.',
      )
    }

    // Read and validate all related collections before persisting intent.
    prepareDeletion(project.id)

    const journal = {
      version: 1,
      projectId: project.id,
      projectName: project.name,
      draftKeys: collectProjectDraftKeys(project.id),
      createdAt: new Date().toISOString(),
    }

    // No destructive operation may run before this write succeeds.
    writeVerified(JOURNAL_KEY, journal)

    completeDeletion(journal)
  },

  async recoverPendingDeletion() {
    const journal = storageAdapter.read(JOURNAL_KEY)

    if (journal === null) {
      return
    }

    validateJournal(journal)
    completeDeletion(journal)
  },
}
