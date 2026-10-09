import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SuccessCriteriaHelp } from './SuccessCriteriaHelp.jsx'

describe('SuccessCriteriaHelp', () => {
  it('opens and closes the guide with Escape', async () => {
    const user = userEvent.setup()
    render(<SuccessCriteriaHelp />)

    const trigger = screen.getByRole('button', { name: /open success criteria guide/i })
    await user.click(trigger)

    expect(screen.getByRole('dialog', { name: /measure the outcome/i })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
