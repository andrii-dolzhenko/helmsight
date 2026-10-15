# P2 — Global Overview, Global Search, and UI Refinement

**Implementation status:** Complete; local QA accepted on 2026-10-15.
**Release status:** Pending pull request, CI, merge, and production smoke test.
**Decision reference:** ADR-046 in the canonical `DECISIONS — Final Project` Google Doc (recording pending).
**Scope:** Frontend only; existing React, Redux Toolkit, React Router, CSS Modules, and local-storage-backed services.

## Product boundaries

- **Global Overview (`/overview`)** is the entry-level, cross-project decision dashboard: what needs management attention, why, and where to act. It is not a second project registry.
- **Projects (`/projects`)** remains the place to browse, create, open, archive, restore, and permanently delete project records. The project registry and its health badges remain there.
- **Project Overview (`/projects/:projectId`)** retains its project-specific Pulse, EVM, exceptions, and control panels.
- **Global Actions (`/actions`)** remains the detailed management-action workflow; Global Overview links to relevant records rather than duplicating this registry.
- The welcome greeting and Daily Insight were moved from Projects to Global Overview; the landing/demo entry now opens `/overview`.

## Global Overview

- Reuses the existing `buildProjectDashboard` and `summarizePortfolioHealth` domain logic. No independent health algorithm, persistence schema, or trend history was introduced.
- Excludes archived projects from current portfolio analysis. Loads existing project, success-criteria, risk, milestone, management-action, and EVM slices; shows loading, error/retry, and empty states.
- Shows portfolio-wide Needs action, On watch, and Projects affected summaries.
- **Attention Drivers** groups real attention/watch signals by Actions, Risks, Milestones, Success criteria, and Metrics. Selecting a group filters the **Priority Signals** list; the filter is keyboard-accessible and reversible. No charting dependency is added.
- Priority Signals are ordered by urgency and date and retain their project context and deep links. The queue initially displays a compact subset, with an option to reveal more.
- Affected Projects prioritizes attention and watch states. Upcoming Milestones shows up to four incomplete milestones within the next 30 local calendar days, with project-specific links.
- No invented portfolio performance trends, artificial percentage changes, or duplicated project registry.

## Global Search

- Available from the global application header, including mobile entry and a keyboard shortcut.
- Indexes active-project Projects, Risks, Milestones, Management Actions, non-archived Reports, and current Meeting Notes; excludes records belonging to archived projects.
- Uses normalized, case-insensitive matching, grouped results, relevance ordering within groups, and a limit of five results per group.
- Supports keyboard navigation, Enter to open, Escape to dismiss, and accessible dialog behavior.
- Stores up to five recent result identifiers locally at `helmsight:global-search-recent:v1`, includes Clear recent, and ignores stale entries not found in the current index. No search data is sent to a backend.
- Search field width and close icon have been refined for desktop and mobile.

## Visual and responsive refinements

- Welcome Banner retains the personal greeting, Daily Insight, and its 30-second decorative light pass. The static vertical ribs are removed to reduce visual noise; reduced-motion preferences remain respected.
- New Projects Workspace Banner uses independent portfolio copy, a compact action, and a right-aligned green matrix treatment. Its light sweep, spacing, gradient, and laptop sizing were refined without introducing another large dashboard.
- The global sidebar identifies the active route with the existing active state plus a green accent marker. Theme Control popup uses an opaque surface rather than a translucent backdrop.
- Consistent hover geometry in Overview cards, compact destructive icon buttons for archived Projects and laptop-width Actions list, stable list metadata alignment, and full-value tooltips for clipped action metadata.
- Governance displays equal-text list items with stable distinct React keys, and its three main cards have full-width mobile actions and left-aligned explanatory copy.
- Existing deletion confirmations and domain lifecycle rules remain intact. Changes do not introduce new production dependencies.

## Evidence — local implementation and acceptance

- `npm run check` on 2026-10-15: **PASS** (`npm run lint`, `npm run test:run`, `npm run build`).
- Vitest: **284 passed / 68 files**; Vite production build: **198 modules transformed**, completed successfully.
- New and updated regression coverage includes Overview derivation/filtering, Search indexing/dialog interactions, Projects banner behavior, responsive Actions row semantics, and duplicate-text Governance keys.
- Owner reviewed and accepted local responsive/light-dark UI, including the final mobile Governance adjustment. Browser inspection is a manual acceptance statement, not a claim of automated cross-browser coverage.
- Patches were reviewed and integrated locally on `feature/p2-global-overview-search`; these edits are not yet released to production.

## Release checklist and outstanding quality gates

- [x] Scope implemented and visually accepted locally.
- [x] ESLint, Vitest, and production build passed on the owner's Mac.
- [ ] Review staged Git diff, excluding personal untracked `docs/ROADMAP_INVENTORY.md`.
- [ ] Commit, push, open pull request, and review GitHub Actions / Vercel Preview checks.
- [ ] Merge to `main`; update local `main`; verify production navigation, Overview, Search, Projects and representative deep links.
- [ ] Official W3C CSS audits for the final build and strict global 0-error/0-warning sign-off — **OPEN under ADR-042**. Prior P2-01 audit numbers must not be presented as an audit of this build.
- [ ] Formal HTML validation of dynamic routes — **OPEN**.
- [ ] Investigate recurring forced-reflow messages only if reproducible profiling demonstrates a meaningful usability/performance regression; occasional ~34–36 ms DevTools warnings alone were not taken as a blocker.

**Release QA note:** Successful lint, tests, build, and local visual acceptance do not close the outstanding global CSS/HTML validation obligations. A separate release exception or completed validation evidence is required before claiming strict compliance.
