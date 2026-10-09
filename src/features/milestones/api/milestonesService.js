import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { normalizeProgress } from '../lib/milestones.js'

const MILESTONES_STORAGE_KEY = 'milestones'

const DEMO_MILESTONES = Object.freeze([
  {
    id: 'demo-milestone-design-system',
    projectId: 'demo-project',
    title: 'Design system rollout',
    description: 'Release the shared component library and migrate the primary delivery surfaces.',
    targetDate: '2026-10-18',
    status: 'inProgress',
    progress: 72,
    createdAt: '2026-09-05T10:00:00.000Z',
    updatedAt: '2026-10-06T12:00:00.000Z',
  },
  {
    id: 'demo-milestone-migration',
    projectId: 'demo-project',
    title: 'Data migration pilot',
    description: 'Complete the pilot migration and validate reconciliation before the production wave.',
    targetDate: '2026-11-04',
    status: 'inProgress',
    progress: 45,
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-10-05T11:00:00.000Z',
  },
  {
    id: 'demo-milestone-reporting',
    projectId: 'demo-project',
    title: 'Executive reporting baseline',
    description: 'Approve the first delivery-health reporting pack and operating cadence.',
    targetDate: '2026-09-30',
    status: 'completed',
    progress: 100,
    createdAt: '2026-08-28T10:00:00.000Z',
    updatedAt: '2026-09-30T16:00:00.000Z',
  },
])

export class MilestonesServiceError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'MilestonesServiceError'
  }
}

function cloneDemoMilestones() {
  return DEMO_MILESTONES.map((milestone) => ({ ...milestone }))
}

function readMilestones() {
  const storedMilestones = storageAdapter.read(MILESTONES_STORAGE_KEY)

  if (storedMilestones === null) {
    const demoMilestones = cloneDemoMilestones()
    storageAdapter.write(MILESTONES_STORAGE_KEY, demoMilestones)
    return demoMilestones
  }

  if (!Array.isArray(storedMilestones)) {
    throw new MilestonesServiceError('Saved milestone data is invalid. Reset local data and try again.')
  }

  return storedMilestones
}

function writeMilestones(milestones) {
  storageAdapter.write(MILESTONES_STORAGE_KEY, milestones)
  return milestones
}

function normalizeMilestoneInput(input) {
  const progress = normalizeProgress(input.progress)
  if (progress === null) {
    throw new MilestonesServiceError('Progress must be a number from 0 to 100.')
  }

  return {
    projectId: input.projectId,
    title: input.title.trim(),
    description: input.description.trim(),
    targetDate: input.targetDate,
    status: input.status,
    progress: input.status === 'completed' ? 100 : progress,
  }
}

function ensureMilestone(milestones, milestoneId) {
  const index = milestones.findIndex((milestone) => milestone.id === milestoneId)
  if (index === -1) throw new MilestonesServiceError('Milestone not found.')
  return index
}

export const milestonesService = {
  getSnapshot() {
    const storedMilestones = storageAdapter.read(MILESTONES_STORAGE_KEY)
    if (storedMilestones === null) return null
    if (!Array.isArray(storedMilestones)) {
      throw new MilestonesServiceError('Saved milestone data is invalid. Reset local data and try again.')
    }
    return storedMilestones
  },

  async list() {
    return readMilestones()
  },

  async create(input) {
    const milestones = readMilestones()
    const timestamp = new Date().toISOString()
    const milestone = {
      id: globalThis.crypto.randomUUID(),
      ...normalizeMilestoneInput(input),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    writeMilestones([milestone, ...milestones])
    return milestone
  },

  async update(milestoneId, input) {
    const milestones = readMilestones()
    const index = ensureMilestone(milestones, milestoneId)
    const updatedMilestone = {
      ...milestones[index],
      ...normalizeMilestoneInput(input),
      updatedAt: new Date().toISOString(),
    }
    const nextMilestones = [...milestones]
    nextMilestones[index] = updatedMilestone
    writeMilestones(nextMilestones)
    return updatedMilestone
  },

  async remove(milestoneId) {
    const milestones = readMilestones()
    ensureMilestone(milestones, milestoneId)
    writeMilestones(milestones.filter((milestone) => milestone.id !== milestoneId))
    return milestoneId
  },
}
