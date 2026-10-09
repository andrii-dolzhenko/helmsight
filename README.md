# HelmSight — Project Delivery Intelligence

**Hillel Full-Stack JavaScript · HW-15 · React + Redux Toolkit**

HelmSight is a responsive project-delivery workspace for Project and Delivery Managers. It brings project governance, delivery controls, Earned Value metrics, reporting, meeting notes, and portfolio health into one frontend application.

> **Live demo:** will be added after the Vercel deployment step.

## ✨ What is implemented

### Portfolio & project workspace

- Active / Archived project lifecycle with restore support;
- Grid / List portfolio views with persisted preference;
- derived portfolio Project Health: **Healthy / Watch / Needs attention / Not assessed**;
- project Overview dashboard with Project Pulse, control KPIs, attention signals, upcoming milestones, Success Criteria, management actions, and EVM position;
- responsive desktop, tablet, and mobile layouts;
- Light / Dark / System themes with persisted preference.

### Interface & motion

- branded responsive landing page with HelmSight visual identity and demo workspace entry;
- consistent project-tab headings, right-aligned primary actions, and full-width supporting descriptions;
- shared primary, secondary, and danger button styles across Light and Dark themes;
- Projects Portfolio Hero with date-stable Daily Insight and an emerald glint that illuminates the existing vertical ribs (a short pass within a 30-second cycle), disabled for `prefers-reduced-motion`.

### Governance

- Project Charter;
- Stakeholder Register;
- Communication Plan;
- structured validation and explicit save/version behavior;
- archived-project read-only mode.

### Project control

- **Success Criteria** — CRUD, deterministic statuses, ROI / Gross Margin / Profit Margin calculations;
- **Risk Register** — CRUD, probability × impact score, severity bands, matrix, Grid / List modes;
- **Milestones** — CRUD, progress, due-soon / overdue attention, responsive roadmap;
- **Management Actions** — accountable PM follow-ups, lifecycle actions, attention states, Grid / List modes.

### Metrics / EVM

- measurement basis: Hours / Person-days / Currency / Story points;
- work-package baseline and BAC;
- automatic Planned Value (PV);
- weekly Earned Value (EV) / Actual Consumption (AC) snapshots;
- CV, SV, CPI, SPI, EAC, ETC, VAC, TCPI where semantically valid;
- cumulative PV / EV / AC position;
- **PV / EV / AC historical trend chart**;
- **SPI / CPI historical trend chart** with Target 1.00;
- Story-points mode intentionally excludes cost-derived indicators.

### Weekly Status Reports

- one report per project / reporting period;
- Draft / Final lifecycle;
- Reopen for correction;
- Current / Archived report history;
- derived historical snapshot from canonical project data;
- editable management narrative;
- report-local Hide / Undo / Restore for control signals;
- browser **Print / Save as PDF**;
- explicit saved-content versioning.

### Meeting Notes

- meeting-history index;
- create / read / edit / delete flows;
- participants, notes, decisions, follow-ups, owner, meeting date;
- draft recovery and explicit saved-content versioning;
- browser **Print / Save as PDF**;
- archived projects remain read-only.

## 🧰 Tech stack

| Area | Technology |
| --- | --- |
| UI | React 19 |
| Build tool | Vite 8 |
| State management | Redux Toolkit + React Redux |
| Routing | React Router 7 |
| Forms | React Hook Form |
| Charts | Chart.js + react-chartjs-2 |
| Styling | CSS Modules + global CSS custom properties |
| Testing | Vitest + React Testing Library |
| Linting | ESLint |
| P0 persistence | versioned `localStorage` adapter behind feature services |

## 🏗 Architecture

The frontend uses a feature-oriented structure without adopting full Feature-Sliced Design.

```text
UI
  ↓
Redux Toolkit thunk
  ↓
feature service / API boundary
  ↓
versioned local persistence
```

React components do not access persistence directly. Business calculations such as EVM, risk severity, Success Criteria status, Project Health, and attention signals are implemented as deterministic domain logic outside presentation components.

### Source structure

```text
src/
├── app/
│   ├── providers/
│   ├── router/
│   └── store/
├── features/
│   ├── dashboard/
│   ├── evm/
│   ├── managementActions/
│   ├── meetings/
│   ├── milestones/
│   ├── preferences/
│   ├── projects/
│   ├── reports/
│   ├── risks/
│   └── successCriteria/
├── layouts/
├── pages/
├── shared/
│   ├── assets/
│   ├── hooks/
│   ├── services/
│   ├── styles/
│   └── ui/
└── test/
```

## 🚀 Getting started

### Requirements

- Node.js `>=20.19.0`;
- Node 22 LTS is recommended;
- npm 10+.

### Install dependencies

```bash
npm ci
```

### Start development server

```bash
npm run dev
```

Vite prints the local URL in the terminal.

## ✅ Quality checks

```bash
npm run lint
npm run test:run
npm run build
```

Run the full quality gate:

```bash
npm run check
```

The project currently contains **40 focused test files** covering store configuration, services, deterministic domain calculations, forms, shared UI behavior, routing-related components, and critical project-control logic.

## 🧭 Main routes

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
/projects/:projectId/reports/new?periodEnd=YYYY-MM-DD
/projects/:projectId/reports/:reportId
/projects/:projectId/actions
/projects/:projectId/actions/new
/projects/:projectId/actions/:actionId/edit
/projects/:projectId/meetings
/projects/:projectId/meetings/new
/projects/:projectId/meetings/:meetingId
/projects/:projectId/meetings/:meetingId/edit
```

Unknown URLs render the application Not Found page.

## 💾 Demo data & persistence

A realistic synthetic project, **Atlas Modernization**, is included so the main workflows can be demonstrated immediately after first launch.

P0 data is stored locally in the browser behind Promise-based feature services. The service boundary is intentionally API-ready so a later backend can replace the temporary data source without moving persistence logic into React components.

Form drafts are stored separately from saved domain records and are used only for accidental-reload recovery where the workflow requires it.

## 🖨 Printing

Weekly Status Reports and Meeting Notes use browser-native printing:

```js
window.print()
```

The print layouts hide application navigation and editing controls. The browser/system dialog can print to a physical printer or **Save as PDF**.

## 🌐 Vercel deployment

The repository includes `vercel.json` with an SPA rewrite so direct navigation or page refresh on React Router routes resolves through `index.html`.

Recommended Vercel settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

After deployment, add the production URL to the **Live demo** line at the top of this README.

## 🎯 P0 scope status

The HW-15 frontend P0 business scope is implemented end-to-end:

- Projects / Portfolio;
- Project Overview;
- Governance;
- Success Criteria;
- Risks;
- Milestones;
- Management Actions;
- Metrics / EVM + historical trends;
- Weekly Status Reports;
- Meeting Notes;
- derived Portfolio Project Health.

The remaining submission work is final regression QA, GitHub/Vercel publication, LMS submission formatting, and the final demonstration walkthrough.

## 🚧 Intentionally outside HW-15 P0

The following are deferred to later Full-Stack course stages:

- real backend and database;
- authentication / authorization;
- OAuth;
- AI features;
- email and real in-product sharing;
- external Jira / GitHub / Slack / Teams integrations;
- WebSockets / real-time synchronization;
- backend audit history;
- full Gantt / critical-path / resource-planning engine;
- generic backlog / sprint / Kanban task management.

---

**Course:** Hillel IT School — Full-Stack JavaScript<br>
**Homework:** HW-15 — React + Redux Toolkit course project
