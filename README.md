# HelmSight — Project Delivery Intelligence

**One workspace for project visibility, delivery control, and informed decisions.**

HelmSight brings portfolio oversight and day-to-day project management together in a responsive web application. Project managers and delivery leaders can organize projects, track delivery health, manage governance and risks, monitor milestones and earned-value indicators, document decisions, and communicate progress through structured reports.

[**Live application — Vercel**](https://helmsight.vercel.app/) · [**Alternative demo — GitHub Pages**](https://andrii-dolzhenko.github.io/helmsight/) · [**Source code — GitHub**](https://github.com/andrii-dolzhenko/helmsight)

## Explore HelmSight

Open the [live application](https://helmsight.vercel.app/) and enter the workspace using the available demo access. A preloaded **Atlas Modernization** project provides realistic records for exploring the project dashboard, risk matrix, milestones, EVM analytics, reports, and meeting notes. You can also create a project and work with your own records.

The application saves workspace data and preferences in the browser, allowing you to return to your work on the same browser and origin. The Vercel and GitHub Pages demos maintain separate browser storage.

## Capabilities

### Portfolio management

- **Project portfolio:** create and edit projects; browse active and archived projects; archive and restore records; switch between Grid and List presentations.
- **Project lifecycle:** permanently delete an archived project with exact-name confirmation. Related browser-local records and owned drafts are removed with the project.
- **Portfolio overview:** monitor project health, portfolio-wide priorities, attention signals, and delivery exceptions; filter attention drivers by module and open the related project records.
- **Project health classification:** derived Healthy, Watch, Needs attention, and Not assessed indicators provide an at-a-glance view of delivery status. A time-aware welcome message and daily project-management insight personalize the portfolio.
- **Project navigation:** open a dedicated project workspace and move directly between its governance, risks, milestones, metrics, reports, actions, and meeting notes.

### Project dashboard and governance

- **Project Overview:** consolidate delivery signals, key performance indicators, milestone progress, risks, success criteria, and management actions in one dashboard.
- **Project Charter:** document the business need, sponsor, objectives, scope, deliverables, benefits, assumptions, constraints, and acceptance criteria.
- **Stakeholder Register:** record stakeholder roles, influence, interest, engagement, communication notes, and management strategy.
- **Communication Plan:** maintain planned communications, intended audiences, and ownership of stakeholder updates.
- **Governance editing:** add, update, and remove stakeholder and communication entries; edit the Project Charter with a visible revision number and last-updated timestamp.
- **Archived project protection:** archived workspaces become read-only until restored.

### Success criteria and delivery milestones

- **Success Criteria:** create, edit, and remove measurable outcomes; compare baseline, current value, target, and target date, with automatically derived outcome status.
- **Financial outcomes:** calculate current ROI, gross margin, and profit margin from the relevant financial inputs, then compare each result with the configured target.
- **Milestones:** create, edit, and delete checkpoints; track target dates, completion percentage, and status through cards and a visual roadmap.
- **Schedule visibility:** see upcoming, due-soon, and overdue milestones alongside a project roadmap.

### Risk management

- **Risk Register:** maintain risk descriptions, owners, response strategies, and lifecycle states.
- **Risk scoring:** calculate severity from Probability × Impact and display the result with meaningful risk levels.
- **Risk matrix:** visualize the distribution of project risks and distinguish active from closed records.
- **Risk lifecycle:** edit risk assessments, close resolved risks, and reopen them when circumstances change.
- **Portfolio Risk Register:** review risks across projects with summary KPIs, owner/project search, status and severity filters, sorting, pagination, and links to source records. Include archived projects when needed.

### Management actions and follow-up

- **Project actions:** track actions with owners, priorities, statuses, progress, and attention indicators.
- **Cross-project Actions register:** review existing actions across the portfolio with KPIs, project/status/priority/attention filters, sorting, pagination, and direct links to project-level records.
- **Action ownership:** keep delivery follow-up tied to its originating project instead of duplicating editable records across portfolio views.

### Metrics and Earned Value Management (EVM)

- **Project baselines:** configure work packages, measurement basis, and Budget at Completion (BAC).
- **Progress snapshots:** record Planned Value (PV), Earned Value (EV), and Actual Consumption (AC).
- **Performance indicators:** calculate Cost Variance (CV), Schedule Variance (SV), Cost Performance Index (CPI), Schedule Performance Index (SPI), Estimate at Completion (EAC), Estimate to Complete (ETC), Variance at Completion (VAC), and To-Complete Performance Index (TCPI) when the inputs and measurement basis permit them.
- **Historical charts:** explore PV/EV/AC and SPI/CPI trends over time.
- **Measurement modes:** support hours, person-days, currency, and story points, showing cost-oriented metrics only where they are meaningful.
- **Global Metrics:** compare portfolio-level SPI/CPI signals, filter projects, include archived projects when needed, and open project-level metric details.

### Weekly status reporting

- **Structured reports:** prepare weekly status reports with reporting periods, management narrative, and project-derived delivery signals.
- **Report lifecycle:** work with Draft and Final states; reopen, archive, and restore reports.
- **Report revisions:** display the current report version and the project-data snapshot captured for the reporting period; saving corrections updates the existing report record.
- **Report-local controls:** hide individual signals from a report, undo a change, or restore hidden signals without modifying their source project records.
- **Report Detail:** review report sections and expand or collapse supporting information.
- **Global Reports:** discover reports across projects using portfolio summaries, separate report/project archive filters, ordering, pagination, and links to the original report; editing remains within the project workspace.
- **Print-friendly output:** use the browser's Print / Save as PDF workflow for supported documents.

### Meeting notes and lessons learned

- **Meeting Notes:** create and maintain meeting records with dates, participants, decisions, follow-up items, responsible owners, and narrative notes; print individual meeting records.
- **Document lifecycle:** edit, archive, restore, and view meeting notes with the appropriate read-only treatment for archived records.
- **Form usability:** input validation, character counters, and recoverable drafts support longer notes.
- **Global Meetings:** find meeting notes across projects with search, project and lifecycle filters, sorting, pagination, and direct access to note details; editing remains in the project workspace.
- **Lessons Learned:** capture reusable project knowledge with categories, searchable records, sorting, detail views, editing, draft recovery, and confirmed deletion.

### Portfolio productivity tools

- **Global Search:** search active projects, risks, milestones, actions, current reports, and meeting notes; navigate by keyboard and revisit recent selections.
- **Notifications:** review important signals for critical risks, overdue milestones and actions, and the daily Decision Lab; filter unread notifications, mark them read, dismiss them, and open related records.
- **Decision Lab:** complete a daily, three-question project-management exercise drawn from nine curated scenarios, with answer feedback, progress, and an end-of-session review.
- **Help Center:** find guidance on navigating the workspace, managing projects, interpreting EVM indicators, working with data, and using productivity tools.
- **Profile and preferences:** update a local first/last name and display role, upload and crop an avatar, and choose appearance settings; the workspace greets you by name.

### Interface and usability

- Responsive desktop, tablet, and mobile layouts with contextual navigation and a mobile menu.
- Light, Dark, and System appearance modes with saved preferences.
- Keyboard-accessible controls, visible focus indicators, and reduced-motion accommodations.
- Lazy-loaded application routes, navigation loading states, and a dedicated Not Found page.
- Sign-in, registration, and password-recovery **demonstration screens** with client-side form validation. Workspace demo access does not require account registration. These screens are UI demonstrations; they do not create server accounts or provide live OAuth authentication.

## Technology stack

| Area | Technology |
| --- | --- |
| Application | React 19, JavaScript, Vite 8 |
| State management | Redux Toolkit, React Redux, feature slices and async thunks |
| Client-side routing | React Router 7 |
| Forms | React Hook Form |
| Data visualization | Chart.js, react-chartjs-2 |
| Styles | CSS Modules, CSS custom properties |
| Client persistence | Versioned browser `localStorage` through feature services |
| Testing | Vitest, React Testing Library, Node.js test runner, Playwright Chromium |
| Code quality | ESLint and production-build checks |
| Deployment | Vercel (primary), GitHub Pages (alternative demo) |

## Application design

HelmSight uses a **feature-oriented architecture** to separate presentation, shared state, business rules, and persistence. Redux Toolkit slices and asynchronous thunks manage core application data. Feature services handle record operations, while transient interface state remains close to the components that use it.

```text
React pages, layouts, and reusable components
                 ↓
Redux Toolkit slices / async thunks and feature services
                 ↓
    Domain calculations and business rules
                 ↓
      Browser-local storage adapter
```

Risk scoring, EVM calculations, success-criteria evaluation, and portfolio health live in independently testable domain helpers rather than page components.

### Project structure

The repository uses feature-oriented modules rather than a flat component directory. Depending on the module, feature code is organized into services (`api/`), Redux state (`model/`), domain utilities (`lib/`), and UI components (`ui/`). Tests are colocated with the relevant code.

The following tree highlights the main directories and representative screens:

```text
helmsight/
├── public/                         # Public assets
├── src/
│   ├── app/
│   │   ├── providers/              # Application-level providers
│   │   ├── router/                 # React Router configuration and loading UI
│   │   └── store/                  # Redux store and selector/dispatch hooks
│   ├── features/
│   │   ├── projects/
│   │   │   ├── api/                # Project services and record operations
│   │   │   ├── model/              # Project Redux state
│   │   │   ├── lib/                # Domain and presentation helpers
│   │   │   └── ui/                 # Forms, dialogs, and workspace components
│   │   ├── dashboard/              # Delivery health and dashboards
│   │   ├── risks/                  # Risk scoring and register operations
│   │   ├── milestones/             # Milestone records and calculations
│   │   ├── successCriteria/        # Outcome tracking and financial indicators
│   │   ├── managementActions/      # Action ownership and follow-up
│   │   ├── evm/                    # Earned Value Management
│   │   ├── reports/                # Weekly report state and services
│   │   ├── meetings/               # Meeting notes and lifecycle
│   │   ├── lessonsLearned/         # Project knowledge records
│   │   ├── globalSearch/           # Cross-module search
│   │   ├── notifications/          # Notification logic and UI
│   │   ├── decisionLab/            # Interactive decision exercises
│   │   ├── profile/                # Local profile management
│   │   ├── preferences/            # Themes and UI preferences
│   │   └── auth/                   # Demonstration auth UI
│   ├── pages/                      # Route-level pages and editors
│   │   ├── GlobalOverviewPage/
│   │   ├── ProjectsPage/
│   │   ├── ProjectOverviewPage/
│   │   ├── GovernancePage/
│   │   ├── RiskEditorPage/
│   │   ├── ReportsPage/
│   │   ├── MeetingsPage/
│   │   └── ...                     # Other project and portfolio pages
│   ├── layouts/
│   │   ├── AppLayout/
│   │   ├── ProjectLayout/
│   │   └── AuthLayout/
│   ├── shared/
│   │   ├── ui/                     # Reusable interface components
│   │   ├── hooks/                  # Shared React hooks
│   │   ├── lib/                    # General utilities
│   │   ├── services/
│   │   │   ├── storage/            # Versioned localStorage adapter
│   │   │   └── drafts/             # Recoverable form drafts
│   │   ├── styles/                 # Shared styles
│   │   └── assets/                 # Imported visual assets
│   ├── test/                       # Shared test configuration
│   ├── App.jsx
│   └── main.jsx
├── scripts/                        # Validation and QA utilities
├── vite.config.js
├── package.json
└── README.md
```

### Navigation

| Section | Example route |
| --- | --- |
| Welcome | `/` |
| Portfolio | `/projects` |
| Portfolio overview | `/overview` |
| Portfolio actions | `/actions` |
| Portfolio risks | `/risks` |
| Portfolio metrics | `/metrics` |
| Portfolio reports | `/reports` |
| Portfolio meetings | `/meetings` |
| Help Center | `/help` |
| Profile and settings | `/settings` |
| Project workspace | `/projects/:projectId` |

The project workspace provides nested views for governance, success criteria, risks, milestones, metrics, reports, actions, and meeting notes. Direct navigation to supported routes is handled by the deployed single-page application.

## Run locally

### Prerequisites

- **Node.js:** `^22.22.2 || ^24.15.0 || >=26.0.0`
- **npm:** included with your Node.js installation

```bash
git clone https://github.com/andrii-dolzhenko/helmsight.git
cd helmsight
npm ci
npm run dev
```

Open the local address displayed by Vite. The preloaded demo workspace is available from the application interface.

### Production build

```bash
npm run build
npm run preview
```

### Development checks

```bash
npm run lint          # ESLint
npm run test:run      # Automated React and domain tests
npm run check         # Lint, tests and production build
npm run qa:html:test  # HTML QA tool tests
```

## Hosting

The primary application is available at **[helmsight.vercel.app](https://helmsight.vercel.app/)**. Vercel serves the SPA with a route fallback, supporting direct navigation to application pages.

An alternative deployment is available on **[GitHub Pages](https://andrii-dolzhenko.github.io/helmsight/)**. It uses the `/helmsight/` base path for its static assets and router.

**Your workspace data:** HelmSight saves projects, related records, and personal preferences in the browser’s local storage. Information stays in that browser and deployment origin; the application does not transfer it automatically between devices or between Vercel and GitHub Pages. Demo sign-in screens do not create or verify user accounts.

---

© 2026 Andrii Dolzhenko. All Rights Reserved.
