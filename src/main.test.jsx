import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('application bootstrap safety', () => {
  const events = []

  beforeEach(() => {
    vi.resetModules()
    events.length = 0
    document.body.innerHTML = '<div id="root"></div>'
  })

  function configureBootstrap(recovery) {
    let renderedElement

    vi.doMock('react-dom/client', () => ({
      createRoot: () => ({
        render(element) {
          renderedElement = element
          events.push('render')
        },
      }),
    }))

    vi.doMock('./features/projects/api/projectDeletionService.js', () => ({
      projectDeletionService: {
        async recoverPendingDeletion() {
          events.push('recover')
          return recovery()
        },
      },
    }))

    vi.doMock('./App.jsx', () => {
      events.push('app-import')
      return { default: () => null }
    })

    vi.doMock('./app/providers/AppProviders.jsx', () => {
      events.push('providers-import')
      return { AppProviders: ({ children }) => children }
    })

    return () => renderedElement
  }

  it('waits for recovery before importing the app and Redux providers', async () => {
    let finishRecovery

    const pendingRecovery = new Promise((resolve) => {
      finishRecovery = resolve
    })

    configureBootstrap(() => pendingRecovery)

    await import('./main.jsx')

    expect(events).toEqual(['recover'])

    finishRecovery()

    await vi.waitFor(() => {
      expect(events).toContain('render')
    })

    expect(events.indexOf('app-import')).toBeGreaterThan(
      events.indexOf('recover'),
    )
    expect(events.indexOf('providers-import')).toBeGreaterThan(
      events.indexOf('recover'),
    )
    expect(events.at(-1)).toBe('render')
  })

  it('blocks application initialization when recovery fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      const getRenderedElement = configureBootstrap(() => {
        throw new Error('Recovery failed')
      })

      await import('./main.jsx')

      await vi.waitFor(() => {
        expect(events).toContain('render')
      })

      expect(events).toEqual(['recover', 'render'])
      expect(getRenderedElement().type).toBe('main')
      expect(getRenderedElement().props.role).toBe('alert')
    } finally {
      consoleSpy.mockRestore()
    }
  })
})
