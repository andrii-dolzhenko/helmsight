import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppStore } from '../../app/store/store.js'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { MeetingsPage } from './MeetingsPage.jsx'

const meetings = [
  {
    id: 'current-note',
    projectId: 'project-1',
    title: 'Weekly delivery sync',
    meetingDate: '2026-10-08',
    owner: 'Alex Morgan',
    participants: ['Alex Morgan', 'Maya Chen'],
    notes: 'Reviewed the current delivery baseline.',
    decisions: ['Continue the approved plan.'],
    followUps: [],
    version: 2,
    archivedAt: null,
    createdAt: '2026-10-08T09:00:00.000Z',
    updatedAt: '2026-10-08T10:00:00.000Z',
  },
  {
    id: 'archived-note',
    projectId: 'project-1',
    title: 'Archived retrospective',
    meetingDate: '2026-09-15',
    owner: 'Maya Chen',
    participants: ['Maya Chen'],
    notes: 'Recorded retrospective findings.',
    decisions: ['Archive the completed record.'],
    followUps: [],
    version: 1,
    archivedAt: '2026-10-01T12:00:00.000Z',
    createdAt: '2026-09-15T09:00:00.000Z',
    updatedAt: '2026-09-15T10:00:00.000Z',
  },
]

function renderMeetings({ archivedProject = false } = {}) {
  const project = {
    id: 'project-1',
    name: 'Project One',
    archivedAt: archivedProject ? '2026-10-10T12:00:00.000Z' : null,
  }

  const store = createAppStore()
  const router = createMemoryRouter([
    {
      path: '/projects/:projectId',
      element: <Outlet context={{ project }} />,
      children: [
        { path: 'meetings', element: <MeetingsPage /> },
        { path: 'meetings/:meetingId', element: <div>Meeting detail destination</div> },
      ],
    },
  ], { initialEntries: ['/projects/project-1/meetings'] })

  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )

  return { router }
}

describe('Meeting Notes lifecycle views', () => {
  beforeEach(() => {
    window.localStorage.clear()
    storageAdapter.write('meetingNotes', meetings)
  })

  it('filters Current and Archived without changing summary KPIs', async () => {
    const user = userEvent.setup()
    renderMeetings()

    expect(await screen.findByText('Weekly delivery sync')).toBeInTheDocument()
    expect(screen.queryByText('Archived retrospective')).not.toBeInTheDocument()

    const tabs = screen.getByRole('tablist', {
      name: 'Meeting Notes lifecycle view',
    })
    expect(within(tabs).getByRole('tab', { name: /Current\s*1/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(tabs).getByRole('tab', { name: /Archived\s*1/ })).toHaveAttribute('aria-selected', 'false')

    const summary = screen.getByLabelText('Meeting Notes summary')
    expect(within(summary).getByText('Meeting notes').parentElement).toHaveTextContent('2')
    expect(within(summary).getByText('Recorded decisions').parentElement).toHaveTextContent('2')

    await user.click(within(tabs).getByRole('tab', { name: /Archived\s*1/ }))

    expect(screen.getByText('Archived retrospective')).toBeInTheDocument()
    expect(screen.queryByText('Weekly delivery sync')).not.toBeInTheDocument()
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'archived-meetings-tab')
    expect(within(summary).getByText('Meeting notes').parentElement).toHaveTextContent('2')
    expect(within(summary).getByText('Recorded decisions').parentElement).toHaveTextContent('2')
  })

  it('provides labeled metadata in Current and Archived meeting cards', async () => {
    const user = userEvent.setup()
    renderMeetings()

    const currentRow = await screen.findByRole('link', {
      name: /Weekly delivery sync/,
    })

    for (const label of ['Meeting date', 'Participants', 'Version', 'Last updated']) {
      expect(within(currentRow).getByText(label)).toBeInTheDocument()
    }

    expect(within(currentRow).getByText('Participants').parentElement)
      .toHaveTextContent('2')
    expect(within(currentRow).getByText('Version').parentElement)
      .toHaveTextContent('v2')

    await user.click(screen.getByRole('tab', { name: /Archived\s*1/ }))

    const archivedRow = screen.getByRole('link', {
      name: /Archived retrospective/,
    })

    for (const label of ['Meeting date', 'Participants', 'Version', 'Last updated']) {
      expect(within(archivedRow).getByText(label)).toBeInTheDocument()
    }

    expect(within(archivedRow).getByText('Participants').parentElement)
      .toHaveTextContent('1')
    expect(within(archivedRow).getByText('Version').parentElement)
      .toHaveTextContent('v1')
  })

  it('supports arrow keys, Home and End with correct focus', async () => {
    const user = userEvent.setup()
    renderMeetings()

    await screen.findByText('Weekly delivery sync')

    const current = screen.getByRole('tab', { name: /Current\s*1/ })
    const archived = screen.getByRole('tab', { name: /Archived\s*1/ })

    await user.click(current)
    await user.keyboard('{ArrowRight}')
    expect(archived).toHaveFocus()
    expect(archived).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Home}')
    expect(current).toHaveFocus()
    expect(current).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{End}')
    expect(archived).toHaveFocus()
    expect(archived).toHaveAttribute('aria-selected', 'true')
  })

  it('shows a distinct Current empty state and keeps archived projects read-only', async () => {
    storageAdapter.write('meetingNotes', [meetings[1]])
    const user = userEvent.setup()
    renderMeetings({ archivedProject: true })

    expect(await screen.findByText('No current meeting notes.')).toBeInTheDocument()
    expect(screen.getByText('All Meeting Notes are archived. Restore a note to return it to Current.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /New meeting note/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Archived\s*1/ }))

    expect(screen.getByText('Archived retrospective')).toBeInTheDocument()
    expect(screen.getByText('Archived project')).toBeInTheDocument()
  })
})
