# P2 Global Reports — ADR-048 Implementation Notes

**Current delivery and QA (2026-10-18):** The described feature is present in the merged `main` frontend and the deployed HelmSight application. Repository-wide rendered HTML QA later verified **47/47 routes, 0 errors, 0 warnings** (PR #23). Production CSS QA later verified **39/39 assets, 0 errors, no per-asset warning regressions**; raw warnings remain and strict CSS 0/0 is **not** achieved. Earlier feature-branch, checklist and QA statements below are preserved as **dated historical evidence**, not current release blockers.


## Scope and ownership

- `/reports` is a global, mainly read-only cross-project discovery route. Its UI is separate from `/projects/:projectId/reports` and existing report-detail routes.
- Data: existing Redux `projects` and `reports` slices/services and versioned localStorage; no new collection, persistence model, backend or CRUD layer.
- `deriveGlobalReportsView` is a pure data projection. It drops orphan reports whose `projectId` cannot be resolved, excludes archived projects by default, and supports filtering/sorting without mutating source records.
- KPI scope: selected projects (including archived only when opted in). Current reports = non-archived Draft + Final; Draft and Final split Current; Archived counts archived Final reports. KPI counts ignore lifecycle switcher, query, status, month selector, sort and pagination.
- Report archive and project archive are independent. An archived project is still read-only when navigating to its project report details. An archived report's status remains Final and it must be restored using the project-level workflow before reopening for correction.
- Reporting-period filter groups stored reports by the calendar month of `periodEnd`, not the start of a week; this convention is intentional because a reporting week can cross months.
- Ordering: newest period (default), oldest period, recently updated; pagination applies after filtering and sorting, 10 rows/cards per page.
- Desktop: Global Actions-like KPI, filters and register hierarchy. Mobile/tablet: stacked filter controls and report cards with natural height and full-width Open report action. No direct global mutations.

## Files

- `src/pages/GlobalReportsPage/GlobalReportsPage.jsx` and `.module.css`
- `src/pages/GlobalReportsPage/globalReports.js`
- Corresponding pure-derivation and UI component tests
- `src/app/router/router.jsx`, `src/layouts/AppLayout/AppLayout.jsx` (desktop/mobile navigation), route fallback test, README

## UX refinement acceptance (2026-10-15)

- Global Reports matches Global Actions styling in desktop Light/Dark themes.
- Owner is a visible register column and searchable; dates are plain text; `Open report` is the separate right-hand action under an unlabeled column.
- Current / Archived is aligned with Filters heading; pagination is centered; register rows use dividers and inset hover treatment.
- The global help control is omitted; project-level Reports help is preserved. Owner accepted the local screenshots as visually satisfactory. This is visual acceptance, **not** automated or deployed validation.

## Local validation status

- Whole-repository ESLint: **passed** in the isolated Linux workspace (2026-10-15).
- Standalone Node diagnostic suite: **74/74 passed**, including 40 W3C-theme preview checks. PostCSS source parse: **57/57 CSS files parsed**, no empty declarations. This is **not** a W3C conformance result.
- Targeted Vitest and Vite build: **not verified in this container**; uploaded ZIP bundles macOS native Rolldown binaries and Linux optional binding is absent. A Linux `npm ci` attempt could not complete in the sandbox. Run on a supported Node runtime after fresh `npm ci`.
- Automated browser/keyboard/AT and W3C production CSS/HTML audits: **pending**. Fresh `dist` generation is blocked in the container, so production CSS cannot be audited there. Do not claim passing gates or production readiness from the static checks.
- The uploaded branch included unstaged and untracked Lessons Learned work. Those edits were preserved; Global Reports should land through a focused branch/PR after reconciling that work and ensuring a clean base.

## Required local follow-up

```bash
npm ci
npm run check
node --test scripts/*.test.mjs
npm run build -- --base=/helmsight/
git diff --check
```

Review `/reports` with 0, 1, 10 and 11+ reports, both report lifecycle views, archived-project inclusion, missing-project records, desktop/mobile breakpoints, Light/Dark/System, focus/keyboard navigation and direct report links. Run the full documented ADR-042 HTML/CSS production validation gate separately and report actual errors, warnings, and coverage.

## macOS full-build QA evidence

The owner subsequently ran full ESLint/Vitest/Vite, Node diagnostics, CSS preview and both W3C CSS profiles on a fresh macOS build. These supersede the isolated Linux environment limitations above; raw CSS warnings remain open. See [shared Global Reports and Risks QA evidence (2026-10-15)](P2_GLOBAL_REGISTERS_QA_2026-10-15.md).
