import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { SuccessCriterionForm } from './SuccessCriterionForm.jsx'

describe('SuccessCriterionForm', () => {
  it('rejects manual percentage values outside the 0-100 range', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <MemoryRouter>
        <SuccessCriterionForm
          submitLabel="Create criterion"
          cancelTo="/projects/demo-project/success-criteria"
          onSubmit={onSubmit}
        />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText(/^title/i), 'Adoption target')
    fireEvent.change(screen.getByLabelText(/^baseline/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/current value/i), { target: { value: '101' } })
    fireEvent.change(screen.getByLabelText(/^target\s*\*?$/i), { target: { value: '80' } })
    fireEvent.change(screen.getByLabelText(/target date/i), {
      target: { value: '2026-12-31' },
    })

    await user.click(screen.getByRole('button', { name: /create criterion/i }))

    expect(await screen.findByText(/current value must be 100 or less/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('validates a one-character title on blur and clears the error while correcting it', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SuccessCriterionForm
          submitLabel="Create criterion"
          cancelTo="/projects/demo-project/success-criteria"
          onSubmit={vi.fn()}
        />
      </MemoryRouter>,
    )

    const title = screen.getByLabelText(/^title/i)
    await user.type(title, 'f')
    await user.tab()

    expect(await screen.findByText(/use at least 2 characters/i)).toBeInTheDocument()

    await user.click(title)
    await user.type(title, 'o')

    await waitFor(() => {
      expect(screen.queryByText(/use at least 2 characters/i)).not.toBeInTheDocument()
    })
  })

  it('explains financial baseline and target labels while calculating ROI live', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <SuccessCriterionForm
          submitLabel="Create criterion"
          cancelTo="/projects/demo-project/success-criteria"
          onSubmit={vi.fn()}
        />
      </MemoryRouter>,
    )

    await user.selectOptions(screen.getByLabelText(/metric type/i), 'roi')

    expect(screen.getByLabelText(/^baseline roi/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^target roi/i)).toBeInTheDocument()
    expect(screen.getByText(/approved business case or project baseline/i)).toBeInTheDocument()
    expect(screen.getByText(/business case, benefits plan, or sponsor commitment/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/financial benefit/i), {
      target: { value: '1500000' },
    })
    fireEvent.change(screen.getByLabelText(/investment cost/i), {
      target: { value: '1000000' },
    })

    expect(screen.getByText('50%')).toBeInTheDocument()
  })

})
