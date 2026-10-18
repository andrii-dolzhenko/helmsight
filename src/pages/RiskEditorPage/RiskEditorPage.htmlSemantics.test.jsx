import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { RiskEditorPage } from './RiskEditorPage.jsx'
import { RiskDetailPage } from '../RiskDetailPage/RiskDetailPage.jsx'

const project = { id: 'project-1', name: 'Test project', archivedAt: null }
const risk = {
  id: 'risk-1', projectId: 'project-1', title: 'Supplier capacity',
  description: 'Supplier capacity may fall below target.', probability: 3, impact: 4,
  score: 12, severity: 'high', owner: 'QA Owner', responseStrategy: 'mitigate',
  mitigation: 'Confirm an alternate supplier.', dueDate: '2026-11-01', status: 'open',
}

function renderRisk(path) {
  const router = createMemoryRouter([
    {
      path: '/projects/:projectId',
      element: <Outlet context={{ project }} />,
      children: [
        { path: 'risks/new', element: <RiskEditorPage /> },
        { path: 'risks/:riskId/edit', element: <RiskEditorPage /> },
        { path: 'risks/:riskId', element: <RiskDetailPage /> },
      ],
    },
  ], { initialEntries: [path] })
  render(<Provider store={createAppStore()}><RouterProvider router={router} /></Provider>)
}

describe('Focused risk route headings', () => {
  beforeEach(() => {
    window.localStorage.clear()
    storageAdapter.write('risks', [risk])
  })

  it('uses a page H1 for New risk in its focused layout', async () => {
    renderRisk('/projects/project-1/risks/new')
    expect(await screen.findByRole('heading', { level: 1, name: 'New risk' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create risk' })).toBeInTheDocument()
  })

  it('retains an H2 for Edit risk beneath the normal project heading', async () => {
    renderRisk('/projects/project-1/risks/risk-1/edit')
    expect(await screen.findByRole('heading', { level: 2, name: 'Edit risk' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Edit risk' })).toBeNull()
  })

  it('uses the risk title as H1 on the focused detail page', async () => {
    renderRisk('/projects/project-1/risks/risk-1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Supplier capacity' })).toBeInTheDocument()
  })
})
