# P2 Global Meetings — Read-only Portfolio Register

**Decision:** ADR-054 (Adopt, 2026-10-16).  **Delivery:** separate feature branch/PR; implementation and QA evidence to be verified.

## Product scope

`/meetings` lists existing Meeting Notes from the current portfolio. It does not create or edit records, change project/meeting archival state, or introduce another persisted data model. The existing `/projects/:projectId/meetings/:meetingId` detail page remains the sole record destination; edit and archive behavior remain controlled by the existing project workflow.

- Sidebar and mobile drawer: **Meetings** after Reports, before Help divider; decorative SVG icon inherits current theme.
- Three derived KPI values: Total meetings, Current notes and Archived notes.
- Search by title or project name (case-insensitive, trimmed); project picker; Current/Archived note lifecycle; explicit Include archived projects (off by default); Reset.
- Sort by newest/oldest meeting date or most recently updated. Same-day ties use updatedAt and stable ID. Ten records per page; controls appear only if needed.
- Desktop rows and responsive cards show Meeting, Project, Date, note Status, Updated and Open. The project is labelled separately when archived; a note may be current even if its project is archived.

## Scope and data rules

The current project population is all non-archived projects unless Include archived projects is enabled. Project selection then narrows the population for both register and KPI totals. Search, note lifecycle selection and sort only filter the visible register and **do not change KPI totals**. The `N of M notes` label shows the filtered register count against all notes in the selected project population. Orphan notes (project missing) are excluded because their contextual route is unavailable. Missing timestamps display `—`; meetingDate is a browser-local calendar date, not a UTC instant.

Current means `!note.archivedAt`; archived means `Boolean(note.archivedAt)`. Project archived state is independent, as required by ADR-035/036 and ADR-054. Display only saved data, without synthetic meetings or statuses. A deleted project and its notes must not reappear in Global Meetings. No meeting-note CRUD, backend, calendar integrations or new dependencies are introduced.

## Verification checklist

- Pure projection unit tests: active vs archived project, note lifecycle independently, orphan exclusion, counts, text matching, sorting and ties.
- Component tests: KPI count, source link, no create link, filters, empty state, pagination.
- Run lint, all Vitest, production build, desktop/iPad/iPhone Light/Dark/System, keyboard and reduced-motion QA, HTML validity and W3C CSS audits under ADR-042.
- Report CSS raw error/warning counts honestly; a successful build is not evidence of 0 warnings.
