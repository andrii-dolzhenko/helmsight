import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ActionListRow } from './ActionsPage.jsx'

const action = {
  id: 'review-1',
  projectId: 'atlas',
  title: 'Review vendor dependencies',
  description: 'Prepare a review',
  owner: 'Alexandra Morgan',
  dueDate: '2026-10-22',
  status: 'inProgress',
  priority: 'high',
  source: 'manual',
}

describe('Action Register list rows', () => {
  it('exposes full metadata and an accessible delete action without changing confirmation ownership', () => {
    const onDelete = vi.fn()
    render(
      <MemoryRouter>
        <ActionListRow action={action} archived={false} disabled={false} onDelete={onDelete} onStatusChange={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Alexandra Morgan')).toHaveAttribute('title', 'Alexandra Morgan')
    expect(screen.getByText('In progress')).toHaveAttribute('title', 'In progress')
    expect(screen.getByText('Oct 22, 2026')).toHaveAttribute('title', 'Oct 22, 2026')
    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    expect(deleteButton).toHaveAttribute('title', 'Delete')
    expect(deleteButton.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    fireEvent.click(deleteButton)
    expect(onDelete).toHaveBeenCalledWith(action)
  })

  it('preserves disabled delete state while a mutation is pending', () => {
    const onDelete = vi.fn()
    render(
      <MemoryRouter>
        <ActionListRow action={action} archived={false} disabled onDelete={onDelete} onStatusChange={vi.fn()} />
      </MemoryRouter>,
    )
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(onDelete).not.toHaveBeenCalled()
  })
})
