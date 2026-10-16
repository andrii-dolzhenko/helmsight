import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HelpHeroAnimation } from './HelpHeroAnimation.jsx'
import animationSource from './questionAnimation.json'

const mocks = vi.hoisted(() => ({
  loadAnimation: vi.fn(),
  goToAndPlay: vi.fn(),
  goToAndStop: vi.fn(),
  destroy: vi.fn(),
  removeEventListener: vi.fn(),
}))

vi.mock('lottie-web', () => ({ default: { loadAnimation: mocks.loadAnimation } }))

beforeEach(() => {
  mocks.loadAnimation.mockImplementation(() => ({
    isLoaded: true,
    addEventListener: vi.fn(),
    removeEventListener: mocks.removeEventListener,
    goToAndPlay: mocks.goToAndPlay,
    goToAndStop: mocks.goToAndStop,
    destroy: mocks.destroy,
  }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Help hero Lottie', () => {
  it('uses the provided five-second artwork without autoplay looping', async () => {
    expect((animationSource.op - animationSource.ip) / animationSource.fr).toBe(5)
    const { container, unmount } = render(<HelpHeroAnimation />)
    await waitFor(() => expect(mocks.loadAnimation).toHaveBeenCalledTimes(1))
    const config = mocks.loadAnimation.mock.calls[0][0]
    expect(config.renderer).toBe('svg')
    expect(config.loop).toBe(false)
    expect(config.autoplay).toBe(false)
    expect(container.querySelector('[data-animation="help-question"]')).toHaveAttribute('aria-hidden', 'true')
    expect(mocks.goToAndPlay).toHaveBeenCalledWith(0, true)
    unmount()
    expect(mocks.destroy).toHaveBeenCalledOnce()
  })

  it('replays once at the thirty-second boundary and stops the timer on unmount', async () => {
    const listeners = new Map()
    const mediaQuery = {
      matches: false,
      addEventListener: vi.fn((type, callback) => listeners.set(type, callback)),
      removeEventListener: vi.fn((type) => listeners.delete(type)),
    }
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
    const { unmount } = render(<HelpHeroAnimation />)
    await waitFor(() => expect(mocks.goToAndPlay).toHaveBeenCalledTimes(1))

    // Reschedule with fake timers via the same OS preference-change callback.
    vi.useFakeTimers()
    act(() => listeners.get('change')())
    expect(mocks.goToAndPlay).toHaveBeenCalledTimes(2)

    act(() => vi.advanceTimersByTime(29_999))
    expect(mocks.goToAndPlay).toHaveBeenCalledTimes(2)
    act(() => vi.advanceTimersByTime(1))
    expect(mocks.goToAndPlay).toHaveBeenCalledTimes(3)

    unmount()
    act(() => vi.advanceTimersByTime(60_000))
    expect(mocks.goToAndPlay).toHaveBeenCalledTimes(3)
    expect(listeners.size).toBe(0)
  })

  it('shows the finished frame without autoplay when reduced motion is requested', async () => {
    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
    render(<HelpHeroAnimation />)
    await waitFor(() => expect(mocks.goToAndStop).toHaveBeenCalledWith(124, true))
    expect(mocks.goToAndPlay).not.toHaveBeenCalled()
  })
})
