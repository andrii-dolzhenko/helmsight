import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'

const STORAGE_KEY = 'managementActions'

const DEMO_ACTIONS = Object.freeze([
  {
    id: 'demo-action-regulatory-pack',
    projectId: 'demo-project',
    title: 'Confirm regulatory evidence pack owner',
    description: 'Assign final accountability for the evidence pack and confirm the review handoff date.',
    owner: 'Maya Chen',
    dueDate: '2026-10-10',
    priority: 'critical',
    status: 'notStarted',
    source: 'risk',
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-06T10:30:00.000Z',
  },
  {
    id: 'demo-action-migration-window',
    projectId: 'demo-project',
    title: 'Approve migration pilot support window',
    description: 'Confirm operations coverage for the pilot migration and publish the escalation contacts.',
    owner: 'Jordan Lee',
    dueDate: '2026-10-15',
    priority: 'high',
    status: 'inProgress',
    source: 'meeting',
    createdAt: '2026-09-28T09:00:00.000Z',
    updatedAt: '2026-10-05T14:10:00.000Z',
  },
  {
    id: 'demo-action-report-pack',
    projectId: 'demo-project',
    title: 'Publish executive reporting cadence',
    description: 'Share the approved weekly reporting calendar with sponsors and workstream leads.',
    owner: 'Alex Morgan',
    dueDate: '2026-10-02',
    priority: 'medium',
    status: 'done',
    source: 'statusReport',
    createdAt: '2026-09-20T09:00:00.000Z',
    updatedAt: '2026-10-02T16:00:00.000Z',
  },
])

export class ManagementActionsServiceError extends Error {
  constructor(message, options = {}) {
    super(message, options)
    this.name = 'ManagementActionsServiceError'
  }
}

function migrateLegacyStatuses(actions) {
  let changed = false
  const next = actions.map((action) => {
    if (action.status !== 'open') return action
    changed = true
    return { ...action, status: 'notStarted' }
  })

  if (changed) storageAdapter.write(STORAGE_KEY, next)
  return next
}

function readActions() {
  const stored = storageAdapter.read(STORAGE_KEY)
  if (stored === null) {
    const demo = DEMO_ACTIONS.map((item) => ({ ...item }))
    storageAdapter.write(STORAGE_KEY, demo)
    return demo
  }
  if (!Array.isArray(stored)) throw new ManagementActionsServiceError('Saved management action data is invalid. Reset local data and try again.')
  return migrateLegacyStatuses(stored)
}

function writeActions(actions) {
  storageAdapter.write(STORAGE_KEY, actions)
  return actions
}

function normalizeInput(input) {
  return {
    projectId: input.projectId,
    title: input.title.trim(),
    description: input.description.trim(),
    owner: input.owner.trim(),
    dueDate: input.dueDate,
    priority: input.priority,
    status: input.status === 'open' ? 'notStarted' : input.status,
    source: input.source,
  }
}

function ensureAction(actions, actionId) {
  const index = actions.findIndex((action) => action.id === actionId)
  if (index === -1) throw new ManagementActionsServiceError('Management action not found.')
  return index
}

export const managementActionsService = {
  getSnapshot() {
    const stored = storageAdapter.read(STORAGE_KEY)
    if (stored === null) return null
    if (!Array.isArray(stored)) throw new ManagementActionsServiceError('Saved management action data is invalid. Reset local data and try again.')
    return migrateLegacyStatuses(stored)
  },
  async list() {
    return readActions()
  },
  async create(input) {
    const actions = readActions()
    const timestamp = new Date().toISOString()
    const action = {
      id: globalThis.crypto.randomUUID(),
      ...normalizeInput(input),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    writeActions([action, ...actions])
    return action
  },
  async update(actionId, input) {
    const actions = readActions()
    const index = ensureAction(actions, actionId)
    const updated = {
      ...actions[index],
      ...normalizeInput(input),
      updatedAt: new Date().toISOString(),
    }
    const next = [...actions]
    next[index] = updated
    writeActions(next)
    return updated
  },
  async remove(actionId) {
    const actions = readActions()
    ensureAction(actions, actionId)
    writeActions(actions.filter((action) => action.id !== actionId))
    return actionId
  },
}
