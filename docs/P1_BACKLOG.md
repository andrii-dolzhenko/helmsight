# HelmSight — P1 Functional Backlog

Status: **planning backlog; functionality not implemented**
Updated: 2026-10-11
Scope owner: Project roadmap (separate from P0.1 CSS Validation Closure)

## P1-PL-01 — Project Lifecycle: Safe Project Deletion

- **Priority:** P1 candidate; explicitly requested for the P1 backlog.
- **Status:** Accepted for P1 consideration; UX/technical design and release scope are **not frozen**.
- **Current P0 functionality:** Create, Edit, Archive and Restore; no permanent-delete action.
- **User problem:** Test/demo projects and obsolete records cannot be permanently removed from the local workspace. Archiving hides/locks them but retains their data.
- **User story:** As a workspace owner, I want to permanently remove an unwanted project after reviewing the consequences, so that my portfolio and its associated data stay accurate.

### Candidate UX and safety requirements

1. Keep **Archive** and **Delete permanently** distinct actions with different intent and clear language. Archive/Restore must continue to work as before.
2. **Proposed P1 default (needs UX sign-off):** allow permanent deletion only from an archived project. Do not silently treat this as a finalized requirement.
3. Provide an accessible destructive-action confirmation that clearly identifies the project and warns about deletion of related records. Typing the exact project name is a candidate safeguard; evaluate effort/usability during P1 refinement.
4. **Cancel** and dismissal paths perform zero mutations. Prevent accidental double-submit; present a clear success/error state.
5. After successful deletion, route safely to Portfolio, remove stale references and refresh summary/dashboard/portfolio aggregates. Preserve all other projects.
6. Do not conflate localStorage deletion with backend/API deletion. P0 uses localStorage; future API contracts will be designed separately when backend/database scope is defined.

### Data integrity / service-layer acceptance

- Implement the operation in the **projects service/data layer**, never solely in a React click handler.
- Inventory **every persisted project-linked data collection and draft** before coding. Candidate collections: governance, success criteria, risks, milestones, management actions, EVM baseline/history, reports, meeting notes, and form drafts. Remove precisely those records owned by the deleted project; avoid collateral damage.
- Define a safe strategy for partial localStorage failure and reload. No orphan project references should be left behind after a successful operation; failure must not be falsely reported as success.
- Make repeated deletion/obsolete direct routes behave predictably (not found, redirect or documented error), without repopulating a deleted project unexpectedly.
- Keep archive/restore semantics, unrelated projects and Light/Dark/System preferences intact.
- Consider how seed/demo projects should behave after deletion and browser reload; agree on policy before implementation.

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

### Decisions still open for P1 refinement

- Is deletion **archive-only**, or allowed from any project state with stronger safeguards?
- Is exact-name confirmation necessary? Is a soft-delete/Trash/undo window warranted for the P1 MVP?
- What are the precise cascade rules and seed-demo policies for the actual storage schema?
- Does the teacher's final-project rubric/deadline permit this enhancement in P1? Confirm before locking scope.

## Scope discipline

This backlog entry **does not authorize implementation during P0.1**. Do not add a delete button, change persistence, alter routing, or commit changes to `main` until P1 design and scope are agreed. Other P1 work remains in planning; this document is not a finalized phase-wide scope.
