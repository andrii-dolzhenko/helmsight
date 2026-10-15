import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { storageAdapter } from '../../shared/services/storage/storageAdapter.js'
import { LessonsLearnedPage } from './LessonsLearnedPage.jsx'
import { LessonDetailPage } from './LessonDetailPage.jsx'
import { LessonEditorPage } from './LessonEditorPage.jsx'

const demoLessons = [
  { id: 'a', projectId: 'p1', title: 'Improve release handoff', category: 'communication', situation: 'Support was notified late.', lesson: 'Communicate early.', recommendation: 'Use a delivery checklist.', createdAt: '2026-10-01T09:00:00Z', updatedAt: '2026-10-02T09:00:00Z' },
  { id: 'b', projectId: 'p1', title: 'Review sponsor cadence', category: 'stakeholders', situation: 'Review meetings were delayed.', lesson: 'Book sessions earlier.', recommendation: 'Confirm sponsor calendar.', createdAt: '2026-10-05T09:00:00Z', updatedAt: '2026-10-06T09:00:00Z' },
  { id: 'c', projectId: 'p2', title: 'Private project record', category: 'planning', situation: 'Other', lesson: 'Other', recommendation: 'Other', createdAt: '2026-10-07T09:00:00Z', updatedAt: '2026-10-07T09:00:00Z' },
]

function renderLessons(path = '/projects/p1/lessons', archived = false) {
  const project = { id: 'p1', name: 'Demo Project', archivedAt: archived ? '2026-10-10T10:00:00Z' : null }
  storageAdapter.write('projects', [{ ...project }, { id: 'p2', name: 'Other project', archivedAt: null }])
  const router = createMemoryRouter([{ path: '/projects/:projectId', element: <Outlet context={{ project }} />, children: [
    { path: 'lessons', element: <LessonsLearnedPage /> },
    { path: 'lessons/new', element: <LessonEditorPage /> },
    { path: 'lessons/:lessonId', element: <LessonDetailPage /> },
    { path: 'lessons/:lessonId/edit', element: <LessonEditorPage /> },
  ] }], { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('Lessons Learned project workspace', () => {
  beforeEach(() => { window.localStorage.clear(); storageAdapter.write('lessonsLearned', demoLessons) })

  it('shows only this project, filters and clears results', async () => {
    const user = userEvent.setup()
    renderLessons()
    expect(await screen.findByRole('link', { name: 'Improve release handoff' })).toBeInTheDocument()
    expect(screen.getByText('Review sponsor cadence')).toBeInTheDocument()
    expect(screen.queryByText('Private project record')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Category'), 'communication')
    expect(screen.queryByText('Review sponsor cadence')).not.toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: 'Search lessons' }), 'nonsense')
    expect(screen.getByText('No lessons match your filters.')).toBeInTheDocument()
    await user.click(within(screen.getByRole('group', { name: 'Filter Lessons Learned' })).getByRole('button', { name: 'Reset filters' }))
    expect(screen.getByText('Review sponsor cadence')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Sort by'), 'oldest')
    expect(screen.getByLabelText('Sort by')).toHaveValue('oldest')
    await user.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(screen.getByLabelText('Sort by')).toHaveValue('newest')
    expect(screen.getByLabelText('Category')).toHaveValue('all')
    expect(screen.getByRole('searchbox', { name: 'Search lessons' })).toHaveValue('')
  })

  it('shows a read-only detail and hides mutation controls for an archived project', async () => {
    const user = userEvent.setup()
    renderLessons('/projects/p1/lessons', true)
    expect(await screen.findByText('Improve release handoff')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /New lesson/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Improve release handoff' }))
    expect(await screen.findByRole('heading', { name: 'Situation' })).toBeInTheDocument()
    expect(screen.getByText('Support was notified late.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit lesson' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete lesson' })).not.toBeInTheDocument()
  })

  it('requires confirmation to delete and preserves other project records', async () => {
    const user = userEvent.setup()
    renderLessons()
    const card = (await screen.findByText('Improve release handoff')).closest('article')
    await user.click(within(card).getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Keep editing' }))
    expect(storageAdapter.read('lessonsLearned')).toHaveLength(3)
    await user.click(within(card).getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete lesson' }))
    await waitFor(() => expect(storageAdapter.read('lessonsLearned').map((x) => x.id)).toEqual(['b', 'c']))
    expect(screen.queryByText('Improve release handoff')).not.toBeInTheDocument()
    expect(screen.getByText('Lesson deleted.').closest('[role="status"]')).toHaveAttribute('data-print-hide', 'true')
  })

  it('creates a lesson, validates required fields and opens the saved detail', async () => {
    const user = userEvent.setup()
    renderLessons('/projects/p1/lessons/new')
    await user.click(screen.getByRole('button', { name: 'Create lesson' }))
    expect(await screen.findByText('Title is required.')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Title/), 'Planning retrospective')
    await user.selectOptions(screen.getByLabelText(/Category/), 'planning')
    await user.type(screen.getByLabelText(/Situation/), 'An unexpected dependency blocked delivery.')
    await user.type(screen.getByLabelText(/^Lesson/), 'Review partner readiness early.')
    await user.type(screen.getByLabelText(/Recommendation/), 'Include dependency checks in kickoff.')
    await user.click(screen.getByRole('button', { name: 'Create lesson' }))
    expect(await screen.findByRole('heading', { name: 'Planning retrospective' })).toBeInTheDocument()
    expect(storageAdapter.read('lessonsLearned')).toHaveLength(4)
    expect(storageAdapter.read('lessonsLearned')[0]).toEqual(expect.objectContaining({ projectId: 'p1', category: 'planning' }))
    expect(storageAdapter.read('draft:lesson-learned:p1:new')).toBeNull()
    expect(screen.getByText('Lesson created.').closest('[role="status"]')).toHaveAttribute('data-print-hide', 'true')
  })

  it('edits the existing lesson without changing ownership or creating duplicates', async () => {
    const user = userEvent.setup()
    renderLessons('/projects/p1/lessons/a/edit')
    const title = await screen.findByLabelText(/Title/)
    expect(title).toHaveValue('Improve release handoff')
    await user.clear(title)
    await user.type(title, 'Release readiness checklist')
    await user.click(screen.getByRole('button', { name: 'Save lesson' }))
    expect(await screen.findByRole('heading', { name: 'Release readiness checklist' })).toBeInTheDocument()
    const records = storageAdapter.read('lessonsLearned')
    expect(records).toHaveLength(3)
    expect(records.find((item) => item.id === 'a')).toEqual(expect.objectContaining({
      title: 'Release readiness checklist', projectId: 'p1', createdAt: demoLessons[0].createdAt,
    }))
    expect(records.find((item) => item.id === 'c')).toEqual(demoLessons[2])
    expect(screen.getByText('Lesson updated.').closest('[role="status"]')).toHaveAttribute('data-print-hide', 'true')
  })

  it('requires two non-whitespace characters in every required form field', async () => {
    const user = userEvent.setup()
    renderLessons('/projects/p1/lessons/new')
    await user.type(screen.getByLabelText(/Title/), 'a')
    await user.type(screen.getByLabelText(/Situation/), 'b')
    await user.type(screen.getByLabelText(/^Lesson/), 'c')
    await user.type(screen.getByLabelText(/Recommendation/), 'd')
    await user.click(screen.getByRole('button', { name: 'Create lesson' }))
    expect(await screen.findAllByText('Use at least 2 characters.')).toHaveLength(4)
    expect(storageAdapter.read('lessonsLearned')).toHaveLength(3)

    const title = screen.getByLabelText(/Title/)
    await user.clear(title)
    await user.type(title, '  x  ')
    await user.click(screen.getByRole('button', { name: 'Create lesson' }))
    expect(screen.getAllByText('Use at least 2 characters.')).toHaveLength(4)
  })

  it('restores an unsaved draft and allows discarding it', async () => {
    const user = userEvent.setup()
    storageAdapter.write('draft:lesson-learned:p1:a', {
      values: { ...demoLessons[0], title: 'Unsaved revised handoff' }, savedAt: '2026-10-15T08:00:00.000Z',
    })
    renderLessons('/projects/p1/lessons/a/edit')
    expect(await screen.findByText('Draft restored')).toBeInTheDocument()
    expect(screen.getByLabelText(/Title/)).toHaveValue('Unsaved revised handoff')
    await user.click(screen.getByRole('button', { name: 'Discard draft' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Discard draft' }))
    expect(screen.getByLabelText(/Title/)).toHaveValue('Improve release handoff')
    expect(storageAdapter.read('draft:lesson-learned:p1:a')).toBeNull()
  })

  it('rejects an edit route for another project', async () => {
    const router = renderLessons('/projects/p1/lessons/c/edit')
    expect(await screen.findByText('Lesson not found.')).toBeInTheDocument()
    router.dispose()
  })

  it('blocks new lessons for archived projects even on direct editor navigation', () => {
    renderLessons('/projects/p1/lessons/new', true)
    expect(screen.getByText('Archived project')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create lesson' })).not.toBeInTheDocument()
  })
})
