import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { GlobalReportsPage } from './GlobalReportsPage.jsx'

const projects = [
  { id: 'active', name: 'Atlas Modernization', archivedAt: null },
  { id: 'archived', name: 'Orion Launch', archivedAt: '2026-10-10T12:00:00Z' },
]
const baseReports = [
  { id: 'current-final', projectId: 'active', periodEnd: '2026-10-11', periodStart: '2026-10-05', status: 'final', version: 3, updatedAt: '2026-10-12T10:00:00Z', owner: 'Alex Morgan', archivedAt: null },
  { id: 'current-draft', projectId: 'active', periodEnd: '2026-10-04', periodStart: '2026-09-28', status: 'draft', version: 1, updatedAt: '2026-10-05T10:00:00Z', owner: 'Dana Lee', archivedAt: null },
  { id: 'report-archived', projectId: 'active', periodEnd: '2026-09-27', periodStart: '2026-09-21', status: 'final', version: 2, updatedAt: '2026-09-28T10:00:00Z', owner: 'Alex Morgan', archivedAt: '2026-09-29T10:00:00Z' },
  { id: 'project-archived', projectId: 'archived', periodEnd: '2026-10-18', periodStart: '2026-10-12', status: 'final', version: 1, updatedAt: '2026-10-18T10:00:00Z', owner: 'Chris Jones', archivedAt: null },
  { id: 'orphan', projectId: 'missing', periodEnd: '2026-10-25', periodStart: '2026-10-19', status: 'final', version: 1, updatedAt: '2026-10-26T10:00:00Z', owner: 'Ghost', archivedAt: null },
]

function setup(reports = baseReports) {
  storageAdapter.write('projects', projects)
  storageAdapter.write('weeklyReports', reports)
  const store = createAppStore()
  const router = createMemoryRouter([
    { path: '/reports', element: <GlobalReportsPage /> },
    { path: '/projects/:projectId/reports/:reportId', element: <div>Project report destination</div> },
    { path: '/projects', element: <div>Projects index</div> },
  ], { initialEntries: ['/reports'] })
  render(<Provider store={store}><RouterProvider router={router} /></Provider>)
  return { router }
}

function expectKpi(name, value) {
  const summary = screen.getByLabelText('Portfolio report summary')
  expect(within(summary).getByText(name).parentElement).toHaveTextContent(String(value))
}

describe('GlobalReportsPage', () => {
  beforeEach(() => window.localStorage.clear())

  it('lists non-archived reports and opens the existing project report route', async () => {
    const user = userEvent.setup()
    const { router } = setup()
    expect(await screen.findByRole('heading', { name: 'Global Reports' })).toBeInTheDocument()
    expectKpi('Current reports', 2)
    expectKpi('Draft', 1)
    expectKpi('Final', 1)
    expectKpi('Archived reports', 1)
    expect(screen.queryByRole('button', { name: 'Open Weekly Status Report guide' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Open report/ })).toHaveLength(2)
    expect(screen.queryByText('Orion Launch')).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('link', { name: /Open report/ })[0])
    expect(router.state.location.pathname).toBe('/projects/active/reports/current-final')
  })

  it('shows owners, a non-clickable period and a separate unlabeled action column', async () => {
    const user = userEvent.setup()
    const { router } = setup()
    await screen.findByRole('heading', { name: 'Global Reports' })
    const register = screen.getByRole('region', { name: 'Portfolio reports' })
    expect(within(register).getByText('Dana Lee')).toBeInTheDocument()
    expect(within(register).getByText('Alex Morgan')).toBeInTheDocument()
    expect(within(register).queryByText('Action')).not.toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Dana')
    expect(within(register).getByText('Dana Lee')).toBeInTheDocument()
    expect(within(register).queryByText('Alex Morgan')).not.toBeInTheDocument()
    const reportingPeriod = within(register).getByText('Sep 28, 2026 – Oct 04, 2026')
    expect(reportingPeriod.closest('a')).toBeNull()
    expect(within(register).queryByText('Action')).not.toBeInTheDocument()
    const reportLink = within(register).getByRole('link', { name: 'Open report' })
    await user.click(reportLink)
    expect(router.state.location.pathname).toBe('/projects/active/reports/current-draft')
  })

  it('keeps the lifecycle switcher next to the filter heading', async () => {
    setup()
    await screen.findByRole('heading', { name: 'Global Reports' })
    const filterPanel = screen.getByRole('region', { name: 'Filters' })
    const title = within(filterPanel).getByRole('heading', { name: 'Filters' })
    const lifecycle = within(filterPanel).getByRole('group', { name: 'Report lifecycle' })
    expect(title.parentElement.parentElement).toContainElement(lifecycle)
  })

  it('switches lifecycle independently from project archival', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('heading', { name: 'Global Reports' })
    await user.click(screen.getByRole('button', { name: /Archived 1/ }))
    expect(screen.getAllByRole('link', { name: /Open report/ })).toHaveLength(1)
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeDisabled()
    expectKpi('Current reports', 2)
    await user.click(screen.getByRole('checkbox', { name: 'Include archived projects' }))
    expectKpi('Current reports', 3)
    await user.click(screen.getByRole('button', { name: /Current 3/ }))
    expect(within(screen.getByRole('region', { name: 'Portfolio reports' })).getByText('Orion Launch (Archived)')).toBeInTheDocument()
  })

  it('combines filters, displays no matches, and resets without altering KPI counts', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('heading', { name: 'Global Reports' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'draft')
    expect(screen.getAllByRole('link', { name: /Open report/ })).toHaveLength(1)
    expectKpi('Final', 1)
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'unmatched')
    expect(screen.getByText('No reports match these filters.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getAllByRole('link', { name: /Open report/ })).toHaveLength(2)
  })

  it('paginates only beyond ten records and keeps page in bounds after filtering', async () => {
    const user = userEvent.setup()
    const reports = Array.from({ length: 11 }, (_, index) => ({
      ...baseReports[0], id: `sample-${index}`, periodEnd: `2026-10-${String(index + 1).padStart(2, '0')}`,
    }))
    setup(reports)
    await screen.findByRole('heading', { name: 'Global Reports' })
    expect(screen.getAllByRole('link', { name: /Open report/ })).toHaveLength(10)
    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(screen.getAllByRole('link', { name: /Open report/ })).toHaveLength(1)
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'nothing')
    expect(screen.queryByRole('navigation', { name: 'Portfolio reports pagination' })).not.toBeInTheDocument()
  })

  it('shows a lifecycle-specific empty state instead of a misleading filter error', async () => {
    const user = userEvent.setup()
    setup([baseReports[0]])
    await screen.findByRole('heading', { name: 'Global Reports' })
    await user.click(screen.getByRole('button', { name: /Archived 0/ }))
    expect(screen.getByText('No archived reports in this scope.')).toBeInTheDocument()
  })

  it('shows a discoverability empty state when no reports are available', async () => {
    setup([])
    expect(await screen.findByText('No portfolio reports yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse projects' })).toHaveAttribute('href', '/projects')
  })
})
