import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ManagementActionForm } from './ManagementActionForm.jsx'

describe('ManagementActionForm', () => {
  it('validates required fields after interaction', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><ManagementActionForm draftKey="test-action" submitLabel="Create action" cancelTo="/actions" onSubmit={vi.fn()} /></MemoryRouter>)
    const title = screen.getByLabelText(/Title/)
    await user.click(title)
    await user.tab()
    expect(await screen.findByText('Title is required.')).toBeInTheDocument()
  })

  it('starts new actions in the not started lifecycle state', () => {
    render(<MemoryRouter><ManagementActionForm draftKey="test-action-status" submitLabel="Create action" cancelTo="/actions" onSubmit={vi.fn()} /></MemoryRouter>)
    expect(screen.getByLabelText(/Status/)).toHaveValue('notStarted')
  })
})
