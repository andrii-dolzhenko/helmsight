import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { ReportsPage } from './ReportsPage.jsx'

const reports = [
  {
    id: 'current-report', projectId: 'project-1', periodStart: '2026-10-01',
    periodEnd: '2026-10-07', status: 'draft', version: 1,
    updatedAt: '2026-10-07T12:00:00.000Z', archivedAt: null,
  },
  {
    id: 'archived-report', projectId: 'project-1', periodStart: '2026-09-24',
    periodEnd: '2026-09-30', status: 'final', version: 2,
    updatedAt: '2026-10-01T12:00:00.000Z', archivedAt: '2026-10-02T12:00:00.000Z',
  },
]

function renderReports() {
  const project = { id: 'project-1', name: 'Test project', archivedAt: null }
  const router = createMemoryRouter([
    {
      path: '/projects/:projectId',
      element: <Outlet context={{ project }} />,
      children: [{ path: 'reports', element: <ReportsPage /> }],
    },
  ], { initialEntries: ['/projects/project-1/reports'] })
  render(<Provider store={createAppStore()}><RouterProvider router={router} /></Provider>)
}

describe('Reports history HTML semantics', () => {
  beforeEach(() => {
    window.localStorage.clear()
    storageAdapter.write('weeklyReports', reports)
    storageAdapter.write('weeklyReportsDemoSeedVersion', 2)
  })

  it('uses native pressed buttons to filter Current and Archived reports', async () => {
    const user = userEvent.setup()
    renderReports()
    const filters = await screen.findByRole('group', { name: 'Report history view' })
    const current = within(filters).getByRole('button', { name: /Current/ })
    const archived = within(filters).getByRole('button', { name: /Archived/ })

    expect(screen.queryByRole('tablist', { name: 'Report history view' })).toBeNull()
    expect(current).toHaveAttribute('aria-pressed', 'true')
    expect(archived).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Oct 01 – Oct 07, 2026')).toBeInTheDocument()

    await user.click(archived)
    expect(current).toHaveAttribute('aria-pressed', 'false')
    expect(archived).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Sep 24 – Sep 30, 2026')).toBeInTheDocument()
    expect(screen.queryByText('Oct 01 – Oct 07, 2026')).toBeNull()
  })
})
