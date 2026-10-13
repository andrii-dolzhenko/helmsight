import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { SettingsPage } from './SettingsPage.jsx'

function renderSettingsPage() {
  const store = createAppStore()
  const router = createMemoryRouter([
    { path: '/settings', element: <SettingsPage /> },
  ], { initialEntries: ['/settings'] })

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('saves separate names and role and hydrates on a fresh render', async () => {
    const user = userEvent.setup()
    const view = renderSettingsPage()
    const first = screen.getByRole('textbox', { name: /First name/ })
    const last = screen.getByRole('textbox', { name: /Last name/ })
    const role = screen.getByRole('textbox', { name: /Role/ })
    expect(first).toHaveValue('Andrii')
    expect(last).toHaveValue('Dolzhenko')

    await user.clear(first)
    await user.type(first, 'Alex')
    await user.clear(last)
    await user.type(last, 'Morgan')
    await user.clear(role)
    await user.type(role, 'Delivery Manager')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Profile saved locally.')
    expect(storageAdapter.read('profile')).toEqual({
      firstName: 'Alex', lastName: 'Morgan', role: 'Delivery Manager', avatarDataUrl: null,
    })
    view.unmount()
    renderSettingsPage()
    expect(screen.getByRole('textbox', { name: /First name/ })).toHaveValue('Alex')
    expect(screen.getByRole('textbox', { name: /Last name/ })).toHaveValue('Morgan')
  })

  it('validates the required first name before saving', async () => {
    const user = userEvent.setup()
    renderSettingsPage()
    await user.clear(screen.getByRole('textbox', { name: /First name/ }))
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter at least 1 character.')
    expect(storageAdapter.read('profile')).toBeNull()
  })

  it('reports storage errors rather than false success', async () => {
    const user = userEvent.setup()
    vi.spyOn(storageAdapter, 'write').mockImplementation(() => {
      throw new Error('Local storage is unavailable.')
    })
    renderSettingsPage()
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Local storage is unavailable.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('removes a saved photo immediately without saving unsaved names, even after reload', async () => {
    const user = userEvent.setup()
    storageAdapter.write('profile', {
      firstName: 'Alex', lastName: 'Morgan', role: 'Delivery Manager',
      avatarDataUrl: 'data:image/png;base64,AAAA',
    })
    const view = renderSettingsPage()
    expect(view.container.querySelector('img')).toBeInTheDocument()

    const first = screen.getByRole('textbox', { name: /First name/ })
    await user.clear(first)
    await user.type(first, 'New unsaved name')
    await user.click(screen.getByRole('button', { name: 'Remove photo' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Photo removed.')
    expect(storageAdapter.read('profile')).toEqual({
      firstName: 'Alex', lastName: 'Morgan', role: 'Delivery Manager', avatarDataUrl: null,
    })
    expect(first).toHaveValue('New unsaved name')
    view.unmount()
    const reloaded = renderSettingsPage()
    expect(reloaded.container.querySelector('img')).toBeNull()
    expect(screen.getByRole('textbox', { name: /First name/ })).toHaveValue('Alex')
  })

  it('keeps the saved photo when removal cannot be persisted', async () => {
    const user = userEvent.setup()
    storageAdapter.write('profile', {
      firstName: 'Alex', lastName: 'Morgan', role: 'Delivery Manager',
      avatarDataUrl: 'data:image/png;base64,AAAA',
    })
    vi.spyOn(storageAdapter, 'write').mockImplementation(() => {
      throw new Error('Local storage is unavailable.')
    })
    const view = renderSettingsPage()
    await user.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Local storage is unavailable.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(view.container.querySelector('img')).toBeInTheDocument()
  })

  it('rejects an unsupported photo without starting the editor', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderSettingsPage()
    const input = screen.getByLabelText('Choose profile photo')
    await user.upload(input, new File(['hello'], 'document.txt', { type: 'text/plain' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPG, PNG or WebP image.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('rejects oversized photos', async () => {
    const user = userEvent.setup()
    renderSettingsPage()
    const input = screen.getByLabelText('Choose profile photo')
    const bigFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await user.upload(input, bigFile)
    expect(await screen.findByRole('alert')).toHaveTextContent('smaller than 5 MB')
  })
})
