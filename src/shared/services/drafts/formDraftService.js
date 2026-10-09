import { storageAdapter } from '../storage/storageAdapter.js'

const DRAFT_PREFIX = 'draft'

function createDraftKey(key) {
  return `${DRAFT_PREFIX}:${key}`
}

export const formDraftService = {
  read(key) {
    return storageAdapter.read(createDraftKey(key))
  },

  write(key, values) {
    return storageAdapter.write(createDraftKey(key), {
      values,
      savedAt: new Date().toISOString(),
    })
  },

  remove(key) {
    storageAdapter.remove(createDraftKey(key))
  },
}
