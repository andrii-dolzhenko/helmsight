import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TextList } from './GovernancePage.jsx'

describe('Governance text lists', () => {
  it('renders repeated charter statements without duplicate React keys', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      render(<TextList items={[
        'External integration partners meet reviewed dependency dates.',
        'External integration partners meet reviewed dependency dates.',
      ]} />)

      expect(screen.getAllByText('External integration partners meet reviewed dependency dates.')).toHaveLength(2)
      expect(consoleSpy.mock.calls.join(' ')).not.toMatch(/same key|unique "key"/i)
    } finally {
      consoleSpy.mockRestore()
    }
  })
})
