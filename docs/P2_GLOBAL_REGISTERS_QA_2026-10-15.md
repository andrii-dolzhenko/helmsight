# P2 Portfolio Registers — macOS QA Evidence (2026-10-15)

**Scope:** Global Reports (ADR-048), Global Risks (ADR-049), and shared application quality checks. **Source:** owner's terminal output from local Mac build. This is QA evidence for a feature commit, not an approved production release.

## Environment and application checks

| Check | Observed result |
| --- | --- |
| Node | v24.21.0 |
| `npm ci` | Installed 231 packages; audit found 0 vulnerabilities. Nonfatal `fsevents` install-script approval notice |
| `npm run check` | PASS — ESLint; Vitest **332/332** tests across **74/74** test files; Vite 8.3.3 production build (**212 modules transformed**) |
| `node --test scripts/*.test.mjs` | PASS — **74/74** Node tests |
| `npm run w3c:preview:test` | PASS — **40/40** tests |
| `node scripts/w3c-radar-production-check.mjs` | PASS — production radar SVG mask, animation keyframes and JS custom-property registration retained |

## Production W3C CSS (all 35 assets, forced fresh requests)

| `css3svg` profile | Verified / total | CSS errors | CSS warnings | Assets 0/0 | Assets with warnings | Unverified / pending |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `--warning=1 --force` | 35/35 | **0** | **290** | 19 | 16 | 0 / 0 |
| `--warning=2 --force` | 35/35 | **0** | **3674** | 0 | 35 | 0 / 0 |

Two in-scope generated CSS bundles:

| Asset | Normal warnings | All-profile warnings | Errors |
| --- | ---: | ---: | ---: |
| `GlobalReportsPage-CHJVNIYZ.css` | 33 | 120 | 0 |
| `GlobalRisksPage-DtUWyPvB.css` | 34 | 149 | 0 |

**Evidence files on the owner's machine:** `w3c-audit/report-normal.json`, `w3c-audit/summary-normal.md`, `w3c-audit/report.json`, `w3c-audit/summary.md`. The terminal summary establishes aggregate counts but **does not classify specific warnings**; compare the detailed JSON messages with baseline reports before declaring any new warnings or ruling any out. The mock W3C failures shown inside the Node diagnostic tests are fixtures, not failures in the production audit.

## Gate and follow-up

- **Application lint, automated tests and production build: PASS.** Owner-approved Light-theme tablet/mobile screenshots are separate visual evidence.
- **Strict ADR-042 W3C CSS 0/0: OPEN** because both reports contain raw warnings despite zero errors and complete asset verification. Do not relabel warning-laden assets as passing.
- **HTML validation, browser console, keyboard/assistive-technology and full accessibility/deployed smoke: NOT VERIFIED by the supplied terminal log.** These remain release/merge evidence items.
- A **selective feature commit** may record reviewed source changes and this QA evidence; it is not equivalent to signing off P2 phase completion or deployment.
- Next W3C work: inspect the issue details, determine whether warnings are pre-existing/vendor/validator compatibility vs regressions, record source mapping and reviewer disposition; retain strict raw counts. Do not delete valid CSS merely to suppress advisory messages.
