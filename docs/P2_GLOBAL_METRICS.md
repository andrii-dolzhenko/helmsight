# P2 Global Metrics — Portfolio EVM Register

**Status:** Feature implementation candidate for ADR-051; pending local/browser QA, commit, pull request and merge.

## Scope

Global Metrics (`/metrics`) appears between Risks and Reports in the workspace's global desktop and mobile navigation. It is a **read-only**, portfolio-level discovery surface. The existing `/projects/:projectId/metrics` workspace retains baseline, weekly snapshot, historical chart and editing responsibilities; `Open metrics` leads directly to it.

## Data and index interpretation

The page reads projects and EVM baselines/snapshots from existing Redux slices and feature services. Each project is evaluated at its latest calendar-valid snapshot. `calculateEvmMetrics()` supplies the dimensionless Schedule Performance Index (SPI) and, for non-story-point measurement bases, Cost Performance Index (CPI). `getPerformanceState()` supplies the existing EVM thresholds: **Healthy ≥ 1.00**, **On watch ≥ 0.95 and < 1.00**, **Needs attention < 0.95**. The worst valid relevant index determines the project state. If neither index is valid, the project is **Missing data**.

`N/A` for Story points CPI means not applicable; `—` means unavailable. The register never fabricates an SPI, CPI, numeric zero or healthy state for a project without data. Raw PV, EV, AC and BAC are not aggregated over different measurement bases/currencies. No portfolio-wide average SPI/CPI or fabricated trend is shown.

## Interaction and scope

Four KPIs count **Reporting projects**, **Needs attention**, **On watch** and **Missing EVM data**. Active projects form the default population. Including archived projects and selecting a specific project change the KPI population; free-text search, measurement basis and performance controls filter only the register. KPI counts do not silently change under register-only filters. Sort defaults to Needs attention first. Ten rows per page, with filter-aware page reset.

Desktop: hoverable register rows, readable columns and explicit project action. Tablet: equal-height, two-column EVM cards. Phone: one-column cards and 2 × 2 KPI grid. Light/Dark/System colors use existing theme tokens. Data load/error/no-data and no-match states are explicit.

## Validation plan

- `npm run check` — ESLint, Vitest and Vite build.
- `node --test scripts/*.test.mjs` — Node diagnostics.
- `npm run w3c:preview:test` — theme transformation tests.
- Production W3C CSS audit on all emitted assets in both warning profiles. Raw diagnostics preserved per ADR-042.
- Browser Light/Dark/System and responsive checks at 440 px, 768 px and desktop; keyboard, tab/focus, route and history checks; W3C Nu validation of rendered `/metrics` DOM.

**Not a deployment claim:** validation in a user's Mac and Vercel preview, commit/PR, actual warning review, production smoke and instructor review remain pending.
