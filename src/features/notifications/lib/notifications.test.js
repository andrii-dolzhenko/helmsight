import { describe, expect, it } from 'vitest'
import { deriveNotifications, unreadCount, visibleNotifications } from './notifications.js'

const today = new Date(2026, 9, 15, 12)
const project = { id: 'p 1', name: 'Atlas', archivedAt: null }

function source(overrides = {}) {
  return {
    projects: [project, { id: 'archived', name: 'Old', archivedAt: '2026-10-01' }],
    risks: [
      { id: 'critical', projectId: 'p 1', status: 'open', severity: 'critical', title: 'Dependency' },
      { id: 'old', projectId: 'archived', status: 'open', severity: 'critical', title: 'Old risk' },
      { id: 'high', projectId: 'p 1', status: 'open', severity: 'high', title: 'High risk' },
      { id: 'closed', projectId: 'p 1', status: 'closed', severity: 'critical', title: 'Closed risk' },
    ],
    actions: [{ id: 'late', projectId: 'p 1', title: 'Review', status: 'inProgress', dueDate: '2026-10-14' }],
    milestones: [{ id: 'gate', projectId: 'p 1', title: 'Release', status: 'planned', targetDate: '2026-10-14' }],
    dailySession: { phase: 'question' }, today,
    ...overrides,
  }
}

describe('derived Header Notifications', () => {
  it('includes the daily lab, critical operational risk, overdue action and milestone with actionable links', () => {
    const alerts = deriveNotifications(source())
    expect(alerts.map((alert) => alert.type)).toEqual(['lab', 'risk', 'action', 'milestone'])
    expect(alerts[1].href).toBe('/projects/p%201/risks/critical')
    expect(alerts[2].href).toBe('/projects/p%201/actions#action-late')
    expect(alerts[3].href).toBe('/projects/p%201/milestones#milestone-gate')
    expect(alerts[0].id).toBe('lab:2026-10-15')
  })
  it('excludes completed lab, archived project items and resolved or future conditions', () => {
    const alerts = deriveNotifications(source({
      dailySession: { phase: 'complete' },
      risks: [{ id: 'closed', projectId: 'p 1', status: 'closed', severity: 'critical' }],
      actions: [{ id: 'future', projectId: 'p 1', status: 'notStarted', dueDate: '2026-11-01' }],
      milestones: [{ id: 'done', projectId: 'p 1', status: 'completed', targetDate: '2026-10-01' }],
    }))
    expect(alerts).toEqual([])
  })
  it('keeps read alerts in All but not Unread, and removes dismissed items from both', () => {
    const alerts = deriveNotifications(source())
    const records = { [alerts[0].id]: { read: true }, [alerts[1].id]: { dismissed: true } }
    expect(visibleNotifications(alerts, records)).toHaveLength(3)
    expect(unreadCount(alerts, records)).toBe(2)
    expect(visibleNotifications(alerts, records, true)).toHaveLength(2)
  })
  it('does not create daily duplicates and changes the reminder id after the local calendar rollover', () => {
    const first = deriveNotifications(source())
    const sameDay = deriveNotifications(source({ today: new Date(2026, 9, 15, 23, 59) }))
    const tomorrow = deriveNotifications(source({ today: new Date(2026, 9, 16, 0, 1) }))
    expect(sameDay[0].id).toBe(first[0].id)
    expect(tomorrow[0].id).not.toBe(first[0].id)
  })
})
