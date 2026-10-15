import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { GlobalRisksPage } from './GlobalRisksPage.jsx'

const projects = [{ id: 'project-1', name: 'Atlas', archivedAt: null }]
const risks = [
  { id: 'dated', projectId: 'project-1', title: 'Vendor risk', owner: 'Alex Morgan', status: 'open', probability: 4, impact: 4, dueDate: '2026-11-01' },
  { id: 'undated', projectId: 'project-1', title: 'Undated risk', owner: 'Dana Lee', status: 'open', probability: 2, impact: 3, dueDate: '' },
]

function renderPage() {
  storageAdapter.write('projects', projects)
  storageAdapter.write('risks', risks)
  const router = createMemoryRouter([{ path: '/risks', element: <GlobalRisksPage /> }], { initialEntries: ['/risks'] })
  render(<Provider store={createAppStore()}><RouterProvider router={router} /></Provider>)
}

describe('GlobalRisksPage HTML semantics', () => {
  beforeEach(() => window.localStorage.clear())

  it('labels its KPI group and uses valid machine-readable dates only for scheduled risks', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Global Risks' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Portfolio risk summary' })).toBeInTheDocument()

    const datedRow = screen.getByText('Vendor risk').closest('li')
    const due = within(datedRow).getByText('Nov 01, 2026')
    expect(due.tagName).toBe('TIME')
    expect(due).toHaveAttribute('dateTime', '2026-11-01')

    const undatedRow = screen.getByText('Undated risk').closest('li')
    expect(within(undatedRow).getByText('No due date').tagName).toBe('SPAN')
    expect(undatedRow.querySelector('time')).toBeNull()
    expect(document.querySelector('time:not([datetime])')).toBeNull()
  })
})
