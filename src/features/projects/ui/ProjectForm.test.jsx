import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ProjectForm } from './ProjectForm.jsx'

describe('ProjectForm', () => {
  it('blocks a target end date that is earlier than the project start date', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <MemoryRouter>
        <ProjectForm
          submitLabel="Create project"
          cancelTo="/projects"
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/project name/i), 'Client Portal')
    await user.type(screen.getByLabelText(/client \/ context/i), 'Acme Group')
    fireEvent.change(screen.getByLabelText(/^start date\s*\*?$/i), {
      target: { value: '2026-10-10' },
    })
    fireEvent.change(screen.getByLabelText(/target end date/i), {
      target: { value: '2026-10-01' },
    })
    await user.click(screen.getByRole('button', { name: /create project/i }))

    expect(
      await screen.findByText(/target end date must be on or after the start date/i),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

it('requires at least two characters for project identity fields', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()

  render(
    <MemoryRouter>
      <ProjectForm
        submitLabel="Create project"
        cancelTo="/projects"
        onSubmit={onSubmit}
      />
    </MemoryRouter>,
  )

  await user.type(screen.getByLabelText(/project name/i), 'A')
  await user.type(screen.getByLabelText(/client \/ context/i), 'B')
  fireEvent.change(screen.getByLabelText(/^start date\s*\*?$/i), {
    target: { value: '2026-10-10' },
  })
  fireEvent.change(screen.getByLabelText(/target end date/i), {
    target: { value: '2026-10-11' },
  })
  await user.click(screen.getByRole('button', { name: /create project/i }))

  expect(await screen.findAllByText(/use at least 2 characters/i)).toHaveLength(2)
  expect(onSubmit).not.toHaveBeenCalled()
})
