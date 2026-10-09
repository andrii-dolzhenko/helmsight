import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { EvmSnapshotForm } from './EvmSnapshotForm.jsx'

const baseline = {
  projectId: 'project-1',
  measurementBasis: 'storyPoints',
  currencyCode: 'USD',
  workPackages: [{ id: 'wp-1', title: 'Frontend', startDate: '2026-10-05', endDate: '2026-10-09', budgetValue: 20 }],
}

describe('EvmSnapshotForm', () => {
  it('keeps story points in earned-value schedule mode without actual-cost input', () => {
    render(<MemoryRouter><EvmSnapshotForm baseline={baseline} snapshots={[]} draftKey="test-evm-snapshot" cancelTo="/metrics" onSubmit={vi.fn()} /></MemoryRouter>)
    expect(screen.getByLabelText(/Earned Value this week \(SP\)/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Actual/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Not used for Story points/i)).toBeInTheDocument()
  })
})
