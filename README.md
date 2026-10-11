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

### Governance and delivery controls

- **Governance:** Project Charter, Stakeholder Register, and Communication Plan, with structured editing and saved versions.
- **Success Criteria:** measurable outcomes, status tracking, ROI, gross margin, and profit margin where applicable.
- **Risks:** probability × impact scoring, severity levels, risk matrix, and Grid / List views.
- **Milestones:** lifecycle management, progress, due-soon/overdue indicators, and roadmap.
- **Management Actions:** owners, priorities, progress, and attention states.
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

**Current P0 architecture:** data and preferences are stored in the browser. Backend services, a database, authentication, and multi-user synchronization are not implemented yet. The feature-service boundary is intended to support later API integration without coupling persistence to React components.

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

**Canonical policy and phase acceptance checklist:** [CSS Validation & Quality Gates](docs/CSS_VALIDATION_POLICY.md). See also [W3C compatibility plan](docs/W3C_COMPATIBILITY_PLAN.md) and [batch audit notes](docs/W3C_BATCH_AUDIT.md).

## Main routes

The URLs below are client-side routes; `:projectId` and similar segments are dynamic identifiers.

```text
/
/projects
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

**P1–P3 — planned:** incremental delivery of the next project capabilities, with the scope of each phase managed in the project backlog. The architecture is prepared for gradual backend/API integration, but those services are not part of P0.

**Current limitations:** no server API, shared database, sign-in/authorization, real-time multi-user collaboration, external integrations, AI features, or full resource/critical-path planning. Browser-local data does not synchronize across users or devices. These are current implementation limits, not permanent product boundaries.

## Author

© 2026 Andrii Dolzhenko. All Rights Reserved.
