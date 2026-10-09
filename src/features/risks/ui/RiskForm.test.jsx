import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { RiskForm } from './RiskForm.jsx'

function renderForm() {
  const onSubmit = vi.fn()
  render(<MemoryRouter><RiskForm draftKey="risk:test:new" submitLabel="Create risk" cancelTo="/risks" onSubmit={onSubmit} /></MemoryRouter>)
  return { onSubmit }
}

describe('RiskForm', () => {
  it('calculates risk score live from probability and impact', () => {
    renderForm()
    fireEvent.change(screen.getByLabelText(/probability/i), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText(/impact/i), { target: { value: '5' } })
    expect(screen.getByText('20 / 25')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('validates a one-character owner after touch', async () => {
    const user = userEvent.setup()
    renderForm()
    const owner = screen.getByLabelText(/owner/i)
    await user.type(owner, 'A')
    await user.tab()
    expect(await screen.findByText(/use at least 2 characters/i)).toBeInTheDocument()
  })
})
