import { afterAll, describe, expect, it } from 'vitest'
import { router } from './router.jsx'
import { getLeafRoutePatterns, verifyManifest } from '../../../scripts/qa-html-routes.mjs'

afterAll(() => router.dispose())

describe('ADR-059 rendered HTML QA route inventory', () => {
  it('covers every current React Router leaf template, including index and Not Found', () => {
    expect(verifyManifest(getLeafRoutePatterns(router.routes))).toBe(true)
  })
})
