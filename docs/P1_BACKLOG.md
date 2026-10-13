# HelmSight — P1 Functional Backlog

Status: **P1-PL-01 merged and deployed; post-release review pending**
Updated: 2026-10-13
Scope owner: Project roadmap (separate from P0.1 CSS Validation Closure)

## P1-PL-01 — Project Lifecycle: Safe Project Deletion

- **Priority:** P1; implementation governed by ADR-040.
- **Status:** Merged into `main` via PR #4 (`d29253c`) and deployed to Vercel.
- **P0 baseline:** Create, Edit, Archive and Restore; no permanent-delete action.
- **User problem:** Test/demo projects and obsolete records cannot be permanently removed from the local workspace. Archiving hides/locks them but retains their data.
- **User story:** As a workspace owner, I want to permanently remove an unwanted project after reviewing the consequences, so that my portfolio and its associated data stay accurate.

### UX and safety requirements

1. Keep **Archive** and **Delete permanently** distinct actions with different intent and clear language. Archive/Restore must continue to work as before.
2. **Adopted (ADR-040):** permanent deletion is available only for archived projects, in both Grid and List views.
3. Require a destructive-action confirmation identifying the project and its related data. The user must enter the exact project name, including case and whitespace.
4. **Cancel** and dismissal paths perform zero mutations. Prevent accidental double-submit; present a clear success/error state.
5. After successful deletion, route safely to Portfolio, remove stale references and refresh summary/dashboard/portfolio aggregates. Preserve all other projects.
6. Do not conflate localStorage deletion with backend/API deletion. P0 uses localStorage; future API contracts will be designed separately when backend/database scope is defined.

### Data integrity / service-layer acceptance

- Implement the operation in the **projects service/data layer**, never solely in a React click handler.
- **Implemented data inventory:** the journaled cascade covers success criteria, risks, milestones, management actions, EVM baselines/snapshots, weekly reports, meeting notes, and owned form drafts. Unrelated project records remain intact.
- Define a safe strategy for partial localStorage failure and reload. No orphan project references should be left behind after a successful operation; failure must not be falsely reported as success.
- Make repeated deletion/obsolete direct routes behave predictably (not found, redirect or documented error), without repopulating a deleted project unexpectedly.
- Keep archive/restore semantics, unrelated projects and Light/Dark/System preferences intact.
- **Implemented demo policy:** an anti-reseed marker prevents deleted Atlas demo data from being recreated after reload.

### Implementation verification snapshot (2026-10-12)

- Automated checks: ESLint, 207/207 Vitest tests and production build passed.
- Manual archived-project deletion verified; automated recovery and failure scenarios covered by tests; Archived Grid/List responsive layouts reviewed.
- Storage ownership audit found no missing project-owned collections among the current services.
- Production preview startup and hard reload passed. Light/Dark/System, keyboard (Tab/Shift+Tab/Escape), Archived Grid/List responsive layouts, and post-contrast-adjustment visual regression were manually reviewed. These checks are not a comprehensive automated accessibility audit.
- W3C Nu validated the production `dist/index.html` entry point with 0 errors and 0 warnings. Dynamically rendered SPA routes were not independently HTML-validated.
- Manual Reduced Motion smoke review covered Portfolio, Project Overview/Radar, Governance, mobile navigation and Reports. The review does not certify every JavaScript animation.
- Post-release follow-up: formal warning-risk adjudication and ADR-042 sign-off, any required dynamic-route accessibility/HTML checks, and final release-evidence documentation.
- CSS validation (ADR-042): 27/27 production CSS assets verified in both profiles, 0 errors, 0 unverified and 0 pending. W3C CSS Error Gate: PASS. Strict raw 0/0 target: NOT MET (39 Normal / 2,833 Extended warnings). Deployment Gate: PENDING FINAL SIGN-OFF. Warning classification and limitations are recorded in `docs/W3C_BATCH_AUDIT.md`.

### Post-merge verification (2026-10-13)

- GitHub PR #4 merged into `main`; merge commit: `d29253c`.
- GitHub CI passed; local `main` synchronized with `origin/main`.
- Vercel Preview application load and console checks passed.
- Vercel Preview: Create → Archive → exact-name safeguard →
  permanent deletion → reload persistence passed.
- Production (`helmsight.vercel.app`): application load and
  deletion/reload scenario confirmed by the project owner.
- Lighthouse on the production Archived Projects page reported
  Accessibility 100 in Desktop mode; this is not a full WCAG audit.
- W3C CSS Error Gate: PASS (0 errors). Strict raw 0/0: NOT MET
  (39 Normal and 2,833 Extended warnings).
- ADR-042 warning-risk adjudication and formal sign-off were
  not completed before deployment and remain open for review.

### P1 acceptance / test cases

| ID | Acceptance test | Expected result |
| --- | --- | --- |
| PL-01 | Cancel destructive confirmation | Project and associated records unchanged |
| PL-02 | Confirm permitted deletion | Project removed from active and archive lists after reload |
| PL-03 | Inspect associated feature stores | No records remaining for deleted project; no records lost from other projects |
| PL-04 | Open deleted project's former deep links | Safe not-found/redirect without crashes |
| PL-05 | Refresh Portfolio/Dashboard | Counts and health/summary aggregates updated |
| PL-06 | Attempt invalid state or repeated deletion | Safe behavior according to agreed archive-only policy |
| PL-07 | Exercise keyboard, screen reader semantics and mobile dialog | Accessible focus, meaningful warning, no accidental destructive action |
| PL-08 | Simulate persistence errors (where testable) | Failure reported; no false success or partial clean state accepted |

**Definition of Done:** reviewed UX state machine and data inventory, focused unit/integration tests, lint/build/CI green, manual Light/Dark/mobile/accessibility regression, data-retention semantics documented, real PR review and merge. Preserve separate established CSS/HTML validation reporting; do not claim 0/0 when incompatible validator diagnostics remain.

### Decision status and remaining release questions

- **Adopted:** archive-only deletion, with persisted-state revalidation (ADR-040).
- **Adopted:** exact-name confirmation; no Trash or undo window in this P1 implementation.
- **Implemented:** project-owned collections, EVM data and drafts are removed through a journaled cascade; Atlas uses an anti-reseed marker.
- Final-project rubric alignment and instructor requirements remain subject to independent confirmation; deployment does not itself establish rubric compliance.

## Scope discipline

P1 Safe Project Deletion was merged into `main` via PR #4
on 2026-10-12 and deployed to Vercel. The feature is no longer
confined to its development branch.

P0.1 CSS validation reporting remains separate. Outstanding
warnings must not be presented as raw W3C 0/0 compliance.
The ADR-042 warning-risk review and formal sign-off remain
open as post-release follow-up. Deployment does not constitute
retroactive approval.

Other P1 backlog items remain outside this feature's scope.
