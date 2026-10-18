// ADR-059 stages 1–2: local production-browser capture, 5-route smoke or 47-route inventory.
// Neither mode contacts W3C or claims HTML validity.
import { createHash } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HTML_QA_ROUTES, HTML_QA_SMOKE, HTML_QA_ALL, verifyReadiness } from './qa-html-routes.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = path.join(ROOT, 'w3c-audit', 'html') // w3c-audit is already gitignored.
const BASE = '/helmsight/'
const LESSON = Object.freeze({
  id: 'qa-html-lesson', projectId: 'demo-project', category: 'planning',
  title: 'Synthetic HTML QA lesson', situation: 'A synthetic project delivery example.',
  lesson: 'Review dependencies before release.', recommendation: 'Validate delivery readiness together.',
  createdAt: '2026-10-06T12:00:00.000Z', updatedAt: '2026-10-06T12:00:00.000Z',
})

export function requireSmokeArgs(args) {
  if (args.length !== 1 || !['--smoke', '--all'].includes(args[0])) {
    throw new Error('Supported: node scripts/qa-html-smoke.mjs --smoke | --all (capture only; never W3C validation)')
  }
}

export function smokeStatus(rows, required = HTML_QA_SMOKE) {
  const ids = new Set(rows.map((row) => row.pattern))
  if (ids.size !== rows.length) return 'UNVERIFIED'
  if (rows.length !== required.length || required.some((item) => !ids.has(item.pattern))) return 'UNVERIFIED'
  return rows.every((row) => row.status === 'CAPTURED' && /^[a-f\d]{64}$/.test(row.sha256))
    ? 'CAPTURED — NOT W3C VALIDATED'
    : 'UNVERIFIED'
}

export function allCaptureStatus(rows, required = HTML_QA_ALL) {
  const declared = new Map(required.map((spec) => [spec.pattern, spec]))
  if (rows.length !== declared.size || new Set(rows.map((row) => row.pattern)).size !== declared.size) return 'UNVERIFIED'
  if (!rows.every((row) => declared.has(row.pattern) &&
      row.status === 'CAPTURED' &&
      row.path === HTML_QA_ROUTES.find((route) => route.pattern === row.pattern)?.path &&
      /^[a-f\d]{64}$/.test(row.sha256) && Number.isSafeInteger(row.bytes) && row.bytes >= 1000)) return 'UNVERIFIED'
  return 'CAPTURED — NOT W3C VALIDATED'
}

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close((error) => error ? reject(error) : resolve(port))
    })
  })
}

async function waitForPreview(url, child) {
  for (let tries = 0; tries < 50; tries += 1) {
    if (child.exitCode !== null) throw new Error(`Vite preview exited with code ${child.exitCode}`)
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(900) })
      if (response.ok && (response.headers.get('content-type') ?? '').includes('text/html')) return
    } catch { /* Vite is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error('Vite preview did not respond in time')
}

async function captureRoute(browser, origin, spec) {
  const row = HTML_QA_ROUTES.find((route) => route.pattern === spec.pattern)
  if (!row) throw new Error(`Missing manifest pattern: ${spec.pattern}`)
  const context = await browser.newContext({
    locale: 'en-US', timezoneId: 'UTC', viewport: { width: 1365, height: 900 },
    colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block',
  })
  const file = `${HTML_QA_ROUTES.indexOf(row) + 1}-${row.pattern === '/' ? 'landing' : row.pattern.replace(/[^a-z\d]+/gi, '-').replace(/^-|-$/g, '')}.html`
  // Fail-closed: previous snapshots cannot be reused when this run fails.
  await fs.rm(path.join(OUTPUT, file), { force: true })
  let page
  try {
    // Every context is ephemeral: never connects to the owner's Chrome profile or storage.
    await context.addInitScript((lesson) => {
      globalThis.localStorage.setItem('helmsight:p0:v1:lessonsLearned', JSON.stringify([lesson]))
    }, LESSON)
    page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    const url = new URL(`${BASE.replace(/\/$/, '')}${row.path}${spec.query ?? ''}`, origin)
    const response = await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 25000 })
    if (!response || !response.ok()) throw new Error(`HTTP ${response?.status() ?? 'no response'}`)
    const ready = page.locator(spec.selector).first()
    await ready.waitFor({ state: 'visible', timeout: 15000 })
    if (spec.expectedText) {
      // Live assertion handles async record loading; a stale/not-found shell cannot pass.
      await ready.filter({ hasText: spec.expectedText }).waitFor({ state: 'visible', timeout: 15000 })
    }
    if (spec.form) {
      await page.locator(spec.formSelector ?? '[data-report-root="true"] form, [data-project-workspace="true"] > section form')
        .first().waitFor({ state: 'visible', timeout: 15000 })
    }
    if (new URL(page.url()).pathname !== url.pathname) throw new Error(`Unexpected redirect to ${page.url()}`)
    await page.waitForFunction(() => !globalThis.document.documentElement.hasAttribute('data-app-booting'), null, { timeout: 6000 })
    if (await page.getByRole('heading', { name: 'HelmSight could not start safely' }).count()) {
      throw new Error('Application startup failed')
    }
    if (await page.getByRole('status', { name: 'Loading HelmSight' }).count()) {
      throw new Error('Route loading fallback remains visible')
    }
    if (errors.length) throw new Error(`Uncaught page error: ${errors.join(' | ')}`)
    const html = await page.evaluate(() => '<!doctype html>\n' + globalThis.document.documentElement.outerHTML)
    if (html.length < 1000 || !html.includes('id="root"')) throw new Error('Suspicious/incomplete rendered document')
    const sha256 = createHash('sha256').update(html).digest('hex')
      await fs.writeFile(path.join(OUTPUT, file), html, 'utf8')
    return { pattern: row.pattern, path: row.path, status: 'CAPTURED', file, sha256, bytes: Buffer.byteLength(html) }
  } catch (error) {
    return { pattern: row.pattern, path: row.path, status: 'UNVERIFIED', reason: error.message }
  } finally {
    await context.close()
  }
}

export async function run() {
  requireSmokeArgs(process.argv.slice(2))
  const isAll = process.argv[2] === '--all'
  const selected = isAll ? HTML_QA_ALL : HTML_QA_SMOKE
  if (isAll) verifyReadiness(selected)
  await fs.mkdir(OUTPUT, { recursive: true })
  const startedAt = new Date().toISOString()
  // No user data or remote deployment is involved; local production build only.
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', `--base=${BASE}`], { cwd: ROOT, stdio: 'inherit' })
  const port = await reservePort()
  const url = `http://127.0.0.1:${port}`
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort', `--base=${BASE}`], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
  })
  let previewLogs = ''
  vite.stdout.on('data', (chunk) => { previewLogs += chunk.toString().slice(-2500) })
  vite.stderr.on('data', (chunk) => { previewLogs += chunk.toString().slice(-2500) })
  let browser
  try {
    await waitForPreview(`${url}${BASE}`, vite)
    const { chromium } = await import('@playwright/test')
    browser = await chromium.launch({ headless: true })
    const rows = []
    for (const spec of selected) {
      const result = await captureRoute(browser, url, spec)
      rows.push(result)
      process.stdout.write(`${result.status}: ${result.path}${result.reason ? ` — ${result.reason}` : ''}\n`)
    }
    const status = isAll ? allCaptureStatus(rows, selected) : smokeStatus(rows)
    const report = {
      kind: isAll ? 'html-qa-all-route-capture' : 'html-qa-smoke-capture', capturedAt: startedAt,
      browser: 'Chromium', base: BASE, localhostOnly: true,
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
      buildIndexSha256: createHash('sha256').update(await fs.readFile(path.join(ROOT, 'dist', 'index.html'))).digest('hex'),
      routeInventory: HTML_QA_ROUTES.length, selected: selected.length,
      captured: rows.filter((row) => row.status === 'CAPTURED').length,
      status, htmlW3c: 'NOT VERIFIED', rows,
    }
    const reportName = isAll ? 'all' : 'smoke'
    await fs.writeFile(path.join(OUTPUT, `${reportName}.json`), JSON.stringify(report, null, 2) + '\n')
    const lines = [isAll ? '# HelmSight HTML QA — 47-route capture' : '# HelmSight HTML QA — capture smoke', '',
      `Generated: ${startedAt}`, `Routes captured: ${report.captured}/${report.selected}; full inventory: ${report.routeInventory}`,
      `Status: ${status}`, 'W3C HTML: NOT VERIFIED — no validator requests were made', '',
      ...rows.map((row) => `- ${row.status}: ${row.path}${row.reason ? ` — ${row.reason}` : ''}`), '']
    await fs.writeFile(path.join(OUTPUT, `${reportName}.md`), lines.join('\n'))
    console.log(`\n${lines.join('\n')}`)
    if (status === 'UNVERIFIED') process.exitCode = 1
  } catch (error) {
    console.error(`HTML QA smoke startup failed: ${error.message}\n${previewLogs.slice(-1400)}`)
    process.exitCode = 1
  } finally {
    await browser?.close()
    vite.kill('SIGTERM')
  }
}

// Do not launch browser/network on import; enables offline Node unit tests.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => { console.error(error); process.exitCode = 1 })
}
