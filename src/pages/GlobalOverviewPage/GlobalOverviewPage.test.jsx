import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { GlobalOverviewPage } from './GlobalOverviewPage.jsx'

function renderOverview() {
  const store = createAppStore()
  const router = createMemoryRouter([{ path: '/overview', element: <GlobalOverviewPage /> }], { initialEntries: ['/overview'] })
  return render(<Provider store={store}><RouterProvider router={router} /></Provider>)
}

describe('GlobalOverviewPage', () => {
  beforeEach(() => { window.localStorage.clear() })

  it('renders the transferred greeting and Daily Insight', async () => {
    renderOverview()
    expect(screen.getByRole('heading', { name: /Good (morning|afternoon|evening), Andrii\./ })).toBeInTheDocument()
    expect(screen.getByLabelText('Daily insight')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Priority signals' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /view projects/i })).not.toBeInTheDocument()
  })

  it('filters priority signals by source and restores the full queue', async () => {
    const user = userEvent.setup()
    storageAdapter.write('projects', [
      { id: 'delta', name: 'Delta Operations', status: 'active', archivedAt: null },
    ])
    storageAdapter.write('managementActions', [
      { id: 'overdue', projectId: 'delta', title: 'Approve overdue handoff', status: 'notStarted', priority: 'high', dueDate: '2000-01-01' },
    ])
    storageAdapter.write('risks', [
      { id: 'exposure', projectId: 'delta', title: 'Critical exposure', severity: 'critical', status: 'open' },
    ])
    renderOverview()
    expect(await screen.findByText('Approve overdue handoff')).toBeInTheDocument()
    const sources = screen.getByRole('group', { name: 'Filter signals by source' })
    await user.click(within(sources).getByRole('button', { name: /Actions/ }))
    expect(screen.getByText('Approve overdue handoff')).toBeInTheDocument()
    expect(screen.queryByText('Critical exposure')).not.toBeInTheDocument()
    expect(within(sources).getByRole('button', { name: /Actions/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /All sources/ }))
    expect(within(sources).getByRole('button', { name: /Actions/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not present fabricated zero metrics if an upstream source fails', async () => {
    storageAdapter.write('projects', [])
    storageAdapter.write('risks', { unexpected: true })
    renderOverview()
    expect(await screen.findByRole('alert')).toHaveTextContent('Portfolio intelligence is unavailable')
    expect(screen.queryByLabelText('Portfolio attention summary')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('offers a meaningful empty portfolio destination', async () => {
    storageAdapter.write('projects', [])
    renderOverview()
    expect(await screen.findByRole('heading', { name: 'No active projects yet' })).toBeInTheDocument()
    expect(within(screen.getByLabelText('Portfolio attention summary')).getByText('Projects affected').parentElement).toHaveTextContent('0')
    expect(screen.getByRole('link', { name: /Create a project/i })).toHaveAttribute('href', '/projects/new')
  })
})
