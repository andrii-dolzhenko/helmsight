import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog.jsx'

describe('ConfirmDialog', () => {
  it('cancels with Escape and confirms with the primary action', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    const { rerender } = render(
      <ConfirmDialog
        isOpen
        title="Leave without saving?"
        message="Unsaved changes will be discarded."
        confirmLabel="Discard changes"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)

    rerender(
      <ConfirmDialog
        isOpen
        title="Leave without saving?"
        message="Unsaved changes will be discarded."
        confirmLabel="Discard changes"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: /discard changes/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
