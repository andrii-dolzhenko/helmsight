import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { MeetingNoteDetailPage } from './MeetingNoteDetailPage.jsx'

const note = {
  id: 'note-1',
  projectId: 'project-1',
  title: 'Weekly delivery sync',
  meetingDate: '2026-10-08',
  owner: 'Alex Morgan',
  participants: ['Alex Morgan', 'Maya Chen'],
  notes: 'Reviewed the delivery baseline.',
  decisions: ['Keep the approved plan.'],
  followUps: [],
  version: 2,
  archivedAt: null,
  createdAt: '2026-10-08T09:00:00.000Z',
  updatedAt: '2026-10-08T10:00:00.000Z',
}

function renderDetail({ archivedNote = false, archivedProject = false } = {}) {
  storageAdapter.write('meetingNotes', [{
    ...note,
    archivedAt: archivedNote ? '2026-10-10T12:00:00.000Z' : null,
  }])

  const project = {
    id: 'project-1',
    name: 'Project One',
    archivedAt: archivedProject ? '2026-10-11T12:00:00.000Z' : null,
  }

  const store = createAppStore()
  const router = createMemoryRouter([
    {
      path: '/projects/:projectId',
      element: <Outlet context={{ project }} />,
      children: [
        {
          path: 'meetings/:meetingId',
          element: <MeetingNoteDetailPage />,
        },
        {
          path: 'meetings/:meetingId/edit',
          element: <div>Editor destination</div>,
        },
      ],
    },
  ], {
    initialEntries: ['/projects/project-1/meetings/note-1'],
  })

  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )

  return { store }
}

function persistedNote() {
  return storageAdapter.read('meetingNotes').find((item) => item.id === note.id)
}

describe('Meeting Note detail lifecycle', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('cancels archive, then archives and restores without changing document metadata', async () => {
    const user = userEvent.setup()
    renderDetail()

    expect(await screen.findByText('Weekly delivery sync')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Archive note' }))

    const dialog = screen.getByRole('alertdialog', {
      name: 'Archive meeting note?',
    })

    expect(persistedNote().archivedAt).toBeNull()

    await user.click(within(dialog).getByRole('button', {
      name: 'Cancel',
    }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(persistedNote().archivedAt).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Archive note' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {
      name: 'Archive note',
    }))

    expect(await screen.findByText('Archived meeting note')).toBeInTheDocument()
    expect(screen.getByText('Meeting Note archived.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print note' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()

    const archived = persistedNote()
    expect(archived.archivedAt).toEqual(expect.any(String))
    expect(archived.version).toBe(note.version)
    expect(archived.updatedAt).toBe(note.updatedAt)
    expect(archived.notes).toBe(note.notes)

    await user.click(screen.getByRole('button', { name: 'Restore note' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Archive note' })).toBeInTheDocument()
    })

    expect(screen.getByText('Meeting Note restored.')).toBeInTheDocument()
    expect(screen.queryByText('Archived meeting note')).not.toBeInTheDocument()

    const restored = persistedNote()
    expect(restored.archivedAt).toBeNull()
    expect(restored.version).toBe(note.version)
    expect(restored.updatedAt).toBe(note.updatedAt)
    expect(restored.notes).toBe(note.notes)
  })

  it('keeps an archived project read-only even when its note is archived', async () => {
    renderDetail({ archivedNote: true, archivedProject: true })

    expect(await screen.findByText('Weekly delivery sync')).toBeInTheDocument()
    expect(screen.getByText('Archived project')).toBeInTheDocument()
    expect(screen.getByText('Archived meeting note')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Print note' })).toBeInTheDocument()

    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archive note' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Restore note' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows a storage error and does not archive a note when persistence fails', async () => {
    const user = userEvent.setup()
    renderDetail()

    await screen.findByText('Weekly delivery sync')

    const writeSpy = vi.spyOn(storageAdapter, 'write').mockImplementation(() => {
      throw new Error('Storage unavailable')
    })

    await user.click(screen.getByRole('button', { name: 'Archive note' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {
      name: 'Archive note',
    }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Storage unavailable')
    })

    expect(writeSpy).toHaveBeenCalled()
    expect(screen.queryByText('Archived meeting note')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archive note' })).toBeInTheDocument()
    expect(persistedNote().archivedAt).toBeNull()
  })
})
