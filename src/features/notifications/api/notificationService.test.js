import { beforeEach, describe, expect, it } from 'vitest'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { notificationService, reconcileNotificationRecords } from './notificationService.js'

beforeEach(() => { window.localStorage.clear() })

describe('Header Notifications persistence', () => {
  it('stores read/dismiss state without persisting project content and restores it on revisit', () => {
    const now = new Date('2026-10-15T12:00:00Z')
    notificationService.reconcile(['risk:p:1:critical', 'lab:2026-10-15'], now)
    notificationService.markRead(['risk:p:1:critical'])
    notificationService.dismiss('lab:2026-10-15')
    expect(notificationService.getRecords()['risk:p:1:critical']).toMatchObject({ read: true, dismissed: false })
    expect(notificationService.getRecords()['lab:2026-10-15']).toMatchObject({ read: true, dismissed: true })
    expect(JSON.stringify(storageAdapter.read('notifications:state:v1'))).not.toContain('Atlas')
    notificationService.reconcile(['risk:p:1:critical', 'lab:2026-10-15'], now)
    expect(notificationService.getRecords()['risk:p:1:critical'].read).toBe(true)
  })
  it('keeps unresolved active state beyond seven days, prunes resolved metadata after seven days', () => {
    const start = new Date('2026-10-01T12:00:00Z')
    const weekLater = new Date('2026-10-15T12:00:00Z')
    const active = { a: { read: true, dismissed: true }, b: { read: true, dismissed: false } }
    const afterWeek = reconcileNotificationRecords(active, ['a'], weekLater)
    expect(afterWeek.a).toMatchObject({ read: true, dismissed: true })
    expect(afterWeek.b.removedAt).toBe(weekLater.toISOString())
    expect(reconcileNotificationRecords(afterWeek, ['a'], new Date('2026-10-22T12:00:01Z'))).toEqual({ a: active.a })
    expect(reconcileNotificationRecords({ a: { ...active.a, removedAt: start.toISOString() } }, ['a'], weekLater).a)
      .toEqual({ read: false, dismissed: false })
  })
  it('does not silently discard malformed preferences', () => {
    storageAdapter.write('notifications:state:v1', { version: 3 })
    expect(() => notificationService.getRecords()).toThrow(/cannot be read/)
  })
})
