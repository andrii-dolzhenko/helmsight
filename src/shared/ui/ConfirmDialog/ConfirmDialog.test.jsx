import { fireEvent, render, screen } from '@testing-library/react'
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
  it('blocks confirmation until explicitly enabled', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    const renderDialog = (confirmDisabled) => (
      <ConfirmDialog
        isOpen
        title="Delete project?"
        message="This action cannot be undone."
        confirmLabel="Delete permanently"
        confirmDisabled={confirmDisabled}
        onCancel={onCancel}
        onConfirm={onConfirm}
      >
        <label htmlFor="confirmation-name">Project name</label>
        <input id="confirmation-name" />
      </ConfirmDialog>
    )

    const { rerender } = render(renderDialog(true))
    const confirmButton = screen.getByRole('button', {
      name: 'Delete permanently',
    })

    expect(screen.getByRole('textbox', {
      name: 'Project name',
    })).toBeInTheDocument()

    expect(confirmButton).toBeDisabled()

    await user.click(confirmButton)
    expect(onConfirm).not.toHaveBeenCalled()

    rerender(renderDialog(false))

    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('prevents confirmation and closing while pending', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    const renderDialog = (isPending) => (
      <ConfirmDialog
        isOpen
        isPending={isPending}
        title="Delete project?"
        message="This action cannot be undone."
        confirmLabel="Delete permanently"
        cancelLabel="Cancel"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    )

    const { rerender } = render(renderDialog(true))
    const dialog = screen.getByRole('alertdialog')

    const confirmButton = screen.getByRole('button', {
      name: 'Delete permanently',
    })
    const cancelButton = screen.getByRole('button', {
      name: 'Cancel',
    })
    const closeButton = screen.getByRole('button', {
      name: 'Close dialog',
    })

    expect(dialog).toHaveAttribute('aria-busy', 'true')
    expect(confirmButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()
    expect(closeButton).toBeDisabled()

    await user.keyboard('{Escape}')
    fireEvent.mouseDown(dialog.parentElement)

    await user.click(confirmButton)
    await user.click(cancelButton)
    await user.click(closeButton)

    expect(onCancel).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()

    rerender(renderDialog(false))

    expect(dialog).toHaveAttribute('aria-busy', 'false')
    expect(confirmButton).toBeEnabled()
    expect(cancelButton).toBeEnabled()
    expect(closeButton).toBeEnabled()

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })


  it('keeps focus inside the dialog while deletion is pending', async () => {
    const user = userEvent.setup()

    const renderDialog = (isPending) => (
      <ConfirmDialog
        isOpen
        isPending={isPending}
        title="Delete project?"
        message="This action cannot be undone."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      >
        <input aria-label="Project name" disabled={isPending} />
      </ConfirmDialog>
    )

    const { rerender } = render(renderDialog(false))
    const dialog = screen.getByRole('alertdialog')
    const input = screen.getByRole('textbox', {
      name: 'Project name',
    })

    input.focus()
    expect(input).toHaveFocus()

    rerender(renderDialog(true))

    expect(dialog).toHaveAttribute('aria-busy', 'true')
    expect(dialog).toHaveFocus()

    await user.tab()
    expect(dialog).toHaveFocus()
  })

})
