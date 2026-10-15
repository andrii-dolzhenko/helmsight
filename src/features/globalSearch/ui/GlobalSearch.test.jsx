import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore } from '../../../app/store/store.js'
import { storageAdapter } from '../../../shared/services/storage/storageAdapter.js'
import { AppLayout } from '../../../layouts/AppLayout/AppLayout.jsx'

function renderWorkspace() {
  const store = createAppStore()
  const router = createMemoryRouter([{
    path: '/', element: <AppLayout />, children: [
      { path: 'overview', element: <h1>Overview screen</h1> },
      { path: 'projects/:projectId/risks/:riskId', element: <h1>Risk destination</h1> },
    ],
  }], { initialEntries: ['/overview'] })
  return render(<Provider store={store}><RouterProvider router={router} /></Provider>)
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    window.localStorage.clear()
    storageAdapter.write('projects', [
      { id: 'active', name: 'Atlas', archivedAt: null },
      { id: 'archived', name: 'Old Atlas', archivedAt: '2026-10-01T12:00:00Z' },
    ])
    storageAdapter.write('risks', [
      { id: 'vendor', projectId: 'active', title: 'Vendor delay', description: 'Approval handoff', status: 'open' },
      { id: 'old-risk', projectId: 'archived', title: 'Old sensitive risk', status: 'open' },
    ])
  })

  it('opens from the header, navigates by keyboard and stores a recent item', async () => {
    const user = userEvent.setup()
    const { container } = renderWorkspace()
    const topbar = container.querySelectorAll('header')[1]
    await user.click(within(topbar).getByRole('button', { name: 'Search portfolio' }))
    const dialog = screen.getByRole('dialog', { name: 'Search portfolio' })
    const input = within(dialog).getByRole('combobox', { name: 'Search across portfolio' })
    await user.type(input, 'Vendor')
    expect(await within(dialog).findByText('Vendor delay')).toBeInTheDocument()
    expect(within(dialog).queryByText('Old sensitive risk')).not.toBeInTheDocument()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(await screen.findByRole('heading', { name: 'Risk destination' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('helmsight:global-search-recent:v1'))).toEqual(['risks:vendor'])
  })

  it('lets the user clear local recent search history', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('helmsight:global-search-recent:v1', JSON.stringify(['risks:vendor']))
    const { container } = renderWorkspace()
    await user.click(within(container.querySelectorAll('header')[1]).getByRole('button', { name: 'Search portfolio' }))
    const dialog = screen.getByRole('dialog', { name: 'Search portfolio' })
    expect(await within(dialog).findByText('Vendor delay')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Clear recent' }))
    expect(window.localStorage.getItem('helmsight:global-search-recent:v1')).toBeNull()
    expect(within(dialog).queryByText('Vendor delay')).not.toBeInTheDocument()
  })

  it('closes on Escape and restores trigger focus', async () => {
    const user = userEvent.setup()
    const { container } = renderWorkspace()
    const trigger = within(container.querySelectorAll('header')[1]).getByRole('button', { name: 'Search portfolio' })
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Search portfolio' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
