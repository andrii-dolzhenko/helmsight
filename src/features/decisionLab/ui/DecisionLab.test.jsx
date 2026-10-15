import { configureStore } from '@reduxjs/toolkit'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import preferencesReducer from '../../preferences/model/preferencesSlice.js'
import profileReducer from '../../profile/model/profileSlice.js'
import { AppLayout } from '../../../layouts/AppLayout/AppLayout.jsx'
import { decisionLabService } from '../api/decisionLabService.js'

function renderLab() {
  const store = configureStore({ reducer: { preferences: preferencesReducer, profile: profileReducer } })
  const router = createMemoryRouter([{ path: '/', element: <AppLayout />, children: [
    { index: true, element: <h1>Portfolio content</h1> },
  ] }])
  return render(<Provider store={store}><RouterProvider router={router} /></Provider>)
}

async function chooseAndSubmit(user, dialog) {
  const choices = within(dialog).getAllByRole('radio')
  await user.click(choices[0])
  await user.click(within(dialog).getByRole('button', { name: /Submit answer/i }))
  expect(within(dialog).getByText('Recommended approach')).toBeInTheDocument()
}

describe('Decision Lab modal', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => { document.body.style.overflow = '' })

  it('opens from sidebar, contains focus, closes on Escape and restores focus', async () => {
    const user = userEvent.setup()
    const { container } = renderLab()
    const trigger = within(container).getByRole('button', { name: 'Open Decision Lab' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Decision Lab' })
    expect(within(dialog).getAllByRole('radio')).toHaveLength(4)
    expect(document.body.style.overflow).toBe('hidden')
    expect(trigger.closest('[data-app-shell]')).toHaveAttribute('inert')
    expect(within(dialog).getByRole('button', { name: 'Close Decision Lab' })).toHaveFocus()
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(within(dialog).getByRole('button', { name: 'Close for now' })).toHaveFocus()
    await user.keyboard('{Tab}')
    expect(within(dialog).getByRole('button', { name: 'Close Decision Lab' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Decision Lab' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
  })

  it('saves submitted decisions, allows closing, then resumes at feedback', async () => {
    const user = userEvent.setup()
    renderLab()
    await user.click(screen.getByRole('button', { name: 'Open Decision Lab' }))
    let dialog = screen.getByRole('dialog', { name: 'Decision Lab' })
    await chooseAndSubmit(user, dialog)
    expect(decisionLabService.getToday().answers).toHaveLength(1)
    await user.click(within(dialog).getByRole('button', { name: 'Close for now' }))
    await user.click(screen.getByRole('button', { name: 'Open Decision Lab' }))
    dialog = screen.getByRole('dialog', { name: 'Decision Lab' })
    expect(within(dialog).getByText('Your decision')).toBeInTheDocument()
    expect(within(dialog).getByText('Scenario 1 of 3')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /Next scenario/i }))
    expect(within(dialog).getByText('Scenario 2 of 3')).toBeInTheDocument()
  })

  it('shows a completion message and answer review, without restarting the set', async () => {
    const user = userEvent.setup()
    renderLab()
    await user.click(screen.getByRole('button', { name: 'Open Decision Lab' }))
    const dialog = screen.getByRole('dialog', { name: 'Decision Lab' })
    for (let index = 0; index < 3; index += 1) {
      await chooseAndSubmit(user, dialog)
      await user.click(within(dialog).getByRole('button', { name: index === 2 ? /See my results/i : /Next scenario/i }))
    }
    expect(within(dialog).getByRole('heading', { name: 'Quest completed' })).toBeInTheDocument()
    expect(within(dialog).getByText(/decisions aligned with the recommended approach/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Review answers' }))
    const review = within(dialog).getByLabelText("Review today's decisions")
    expect(review).toBeInTheDocument()
    expect(within(review).getAllByText(/^Your choice:/)).toHaveLength(3)
    expect(within(review).getAllByText(/^Decision insight:/)).toHaveLength(3)
    expect(within(review).getAllByText(/^Recommended approach:/)).toHaveLength(3)
    await user.click(within(dialog).getByRole('button', { name: 'Back to workspace' }))
    await user.click(screen.getByRole('button', { name: 'Open Decision Lab' }))
    expect(screen.getByRole('heading', { name: 'Quest completed' })).toBeInTheDocument()
  })

  it('opens from mobile navigation and restores focus to mobile menu trigger', async () => {
    const user = userEvent.setup()
    const { container } = renderLab()
    // jsdom does not activate CSS media queries. Reproduce the mobile layout's
    // visibility so the return-focus target can receive focus after closing.
    const mobileHeader = container.querySelector('header')
    mobileHeader.style.display = 'flex'
    const openMenu = within(mobileHeader).getByRole('button', { name: 'Open navigation menu' })
    await user.click(openMenu)
    const drawer = screen.getByRole('complementary', { name: 'Mobile navigation', hidden: true })
    drawer.parentElement.style.display = 'block'
    const mobileLabButton = within(drawer).getByRole('button', { name: 'Open Decision Lab' })
    expect(mobileLabButton.closest('nav')).toBeNull()
    expect(mobileLabButton.parentElement.nextElementSibling).toContainElement(within(drawer).getByText('Appearance'))
    await user.click(mobileLabButton)
    expect(screen.queryByRole('complementary', { name: 'Mobile navigation', hidden: true })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Decision Lab' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(openMenu).toHaveFocus()
  })
})
