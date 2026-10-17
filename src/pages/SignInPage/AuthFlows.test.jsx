import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthLayout } from '../../layouts/AuthLayout/AuthLayout.jsx'
import { SignInPage } from './SignInPage.jsx'
import { SignUpPage } from '../SignUpPage/SignUpPage.jsx'
import { ForgotPasswordPage } from '../ForgotPasswordPage/ForgotPasswordPage.jsx'
import { ResetPasswordPage } from '../ResetPasswordPage/ResetPasswordPage.jsx'

function renderAuth(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route path="/overview" element={<h1>Demo workspace</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Auth UI Prototype', () => {
  it.each(['/sign-in', '/sign-up', '/forgot-password', '/reset-password'])(
    'exposes an unauthenticated demo route from %s', async (path) => {
      const user = userEvent.setup()
      renderAuth(path)
      expect(screen.getByRole('link', { name: 'HelmSight home' })).toHaveAttribute('href', '/')
      expect(screen.getByText('From complexity to confident delivery.')).toBeInTheDocument()
      expect(screen.getByText('© 2026 HelmSight. All rights reserved.')).toBeInTheDocument()
      expect(screen.getByText(/no account is created/i)).toBeInTheDocument()
      await user.click(screen.getByRole('link', { name: /explore demo workspace/i }))
      expect(screen.getByRole('heading', { name: 'Demo workspace' })).toBeInTheDocument()
    },
  )

  it('keeps the shared branding and changes narrative when navigating between auth screens', async () => {
    const user = userEvent.setup()
    renderAuth('/sign-in')
    expect(screen.getByRole('heading', { name: 'Clarity starts here.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'HelmSight home' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Create one' }))

    expect(screen.getByRole('heading', { name: 'See the bigger picture.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'HelmSight home' })).toBeInTheDocument()
  })

  it('validates Sign In and does not verify or retain a password', async () => {
    const user = userEvent.setup()
    const stored = vi.spyOn(Storage.prototype, 'setItem')
    renderAuth('/sign-in')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter a password.')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'user@example.com')
    await user.type(screen.getByLabelText('Password'), 'samplePass123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('status')).toHaveTextContent('No credentials were verified or stored')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(stored).not.toHaveBeenCalled()
    stored.mockRestore()
  })

  it('shows and hides passwords without submitting the form', async () => {
    const user = userEvent.setup()
    renderAuth('/sign-in')
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows honest Google and GitHub placeholders on both primary screens', async () => {
    const user = userEvent.setup()
    const view = renderAuth('/sign-in')
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(screen.getByRole('status')).toHaveTextContent('Google sign-in is coming soon')
    await user.click(screen.getByRole('button', { name: 'Continue with GitHub' }))
    expect(screen.getByRole('status')).toHaveTextContent('GitHub sign-in is coming soon')
    view.unmount()
    renderAuth('/sign-up')
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(screen.getByRole('status')).toHaveTextContent('Google sign-up is coming soon')
    expect(screen.queryByRole('checkbox', { name: /remember me/i })).not.toBeInTheDocument()
  })

  it('keeps account preview notices outside the form layout and dismissible', async () => {
    const user = userEvent.setup()
    renderAuth('/sign-up')

    await user.click(screen.getByRole('button', { name: 'Create Account' }))
    expect(screen.getAllByRole('alert')).toHaveLength(4)
    const card = screen.getByRole('heading', { name: 'Create Account' }).parentElement

    const githubButton = screen.getByRole('button', { name: 'Continue with GitHub' })
    await user.click(githubButton)
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent('GitHub sign-up is coming soon')
    expect(notice).toHaveAttribute('aria-live', 'polite')
    expect(notice.parentElement).toBe(document.body)
    expect(card).not.toContainElement(notice)
    expect(screen.getAllByRole('alert')).toHaveLength(4)

    await user.click(screen.getByRole('button', { name: 'Dismiss account preview notice' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(githubButton).toHaveFocus()
    expect(screen.getAllByRole('alert')).toHaveLength(4)
  })

  it('reserves validation-message space before registration errors appear', async () => {
    const user = userEvent.setup()
    const { container } = renderAuth('/sign-up')
    const errorSlots = [...container.querySelectorAll('[id$="-error"]')]

    expect(errorSlots).toHaveLength(4)
    expect(errorSlots.every((slot) => slot.textContent === '')).toBe(true)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(screen.getAllByRole('alert')).toHaveLength(4)
    expect(errorSlots.map((slot) => slot.textContent)).toEqual([
      'Enter your name.',
      'Enter your email address.',
      'Enter a password.',
      'Confirm your password.',
    ])
    expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveAttribute('aria-describedby', 'sign-up-name-error')
  })

  it('validates registration fields, matching passwords, and creates no account', async () => {
    const user = userEvent.setup()
    renderAuth('/sign-up')
    await user.click(screen.getByRole('button', { name: /^create account$/i }))
    expect(screen.getByText('Enter your name.')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Alex Example')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'alex@example.com')
    await user.type(screen.getByLabelText('Password', { exact: true }), 'samplePass123')
    await user.type(screen.getByLabelText('Confirm password'), 'different123')
    await user.click(screen.getByRole('button', { name: /^create account$/i }))
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Confirm password'))
    await user.type(screen.getByLabelText('Confirm password'), 'samplePass123')
    await user.click(screen.getByRole('button', { name: /^create account$/i }))
    expect(await screen.findByRole('status')).toHaveTextContent('No account was created')
    expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('')
    expect(screen.getByLabelText('Confirm password')).toHaveValue('')
  })

  it('offers a recovery preview without claiming to send an email', async () => {
    const user = userEvent.setup()
    renderAuth('/forgot-password')
    expect(screen.getByRole('link', { name: /preview reset password form/i })).toHaveAttribute('href', '/reset-password')
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'alex@example.com')
    await user.click(screen.getByRole('button', { name: 'Preview Recovery Request' }))
    expect(await screen.findByRole('status')).toHaveTextContent('No email was sent')
  })

  it('offers a reset preview without claiming to change a password', async () => {
    const user = userEvent.setup()
    renderAuth('/reset-password')
    await user.type(screen.getByLabelText('New password'), 'newPass123')
    await user.type(screen.getByLabelText('Confirm new password'), 'newPass123')
    await user.click(screen.getByRole('button', { name: 'Preview Password Reset' }))
    expect(await screen.findByRole('status')).toHaveTextContent('No password was changed')
    expect(screen.getByLabelText('New password')).toHaveValue('')
  })
})
