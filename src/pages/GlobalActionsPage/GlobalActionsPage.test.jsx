import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { GlobalActionsPage } from './GlobalActionsPage.jsx'

const projects = [
  {
    id: 'active',
    name: 'Active Delivery',
    status: 'active',
    archivedAt: null,
  },
  {
    id: 'archived',
    name: 'Archived Delivery',
    status: 'active',
    archivedAt: '2026-10-01T12:00:00.000Z',
  },
]

const actions = [
  {
    id: 'overdue',
    projectId: 'active',
    title: 'Confirm regulatory handoff',
    description: 'Confirm evidence ownership.',
    owner: 'Maya Chen',
    dueDate: '2000-01-01',
    priority: 'critical',
    status: 'notStarted',
    source: 'risk',
  },
  {
    id: 'finished',
    projectId: 'active',
    title: 'Publish reporting cadence',
    description: '',
    owner: 'Jordan Lee',
    dueDate: '2000-01-02',
    priority: 'medium',
    status: 'done',
    source: 'statusReport',
  },
  {
    id: 'archived-action',
    projectId: 'archived',
    title: 'Archive the retrospective',
    description: '',
    owner: 'Sam Taylor',
    dueDate: '2099-01-01',
    priority: 'high',
    status: 'inProgress',
    source: 'meeting',
  },
  {
    id: 'orphan',
    projectId: 'missing',
    title: 'Orphan action',
    description: '',
    owner: 'Missing Owner',
    dueDate: '2000-01-01',
    priority: 'critical',
    status: 'notStarted',
    source: 'manual',
  },
]

function renderGlobalActions() {
  const store = createAppStore()
  const router = createMemoryRouter([
    {
      path: '/actions',
      element: <GlobalActionsPage />,
    },
    {
      path: '/projects/:projectId/actions',
      element: <div>Project Action Register destination</div>,
    },
  ], { initialEntries: ['/actions'] })

  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )

  return { router }
}

function expectMetric(label, value) {
  const summary = screen.getByLabelText('Portfolio action summary')
  expect(within(summary).getByText(label).parentElement).toHaveTextContent(
    String(value),
  )
}

describe('GlobalActionsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    storageAdapter.write('projects', projects)
    storageAdapter.write('managementActions', actions)
  })

  it('shows active-project actions, accurate metrics and contextual navigation', async () => {
    const user = userEvent.setup()
    const { router } = renderGlobalActions()

    expect(await screen.findByText('Confirm regulatory handoff')).toBeInTheDocument()
    expect(screen.getByText('Publish reporting cadence')).toBeInTheDocument()
    expect(screen.queryByText('Archive the retrospective')).not.toBeInTheDocument()
    expect(screen.queryByText('Orphan action')).not.toBeInTheDocument()

    expectMetric('Active', 1)
    expectMetric('Critical active', 1)
    expectMetric('Needs attention', 1)
    expectMetric('Done', 1)

    expect(screen.getByText('MC')).toBeInTheDocument()
    expect(screen.getByText('Maya Chen')).toBeInTheDocument()

    await user.click(screen.getAllByRole('link', { name: 'Open in project' })[0])

    expect(router.state.location.pathname).toBe('/projects/active/actions')
    expect(router.state.location.hash).toBe('#action-overdue')
  })

  it('combines filters without changing portfolio metrics and supports reset', async () => {
    const user = userEvent.setup()
    renderGlobalActions()

    await screen.findByText('Confirm regulatory handoff')

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      'done',
    )

    expect(screen.getByText('Publish reporting cadence')).toBeInTheDocument()
    expect(screen.queryByText('Confirm regulatory handoff')).not.toBeInTheDocument()
    expectMetric('Active', 1)
    expectMetric('Done', 1)

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Priority' }),
      'critical',
    )

    expect(screen.getByText('No actions match these filters.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(screen.getByText('Confirm regulatory handoff')).toBeInTheDocument()
    expect(screen.getByText('Publish reporting cadence')).toBeInTheDocument()
  })

  it('includes archived projects on demand and scopes metrics by project', async () => {
    const user = userEvent.setup()
    renderGlobalActions()

    await screen.findByText('Confirm regulatory handoff')

    const archivedToggle = screen.getByRole('checkbox', {
      name: 'Include archived projects',
    })

    await user.click(archivedToggle)

    expect(screen.getByText('Archive the retrospective')).toBeInTheDocument()
    expect(
      screen.getByText('Archive the retrospective').closest('li'),
    ).toHaveTextContent('Archived Delivery (Archived)')
    expectMetric('Active', 2)
    expectMetric('Done', 1)

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Project' }),
      'archived',
    )

    expectMetric('Active', 1)
    expectMetric('Critical active', 0)
    expectMetric('Done', 0)
    expect(screen.queryByText('Confirm regulatory handoff')).not.toBeInTheDocument()

    await user.click(archivedToggle)

    expect(screen.queryByText('Archive the retrospective')).not.toBeInTheDocument()
    expect(screen.getByText('Confirm regulatory handoff')).toBeInTheDocument()
  })

  function buildPaginatedActions(count) {
    return Array.from({ length: count }, (_, index) => ({
      id: `page-action-${index + 1}`,
      projectId: 'active',
      title: `Page action ${index + 1}`,
      description: '',
      owner: 'Maya Chen',
      dueDate: `2099-01-${String(index + 1).padStart(2, '0')}`,
      priority: index === 0 ? 'critical' : 'low',
      status: index === count - 1 ? 'done' : 'notStarted',
      source: 'manual',
    }))
  }

  it('hides pagination when exactly ten actions exist', async () => {
    storageAdapter.write('managementActions', buildPaginatedActions(10))
    renderGlobalActions()

    expect(await screen.findByText('Page action 1')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Open in project' })).toHaveLength(10)

    expect(screen.queryByRole('navigation', {
      name: 'Portfolio actions pagination',
    })).not.toBeInTheDocument()

    expectMetric('Active', 9)
    expectMetric('Critical active', 1)
    expectMetric('Done', 1)
  })

  it('paginates eleven actions and resets to page one after filtering', async () => {
    const user = userEvent.setup()
    storageAdapter.write('managementActions', buildPaginatedActions(11))
    renderGlobalActions()

    expect(await screen.findByText('Page action 1')).toBeInTheDocument()
    expect(screen.queryByText('Page action 11')).not.toBeInTheDocument()

    const pagination = screen.getByRole('navigation', {
      name: 'Portfolio actions pagination',
    })

    expect(pagination).toHaveTextContent('Showing 1–10 of 11 actions')
    expect(screen.getAllByRole('link', { name: 'Open in project' })).toHaveLength(10)
    expect(within(pagination).getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(within(pagination).getByRole('button', { name: 'Page 1' }))
      .toHaveAttribute('aria-current', 'page')

    expectMetric('Active', 10)
    expectMetric('Critical active', 1)
    expectMetric('Done', 1)

    await user.click(within(pagination).getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Page action 11')).toBeInTheDocument()
    expect(screen.queryByText('Page action 1')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Open in project' })).toHaveLength(1)
    expect(pagination).toHaveTextContent('Showing 11–11 of 11 actions')
    expect(within(pagination).getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(within(pagination).getByRole('button', { name: 'Page 2' }))
      .toHaveAttribute('aria-current', 'page')

    expectMetric('Active', 10)
    expectMetric('Done', 1)

    await user.click(within(pagination).getByRole('button', { name: 'Previous' }))

    expect(screen.getByText('Page action 1')).toBeInTheDocument()
    expect(screen.queryByText('Page action 11')).not.toBeInTheDocument()

    await user.click(within(pagination).getByRole('button', { name: 'Page 2' }))

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      'done',
    )

    expect(screen.getByText('Page action 11')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', {
      name: 'Portfolio actions pagination',
    })).not.toBeInTheDocument()

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      'all',
    )

    expect(screen.getByText('Page action 1')).toBeInTheDocument()
    expect(screen.queryByText('Page action 11')).not.toBeInTheDocument()
    expect(within(screen.getByRole('navigation', {
      name: 'Portfolio actions pagination',
    })).getByRole('button', { name: 'Page 1' }))
      .toHaveAttribute('aria-current', 'page')

    expectMetric('Active', 10)
    expectMetric('Done', 1)
  })

})
