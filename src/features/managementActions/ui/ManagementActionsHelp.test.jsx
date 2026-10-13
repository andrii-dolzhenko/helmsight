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

  it('opens the portfolio guide and preserves modal keyboard behavior', async () => {
    const user = userEvent.setup()
    render(<ManagementActionsHelp variant="portfolio" />)

    const trigger = screen.getByRole('button', {
      name: 'Open global actions guide',
    })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', 'global-actions-help-dialog')

    await user.click(trigger)

    const dialog = screen.getByRole('dialog', {
      name: 'Understanding Global Actions',
    })

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    for (const heading of [
      'Portfolio summary',
      'Status and priority',
      'Attention indicators',
      'Filters and archived projects',
      'Working with actions',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }

    const closeButton = screen.getByRole('button', {
      name: 'Close global actions guide',
    })

    expect(closeButton).toHaveFocus()

    await user.keyboard('{Tab}')
    expect(closeButton).toHaveFocus()

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(closeButton).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

})
