import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ManagementActionsHelp } from './ManagementActionsHelp.jsx'

describe('ManagementActionsHelp', () => {
  it('opens and closes the guide with Escape', async () => {
    const user = userEvent.setup()
    render(<ManagementActionsHelp />)

    const trigger = screen.getByRole('button', { name: /open management action field guide/i })
    await user.click(trigger)

    expect(screen.getByRole('dialog', { name: /status and source context/i })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
