# P2-C — Global Actions

Status: Released to production on 2026-10-13. Repository-wide rendered HTML QA subsequently completed on 2026-10-18 (47/47 routes, 0 errors, 0 warnings); CSS warning debt remains under ADR-042.
Decision: ADR-044 — P2-C Global Actions: Portfolio Register and Approved UI.
Feature: HS-027 — Global Actions.

## Contract

### Purpose

Provide a portfolio-wide view of existing Management Actions without duplicating project-scoped action management.

### Navigation

- Add the global `/actions` route inside AppLayout.
- Add Actions to desktop sidebar and mobile navigation.
- Keep existing project Action Register routes unchanged.
- Open an action through `/projects/:projectId/actions#action-{actionId}`.
- Do not render broken navigation links for missing projects.

### Data and ownership

- Read actions through the existing Management Actions Redux slice and service.
- Read project metadata through the existing Projects Redux slice.
- Join records using `projectId`.
- Do not introduce a second action store, duplicate CRUD service, backend or database.
- Keep action creation, editing, lifecycle updates and deletion in the project Action Register.
- Archived projects remain read-only.
- Handle unavailable project references without assuming they are valid.

### Portfolio summary

Display four counters:

- Active: actions whose status is not Done.
- Critical active: unfinished actions with Critical priority.
- Needs attention: unfinished actions classified as Due soon or Overdue.
- Done: completed actions.

Counters reflect the selected project scope, including the Project selector and Include archived projects setting. Status, Priority and Attention filters affect register results but not the portfolio counters.

### Filters and ordering

- Project: All active projects by default.
- Status: All, Not started, In progress, Done.
- Priority: All, Low, Medium, High, Critical.
- Attention: All, On track, Due soon, Overdue, Done.
- Include archived projects: off by default.
- Provide a way to reset filters.
- Paginate filtered and sorted results at 10 actions per page.
- Show pagination controls only when more than 10 actions match.
- Reset to page one when filters change; keep portfolio counters independent of pagination.
- Reuse existing action attention and sorting logic.
- Due soon covers today through the next seven calendar days.
- Overdue means an unfinished action with a past due date.
- Completed actions never count as overdue.
- Existing sort order: unfinished first, then due date, then priority.
- Respect ADR-041 calendar-date semantics.

### Approved UI

- Desktop: portfolio header, four summary cards, filtering controls and a list-first action register.
- Mobile: responsive action cards with accessible filtering controls.
- Show action title, project, owner, due date, priority, status and attention.
- Show action descriptions where the layout supports them. Source classifications are not shown in the global register.
- Present owners with their saved text names and derived initials.
- Do not display fabricated owner photos or pretend that owners are authenticated users.
- Provide an explicit Open in project action.
- Distinguish archived projects visually when included.
- Use real persisted values; visual mockup records and counts are illustrative.
- Preserve HelmSight Light/Dark/System appearance and existing responsive conventions.
- Provide loading, retryable error, empty and no-filter-match states.
- No global action creation, inline editing, deletion, second Grid mode or task-management subsystem.

## Acceptance checks

- Verify direct navigation to `/actions` and active desktop/mobile navigation.
- Verify actions from multiple projects appear with correct project names.
- Verify project-scoped navigation targets the correct action anchor.
- Verify summary counters for mixed statuses, priorities and due dates.
- Verify project scope changes summary totals.
- Verify register-only filters do not unexpectedly change summary totals.
- Verify combinations of project, status, priority and attention filters.
- Verify sorting and calendar boundaries, including Done actions.
- Verify pagination at 10 and 11 actions, navigation boundaries, filter resets and stable KPI values.
- Verify archived projects are excluded by default and correctly labeled when included.
- Verify archived actions remain editable only after restoring their project.
- Verify missing/deleted project references do not create broken links.
- Verify empty portfolio, empty action register and no-filter-match states.
- Verify independent project/action loading failures and Retry.
- Verify desktop, mobile, keyboard, focus, themes and reduced motion.
- Run ESLint, Vitest, production build and applicable CSS/HTML validation.
- Record raw W3C warnings and keep ADR-042 warning adjudication separate from strict 0/0 compliance.

## Architecture

- Route: new lazy-loaded global page under AppLayout.
- State: existing managementActions and projects Redux slices.
- Business logic: existing action priority, status, attention and sorting helpers.
- Persistence: existing browser-local storageAdapter through feature services.
- Mutations: existing project-scoped Action Register only.
- Accessibility: semantic controls, visible focus, accessible filter labels and appropriate status announcements.
- No additional dependency is approved for this feature.

## QA and release evidence

Local verification on 2026-10-13:

- ESLint: passed.
- Vitest: 241 tests passed across 57 files.
- Vite production build: passed.
- Pagination component tests: 5 passed, including two pagination scenarios.
- Browser review: Desktop, Tablet and Mobile layouts; Light/Dark themes; pagination controls and page switching reviewed.
- W3C CSS normal (warning=1): 30/30 assets verified, 0 errors, 117 warnings overall; GlobalActionsPage: 0 errors, 41 warnings.
- W3C CSS extended (warning=2): 30/30 assets verified, 0 errors, 3,056 warnings overall; GlobalActionsPage: 0 errors, 138 warnings.
- Existing CSS modules retain their previous warning counts; no W3C errors were reported.
- GlobalActionsPage normal warnings: 38 CSS variable static-analysis limitations and 3 vendor-extension warnings.
- Deprecated clip declarations were replaced with clip-path; two warnings eliminated.
- Strict W3C 0 errors / 0 warnings compliance: not achieved. ADR-042 warning adjudication remains open.
- W3C preview tooling: 40/40 tests passed.
- **Historical QA status at the time of PR #7:** No dedicated HTML script was configured and formal validation was not performed. A later repository-wide Nu validator audit in PR #23 covered 47/47 routes with 0 errors and 0 warnings.
- Feature commit: `80c7e1d` — portfolio-wide Global Actions register.
- Laptop layout fix commit: `5e51e2b` — balanced desktop columns and single-line badges.
- Pull request: [#7](https://github.com/andrii-dolzhenko/helmsight/pull/7), successfully merged into `main`.
- Merge commit: `c35a314`. Local `main` was fast-forwarded to match `origin/main`.
- GitHub PR checks: 3 successful; 1 GitHub Pages deployment check skipped. Post-merge GitHub reported 4 passed checks.
- Vercel Preview: deployment successful; visual smoke test accepted.
- MacBook Air: desktop table columns, status badges and action links visually accepted at the target screen size.
- Production: https://helmsight.vercel.app/actions — smoke test confirmed as Production OK after merge.
- The extended W3C CSS audit predates the final laptop layout fix. The normal W3C audit was rerun after that fix and remained at 0 errors / 117 warnings overall, with 41 warnings in GlobalActionsPage.

The approved UI was used as design guidance. Production release is confirmed by the merged PR, successful deployment and production smoke test. Strict raw CSS 0/0 compliance remains open; formal rendered-HTML validation was subsequently completed in PR #23.
