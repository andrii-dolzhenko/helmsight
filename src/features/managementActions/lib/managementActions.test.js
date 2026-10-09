import { describe, expect, it } from 'vitest'
import {
  ACTION_ATTENTION,
  getActionAttentionState,
  getActionStatusLabel,
  sortActions,
} from './managementActions.js'

describe('management action presentation', () => {
  it('derives overdue, due soon, and done states', () => {
    const today = new Date('2026-10-07T12:00:00')
    expect(getActionAttentionState({ status: 'notStarted', dueDate: '2026-10-06' }, today)).toBe(ACTION_ATTENTION.OVERDUE)
    expect(getActionAttentionState({ status: 'inProgress', dueDate: '2026-10-12' }, today)).toBe(ACTION_ATTENTION.DUE_SOON)
    expect(getActionAttentionState({ status: 'done', dueDate: '2026-10-01' }, today)).toBe(ACTION_ATTENTION.DONE)
  })

  it('orders active work before done work and earlier due dates first', () => {
    const result = sortActions([
      { id: 'done', status: 'done', dueDate: '2026-10-01', priority: 'critical' },
      { id: 'later', status: 'notStarted', dueDate: '2026-10-20', priority: 'medium' },
      { id: 'sooner', status: 'inProgress', dueDate: '2026-10-10', priority: 'high' },
    ])
    expect(result.map((item) => item.id)).toEqual(['sooner', 'later', 'done'])
  })

  it('keeps the legacy open status readable during local data migration', () => {
    expect(getActionStatusLabel('open')).toBe('Not started')
  })
})
