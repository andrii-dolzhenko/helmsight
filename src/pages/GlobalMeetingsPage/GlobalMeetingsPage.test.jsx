import { configureStore } from '@reduxjs/toolkit'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import projectsReducer, { createProjectsInitialState } from '../../features/projects/model/projectsSlice.js'
import meetingsReducer, { createMeetingsInitialState } from '../../features/meetings/model/meetingsSlice.js'
import { GlobalMeetingsPage } from './GlobalMeetingsPage.jsx'

const projects = [
  { id: 'atlas', name: 'Atlas', archivedAt: null },
  { id: 'beacon', name: 'Beacon', archivedAt: '2026-10-02T10:00:00.000Z' },
]
const meetingData = [
  { id: 'one', projectId: 'atlas', title: 'Atlas Kickoff', meetingDate: '2026-10-01', updatedAt: '2026-10-02T08:00:00.000Z' },
  { id: 'two', projectId: 'atlas', title: 'Risk Review', meetingDate: '2026-10-04', updatedAt: '2026-10-04T08:00:00.000Z', archivedAt: '2026-10-05T08:00:00.000Z' },
  { id: 'three', projectId: 'beacon', title: 'Beacon Planning', meetingDate: '2026-10-05', updatedAt: '2026-10-05T08:00:00.000Z' },
]

function renderPage({ meetingItems = meetingData, projectItems = projects } = {}) {
  const store = configureStore({
    reducer: { projects: projectsReducer, meetings: meetingsReducer },
    preloadedState: {
      projects: createProjectsInitialState(projectItems, 'succeeded'),
      meetings: createMeetingsInitialState(meetingItems, 'succeeded'),
    },
  })
  return render(<Provider store={store}><MemoryRouter><GlobalMeetingsPage /></MemoryRouter></Provider>)
}

describe('GlobalMeetingsPage', () => {
  it('shows real project-scoped KPI totals and links to existing meeting details', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Global Meetings' })).toBeInTheDocument()
    const summary = screen.getByLabelText('Portfolio meetings summary')
    expect(within(summary).getByText('Total meetings').parentElement).toHaveTextContent('2')
    expect(within(summary).getByText('Current notes').parentElement).toHaveTextContent('1')
    expect(within(summary).getByText('Archived notes').parentElement).toHaveTextContent('1')
    expect(screen.getByRole('link', { name: 'Open meeting note: Atlas Kickoff' }))
      .toHaveAttribute('href', '/projects/atlas/meetings/one')
    expect(screen.queryByText('Beacon Planning')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /New meeting/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Action')).not.toBeInTheDocument()
  })

  it('combines project archival and note lifecycle independently', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('checkbox', { name: 'Include archived projects' }))
    expect(screen.getByText('Beacon Planning')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Archived 1/i }))
    expect(screen.getByText('Risk Review')).toBeInTheDocument()
    expect(screen.queryByText('Atlas Kickoff')).not.toBeInTheDocument()
    expect(screen.queryByText('Beacon Planning')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Project' }), 'beacon')
    expect(screen.getByText('No archived meeting notes in this scope.')).toBeInTheDocument()
  })

  it('filters by title, resets filters and displays a no-match state', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'not found')
    expect(screen.getByText('No meeting notes match these filters.')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Reset filters' })[0])
    expect(screen.getByText('Atlas Kickoff')).toBeInTheDocument()
  })

  it('paginates more than ten notes and exposes page controls', async () => {
    const user = userEvent.setup()
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `note-${index}`,
      projectId: 'atlas',
      title: `Meeting ${index}`,
      meetingDate: '2026-10-01',
      updatedAt: `2026-10-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
    }))
    renderPage({ meetingItems: items })
    expect(screen.getAllByRole('link', { name: /Open meeting note:/ })).toHaveLength(10)
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getAllByRole('link', { name: /Open meeting note:/ })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows a genuine empty state when there are no notes', () => {
    renderPage({ meetingItems: [] })
    expect(screen.getByText('No portfolio meeting notes yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse projects' })).toHaveAttribute('href', '/projects')
  })
})
