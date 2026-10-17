import { afterAll, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { isValidElement } from 'react'
import { matchRoutes } from 'react-router'
import { router } from './router.jsx'
import { RouteLoadingFallback } from './RouteLoadingFallback.jsx'

afterAll(() => router.dispose())

describe('Stage 28 initial route fallback', () => {
  it('uses the Vite public base for nested deployments', () => {
    expect(router.basename).toBe(import.meta.env.BASE_URL)
  })

  it.each([
    ['landing page', '/'],
    ['sign in', '/sign-in'],
    ['sign up', '/sign-up'],
    ['forgot password', '/forgot-password'],
    ['reset password', '/reset-password'],
    ['projects list', '/projects'],
    ['global risks', '/risks'],
    ['global metrics', '/metrics'],
    ['global reports', '/reports'],
    ['global meetings', '/meetings'],
    ['help center', '/help'],
    ['workspace settings', '/settings'],
    ['project overview', '/projects/demo-project'],
    ['nested metrics page', '/projects/demo-project/metrics'],
    ['unmatched URL', '/does-not-exist'],
  ])('provides a fallback for direct loading of the %s', (_label, pathname) => {
    const matches = matchRoutes(router.routes, pathname)
    const fallback = matches?.[0]?.route.hydrateFallbackElement
    expect(isValidElement(fallback)).toBe(true)
    expect(fallback.type).toBe(RouteLoadingFallback)
  })

  it('provides an accessible loading announcement', () => {
    render(<RouteLoadingFallback />)
    expect(screen.getByRole('status').textContent).toBe('Loading HelmSight…')
  })
})
