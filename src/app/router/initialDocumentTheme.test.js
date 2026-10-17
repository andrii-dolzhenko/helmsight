import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const bootScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]

function runDocumentBoot(pathname, { base = '/', storedTheme = null, prefersDark = false } = {}) {
  const root = { dataset: {} }
  const meta = { content: '#f5f1e8', setAttribute(_name, value) { this.content = value } }
  const document = {
    documentElement: root,
    querySelector: () => meta,
  }
  const window = {
    location: { pathname },
    localStorage: { getItem: () => storedTheme && JSON.stringify({ themeMode: storedTheme }) },
    matchMedia: () => ({ matches: prefersDark }),
  }

  runInNewContext(bootScript.replaceAll('%BASE_URL%', base), { document, window })
  return { dataset: root.dataset, themeColor: meta.content }
}

describe('initial document paint', () => {
  it.each([
    ['/', '/'],
    ['/sign-in', '/'],
    ['/sign-up', '/'],
    ['/forgot-password', '/'],
    ['/reset-password', '/'],
    ['/helmsight/', '/helmsight/'],
    ['/helmsight/sign-in', '/helmsight/'],
    ['/helmsight/sign-up/', '/helmsight/'],
    ['/helmsight/forgot-password', '/helmsight/'],
    ['/helmsight/reset-password', '/helmsight/'],
  ])('paints public route %s dark before mounting React', (pathname, base) => {
    const result = runDocumentBoot(pathname, { base, storedTheme: 'light' })
    expect(result.dataset.publicPage).toBe('true')
    expect(result.themeColor).toBe('#02090d')
  })

  it.each([
    ['/overview', '/'],
    ['/settings', '/'],
    ['/helmsight/overview', '/helmsight/'],
  ])('preserves the saved workspace theme for %s', (pathname, base) => {
    const result = runDocumentBoot(pathname, { base, storedTheme: 'light' })
    expect(result.dataset.publicPage).toBeUndefined()
    expect(result.dataset.theme).toBe('light')
    expect(result.themeColor).toBe('#f5f1e8')
  })

  it('retains the dark workspace bootstrap theme', () => {
    const result = runDocumentBoot('/overview', { storedTheme: 'dark' })
    expect(result.dataset.theme).toBe('dark')
    expect(result.themeColor).toBe('#111512')
  })

  it('keeps Auth dark even when the saved workspace theme is light', () => {
    const result = runDocumentBoot('/sign-in', { storedTheme: 'light' })
    expect(result.dataset.theme).toBe('light')
    expect(result.themeColor).toBe('#02090d')
  })

  it('resolves the system theme for workspace routes', () => {
    const result = runDocumentBoot('/overview', { prefersDark: true })
    expect(result.dataset.theme).toBe('dark')
    expect(result.themeColor).toBe('#111512')
  })
})
