import { configureStore } from '@reduxjs/toolkit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it } from 'vitest'
import preferencesReducer from '../model/preferencesSlice.js'
import { ThemeControl } from './ThemeControl.jsx'

function renderThemeControl() {
  const store = configureStore({
    reducer: {
      preferences: preferencesReducer,
    },
  })

  return render(
    <Provider store={store}>
      <ThemeControl />
    </Provider>,
  )
}

describe('ThemeControl', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('supports arrow-key navigation and keyboard theme selection', async () => {
    const user = userEvent.setup()
    renderThemeControl()

    const trigger = screen.getByRole('button', { name: /theme: system/i })
    trigger.focus()

    await user.keyboard('{ArrowDown}')

    const systemOption = screen.getByRole('menuitemradio', { name: 'System' })
    expect(systemOption).toHaveFocus()

    await user.keyboard('{ArrowDown}')

    const lightOption = screen.getByRole('menuitemradio', { name: 'Light' })
    expect(lightOption).toHaveFocus()

    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /theme: light/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
