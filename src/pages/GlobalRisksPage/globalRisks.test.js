import { describe, expect, it } from 'vitest'
import { deriveGlobalRisksView, getRiskAttention, RISK_SORT } from './globalRisks.js'

const today = new Date(2026, 9, 15)
const projects = [{ id: 'a', name: 'Atlas', archivedAt: null }, { id: 'b', name: 'Orion', archivedAt: '2026-10-01T00:00:00Z' }]
const risks = [
  { id: 'high', projectId: 'a', title: 'Schedule', owner: 'Alex', probability: 4, impact: 4, status: 'open', dueDate: '2026-10-14', updatedAt: '2026-10-09' },
  { id: 'low', projectId: 'a', title: 'Vendor', owner: 'Dana', probability: 2, impact: 2, status: 'monitoring', dueDate: '2026-10-29', updatedAt: '2026-10-13' },
  { id: 'closed', projectId: 'a', title: 'Completed', owner: 'Dana', probability: 5, impact: 5, status: 'closed', dueDate: '2026-10-10', updatedAt: '2026-10-10' },
  { id: 'noDate', projectId: 'a', title: 'Unknown', owner: 'Alex', probability: 3, impact: 3, status: 'mitigated', updatedAt: '2026-10-08' },
  { id: 'archived', projectId: 'b', title: 'Legacy', owner: 'Sam', probability: 5, impact: 5, status: 'open', dueDate: '2026-10-16' },
  { id: 'orphan', projectId: 'missing', title: 'Orphan', owner: 'Ghost', probability: 5, impact: 5, status: 'open' },
]
const derive = (options = {}) => deriveGlobalRisksView({ projects, risks, today, ...options })
describe('Global Risks portfolio projection', () => {
  it('excludes archived projects and orphan risks by default', () => {
    expect(derive().visibleRisks.map((r) => r.id)).not.toContain('archived')
    expect(derive().visibleRisks.map((r) => r.id)).not.toContain('orphan')
    expect(derive().summary).toEqual({ active: 3, critical: 1, attention: 2, closed: 1 })
  })
  it('keeps KPI counts independent from register-only filters', () => {
    expect(derive({ query: 'nobody', status: 'closed', severity: 'low', attention: 'noDue' }).summary).toEqual(derive().summary)
    expect(derive({ query: 'nobody' }).visibleRisks).toEqual([])
  })
  it('includes archived project records only when requested', () => {
    expect(derive({ includeArchivedProjects: true }).summary).toEqual({ active: 4, critical: 2, attention: 3, closed: 1 })
    expect(derive({ includeArchivedProjects: true, projectId: 'b' }).visibleRisks.map((r) => r.id)).toEqual(['archived'])
  })
  it('composes owner/project search, severity, status and attention', () => {
    expect(derive({ query: 'alex', status: 'open', severity: 'high', attention: 'overdue' }).visibleRisks.map((r) => r.id)).toEqual(['high'])
    expect(derive({ attention: 'noDue' }).visibleRisks.map((r) => r.id)).toEqual(['noDate'])
    expect(derive({ query: 'atlas', status: 'closed' }).visibleRisks.map((r) => r.id)).toEqual(['closed'])
  })
  it('treats today and day 14 as due soon; closed deadlines are not attention', () => {
    expect(getRiskAttention({ status: 'open', dueDate: '2026-10-15' }, today)).toBe('dueSoon')
    expect(getRiskAttention({ status: 'open', dueDate: '2026-10-29' }, today)).toBe('dueSoon')
    expect(getRiskAttention({ status: 'open', dueDate: '2026-10-30' }, today)).toBe('onTrack')
    expect(getRiskAttention({ status: 'closed', dueDate: '2026-10-14' }, today)).toBe('closed')
  })
  it('orders active risk exposure first and supports due/recent sorting', () => {
    expect(derive().visibleRisks.map((r) => r.id)).toEqual(['high', 'noDate', 'low', 'closed'])
    expect(derive({ sort: RISK_SORT.DUE }).visibleRisks[0].id).toBe('closed')
    expect(derive({ sort: RISK_SORT.RECENT }).visibleRisks[0].id).toBe('low')
  })
})
