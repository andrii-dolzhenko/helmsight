import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore } from '../../app/store/store.js'
import { archiveMeetingNote, restoreMeetingNote } from '../../features/meetings/model/meetingsSlice.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { MeetingsPage } from './MeetingsPage.jsx'

function makeNote(number, archived = false) {
  const day = String(number).padStart(2, '0')
  const reverseDay = String(13 - number).padStart(2, '0')
  return {
    id: `note-${number}`,
    projectId: 'project-1',
    title: `Meeting ${day}`,
    meetingDate: `2026-10-${day}`,
    owner: 'Alex Morgan',
    participants: ['Alex Morgan'],
    notes: 'Reviewed delivery progress.',
    decisions: ['Continue the approved plan.'],
    followUps: [],
    version: 1,
    archivedAt: archived ? '2026-10-15T12:00:00.000Z' : null,
    createdAt: `2026-10-${day}T08:00:00.000Z`,
    updatedAt: `2026-10-${reverseDay}T09:00:00.000Z`,
  }
}

const notes = Array.from({ length: 11 }, (_, index) => makeNote(index + 1))

function renderMeetings(records = notes) {
  storageAdapter.write('meetingNotes', records)
  const store = createAppStore()
  const project = { id: 'project-1', name: 'Project One', archivedAt: null }
  const router = createMemoryRouter([
    {
      path: '/projects/:projectId',
      element: <Outlet context={{ project }} />,
      children: [{ path: 'meetings', element: <MeetingsPage /> }],
    },
  ], { initialEntries: ['/projects/project-1/meetings'] })

  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )
  return { store }
}

describe('Meeting Notes sorting and pagination', () => {
  beforeEach(() => window.localStorage.clear())

  it('hides pagination for exactly ten notes', async () => {
    renderMeetings(notes.slice(0, 10))
    expect(await screen.findByText('Meeting 10')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('newest')
    expect(screen.queryByRole('navigation', { name: 'Meeting Notes pagination' })).not.toBeInTheDocument()
    expect(screen.getByText('Meeting 01')).toBeInTheDocument()
  })

  it('paginates eleven notes, shows page numbers and keeps summary totals', async () => {
    const user = userEvent.setup()
    renderMeetings()

    expect(await screen.findByText('Meeting 11')).toBeInTheDocument()
    expect(screen.queryByText('Meeting 01')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Current\s*11/ })).toBeInTheDocument()
    const summary = screen.getByLabelText('Meeting Notes summary')
    expect(within(summary).getByText('Meeting notes').parentElement).toHaveTextContent('11')
    expect(within(summary).getByText('Recorded decisions').parentElement).toHaveTextContent('11')

    const pagination = screen.getByRole('navigation', { name: 'Meeting Notes pagination' })
    expect(within(pagination).getByText('Showing 1–10 of 11 notes')).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(within(pagination).getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')

    await user.click(within(pagination).getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Meeting 01')).toBeInTheDocument()
    expect(screen.queryByText('Meeting 11')).not.toBeInTheDocument()
    expect(within(pagination).getByText('Showing 11–11 of 11 notes')).toBeInTheDocument()
    expect(within(pagination).getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
    expect(within(pagination).getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('sorts by oldest meeting and most recently updated, resetting to page one', async () => {
    const user = userEvent.setup()
    renderMeetings()
    await screen.findByText('Meeting 11')
    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    const sort = screen.getByRole('combobox', { name: 'Sort by' })
    await user.selectOptions(sort, 'oldest')
    expect(sort).toHaveValue('oldest')
    expect(screen.getByText('Meeting 01')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    await user.selectOptions(sort, 'newest')
    expect(screen.getByText('Meeting 11')).toBeInTheDocument()
    expect(screen.queryByText('Meeting 01')).not.toBeInTheDocument()

    await user.selectOptions(sort, 'updated')
    expect(screen.getByText('Meeting 01')).toBeInTheDocument()
    expect(screen.queryByText('Meeting 11')).not.toBeInTheDocument()
    expect(sort).toHaveValue('updated')
  })

  it('resets pagination when switching Current/Archived, without changing project KPIs', async () => {
    const user = userEvent.setup()
    renderMeetings([...notes, makeNote(12, true)])
    await screen.findByText('Meeting 11')
    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(screen.getByText('Meeting 01')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Archived\s*1/ }))
    expect(screen.getByText('Meeting 12')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Meeting Notes pagination' })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('newest')

    await user.click(screen.getByRole('tab', { name: /Current\s*11/ }))
    expect(screen.getByText('Meeting 11')).toBeInTheDocument()
    expect(screen.queryByText('Meeting 01')).not.toBeInTheDocument()
    const summary = screen.getByLabelText('Meeting Notes summary')
    expect(within(summary).getByText('Meeting notes').parentElement).toHaveTextContent('12')
  })

  it('clamps an out-of-range page when archived notes reduce the Current count', async () => {
    const user = userEvent.setup()
    const { store } = renderMeetings()
    await screen.findByText('Meeting 11')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Meeting 01')).toBeInTheDocument()

    await act(async () => {
      await store.dispatch(archiveMeetingNote('note-11')).unwrap()
    })

    expect(screen.getByText('Meeting 10')).toBeInTheDocument()
    expect(screen.getByText('Meeting 01')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Meeting Notes pagination' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Current\s*10/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Archived\s*1/ })).toBeInTheDocument()
    const summary = screen.getByLabelText('Meeting Notes summary')
    expect(within(summary).getByText('Meeting notes').parentElement).toHaveTextContent('11')

    await act(async () => {
      await store.dispatch(restoreMeetingNote('note-11')).unwrap()
    })

    expect(screen.getByRole('button', { name: 'Page 1' }))
      .toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Meeting 11')).toBeInTheDocument()
    expect(screen.queryByText('Meeting 01')).not.toBeInTheDocument()
  })
})
