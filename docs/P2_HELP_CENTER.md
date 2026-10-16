# P2 Help Center — implementation and content verification

**ADR:** ADR-055 (Adopt, 2026-10-16).  **Delivery:** combined PR with unmerged Global Meetings (ADR-054), on `feature/p2-global-meetings`.  **Status:** implementation prepared; local Mac QA / visual review / PR / merge pending.

## User-facing scope

`/help` replaces the desktop/mobile Help placeholder with a branded user-facing knowledge base. Topics: Getting Started, Managing Projects, Metrics & Performance, Working with Data, Notifications & Decision Lab, Frequently Asked Questions. Six cards jump to sections; guide links take users to real pages. FAQ uses native `<details>/<summary>` for keyboard and screen-reader support. Desktop 3-column topic grid becomes 2-column then 1-column; guide articles are 2-column and collapse to 1 on mobile. The only new UI dependency is a lazy-loaded Lottie renderer for the owner-provided Help banner animation; no account workflow, chatbot, contact form, support promise or independent persistence.

The published help copy deliberately avoids developer and classroom terms. Internal source traceability is maintained below; this document is **not** displayed in the product.

## Source-to-copy verification checklist

| Help content | Verified source in supplied current working tree | Notes |
|---|---|---|
| Global vs project navigation; create project | `src/app/router/router.jsx`, `src/layouts/AppLayout/AppLayout.jsx`, `src/layouts/ProjectLayout/ProjectLayout.jsx`, `src/pages/ProjectsPage/ProjectsPage.jsx` | `/projects`, `/projects/new`, `/overview`, project subroutes exist. |
| Cross-project actions, risks, metrics, reports, meetings | `src/pages/GlobalActionsPage/`, `GlobalRisksPage/`, `GlobalMetricsPage/`, `GlobalReportsPage/`, `GlobalMeetingsPage/` | Global pages are discovery/register surfaces; editing stays in project-specific modules. |
| Meeting Note lifecycle | `src/pages/MeetingsPage/`, `src/features/meetings/` | Current/Archived notes distinct from project archived status. |
| Report lifecycle | `src/pages/ReportsPage/`, `src/features/reports/` | Draft/Final, archive/restore behavior. |
| EVM measures and thresholds | `src/features/evm/lib/evm.js`, `src/pages/GlobalMetricsPage/globalMetrics.js` | PV planned by date, EV sum of earned values, AC actual only in non-story-points mode, SPI = EV/PV, CPI = EV/AC; Healthy ≥1.00, Watch [0.95,1.00), Needs attention <0.95. Invalid ratios are null/Not available; mixed basis units are not aggregated. |
| Projects archive, restore, permanent deletion | `src/pages/ProjectsPage/ProjectsPage.jsx`, `src/features/projects/api/projectDeletionService.js` | Confirm archived-only deletion and exact-name confirmation; no undo. |
| Notification scope and states | `src/features/notifications/lib/notifications.js`, `src/features/notifications/ui/NotificationBell.jsx` | Critical active risks, overdue incomplete actions/milestones, daily Decision Lab; read/dismiss differ. |
| Decision Lab cadence | `src/features/decisionLab/lib/dailyDecisionLab.js`, `scenarios.js`, `src/features/decisionLab/ui/DecisionLabModal.jsx` | Three daily scenarios from a rotating bank of nine; resumable local session. |
| Browser-local data boundaries | `README.md`, `src/shared/services/storage/storageAdapter.js`, project service files | User-facing warnings mention only browser-specific storage, no cross-device sync, and risk of clearing browser data. |

## Help banner animation (owner-provided asset)

- `src/pages/HelpPage/questionAnimation.json` is a palette-adjusted copy of the supplied `question.json` (25 FPS, frames 0–124, 5-second animation). Geometry and keyframes are preserved; purple/olive colors are remapped to HelmSight greens and mint. The user-supplied file is the source, not a newly invented SVG animation.
- `HelpHeroAnimation.jsx` renders this Lottie only on the Help route with lazy-loaded `lottie-web`, `loop: false` and an explicit 30,000 ms replay cadence measured start-to-start. After 5 seconds the final frame holds until the next cycle; the animation is not played continuously.
- Under `prefers-reduced-motion: reduce`, the component displays the end frame statically and does not start a replay timer. On unmount or preference change, listeners/timers are cleaned up. The artwork is decorative and aria-hidden.
- The additional dependency is justified specifically by source fidelity: accurately reproducing the supplied 35-asset Lottie with hand-authored CSS/SVG would duplicate a complex animation engine. `npm install` updates `package-lock.json` on the developer machine; include that lockfile in the combined PR.

## QA before release

- `npm run check` and focused Help/router/layout tests.
- Manually open `/help` via desktop sidebar and mobile drawer, verify active state, scroll anchors, all route links, FAQ pointer/keyboard toggle, and back/forward navigation.
- Check macOS desktop, tablet ~768px, mobile ~440px and small ~375px in Light, Dark and System; keyboard focus, reduced motion, contrast and text overflow.
- Run W3C CSS full asset profiles (`--warning=1`, `--warning=2`) and HTML validation for `/help`; record raw errors/warnings separately from ADR-042 warning-adjudicated eligibility.
- Recheck copy when project behavior or full-stack storage/auth changes; do not claim functionality or support channels the deployed app does not have.
