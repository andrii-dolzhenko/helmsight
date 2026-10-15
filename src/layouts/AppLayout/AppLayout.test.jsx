import { configureStore } from '@reduxjs/toolkit'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import preferencesReducer from '../../features/preferences/model/preferencesSlice.js'
import profileReducer from '../../features/profile/model/profileSlice.js'
import { AppLayout } from './AppLayout.jsx'

function renderLayout() {
  const store = configureStore({
    reducer: {
      preferences: preferencesReducer,
      profile: profileReducer,
    },
  })

  const router = createMemoryRouter([
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <div>Workspace content</div> },
        { path: 'next', element: <div>Next content</div> },
        { path: 'projects', element: <div>Projects content</div> },
      ],
    },
  ])

  const view = render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )

  return { router, ...view }
}

describe('AppLayout mobile navigation', () => {
  it('keeps desktop controls in the header and opens an accessible profile menu', async () => {
    const user = userEvent.setup()
    const { container } = renderLayout()
    const desktopHeader = container.querySelectorAll('header')[1]
    expect(within(desktopHeader).queryByRole('link', { name: 'Profile settings' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open profile menu' }))
    const menu = screen.getByRole('menu', { name: 'Profile actions' })
    expect(within(menu).getByRole('menuitem', { name: 'Profile & Settings' }))
      .toHaveAttribute('href', '/settings')
    expect(within(menu).getByRole('menuitem', { name: 'Exit workspace' })).toHaveAttribute('href', '/')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu', { name: 'Profile actions' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'HelmSight home' }).every((link) => link.getAttribute('href') === '/overview')).toBe(true)
  })

  afterEach(() => {
    document.body.style.overflow = ''
    document.body.scrollTop = 0
    document.documentElement.scrollTop = 0
  })

  it('keeps theme, one profile entry and Exit workspace in the mobile drawer', async () => {
    const user = userEvent.setup()
    const { container } = renderLayout()
    const mobileHeader = container.querySelector('header')
    // Mobile-only markup is hidden by the desktop CSS default in jsdom.
    expect(within(mobileHeader).queryByRole('button', { name: /Theme:/, hidden: true })).not.toBeInTheDocument()
    expect(within(mobileHeader).queryByRole('link', { name: 'Profile settings', hidden: true })).not.toBeInTheDocument()
    expect(within(mobileHeader).queryByRole('button', { name: 'Open profile menu', hidden: true })).not.toBeInTheDocument()
    await user.click(within(mobileHeader).getByRole('button', { name: 'Open navigation menu', hidden: true }))
    const drawer = screen.getByRole('complementary', { name: 'Mobile navigation', hidden: true })
    expect(within(drawer).getByRole('button', { name: /Theme:/, hidden: true })).toBeInTheDocument()
    expect(within(drawer).getByRole('link', { name: 'Profile settings', hidden: true })).toHaveAttribute('href', '/settings')
    expect(within(drawer).queryByRole('link', { name: 'Profile & Settings', hidden: true })).not.toBeInTheDocument()
    expect(within(drawer).getAllByRole('link', { hidden: true }).filter((link) => link.getAttribute('href') === '/settings')).toHaveLength(1)
    expect(within(drawer).getByRole('link', { name: 'Exit workspace', hidden: true })).toHaveAttribute('href', '/')
  })

  it('opens from the hamburger control and closes with Escape', async () => {
    const user = userEvent.setup()
    renderLayout()

    const openButton = screen.getByLabelText(/open navigation menu/i)
    fireEvent.click(openButton)

    expect(screen.getByLabelText(/mobile navigation/i)).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText(/mobile navigation/i)).not.toBeInTheDocument()
    expect(openButton).toHaveAttribute('aria-expanded', 'false')
  })
  it('smoothly restores the Projects page to the top when Projects is clicked again', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { router } = renderLayout()

    await act(async () => {
      await router.navigate('/projects')
    })

    scrollTo.mockClear()
    document.documentElement.scrollTop = 600

    const projectsLinks = screen.getAllByRole('link', { name: 'Projects' })
    fireEvent.click(projectsLinks[0])

    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'smooth',
    })

    scrollTo.mockRestore()
  })

  it('preserves initial browser scroll restoration and resets only after SPA navigation', async () => {
    document.body.scrollTop = 240
    document.documentElement.scrollTop = 240

    const { router } = renderLayout()

    expect(document.body.scrollTop).toBe(240)
    expect(document.documentElement.scrollTop).toBe(240)

    await act(async () => {
      await router.navigate('/next')
    })

    expect(document.body.scrollTop).toBe(0)
    expect(document.documentElement.scrollTop).toBe(0)
  })

})
