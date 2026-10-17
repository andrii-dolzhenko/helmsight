import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PublicFooter } from './PublicFooter.jsx'

describe('PublicFooter', () => {
  it('uses the same visible copy and layout component on every public route', () => {
    const { container } = render(<PublicFooter />)
    const footer = container.querySelector('footer')

    expect(footer).toBeInTheDocument()
    expect(footer).toHaveTextContent('From complexity to confident delivery.')
    expect(screen.getByText('© 2026 HelmSight. All rights reserved.')).toBeInTheDocument()
  })

  it('allows landing-only background decoration without changing footer copy', () => {
    const { container } = render(<PublicFooter className="landing-background" />)
    expect(container.querySelector('footer')).toHaveClass('landing-background')
    expect(screen.getByText('© 2026 HelmSight. All rights reserved.')).toBeInTheDocument()
  })
})
