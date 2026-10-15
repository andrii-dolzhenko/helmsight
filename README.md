# HelmSight — Project Delivery Intelligence

HelmSight is a responsive project-delivery management application for Project Managers and Delivery Managers. It brings project health, governance, risks, milestones, Earned Value Management (EVM), management actions, reporting, and meeting notes into one workspace. The application is being developed in phases, with backend and API integration planned for future releases.

**Live demo (Vercel):** [helmsight.vercel.app](https://helmsight.vercel.app/)

**Backup demo (GitHub Pages):** [andrii-dolzhenko.github.io/helmsight](https://andrii-dolzhenko.github.io/helmsight/)

**Repository:** [github.com/andrii-dolzhenko/helmsight](https://github.com/andrii-dolzhenko/helmsight)

## Features

### Portfolio and project workspace

- Active and archived projects, restore actions, and persistent **Grid / List** views.
- Project creation and editing, plus a seeded **Atlas Modernization** demo workspace.
- Derived portfolio health: **Healthy / Watch / Needs attention / Not assessed**.
- Project Overview with delivery signals, upcoming milestones, success criteria, management actions, and performance indicators.
- Responsive desktop, tablet, and mobile layouts; persistent **Light / Dark / System** appearance settings.
- **P2-B feature branch (not yet released):** local profile details, saved avatar photos, and a time-of-day portfolio greeting using the first name. See [P2-B profile documentation](docs/P2_LOCAL_PROFILE.md).

### Governance and delivery controls

- **Governance:** Project Charter, Stakeholder Register, and Communication Plan, with structured editing and saved versions.
- **Success Criteria:** measurable outcomes, status tracking, ROI, gross margin, and profit margin where applicable.
- **Risks:** probability × impact scoring, severity levels, risk matrix, and Grid / List views.
- **Milestones:** lifecycle management, progress, due-soon/overdue indicators, and roadmap.
- **Management Actions:** owners, priorities, progress, and attention states.
- **Lessons Learned (P2):** project-scoped knowledge register with validated create/edit, search, category filter, sorting, detail, draft recovery, and confirmed deletion. See [Lessons Learned](docs/P2_LESSONS_LEARNED.md).
- Archived projects remain **read-only** until restored.

### Metrics and Earned Value Management

- Work-package baselines, measurement basis, and Budget at Completion (BAC).
- Planned Value (PV), Earned Value (EV), and Actual Consumption (AC) snapshots.
- Derived CV, SV, CPI, SPI, EAC, ETC, VAC, and TCPI where meaningful.
- Historical **PV / EV / AC** and **SPI / CPI** visualizations.
- Hours, person-days, currency, and story-points modes; cost-based indicators are excluded where the unit does not support them.

### Reports and meeting notes

- **Weekly Status Reports:** reporting periods, Draft / Final states, reopen, archive/restore, saved versions, and management narrative.
- Report snapshots derived from project records, with report-local **Hide / Undo / Restore** of signals.
- **Meeting Notes:** participants, decisions, follow-ups, owners, and create/edit/delete flows.
- Live character counters and validation for meeting-note inputs (see [text-input limits](docs/TEXT_INPUT_LIMITS.md)).
- Recoverable drafts where implemented, plus browser-native **Print / Save as PDF**.

### Interface and accessibility

- Branded landing page, contextual guidance, responsive navigation, and custom 404 page.
- Semantic controls, keyboard interactions, visible focus states, and reduced-motion support.
- Lazy-loaded routes with a loading fallback for initial navigation.
- **P2-B feature branch:** desktop profile menu; mobile/tablet profile and theme controls in the navigation drawer; `Exit workspace` returns to the landing page without signing out or clearing data.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, JavaScript, Vite 8 |
| State | Redux Toolkit, React Redux, slices, async thunks |
| Routing | React Router 7 |
| Forms | React Hook Form |
| Charts | Chart.js, react-chartjs-2 |
| Styling | CSS Modules, CSS custom properties |
| Testing | Vitest, React Testing Library, Node.js test runner |
| Quality | ESLint, production build, W3C CSS diagnostic scripts |
| Persistence | Versioned browser `localStorage` behind feature services |

## Architecture

The application uses a **feature-oriented structure**, without claiming full Feature-Sliced Design:

```text
React UI → Redux Toolkit → feature services → versioned localStorage adapter
```

Components do not need to implement domain calculations or persistence details. EVM, risk severity, success criteria, and portfolio health are handled by testable domain logic.

```text
src/
├── app/             # Router, providers, Redux store
├── features/        # Feature services, state, forms, domain logic
├── layouts/         # App and project layouts
├── pages/           # Screens and editors
├── shared/          # UI components, hooks, styles, storage
└── test/            # Shared test setup
scripts/             # CSS/W3C diagnostics and Node tests
docs/                # Supporting technical documentation
```

**Current client-side architecture:** data, profile and preferences are stored in the browser. Backend services, a database, authentication, and multi-user synchronization are not implemented yet. The feature-service boundary is intended to support later API integration without coupling persistence to React components.

## Getting started

**Requirements:** Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` and npm.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. A seeded project is available for exploring the main workflows.

## Quality checks

```bash
npm run lint             # ESLint
npm run test:run         # Vitest
npm run build            # Production bundle
npm run check            # Lint + Vitest + build
npm run preview          # Serve the production build locally
node --test scripts/*.test.mjs  # Standalone Node diagnostic tests
```

### CSS validation and phase quality gates

CSS is validated **after the production build**, not only in source files. At the end of P1, P2, and P3, the target is **0 errors / 0 warnings** in the selected HTML/CSS validators, with no skipped or unverified files. The same quality standard also applies to ESLint, tests, build output, and application-origin browser diagnostics.

```bash
npm run build
npm run w3c:preview:test
node --test scripts/*.test.mjs
npm run w3c:audit -- --warning=1 --force
npm run w3c:audit -- --warning=2 --force
```

W3C requests need network access. Reports are written to ignored `w3c-audit/`; theme previews to ignored `w3c-preview/`. An unavailable validator is **unverified**, never a pass. Some modern standards-based CSS can be rejected by the older `css3svg` validator; such results are investigated and documented rather than silenced or hidden.

**P2-B local evidence (2026-10-13, before PR/merge):** `npm run check` passed (ESLint clean, 228/228 Vitest across 55 files, Vite build with 185 modules). Forced W3C `css3svg` audits verified all 28 production CSS assets with **0 errors** and **0 unverified/pending**. Normal (`warning=1`): **76 warnings** across 10 assets; Extended (`warning=2`): **2,918 warnings** across 28 assets. Strict raw 0/0 remains **NOT MET**. These local results are not evidence for production deployments or formal ADR-042 sign-off. Details: [batch audit](docs/W3C_BATCH_AUDIT.md).

**Canonical policy and phase acceptance checklist:** [CSS Validation & Quality Gates](docs/CSS_VALIDATION_POLICY.md). See also [W3C compatibility plan](docs/W3C_COMPATIBILITY_PLAN.md) and [batch audit notes](docs/W3C_BATCH_AUDIT.md).

## Main routes

The URLs below are client-side routes; `:projectId` and similar segments are dynamic identifiers.

```text
/
/projects
/overview
/actions
/risks                            # ADR-049: portfolio-wide Risk Register
/reports                          # ADR-048: portfolio-wide Weekly Reports discovery
/settings                         # P2-B: local profile (pending merge)
/projects/new
/projects/:projectId
/projects/:projectId/edit
/projects/:projectId/governance
/projects/:projectId/success-criteria
/projects/:projectId/success-criteria/new
/projects/:projectId/success-criteria/:criterionId/edit
/projects/:projectId/risks
/projects/:projectId/risks/new
/projects/:projectId/risks/:riskId
/projects/:projectId/risks/:riskId/edit
/projects/:projectId/milestones
/projects/:projectId/milestones/new
/projects/:projectId/milestones/:milestoneId/edit
/projects/:projectId/metrics
/projects/:projectId/metrics/baseline
/projects/:projectId/metrics/snapshots/new
/projects/:projectId/metrics/snapshots/:snapshotId/edit
/projects/:projectId/reports
/projects/:projectId/reports/new
/projects/:projectId/reports/:reportId
/projects/:projectId/actions
/projects/:projectId/actions/new
/projects/:projectId/actions/:actionId/edit
/projects/:projectId/meetings
/projects/:projectId/meetings/new
/projects/:projectId/meetings/:meetingId
/projects/:projectId/meetings/:meetingId/edit
```

Unknown paths render the custom Not Found page. Route modules are loaded on demand.

## Deployment

The project includes `vercel.json` with a single-page-application rewrite to `index.html`, so React Router routes can be opened directly or refreshed after deployment.

**Vercel settings:** Framework **Vite** · Build command `npm run build` · Output directory `dist`.

The primary public deployment is hosted on **Vercel**. A second, automatically deployed static build is hosted on **GitHub Pages**. The GitHub Pages build uses the `/helmsight/` public base path and a matching React Router basename; Vercel retains the root (`/`) base path.

GitHub Pages includes a `404.html` SPA fallback for directly opening nested routes. Those deep links may return HTTP 404 while rendering the React application; Vercel is the canonical deployment for normal 200-status SPA rewrites.

**Deployment guide:** [GitHub Pages backup, CI and verification](docs/GITHUB_PAGES_DEPLOYMENT.md).

Browser-local data is scoped to each domain, so the backup demo does **not** synchronize project data with Vercel.

## Scope and limitations

**P0 — implemented:** project portfolio and workspace, Project Overview, governance, success criteria, risks, milestones, management actions, EVM and trends, weekly reports, meeting notes, and portfolio health. The current release is a working client-side application backed by versioned browser storage.

### P1 Safe Project Deletion — merged and deployed

Merged to `main` via PR #4 (`d29253c`), with Vercel functional smoke checks recorded in [P1 Backlog](docs/P1_BACKLOG.md):

- **Delete permanently** is available only for archived projects (Grid and List).
- Confirmation requires the exact project name, including case and whitespace.
- A journaled cascade removes the project, related feature records, EVM records and owned form drafts. There is no Trash or Undo.
- An anti-reseed marker prevents deleted Atlas demo records from being restored automatically.
- This deletion is browser-local, not backend- or cross-device-wide.

ADR-042 warning-risk adjudication and formal sign-off remain open; deployment did not retroactively close that decision.

### P2-B Local Profile & Settings — merged and deployed

Merged into `main` via [PR #6](https://github.com/andrii-dolzhenko/helmsight/pull/6) (`6509f41`). The `/settings` profile workflow, avatar and personalized greeting are available in production; the project owner confirmed the production smoke test on 2026-10-14. `Exit workspace` remains navigation, not authentication or logout. See [P2-B acceptance evidence and limitations](docs/P2_LOCAL_PROFILE.md).

### P2-C Global Actions — merged and deployed

Merged into `main` via [PR #7](https://github.com/andrii-dolzhenko/helmsight/pull/7) (`c35a314`); release evidence was finalized through [PR #8](https://github.com/andrii-dolzhenko/helmsight/pull/8) (`8323f99`). The read-only portfolio-wide `/actions` register includes filters, KPIs, pagination and responsive layouts. Production smoke testing was accepted on 2026-10-13. See [P2-C release evidence](docs/P2_GLOBAL_ACTIONS.md).

### P2 Global Reports — implementation in progress (ADR-048)

Global `/reports` discovers existing Weekly Status Reports across projects, with portfolio KPIs, separate report/archive and project/archive scopes, filtering, ordering, 10-item pagination and responsive rows/cards. It is a read-only portfolio surface: report creation, editing, lifecycle changes and printing remain inside each project. This work is prepared in the uploaded `feature/p2-lessons-learned` snapshot and **is not merged or deployed**. See [implementation and QA notes](docs/P2_GLOBAL_REPORTS.md).

### P2 Global Risks — implementation awaiting final QA (ADR-049)

Global `/risks` is a read-only portfolio risk register using existing Redux/domain services. It includes Active, High/Critical, Needs attention and Closed KPIs; project/status/severity/attention filters; owner search; sorting; 10-item pagination; and responsive cards. Source project Risk Registers own all writes. The tablet layout uses three filters on the first row, two plus Reset on the second; risk cards are 2 columns on tablet and 1 on mobile, with 2×2 KPI cards on mobile. UI review was accepted locally on 2026-10-15. macOS lint, 332 Vitest tests, 74 Node tests and the production build passed; W3C CSS has zero errors but nonzero warnings in both full-asset profiles. HTML and release validation remain open. See the [macOS QA evidence](docs/P2_GLOBAL_REGISTERS_QA_2026-10-15.md). See [ADR-049 implementation and QA notes](docs/P2_GLOBAL_RISKS.md).

**Other P1–P3 capabilities — planned:** incremental delivery remains governed by the project backlog. Backend/API integration is not part of the current client-side implementation.

**Current limitations:** no server API, shared database, sign-in/authorization, real-time multi-user collaboration, external integrations, AI features, or full resource/critical-path planning. Browser-local data does not synchronize across users or devices. These are current implementation limits, not permanent product boundaries.

## Author

© 2026 Andrii Dolzhenko. All Rights Reserved.
