import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { ProjectsPage } from './ProjectsPage.jsx'

const archivedProject = {
  id: 'archived-delivery',
  name: 'Archived Delivery',
  description: 'Historical delivery context.',
  clientContext: 'Northstar Telecom',
  startDate: '2026-01-10',
  targetEndDate: '2026-07-20',
  status: 'active',
  archivedAt: '2026-10-06T12:00:00.000Z',
  createdAt: '2026-01-01T09:00:00.000Z',
  updatedAt: '2026-10-06T12:00:00.000Z',
}

const activeProject = {
  ...archivedProject,
  id: 'active-delivery',
  name: 'Active Delivery',
  archivedAt: null,
}

function renderProjectsPage(initialEntry = '/projects') {
  const store = createAppStore()
  const router = createMemoryRouter(
    [{ path: '/projects', element: <ProjectsPage /> }],
    { initialEntries: [initialEntry] },
  )

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )
}

describe('ProjectsPage permanent deletion', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.scrollTo = vi.fn()
    storageAdapter.write('projects', [activeProject, archivedProject])
  })

  it('offers deletion only in Archived Grid and List with exact-name confirmation', async () => {
    const user = userEvent.setup()

    renderProjectsPage()

    await screen.findByText('Active Delivery')

    expect(
      screen.queryByRole('button', { name: 'Delete permanently' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /archived/i }))

    let panel = screen.getByRole('tabpanel', { name: /archived/i })

    expect(
      within(panel).getByRole('button', { name: 'Delete permanently' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /list view/i }))

    panel = screen.getByRole('tabpanel', { name: /archived/i })

    const deleteButton = within(panel).getByRole('button', {
      name: 'Delete permanently',
    })

    expect(deleteButton).toBeInTheDocument()

    await user.click(deleteButton)

    const dialog = screen.getByRole('alertdialog')
    const confirmationInput = within(dialog).getByRole('textbox')
    const confirmButton = within(dialog).getByRole('button', {
      name: 'Delete permanently',
    })

    expect(confirmButton).toBeDisabled()

    await user.type(confirmationInput, 'archived Delivery')
    expect(confirmButton).toBeDisabled()

    await user.clear(confirmationInput)
    await user.type(confirmationInput, 'Archived Delivery ')
    expect(confirmButton).toBeDisabled()

    await user.clear(confirmationInput)
    await user.type(confirmationInput, archivedProject.name)

    expect(confirmButton).toBeEnabled()

    await user.click(
      within(dialog).getByRole('button', { name: 'Keep project' }),
    )

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(storageAdapter.read('projects')).toEqual([
      activeProject,
      archivedProject,
    ])
  })

  it('rejects deletion when the persisted project is no longer archived', async () => {
    const user = userEvent.setup()

    renderProjectsPage('/projects?view=archived')

    await screen.findByText('Archived Delivery')

    await user.click(
      screen.getByRole('button', { name: 'Delete permanently' }),
    )

    const dialog = screen.getByRole('alertdialog')

    storageAdapter.write('projects', [
      activeProject,
      { ...archivedProject, archivedAt: null },
    ])

    await user.type(
      within(dialog).getByRole('textbox'),
      archivedProject.name,
    )

    await user.click(
      within(dialog).getByRole('button', { name: 'Delete permanently' }),
    )

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      /only archived projects can be permanently deleted/i,
    )

    expect(storageAdapter.read('projects')).toMatchObject([
      activeProject,
      { ...archivedProject, archivedAt: null },
    ])
    expect(storageAdapter.read('pendingProjectDeletion')).toBeNull()
  })
  it('shows the saved deletion toast only once', () => {
    const toastKey = 'helmsight:project-deleted-toast'
    window.sessionStorage.setItem(toastKey, '1')

    const { unmount } = renderProjectsPage('/projects?view=archived')

    expect(screen.getByRole('status')).toHaveTextContent(
      'Project deleted permanently.',
    )
    expect(window.sessionStorage.getItem(toastKey)).toBeNull()

    unmount()

    renderProjectsPage('/projects?view=archived')

    expect(
      screen.queryByText('Project deleted permanently.'),
    ).not.toBeInTheDocument()
  })

})
