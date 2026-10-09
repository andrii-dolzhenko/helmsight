import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { EvmBaselineForm } from './EvmBaselineForm.jsx'

describe('EvmBaselineForm', () => {
  it('switches the complete form unit when the measurement basis changes', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><EvmBaselineForm draftKey="test-evm-baseline" cancelTo="/metrics" onSubmit={vi.fn()} /></MemoryRouter>)

    await user.selectOptions(screen.getByLabelText(/measurement basis/i), 'currency')
    expect(screen.getByLabelText(/^currency/i)).toHaveValue('USD')
    expect(screen.getByText(/baseline value \(USD\)/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/measurement basis/i), 'storyPoints')
    expect(screen.getByText(/baseline value \(SP\)/i)).toBeInTheDocument()
    expect(screen.getByText(/cost forecasts are not calculated/i)).toBeInTheDocument()
  })
})
