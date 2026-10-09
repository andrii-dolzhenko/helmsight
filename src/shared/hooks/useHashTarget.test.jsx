import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useHashTarget } from './useHashTarget.js'

function Harness({ showTarget }) {
  useHashTarget('ready')

  return showTarget ? <article id="target-card" tabIndex={-1}>Target card</article> : null
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
})
