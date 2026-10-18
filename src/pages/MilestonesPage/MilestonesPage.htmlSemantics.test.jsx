import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { MilestonesPage } from './MilestonesPage.jsx'

function renderMilestones() {
  const project = { id: 'project-1', name: 'Test project', archivedAt: null }
  const router = createMemoryRouter([
    {
      path: '/projects/:projectId',
      element: <Outlet context={{ project }} />,
      children: [{ path: 'milestones', element: <MilestonesPage /> }],
    },
  ], { initialEntries: ['/projects/project-1/milestones'] })
  render(<Provider store={createAppStore()}><RouterProvider router={router} /></Provider>)
}

describe('Milestones HTML semantics', () => {
  beforeEach(() => {
    window.localStorage.clear()
    storageAdapter.write('milestones', [
      {
        id: 'checkpoint-1', projectId: 'project-1', title: 'Ready for rollout',
        description: 'QA completed', targetDate: '2026-11-01', status: 'inProgress',
        progress: 72,
      },
    ])
  })

  it('exposes labelled milestone progress as a real progressbar', async () => {
    renderMilestones()
    const summary = await screen.findByRole('group', { name: 'Milestone summary' })
    expect(within(summary).getByText('Total milestones').parentElement).toHaveTextContent('1')
    const progress = screen.getByRole('progressbar', { name: 'Milestone completion' })
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(progress).toHaveAttribute('aria-valuenow', '72')
  })
})
