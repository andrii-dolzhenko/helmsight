import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { HelpPage } from './HelpPage.jsx'
import { HELP_FAQS, HELP_TOPICS } from './helpContent.js'

function renderHelp() {
  return render(<MemoryRouter><HelpPage /></MemoryRouter>)
}

describe('Help Center', () => {
  it('shows all six topics and navigable anchors without implementation terminology', () => {
    renderHelp()
    expect(screen.getByRole('heading', { level: 1, name: 'Help Center' })).toBeInTheDocument()
    const topics = screen.getByRole('region', { name: 'Explore by topic' })
    expect(within(topics).getAllByRole('link')).toHaveLength(6)
    for (const topic of HELP_TOPICS) {
      expect(within(topics).getByRole('link', { name: new RegExp(topic.title, 'i') }))
        .toHaveAttribute('href', `#${topic.id}`)
      expect(screen.getByRole('region', { name: topic.title })).toHaveAttribute('id', topic.id)
    }
    expect(within(topics).getByRole('link', { name: /Frequently Asked Questions/ }))
      .toHaveAttribute('href', '#frequently-asked-questions')
    expect(screen.queryByText(/Redux|storageAdapter|ADR-0|course project|React framework/i)).not.toBeInTheDocument()
  })

  it('links to real portfolio destinations and includes EVM interpretation and data safety', () => {
    renderHelp()
    expect(screen.getByRole('link', { name: /Browse projects/ })).toHaveAttribute('href', '/projects')
    expect(screen.getByRole('link', { name: /Open Global Meetings/ })).toHaveAttribute('href', '/meetings')
    expect(screen.getByRole('link', { name: /Review Global Metrics/ })).toHaveAttribute('href', '/metrics')
    expect(screen.getByText(/SPI = EV ÷ PV/)).toBeInTheDocument()
    expect(screen.getByText(/For Story points, HelmSight does not calculate CPI/)).toBeInTheDocument()
    expect(screen.getByText(/It is not automatically synchronized to other devices/)).toBeInTheDocument()
  })

  it('mounts the supplied branded Lottie in a decorative hero container', () => {
    const { container } = renderHelp()
    const hero = container.querySelector('header[aria-labelledby="help-title"]')
    const symbol = hero.querySelector('[data-animation="help-question"]')
    expect(symbol).toHaveAttribute('aria-hidden', 'true')
    expect(symbol.querySelector('svg[viewBox="0 0 112 146"]')).not.toBeInTheDocument()
  })

  it('lets users open FAQ answers with native keyboard-accessible details', async () => {
    const user = userEvent.setup()
    const { container } = renderHelp()
    expect(container.querySelectorAll('details')).toHaveLength(HELP_FAQS.length)
    const first = screen.getByText('Where is my workspace information saved?')
    const details = first.closest('details')
    expect(details).not.toHaveAttribute('open')
    expect(details.querySelector('summary svg')).toHaveAttribute('viewBox', '0 0 20 20')
    expect(details.querySelector('summary svg path')).toHaveAttribute('stroke', 'currentColor')
    await user.click(first)
    expect(details).toHaveAttribute('open')
    expect(within(details).getByText(/Clearing browser data can permanently erase/)).toBeInTheDocument()
    await user.click(first)
    expect(details).not.toHaveAttribute('open')
  })
})
