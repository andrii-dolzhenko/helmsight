import { configureStore } from '@reduxjs/toolkit'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import preferencesReducer from '../../features/preferences/model/preferencesSlice.js'
import { AppLayout } from './AppLayout.jsx'

function renderLayout() {
  const store = configureStore({
    reducer: {
      preferences: preferencesReducer,
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
  afterEach(() => {
    document.body.style.overflow = ''
    document.body.scrollTop = 0
    document.documentElement.scrollTop = 0
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
