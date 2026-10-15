import { describe, expect, it } from 'vitest'
import { deriveGlobalReportsView, REPORT_SORT } from './globalReports.js'

const projects = [
  { id: 'active', name: 'Atlas', archivedAt: null },
  { id: 'archived', name: 'Orion', archivedAt: '2026-10-10T10:00:00Z' },
]
const reports = [
  { id: 'final-new', projectId: 'active', owner: 'Alex Morgan', status: 'final', periodEnd: '2026-10-11', updatedAt: '2026-10-13T10:00:00Z', archivedAt: null },
  { id: 'draft-old', projectId: 'active', owner: 'Dana Lee', status: 'draft', periodEnd: '2026-09-27', updatedAt: '2026-10-14T10:00:00Z', archivedAt: null },
  { id: 'final-archived', projectId: 'active', owner: 'Alex Morgan', status: 'final', periodEnd: '2026-09-20', updatedAt: '2026-10-10T10:00:00Z', archivedAt: '2026-10-11T10:00:00Z' },
  { id: 'project-archived', projectId: 'archived', owner: 'Chris Jones', status: 'final', periodEnd: '2026-10-04', updatedAt: '2026-10-15T10:00:00Z', archivedAt: null },
  { id: 'orphan', projectId: 'removed', owner: 'Ghost', status: 'final', periodEnd: '2026-10-20', updatedAt: '2026-10-15T10:00:00Z', archivedAt: null },
]
const derive = (overrides = {}) => deriveGlobalReportsView({ projects, reports, ...overrides })

describe('Global Reports portfolio derivation', () => {
  it('excludes archived projects and orphan records by default', () => {
    const result = derive()
    expect(result.visibleReports.map((report) => report.id)).toEqual(['final-new', 'draft-old'])
    expect(result.scopedCount).toBe(3)
    expect(result.summary).toEqual({ current: 2, draft: 1, final: 1, archived: 1 })
    expect(result.projectById.has('removed')).toBe(false)
  })

  it('keeps all four KPIs independent of register filters and lifecycle', () => {
    const result = derive({ lifecycle: 'archived', query: 'alex', status: 'draft', period: '2026-10' })
    expect(result.summary).toEqual({ current: 2, draft: 1, final: 1, archived: 1 })
    expect(result.visibleReports).toEqual([])
  })

  it('distinguishes archival of a project from archival of a report', () => {
    const view = derive({ includeArchivedProjects: true })
    expect(view.summary).toEqual({ current: 3, draft: 1, final: 2, archived: 1 })
    expect(view.visibleReports.map((report) => report.id)).toContain('project-archived')
    expect(derive({ lifecycle: 'archived' }).visibleReports.map((report) => report.id)).toEqual(['final-archived'])
  })

  it('scopes KPI counts to the selected project, including archived scope', () => {
    expect(derive({ includeArchivedProjects: true, projectId: 'archived' }).summary)
      .toEqual({ current: 1, draft: 0, final: 1, archived: 0 })
    expect(derive({ projectId: 'archived' }).summary)
      .toEqual({ current: 0, draft: 0, final: 0, archived: 0 })
  })

  it('combines project/owner search, status and month-of-period-end filters', () => {
    expect(derive({ query: 'aLeX', status: 'final', period: '2026-10' }).visibleReports.map((report) => report.id))
      .toEqual(['final-new'])
    expect(derive({ query: 'Dana', period: '2026-09' }).visibleReports.map((report) => report.id))
      .toEqual(['draft-old'])
    expect(derive({ query: 'absent' }).visibleReports).toEqual([])
    expect(derive().periods).toEqual(['2026-10', '2026-09'])
  })

  it('sorts newest period, oldest period and recently updated deterministically', () => {
    expect(derive().visibleReports.map((report) => report.id)).toEqual(['final-new', 'draft-old'])
    expect(derive({ sort: REPORT_SORT.OLDEST }).visibleReports.map((report) => report.id)).toEqual(['draft-old', 'final-new'])
    expect(derive({ sort: REPORT_SORT.RECENTLY_UPDATED }).visibleReports.map((report) => report.id)).toEqual(['draft-old', 'final-new'])
  })

  it('handles empty collections and missing optional text', () => {
    expect(derive({ projects: [], reports: [] }).summary).toEqual({ current: 0, draft: 0, final: 0, archived: 0 })
    expect(derive({ reports: [{ id: 'untitled', projectId: 'active', status: 'draft' }], query: 'no owner' }).visibleReports).toEqual([])
  })
})
