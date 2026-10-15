import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { GlobalMetricsPage } from './GlobalMetricsPage.jsx'

const baseline = (projectId, measurementBasis = 'hours') => ({
  projectId, measurementBasis, currencyCode: 'USD',
  workPackages: [{ id: `wp-${projectId}`, startDate: '2026-10-01', endDate: '2026-10-01', budgetValue: 100 }],
})
const snapshot = (projectId, earnedValue, actualValue = 100) => ({
  id: `sp-${projectId}`, projectId, snapshotDate: '2026-10-02',
  entries: [{ packageId: `wp-${projectId}`, earnedValue, actualValue }],
})
function setup(extraProjects = []) {
  storageAdapter.write('projects', [
    { id: 'active', name: 'Atlas Modernization', archivedAt: null },
    { id: 'story', name: 'Storypoint Project', archivedAt: null },
    { id: 'none', name: 'Without metrics', archivedAt: null },
    { id: 'archived', name: 'Archived Project', archivedAt: '2026-10-05T10:00:00Z' },
    ...extraProjects,
  ])
  storageAdapter.write('evmMetrics', {
    baselines: [baseline('active'), baseline('story', 'storyPoints'), baseline('archived')],
    snapshots: [snapshot('active', 90), snapshot('story', 100), snapshot('archived', 100)],
  })
  const store = createAppStore()
  const router = createMemoryRouter([
    { path: '/metrics', element: <GlobalMetricsPage /> },
    { path: '/projects/:projectId/metrics', element: <div>Project metrics destination</div> },
    { path: '/projects', element: <div>Projects index</div> },
  ], { initialEntries: ['/metrics'] })
  render(<Provider store={store}><RouterProvider router={router} /></Provider>)
  return { router }
}

describe('GlobalMetricsPage', () => {
  beforeEach(() => window.localStorage.clear())

  it('shows real portfolio KPIs and opens project metrics, not an editor', async () => {
    const user = userEvent.setup()
    const { router } = setup()
    expect(await screen.findByRole('heading', { name: 'Global Metrics' })).toBeInTheDocument()
    const summary = screen.getByRole('group', { name: 'Portfolio EVM summary' })
    expect(within(summary).getByText('Reporting projects').parentElement).toHaveTextContent('2')
    expect(within(summary).getByText('Needs attention').parentElement).toHaveTextContent('1')
    expect(within(summary).getByText('Missing EVM data').parentElement).toHaveTextContent('1')
    const register = screen.getByRole('region', { name: 'Portfolio performance' })
    expect(within(register).getAllByRole('link', { name: /Open metrics/ })).toHaveLength(3)
    await user.click(within(register).getAllByRole('link', { name: /Open metrics/ })[0])
    expect(router.state.location.pathname).toBe('/projects/active/metrics')
  })

  it('exposes an explicit N/A for Story points CPI and does not invent missing indices', async () => {
    setup()
    await screen.findByRole('heading', { name: 'Global Metrics' })
    const rows = screen.getAllByRole('listitem')
    const story = rows.find((row) => within(row).queryByText('Storypoint Project'))
    const missing = rows.find((row) => within(row).queryByText('Without metrics'))
    expect(story).toHaveTextContent('N/A')
    expect(missing).toHaveTextContent('Missing data')
    expect(missing).toHaveTextContent('No snapshot')
  })

  it('keeps KPI scope stable when filtering and includes archived projects on demand', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('heading', { name: 'Global Metrics' })
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Atlas')
    const register = screen.getByRole('region', { name: 'Portfolio performance' })
    expect(within(register).getAllByRole('link', { name: /Open metrics/ })).toHaveLength(1)
    const summary = screen.getByRole('group', { name: 'Portfolio EVM summary' })
    expect(within(summary).getByText('Reporting projects').parentElement).toHaveTextContent('2')
    await user.click(screen.getByRole('checkbox', { name: 'Include archived projects' }))
    expect(within(summary).getByText('Reporting projects').parentElement).toHaveTextContent('3')
    await user.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(within(register).getAllByRole('link', { name: /Open metrics/ })).toHaveLength(3)
  })

  it('paginates 11 projects and resets to the first page when filtering', async () => {
    const user = userEvent.setup()
    setup(Array.from({ length: 11 }, (_, index) => ({ id: `extra-${index}`, name: `Extra ${index}`, archivedAt: null })))
    await screen.findByRole('heading', { name: 'Global Metrics' })
    expect(screen.getAllByRole('link', { name: /Open metrics/ })).toHaveLength(10)
    const pagination = screen.getByRole('navigation', { name: 'Portfolio metrics pagination' })
    expect(within(pagination).getByText('Showing 1–10 of 14 projects')).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(within(pagination).getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    await user.click(within(pagination).getByRole('button', { name: 'Next' }))
    expect(within(pagination).getByText('Showing 11–14 of 14 projects')).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
    expect(within(pagination).getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getAllByRole('link', { name: /Open metrics/ })).toHaveLength(4)
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Atlas')
    expect(screen.getAllByRole('link', { name: /Open metrics/ })).toHaveLength(1)
    expect(screen.queryByRole('navigation', { name: 'Portfolio metrics pagination' })).not.toBeInTheDocument()
  })

  it('shows compact page controls with ellipses for a large portfolio', async () => {
    const user = userEvent.setup()
    setup(Array.from({ length: 67 }, (_, index) => ({ id: `bulk-${index}`, name: `Bulk ${index}`, archivedAt: null })))
    await screen.findByRole('heading', { name: 'Global Metrics' })
    const pagination = screen.getByRole('navigation', { name: 'Portfolio metrics pagination' })
    expect(within(pagination).getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    expect(within(pagination).queryByRole('button', { name: 'Page 4' })).not.toBeInTheDocument()
    expect(within(pagination).getAllByText('…')).toHaveLength(1)
    await user.click(within(pagination).getByRole('button', { name: 'Page 7' }))
    expect(within(pagination).getByRole('button', { name: 'Page 7' })).toHaveAttribute('aria-current', 'page')
    expect(within(pagination).queryByRole('button', { name: 'Page 3' })).not.toBeInTheDocument()
    expect(within(pagination).getAllByText('…')).toHaveLength(1)
    expect(within(pagination).getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getAllByRole('link', { name: /Open metrics/ })).toHaveLength(10)
  })

  it('provides no-match and no-projects empty states', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('heading', { name: 'Global Metrics' })
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Unmatched')
    expect(screen.getByText('No projects match these filters.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.queryByText('No projects match these filters.')).not.toBeInTheDocument()
  })
})
