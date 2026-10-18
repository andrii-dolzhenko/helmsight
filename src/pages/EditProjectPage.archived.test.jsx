import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore } from '../app/store/store.js'
import { storageAdapter } from '../shared/services/storage/storageAdapter.js'
import { EditProjectPage } from './EditProjectPage.jsx'

function renderDirectEditRoute() {
  const router = createMemoryRouter(
    [
      { path: '/projects/:projectId/edit', element: <EditProjectPage /> },
      { path: '/projects/:projectId', element: <p>Project overview</p> },
    ],
    { initialEntries: ['/projects/archived-project/edit'] },
  )

  return render(
    <Provider store={createAppStore()}>
      <RouterProvider router={router} />
    </Provider>,
  )
}

const archivedProject = {
  id: 'archived-project',
  name: 'Historical Delivery',
  description: 'Preserved historical project.',
  clientContext: 'Northstar Telecom',
  startDate: '2026-01-10',
  targetEndDate: '2026-07-20',
  status: 'active',
  archivedAt: '2026-10-06T12:00:00.000Z',
  createdAt: '2026-01-01T09:00:00.000Z',
  updatedAt: '2026-10-06T12:00:00.000Z',
}

describe('EditProjectPage archive protection', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows a read-only state instead of an edit form on a direct archived-project URL', async () => {
    storageAdapter.write('projects', [archivedProject])
    renderDirectEditRoute()

    expect(await screen.findByText('This project is archived.')).toBeInTheDocument()
    expect(screen.getByText('Restore the project before editing its details.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/project name/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to project' })).toHaveAttribute(
      'href', '/projects/archived-project',
    )
  })

  it('permits editing when the same project has been restored', async () => {
    storageAdapter.write('projects', [{ ...archivedProject, archivedAt: null }])
    renderDirectEditRoute()

    expect(await screen.findByRole('heading', { name: 'Edit project' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    expect(screen.queryByText('This project is archived.')).not.toBeInTheDocument()
  })
})
