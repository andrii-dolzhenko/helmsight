import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useHashTarget } from './useHashTarget.js'

function Harness({ showTarget, mode = 'grid' }) {
  const hashTargetId = useHashTarget('ready')

  return showTarget ? (
    <article
      key={mode}
      id="target-card"
      data-hash-target={hashTargetId === 'target-card' ? 'true' : undefined}
      data-view={mode}
      tabIndex={-1}
    >
      Target card
    </article>
  ) : null
}

describe('useHashTarget', () => {
  let scrollIntoView

  beforeEach(() => {
    scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete HTMLElement.prototype.scrollIntoView
  })

  it('waits for a hash target that appears after the first render', async () => {
    const view = render(
      <MemoryRouter initialEntries={['/project/milestones#target-card']}>
        <Harness showTarget={false} />
      </MemoryRouter>,
    )

    view.rerender(
      <MemoryRouter initialEntries={['/project/milestones#target-card']}>
        <Harness showTarget />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest',
      })
      expect(document.activeElement).toHaveAttribute('id', 'target-card')
    })
  })

  it('uses explicit navigation state as a reliable dashboard focus target', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/project/success-criteria',
          hash: '#target-card',
          state: { focusTargetId: 'target-card' },
        }]}
      >
        <Harness showTarget />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled()
      expect(document.activeElement).toHaveAttribute('id', 'target-card')
    })
  })

  it('keeps the URL-target marker when Grid/List replaces the action element', async () => {
    const view = render(
      <MemoryRouter initialEntries={['/projects/demo/actions#target-card']}>
        <Harness showTarget mode="grid" />
      </MemoryRouter>,
    )

    const gridCard = screen.getByText('Target card')
    expect(gridCard).toHaveAttribute('data-view', 'grid')
    expect(gridCard).toHaveAttribute('data-hash-target', 'true')
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())

    view.rerender(
      <MemoryRouter initialEntries={['/projects/demo/actions#target-card']}>
        <Harness showTarget mode="list" />
      </MemoryRouter>,
    )

    const listRow = screen.getByText('Target card')
    expect(listRow).not.toBe(gridCard)
    expect(listRow).toHaveAttribute('data-view', 'list')
    expect(listRow).toHaveAttribute('data-hash-target', 'true')
  })

  it('marks only the explicit state focus target when no hash is supplied', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/projects/demo/actions',
          state: { focusTargetId: 'target-card' },
        }]}
      >
        <Harness showTarget />
      </MemoryRouter>,
    )

    expect(screen.getByText('Target card')).toHaveAttribute('data-hash-target', 'true')
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
  })

})
