import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'

const PROJECT_DRAFT_TYPES = [
  'risk',
  'milestone',
  'successCriterion',
  'management-action',
  'evm-snapshot',
  'meeting-note',
  'weekly-report',
  'lesson-learned',
]

export function collectProjectDraftKeys(projectId) {
  const exactKeys = new Set([
    `draft:project:${projectId}:edit`,
    `draft:evm-baseline:${projectId}`,
  ])

  const prefixes = PROJECT_DRAFT_TYPES.map(
    (type) => `draft:${type}:${projectId}:`,
  )

  return storageAdapter.listKeys('draft:').filter(
    (key) =>
      exactKeys.has(key) ||
      prefixes.some((prefix) => key.startsWith(prefix)),
  )
}
