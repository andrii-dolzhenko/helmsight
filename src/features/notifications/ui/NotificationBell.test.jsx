import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { NotificationBell } from './NotificationBell.jsx'

const items = Array.from({ length: 21 }, (_, index) => ({
  id: `risk:p:${index}:critical`, type: 'risk', title: 'Critical risk',
  detail: `Alert ${index}`, projectName: 'Atlas', href: '/projects/p/risks/1',
}))

function Fixture({ model, openLab = vi.fn() }) {
  const [open, setOpen] = useState(false)
  return <MemoryRouter><NotificationBell model={model} isOpen={open} onOpenChange={setOpen} onOpenLab={openLab} /></MemoryRouter>
}

function createModel(overrides = {}) {
  return {
    alerts: items, records: {}, unread: items.length, loading: false, error: '',
    refresh: vi.fn(), markRead: vi.fn(), dismiss: vi.fn(), ...overrides,
  }
}

describe('NotificationBell', () => {
  it('opens, shows unread badge and scrolls through pages of 20', async () => {
    const user = userEvent.setup()
    render(<Fixture model={createModel()} />)
    const bell = screen.getByRole('button', { name: 'Notifications, 21 unread' })
    expect(bell).toHaveTextContent('9+')
    await user.click(bell)
    const panel = screen.getByRole('region', { name: 'Notifications' })
    expect(within(panel).getAllByText('Critical risk')).toHaveLength(20)
    await user.click(within(panel).getByRole('button', { name: 'Show more (+1)' }))
    expect(within(panel).getAllByText('Critical risk')).toHaveLength(21)
    await user.keyboard('{Escape}')
    expect(panel).not.toBeInTheDocument()
    expect(bell).toHaveFocus()
  })
  it('filters unread, marks all and dismisses a single notification', async () => {
    const user = userEvent.setup()
    const model = createModel({ records: { [items[0].id]: { read: true } }, unread: 20 })
    render(<Fixture model={model} />)
    await user.click(screen.getByRole('button', { name: 'Notifications, 20 unread' }))
    await user.click(screen.getByRole('button', { name: 'Unread (20)' }))
    expect(screen.queryByText('Alert 0')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mark all read' }))
    expect(model.markRead).toHaveBeenCalledWith(items.map((item) => item.id))
    await user.click(screen.getByRole('button', { name: 'Dismiss Critical risk: Alert 1' }))
    expect(model.dismiss).toHaveBeenCalledWith(items[1].id)
  })
  it('opens the existing Decision Lab without inventing a route', async () => {
    const user = userEvent.setup()
    const openLab = vi.fn()
    const model = createModel({ alerts: [{ id: 'lab:2026-10-15', type: 'lab', title: 'Decision Lab is ready', detail: 'Three scenarios', projectName: null }], unread: 1 })
    render(<Fixture model={model} openLab={openLab} />)
    await user.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }))
    await user.click(screen.getByRole('button', { name: 'Open Decision Lab ↗' }))
    expect(model.markRead).toHaveBeenCalledWith(['lab:2026-10-15'])
    expect(openLab).toHaveBeenCalledWith(expect.any(HTMLButtonElement))
  })
})
