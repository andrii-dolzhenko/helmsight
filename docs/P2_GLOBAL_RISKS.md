# P2 Global Risks — ADR-049 Implementation & QA

**Current delivery and QA (2026-10-18):** The described feature is present in the merged `main` frontend and the deployed HelmSight application. Repository-wide rendered HTML QA later verified **47/47 routes, 0 errors, 0 warnings** (PR #23). Production CSS QA later verified **39/39 assets, 0 errors, no per-asset warning regressions**; raw warnings remain and strict CSS 0/0 is **not** achieved. Earlier feature-branch, checklist and QA statements below are preserved as **dated historical evidence**, not current release blockers.


## Product and data boundaries

- Global route `/risks` is between Actions and Reports in desktop/mobile navigation. Project route `/projects/:projectId/risks/:riskId` remains the source detail and CRUD workflow.
- Reuse existing Redux projects/risks slices and the risk scoring/attention domain functions. No new backend, database, duplication of source risk records or global editing.
- Portfolio cards: Active risks, active High/Critical, active Needs attention, Closed. Counters follow selected project scope, exclude archived projects by default, and are independent of register search/status/severity/attention/sort/page controls.
- Risk severity follows implemented `getRiskSeverity`: Low 1–4, Medium 5–9, High 10–16, Critical 17–25. Earlier ADR-013 lists older 10–14 / 15–25 boundaries; documentation reconciliation remains separate, not a scoring change in ADR-049.
- Text search by risk title, project and owner. Filters: project, status, severity, attention, and Include archived projects. Closed risks do not receive due-soon/overdue attention; a missing deadline remains explicitly distinguishable.
- Default highest-exposure sorting with due/recent alternatives. Ten records per page, with project-specific detail navigation. Archived projects remain read-only, orphan records are excluded.

## Responsive UI and owner acceptance

- Desktop: table-like rows with dividers, inset hover/focus and a right-side `Open risk` button.
- Tablet (641–1180px): three filters in row one; two filters plus Reset filters in row two; project archive checkbox below. Risk cards use two columns, equal row-height via CSS Grid and an explicit gap.
- Mobile (up to 640px): KPI layout 2×2, stacked filters, one risk card per row and full-width sort selector to the right of its label. Risk cards group Risk/Severity, Project/Owner, Status/Due, then `Open risk`; long text is not truncated by fixed pixel heights.
- The owner confirmed tablet/mobile appearance on 2026-10-15 after these refinements. This does not replace browser keyboard, reduced-motion, or contrast tests.

## QA evidence — 2026-10-15 isolated workspace

| Check | Result | Limit |
| --- | --- | --- |
| ESLint (`npm run lint`) | PASS | Entire extracted repository, no lint errors |
| Node diagnostics (`node --test scripts/*.test.mjs`) | PASS, 74/74 | Existing Node diagnostic suite |
| Direct Global Risks projection assertions | PASS, 12/12 | Node assertions of KPI scope, archive/search/attention/date/sort (not Vitest) |
| Source CSS syntax (PostCSS) | PASS, 57/57 parsed | No empty declarations; **not** W3C validation |
| W3C theme preview diagnostic tests | PASS, 40/40 | Does not replace remote production CSS W3C audit |
| Global Risks Vitest tests | Not run to completion | Native Linux Rolldown optional binding absent from uploaded macOS dependencies |
| Vite production build | BLOCKED | Same missing Rolldown binding; container Node v22.16.0 is below package engines |
| Forced W3C CSS normal and extended | UNVERIFIED | No fresh production CSS assets/build; remote npm/W3C access unavailable here |
| W3C HTML, keyboard, automated browser QA | UNVERIFIED | Separate checks required before merge/release |
| Light-theme 768px and 440px | Owner visually accepted | Screenshot review, not full automated browser validation |

ADR-042 strict 0-error/0-warning CSS/HTML gates remain OPEN. Never replace the raw validator report with the PostCSS parsing result.

## Local acceptance commands

Run on macOS with supported Node and freshly installed dependencies before commit/PR:

```bash
node -v
npm ci
npm run check
node --test scripts/*.test.mjs
npm run w3c:preview:test
node scripts/w3c-radar-production-check.mjs
npm run w3c:audit -- --warning=1 --force
npm run w3c:audit -- --warning=2 --force
```

Review every production CSS asset in `w3c-audit/report-normal.json` and `w3c-audit/report.json`: record total/verified/unverified/pending, raw errors and warnings, and the build SHA. Confirm responsive Light/Dark/System, keyboard/focus, reduced-motion, no console regressions, direct risk deep links and HTML validation before release sign-off. A feature commit is not a release approval.

## macOS full-build QA evidence

The owner subsequently ran full ESLint/Vitest/Vite, Node diagnostics, CSS preview and both W3C CSS profiles on a fresh macOS build. These supersede the isolated Linux environment limitations above; raw CSS warnings remain open. See [shared Global Reports and Risks QA evidence (2026-10-15)](P2_GLOBAL_REGISTERS_QA_2026-10-15.md).
