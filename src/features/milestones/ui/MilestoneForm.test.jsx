import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { MilestoneForm } from './MilestoneForm.jsx'

describe('MilestoneForm', () => {
  it('validates progress boundaries and auto-sets completed progress to 100', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <MilestoneForm
          draftKey="test-milestone"
          submitLabel="Create milestone"
          cancelTo="/projects/demo-project/milestones"
          onSubmit={vi.fn()}
        />
      </MemoryRouter>,
    )

    const progress = screen.getByLabelText(/progress/i)
    fireEvent.change(progress, { target: { value: '101' } })
    fireEvent.blur(progress)
    expect(await screen.findByText(/cannot exceed 100/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/status/i), 'completed')
    expect(progress).toHaveValue(100)
  })

  it('keeps milestone status synchronized with progress', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <MilestoneForm
          draftKey="test-milestone-status-sync"
          submitLabel="Create milestone"
          cancelTo="/projects/demo-project/milestones"
          onSubmit={vi.fn()}
        />
      </MemoryRouter>,
    )

    const status = screen.getByLabelText(/status/i)
    const progress = screen.getByLabelText(/progress/i)

    expect(status).toHaveValue('planned')

    await user.clear(progress)
    await user.type(progress, '35')
    expect(status).toHaveValue('inProgress')

    await user.selectOptions(status, 'completed')
    expect(status).toHaveValue('completed')
    expect(progress).toHaveValue(100)
  })
})
