import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeetingNoteForm } from './MeetingNoteForm.jsx'

const originalScrollHeight = Object.getOwnPropertyDescriptor(
  HTMLTextAreaElement.prototype,
  'scrollHeight',
)

afterEach(() => {
  if (originalScrollHeight) {
    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', originalScrollHeight)
  } else {
    delete HTMLTextAreaElement.prototype.scrollHeight
  }
})

describe('MeetingNoteForm textarea sizing', () => {
  it('grows notes and list textareas as their content changes', () => {
    let measuredHeight = 150
    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => measuredHeight,
    })

    const { container } = render(
      <MemoryRouter>
        <MeetingNoteForm
          cancelTo="/meetings"
          submitLabel="Create note"
          onSubmit={async () => true}
        />
      </MemoryRouter>,
    )

    const textareas = container.querySelectorAll('textarea[data-auto-grow]')
    expect(textareas.length).toBe(3)
    for (const textarea of textareas) expect(textarea.style.height).toBe('150px')

    measuredHeight = 220
    fireEvent.change(screen.getByPlaceholderText(/Capture the key discussion/), {
      target: { value: 'A longer meeting discussion with a decision.' },
    })
    expect(textareas[0].style.height).toBe('220px')
  })
})

function renderMeetingForm(onSubmit = vi.fn().mockResolvedValue(true)) {
  render(
    <MemoryRouter>
      <MeetingNoteForm cancelTo="/meetings" submitLabel="Create note" onSubmit={onSubmit} />
    </MemoryRouter>,
  )
  return onSubmit
}

describe('MeetingNoteForm character limits', () => {
  it('shows live counts for required fields and optional list rows without truncation', () => {
    renderMeetingForm()

    expect(screen.getByText('0 / 5,000 characters')).toBeInTheDocument()
    expect(screen.getAllByText('0 / 400 characters')).toHaveLength(2)

    fireEvent.change(screen.getByRole('textbox', { name: /Title/i }), {
      target: { value: 'x'.repeat(141) },
    })
    expect(screen.getByText('141 / 140 characters')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /Owner/i }), {
      target: { value: '  Alex Morgan  ' },
    })
    expect(screen.getByText('11 / 100 characters')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/Capture the key discussion/), {
      target: { value: 'x'.repeat(5001) },
    })
    expect(screen.getByText('5,001 / 5,000 characters')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Capture the key discussion/)).toHaveValue('x'.repeat(5001))

    fireEvent.change(screen.getByPlaceholderText('Decision made during the meeting'), {
      target: { value: 'x'.repeat(401) },
    })
    expect(screen.getByText('401 / 400 characters')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Owner — follow-up and target timing'), {
      target: { value: 'x'.repeat(400) },
    })
    expect(screen.getByText('400 / 400 characters')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('e.g. Maya Chen'), {
      target: { value: 'x'.repeat(101) },
    })
    expect(screen.getByText('101 / 100 characters')).toBeInTheDocument()
  })

  it('blocks an over-limit submission, then accepts the maximum of 5,000 characters', async () => {
    const onSubmit = renderMeetingForm()

    fireEvent.change(screen.getByRole('textbox', { name: /Title/i }), {
      target: { value: 'Sprint review' },
    })
    fireEvent.change(screen.getByLabelText(/Meeting date/i), {
      target: { value: '2026-10-09' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: /Owner/i }), {
      target: { value: 'Alex Morgan' },
    })
    const notes = screen.getByPlaceholderText(/Capture the key discussion/)
    fireEvent.change(notes, { target: { value: 'x'.repeat(5001) } })
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }))

    expect(await screen.findByText('Use 5,000 characters or fewer.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(notes, { target: { value: 'x'.repeat(5000) } })
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].notes).toHaveLength(5000)
  })
})
