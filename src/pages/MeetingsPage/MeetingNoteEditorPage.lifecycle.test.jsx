import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { MeetingNoteEditorPage } from './MeetingNoteEditorPage.jsx'

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

function renderEditor({
  archivedNote = false,
  archivedProject = false,
  createMode = false,
} = {}) {
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
          path: 'meetings/new',
          element: <MeetingNoteEditorPage />,
        },
        {
          path: 'meetings/:meetingId/edit',
          element: <MeetingNoteEditorPage />,
        },
        {
          path: 'meetings/:meetingId',
          element: <div>Meeting detail destination</div>,
        },
      ],
    },
  ], {
    initialEntries: [
      createMode
        ? '/projects/project-1/meetings/new'
        : '/projects/project-1/meetings/note-1/edit',
    ],
  })

  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )

  return { router }
}

describe('Meeting Note editor lifecycle guards', () => {
  beforeEach(() => window.localStorage.clear())

  it('allows editing a current note in an active project', async () => {
    renderEditor()

    expect(await screen.findByRole('button', { name: 'Save note' }))
      .toBeInTheDocument()
    expect(screen.getByText('Edit meeting record')).toBeInTheDocument()
    expect(screen.queryByText('Archived Meeting Notes are read-only.'))
      .not.toBeInTheDocument()
  })

  it('blocks a direct edit URL for an archived note and links to its detail', async () => {
    const user = userEvent.setup()
    const { router } = renderEditor({ archivedNote: true })

    expect(await screen.findByText('Archived Meeting Notes are read-only.'))
      .toBeInTheDocument()
    expect(screen.getByText('Restore this note before editing its content.'))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save note' }))
      .not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'View archived note' }))

    expect(router.state.location.pathname)
      .toBe('/projects/project-1/meetings/note-1')

    const persisted = storageAdapter.read('meetingNotes')[0]
    expect(persisted.archivedAt).toBe('2026-10-10T12:00:00.000Z')
    expect(persisted.version).toBe(2)
  })

  it('blocks editing a note when its project is archived', async () => {
    renderEditor({ archivedProject: true })

    expect(await screen.findByText('Archived projects are read-only.'))
      .toBeInTheDocument()
    expect(screen.getByText(
      'Restore the project before creating or editing Meeting Notes.',
    )).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save note' }))
      .not.toBeInTheDocument()
  })

  it('blocks creating a note when its project is archived', async () => {
    renderEditor({ archivedProject: true, createMode: true })

    expect(await screen.findByText('Archived projects are read-only.'))
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create note' }))
      .not.toBeInTheDocument()
  })
})
