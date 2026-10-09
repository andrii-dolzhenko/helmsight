import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { EvmHelp } from './EvmHelp.jsx'

describe('EvmHelp', () => {
  it('explains the earning rule and formulas', async () => {
    const user = userEvent.setup()
    render(<EvmHelp />)
    await user.click(screen.getByRole('button', { name: /open evm guide/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Earned Value is not time spent')
    expect(screen.getByRole('dialog')).toHaveTextContent('CPI = EV / AC')
  })
})
