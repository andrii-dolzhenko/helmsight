import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { ProjectsPage } from './ProjectsPage.jsx'

function renderProjectsPage(initialEntry = '/projects') {
  const store = createAppStore()

  const router = createMemoryRouter([
    {
      path: '/projects',
      element: <ProjectsPage />,
    },
  ], { initialEntries: [initialEntry] })

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )
}

describe('ProjectsPage view modes', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.scrollTo = vi.fn()
  })

  it('switches to list view and persists the presentation preference', async () => {
    const user = userEvent.setup()
    renderProjectsPage()

    await screen.findByText('Atlas Modernization')
    const newProjectLink = screen.getByRole('link', { name: /new project/i })
    expect(newProjectLink).toHaveAttribute('data-ui-button', 'primary')
    const titleRow = newProjectLink.closest('[data-ui-page-title-row]')
    expect(titleRow).toContainElement(screen.getByRole('heading', { name: 'Projects' }))
    expect(titleRow.closest('[data-ui-page-header]')).toHaveTextContent('Keep delivery context')

    const listButton = screen.getByRole('button', { name: /list view/i })
    await user.click(listButton)

    await waitFor(() => {
      expect(listButton).toHaveAttribute('aria-pressed', 'true')
    })

    expect(storageAdapter.read('preferences')).toMatchObject({
      projectsViewMode: 'list',
    })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows historical archive metadata without operational health', async () => {
    const user = userEvent.setup()
    storageAdapter.write('projects', [
      {
        id: 'archived-project',
        name: 'Archived Delivery',
        description: 'Preserved delivery context.',
        clientContext: 'Northstar Telecom',
        startDate: '2026-01-10',
        targetEndDate: '2026-07-20',
        status: 'active',
        archivedAt: '2026-10-06T12:00:00.000Z',
        createdAt: '2026-01-01T09:00:00.000Z',
        updatedAt: '2026-10-06T12:00:00.000Z',
      },
    ])

    renderProjectsPage()

    const archivedTab = await screen.findByRole('tab', { name: /archived/i })
    await user.click(archivedTab)

    const panel = screen.getByRole('tabpanel', { name: /archived/i })
    expect(within(panel).getByText('Archived Delivery')).toBeInTheDocument()

    expect(within(panel).queryByText(/awaiting control data/i)).not.toBeInTheDocument()
    expect(within(panel).getAllByText('Archived')).toHaveLength(2)
  })

  it('keeps the Archived lifecycle view on reload through the URL state', async () => {
    storageAdapter.write('projects', [
      {
        id: 'archived-project',
        name: 'Archived Delivery',
        description: 'Preserved delivery context.',
        clientContext: 'Northstar Telecom',
        startDate: '2026-01-10',
        targetEndDate: '2026-07-20',
        status: 'active',
        archivedAt: '2026-10-06T12:00:00.000Z',
        createdAt: '2026-01-01T09:00:00.000Z',
        updatedAt: '2026-10-06T12:00:00.000Z',
      },
    ])

    renderProjectsPage('/projects?view=archived')

    const archivedTab = await screen.findByRole('tab', { name: /archived/i })
    expect(archivedTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: /archived/i })).toHaveTextContent(
      'Archived Delivery',
    )
  })

  it('returns the hero action to Active projects before scrolling to the portfolio', async () => {
    const user = userEvent.setup()
    storageAdapter.write('projects', [
      {
        id: 'archived-project',
        name: 'Archived Delivery',
        description: 'Preserved delivery context.',
        clientContext: 'Northstar Telecom',
        startDate: '2026-01-10',
        targetEndDate: '2026-07-20',
        status: 'active',
        archivedAt: '2026-10-06T12:00:00.000Z',
        createdAt: '2026-01-01T09:00:00.000Z',
        updatedAt: '2026-10-06T12:00:00.000Z',
      },
    ])

    renderProjectsPage('/projects?view=archived')

    const archivedTab = await screen.findByRole('tab', { name: /archived/i })
    expect(archivedTab).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('button', { name: /view projects/i }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /active/i })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' }),
    )
  })

  it('derives active portfolio health from canonical project-control data', async () => {
    renderProjectsPage()

    await screen.findByText('Atlas Modernization')

    expect(await screen.findByText('Health · Needs attention')).toBeInTheDocument()
    expect(screen.queryByText(/awaiting control data/i)).not.toBeInTheDocument()
  })

})
