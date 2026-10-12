import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DeleteProjectDialog } from './DeleteProjectDialog.jsx'

const project = {
  id: 'project-1',
  name: 'Atlas Project',
  archivedAt: '2026-10-12T12:00:00.000Z',
}

describe('DeleteProjectDialog', () => {
  it('requires the exact project name, including case and whitespace', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    render(
      <DeleteProjectDialog
        project={project}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    const input = screen.getByRole('textbox')
    const confirmButton = screen.getByRole('button', {
      name: 'Delete permanently',
    })

    expect(confirmButton).toBeDisabled()

    await user.type(input, 'atlas Project')
    expect(confirmButton).toBeDisabled()

    await user.clear(input)
    await user.type(input, 'Atlas Project ')
    expect(confirmButton).toBeDisabled()

    await user.clear(input)
    await user.type(input, project.name)
    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith({
      projectId: project.id,
      confirmationName: project.name,
    })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('blocks repeated confirmation and cancellation while deletion is pending', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    let resolveDeletion

    const deletionPromise = new Promise((resolve) => {
      resolveDeletion = resolve
    })
    const onConfirm = vi.fn(() => deletionPromise)

    render(
      <DeleteProjectDialog
        project={project}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    await user.type(screen.getByRole('textbox'), project.name)
    await user.click(screen.getByRole('button', {
      name: 'Delete permanently',
    }))

    expect(onConfirm).toHaveBeenCalledTimes(1)

    const pendingButton = screen.getByRole('button', {
      name: 'Deleting…',
    })

    expect(pendingButton).toBeDisabled()
    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', {
      name: 'Keep project',
    })).toBeDisabled()

    await user.click(pendingButton)
    await user.keyboard('{Escape}')

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    await act(async () => {
      resolveDeletion()
      await deletionPromise
    })

    expect(screen.getByRole('button', {
      name: 'Delete permanently',
    })).toBeEnabled()

    await user.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
