# HelmSight P0.1 — Stage 44: Zero CSS Errors (JS property registration pilot)

## Decision and scope

**Status: ACCEPTED — automated checks and shown desktop Light/Dark radar QA PASS; final P0.1 release gate remains pending.**

The W3C CSS Validator (`css3svg`, Normal warning level 1) records `Unrecognized at-rule “@property”` on the registered, standards-based radar token. Stage 41 verified that removing the typed registration makes the pulse jump. The target is **0 W3C CSS Errors**, retaining the same typed animation rather than removing it.

- Remove only the top-level `@property --radar-wave-radius` block from `ProjectOverviewPage.module.css`.
- Register the **same exact** descriptors via `CSS.registerProperty()` at module initialization of the lazy-loaded `ProjectOverviewPage.jsx`, **before** React renders the pulse element.
- Feature-detect the JS API; browsers without support use the same untyped fallback as browsers that ignored `@property`.
- Catch only `InvalidModificationError` from duplicate registration (e.g. Vite HMR). Re-throw unexpected registration errors instead of silently treating them as success.
- Keep `--radar-wave-radius`, all `@keyframes` stops, radar SVG `mask-*`/`-webkit-mask-*`, media queries, themes and reduced-motion unchanged.
- Extend source-transform tests, 4 isolated registrar tests, and production guard to assert **built JS registration** and **built CSS absence of `@property`**. No change to the W3C audit service or its counters.

## Boundaries and risks

This uses a standard alternative in the CSS Properties and Values API, but its runtime initialization is not identical to parsing a stylesheet at arbitrary points in time: the property becomes registered when the lazy page's JS module executes. This happens before this module renders the radar, but other earlier-rendered components must not rely on the same property. Verify module loading, animations after route navigation, Vite HMR and production behavior.

Potential compatibility boundary: an older browser with no `CSS.registerProperty` cannot interpolate the percentage token (same degraded behavior as the old unsupported `@property` rule). A duplicate registration is tolerated; unrelated errors are not hidden. Do not claim support in older Firefox without actual browser verification.

Existing W3C baseline from Stage 43: **1 Error / 39 Warnings, 26/26 CSS assets verified**; 126 Vitest + 69 Node tests passing. Hypothesis after Stage 44: **0 Errors / 39 Warnings** with 26/26 assets verified, 126 Vitest and **73 Node tests**. The number of warnings must be observed; an additional or changed warning requires investigation.

## Acceptance and manual QA

1. Run `git apply --check --whitespace=error` and `git diff --check`.
2. Run `npm run check`, `node --test scripts/*.test.mjs`, `node scripts/w3c-radar-production-check.mjs`.
3. Run `npm run w3c:audit -- --warning=1 --force`, inspect `w3c-audit/summary-normal.md` for **zero recorded CSS errors**, no unverified or pending assets, and the actual warning count.
4. Open Project Overview **in a fresh production session** at desktop width greater than 1120 px. Compare visible pulse with the pre-pilot stage, Light/Dark, and repeated project route navigation.
5. Verify `prefers-reduced-motion: reduce` and mobile <=1120 px still disable pulse. Test refreshing the route; HMR duplicate registration should not break development.
6. If a runtime exception, pulse degradation, test failure, or more W3C errors occur, do not commit or declare PASS; review and reverse only this pilot.

The Stage 43 hash-target follow-up remains a separate browser QA item; the Stage 44 pilot does not change navigation or data.

## Post-pilot evidence and decision — 2026-10-11

The user applied this Stage 44 patch in `chore/p0-css-validation` and supplied the complete subsequent terminal output, plus `Screen Recording 2026-10-11 at 20.15.09.mov`. These are **observations of a local checkout**, not remote CI/deployment evidence.

| Gate | Observed result |
| --- | --- |
| ESLint | PASS |
| Vitest | **126/126**, 42 files |
| Node tests | **73/73**, including four Stage 44 registrar cases |
| Vite build | PASS, 168 transformed modules |
| Radar production guard | PASS: mask, keyframes, JS registration present |
| W3C Normal `--warning=1 --force` | **26/26 assets checked, 0 Errors / 39 Warnings, 0 unverified, 0 pending** |
| Project Overview output | `ProjectOverviewPage-BOuijvOw.css`: **0 Errors / 10 Warnings** |
| User video | Radar glow/animation visible on desktop in Light/Dark; mobile responsive view showed no obvious regression |
| Browser checks not evidenced after patch | Full reduced-motion UI test; old Chrome/Firefox/Safari matrix; route hard-refresh/HMR re-registration across browsers |

**Decision:** accept Stage 44 for its defined **zero W3C CSS errors with radar retained** goal. Record all 39 warnings; they are not counted as 0/0 files. Do not claim full phase/deployment closure until `docs/P01_RELEASE_GATE.md` is satisfied, including the separate Management Actions SPA hash-target issue.

**Stage 45 regression check (2026-10-12):** After changing AppLayout overflow, the full local run still passes the radar production guard and forced W3C audit at **0 Errors / 39 Warnings**, with **126/126 Vitest** and **74/74 Node tests**. The JS registration implementation has not changed.
