# P2-01 — Meeting Notes Lifecycle

Status: Implemented locally on 2026-10-14; release pending.
Decision: ADR-045 — P2-01 Meeting Notes Archive/Restore: Lifecycle and Portfolio-Consistent Switcher, including the Sorting and Pagination and Meeting Date: Past and Today Only amendments.
Decision log: https://docs.google.com/document/d/1DCgkTPbcTCZDG5zeETErmLlRQ8qAgIPpQevcqnfgs_I/edit

## Contract

### Purpose

Extend project-scoped Meeting Notes with a reversible archive lifecycle and scalable history navigation without duplicating the existing meeting management system.

### Lifecycle and persistence

- Current: `archivedAt` is absent or null.
- Archived: `archivedAt` contains a persisted ISO timestamp.
- Existing notes without `archivedAt` remain Current.
- Archive and Restore are idempotent.
- Lifecycle transitions preserve note content, document version, and `updatedAt`.
- Archived notes cannot be edited or deleted until restored.
- Archive requires confirmation; Restore is immediate.
- Permanent Delete retains its existing confirmation.
- Storage failures must not produce false success feedback.
- An archived project makes all its Meeting Notes read-only, independently of each note's lifecycle state.

### Navigation and actions

- Keep existing project-scoped Meeting Notes list, detail, creation and editing routes.
- Current notes support View, Print, Edit, Archive and Delete.
- Archived notes support View, Print and Restore.
- Notes in archived projects support View and Print only.
- Block direct editor access for archived notes and archived projects.
- Preserve existing browser-local persistence and draft recovery behavior.

### Meeting date validation

- Meeting Notes describe meetings that have already occurred.
- Accept valid historical dates and the current local calendar date.
- Reject future meeting dates on both Create and Edit.
- The date input exposes the current local date through its `max` attribute.
- Form validation reports: `Meeting date cannot be in the future.`
- The meetings service independently rejects future dates, including calls that bypass the form.
- Invalid calendar dates remain rejected.
- Existing persisted records are not automatically rewritten or deleted.

### History views, sorting and pagination

- Default lifecycle view: Current.
- Use the existing Portfolio-style Current / Archived switcher above the Meeting history card, aligned to the right.
- Display separate counts of Current and Archived notes in the switcher.
- Place the Sort by control inside the Meeting history header, to the right of Project meeting record.
- Available sorting: Newest meeting (default), Oldest meeting, Recently updated.
- Sort the selected lifecycle collection, not all project notes together.
- Filter by lifecycle, then sort, then paginate.
- Display 10 meeting notes per page.
- Hide pagination for 10 or fewer notes in the selected view.
- Show accessible numbered page controls and Previous / Next for 11 or more notes.
- Reset to the first page when the lifecycle view or sorting changes.
- Clamp pagination when the record count decreases; preserve a valid page after Archive/Restore.
- Keep page controls visually centered within the Meeting history card on Desktop.
- Keep the showing-count text on the left; use a centered stacked layout at narrower widths.
- Do not introduce Grid/List modes, advanced filters, server pagination or new dependencies.

### Summary and responsive UI

- Meeting notes, Recorded decisions and Named participants KPIs include all notes in the selected project, regardless of lifecycle tab, sorting or page number.
- History rows retain the existing Desktop table layout.
- Tablet and Mobile use labeled metadata: Meeting date, Participants, Version and Last updated.
- Place View note below the metadata in responsive cards.
- Preserve Light/Dark/System appearance, visible keyboard focus and accessible control labels.
- Provide separate Current and Archived empty states.
- Do not display a redundant total note count in the Meeting history header.

## Architecture

- UI: existing MeetingsPage, MeetingNoteDetailPage, MeetingNoteEditorPage and MeetingNoteForm.
- State: existing meetings Redux slice, extended with archive and restore async thunks.
- Service: existing meetingsService with archive/restore, read-only enforcement and date validation.
- Persistence: existing versioned browser-local storageAdapter.
- History sorting and pagination: local React state and CSS Modules.
- No new backend, database, API layer, package or persistent collection.

## Acceptance checks

- Verify legacy notes remain Current.
- Verify Archive confirmation, cancellation, Restore, idempotency and persistence after reload.
- Verify no document content, version or updated timestamp changes during lifecycle transitions.
- Verify edit/delete restrictions for archived notes and archived projects.
- Verify direct editor routes cannot bypass read-only UI restrictions.
- Verify lifecycle counters, empty states, keyboard tab navigation and all-notes KPIs.
- Verify all three sort modes and 10/11-note pagination boundaries.
- Verify page reset on tab/sort changes and Archive/Restore count changes.
- Verify past/today/future meeting date validation for Create and Edit.
- Verify a rejected future-date update does not mutate the stored note.
- Verify Desktop, Tablet, Mobile, Light/Dark, focus and reduced-motion behavior.
- Run ESLint, Vitest, production build and applicable CSS/HTML validation.
- Keep strict W3C 0/0 compliance separate from tests, visual review and ADR-042 warning adjudication.

## QA and release evidence

Local verification on 2026-10-14:

- ESLint: passed, 0 errors and 0 warnings.
- Vitest: 265 tests passed across 62 files.
- Vite production build: passed.
- Meeting Notes service tests: 16 passed.
- Meeting Note form tests: 4 passed.
- Meeting Notes lifecycle view tests: 4 passed.
- Sorting and pagination tests: 5 passed.
- Browser review: Desktop, Tablet and Mobile, responsive card labels, lifecycle switcher, sorting chevron, pagination alignment and Light/Dark presentation reviewed.
- Meeting date validation: automated Create/Edit validation completed; future-date service and form guards covered by regression tests.
- W3C CSS Normal (warning=1, final build; verified cache plus fresh changed-asset validation): 30/30 assets verified; 0 errors, 117 warnings overall; 0 unverified.
- W3C CSS Extended (warning=2, final build; verified cache plus fresh changed-asset validation): 30/30 assets verified; 0 errors, 3,076 warnings overall; 0 unverified.
- MeetingsPage CSS: Normal 0 errors / 0 warnings; Extended 0 errors / 196 warnings.
- MeetingNoteEditorPage CSS: Normal 0 errors / 0 warnings; Extended 0 errors / 93 warnings.
- Meeting Notes Extended diagnostics: 145 property redefinitions, 91 foreground-color-without-background warnings and 53 background-without-foreground-color warnings.
- Compared with the prior P2-C audit: Normal warnings remain 117; Extended warnings increased from 3,056 to 3,076 (+20). The cause of the Extended difference has not been established.
- Raw validator reports: w3c-audit/report-normal.json and w3c-audit/report.json.
- W3C HTML: formal dynamic-route validation pending.
- Strict W3C 0 errors / 0 warnings: not established; ADR-042 warning-risk sign-off remains open.
- Pull request, CI, Preview, merge commit and production smoke test: pending.

This document describes the implemented local feature and open release gates. It does not assert that P2-01 has been merged or deployed.

## P2-01 Release Handoff — 2026-10-14

**Status:** Implementation and local verification completed; PR #10 awaiting merge.

**Scope delivered:** Individual Meeting Notes Archive/Restore lifecycle; read-only protection for archived notes; Current/Archived history views; sorting and pagination; meeting-date validation; responsive UI; regression coverage.

### Final verification evidence

- ESLint: PASS.
- Vitest: 265 passed across 62 files.
- W3C tooling unit tests: 74 passed, 0 failed.
- GitHub Pages production build with `--base=/helmsight/`: PASS.
- GitHub Actions PR checks: 3 successful; GitHub Pages deployment skipped as expected for a pull request.
- Vercel Preview deployment: successful for commit `f3bf575`.
- PR: https://github.com/andrii-dolzhenko/helmsight/pull/10
- Preview: https://helmsight-git-feature-p2-meeting-notes-8164a4-andrii-dolzhenko1.vercel.app/

### Preview verification scope and accepted exception

Landing Page and the demo project's Meeting Notes page were loaded and visually reviewed on Vercel Preview.

The full Archive/Restore, sorting, pagination, date-validation and persistence scenario was tested locally, but was **not repeated end-to-end on Vercel Preview**. The project owner explicitly accepted skipping this duplicate Preview test because preparing substantial test data would add disproportionate effort.

This is a recorded QA scope exception, **not** a claim that full Preview end-to-end testing passed.

### Validation debt and remaining release checks

- Official W3C CSS Normal audit: 30/30 assets verified; 0 errors, 117 warnings.
- Official W3C CSS Extended audit: 30/30 assets verified; 0 errors, 3,076 warnings.
- Strict global W3C 0-error/0-warning sign-off remains OPEN under ADR-042.
- Formal dynamic-route HTML validation remains OPEN.
- Production verification after merging PR #10 remains PENDING.
- Successful CI does not imply closure of these outstanding validation items.

This handoff supersedes earlier pending PR/CI/Preview status notes in this document. It closes the P2-01 implementation evidence, not the outstanding global validation obligations.
