import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'

const KEY = 'notifications:state:v1'
const CLEANUP_DAYS = 7
const EMPTY = Object.freeze({ version: 1, records: {} })

export function reconcileNotificationRecords(records, activeIds, now = new Date()) {
  const active = new Set(activeIds)
  const next = {}
  const nowMs = now.getTime()
  for (const [id, record] of Object.entries(records)) {
    if (active.has(id)) {
      // A previously resolved condition became active again: treat it as a new episode.
      next[id] = record.removedAt ? { read: false, dismissed: false } : record
    } else {
      const removedAt = record.removedAt ?? now.toISOString()
      if (nowMs - new Date(removedAt).getTime() < CLEANUP_DAYS * 86400000) {
        next[id] = { ...record, removedAt }
      }
    }
  }
  for (const id of active) {
    if (!(id in next)) next[id] = { read: false, dismissed: false }
  }
  return next
}

function get() {
  const stored = storageAdapter.read(KEY)
  if (stored === null) return EMPTY
  if (!stored || stored.version !== 1 || !stored.records ||
      typeof stored.records !== 'object' || Array.isArray(stored.records)) {
    throw new Error('Saved notification preferences cannot be read.')
  }
  return stored
}

function save(records) {
  return storageAdapter.write(KEY, { version: 1, records }).records
}

export const notificationService = {
  getRecords() { return get().records },
  reconcile(ids, now = new Date()) {
    const before = get().records
    const after = reconcileNotificationRecords(before, ids, now)
    return JSON.stringify(before) === JSON.stringify(after) ? before : save(after)
  },
  markRead(ids) {
    const before = get().records
    const records = { ...before }
    for (const id of ids) {
      if (records[id] && !records[id].dismissed) records[id] = { ...records[id], read: true }
    }
    return save(records)
  },
  dismiss(id) {
    const records = { ...get().records }
    if (records[id]) records[id] = { ...records[id], dismissed: true, read: true }
    return save(records)
  },
}
