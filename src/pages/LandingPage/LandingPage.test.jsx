import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage.jsx'

describe('LandingPage', () => {
  it('renders the HelmSight product landing and routes workspace actions to Global Overview', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: /project intelligence for a clearer tomorrow\./i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Delivery Clarity Platform')).toBeInTheDocument()
    expect(screen.getByText(/move with confidence/i)).toBeInTheDocument()
    expect(screen.getByText(/end-to-end project visibility/i)).toBeInTheDocument()
    expect(screen.getByText(/proactive risk management/i)).toBeInTheDocument()
    expect(screen.getByText(/faster, more confident decisions/i)).toBeInTheDocument()
    expect(screen.getByText('From complexity to confident delivery.')).toBeInTheDocument()
    expect(screen.getByText('© 2026 HelmSight. All rights reserved.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'HelmSight home' })).toHaveLength(1)

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/overview')
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/overview')
    expect(screen.getByRole('link', { name: /open demo workspace/i })).toHaveAttribute(
      'href',
      '/overview',
    )
  })
})
