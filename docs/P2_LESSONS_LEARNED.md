# P2 — Lessons Learned (Project Workspace)

**Decision:** [ADR-047 — P2-02 Lessons Learned Register](https://docs.google.com/document/d/1DCgkTPbcTCZDG5zeETErmLlRQ8qAgIPpQevcqnfgs_I/edit) (Adopt, 2026-10-15).

**Scope:** Project-scoped frontend module. This module is not a global portfolio register.

**Current delivery and QA (2026-10-18):** The described feature is present in the merged `main` frontend and the deployed HelmSight application. Repository-wide rendered HTML QA later verified **47/47 routes, 0 errors, 0 warnings** (PR #23). Production CSS QA later verified **39/39 assets, 0 errors, no per-asset warning regressions**; raw warnings remain and strict CSS 0/0 is **not** achieved. Earlier feature-branch, checklist and QA statements below are preserved as **dated historical evidence**, not current release blockers.


## User flow and navigation

Open **Projects → [project] → Lessons Learned** (tab after Meetings).

| View | Route suffix after `/projects/:projectId` |
| --- | --- |
| Lesson register | `/lessons` |
| Create lesson | `/lessons/new` |
| Read lesson | `/lessons/:lessonId` |
| Edit lesson | `/lessons/:lessonId/edit` |

- Register: title/lesson preview, category, timestamps, search across title/situation/lesson/recommendation, category filter, newest/oldest/updated/title sorting and empty/error states.
- Detail: situation, lesson and practical recommendation, with editing and confirmed deletion for active projects.
- Editor: required-field validation, 140-character title limit, 5,000-character narrative limits, local draft recovery and discard/leave confirmation.
- Project archive: records are readable but create/update/delete are blocked in both UI and service. Cross-project record access and mutation are not permitted.

## Data and persistence

Each lesson has `id`, `projectId`, `title`, `category`, `situation`, `lesson`, `recommendation`, `createdAt` and `updatedAt`.

Approved categories: **Planning**, **Delivery**, **Communication**, **Stakeholders**, **Risk Management**, **Other**.

`src/features/lessonsLearned/api/lessonsLearnedService.js` owns validation, project ownership checks and the versioned `storageAdapter` collection (`lessonsLearned`); the register uses the pure `filterSortLessons` helper. The small feature uses the existing service boundary directly rather than adding another Redux slice. Persistence is browser-local; no backend, authentication, collaboration or cross-project lessons search is implemented.

Permanent project deletion includes lessons in the recoverable collection cascade. Lesson form drafts are project-scoped and included in project draft cleanup and recovery checks.

## Verification evidence and remaining gate

- **User confirmation:** Lessons Learned functional and visual review was completed in a separate chat; this document does not substitute for its original screenshots or evidence.
- **Integration rerun after syncing with `main` (2026-10-15):** `npm run check` passed (ESLint, **333/333 Vitest tests in 75 files**, and production build); standalone Node tests **74/74**; theme-preview tests **40/40**; `git diff --check` clean.
- Regression tests cover service CRUD, validation, project isolation, archive guards, drafts and deletion handling, plus register/detail/editor flows.
- **Historical QA gate (2026-10-15):** Formal rendered HTML validation was not yet demonstrated at this snapshot. The later PR #23 Nu audit verified 47/47 routes, 0 errors and 0 warnings; strict raw CSS 0/0 remains unmet. Existing CSS warnings are not waived; see `docs/CSS_VALIDATION_POLICY.md` and ADR-042.

## Implementation ownership

- UI: `src/pages/LessonsLearnedPage/` and `src/features/lessonsLearned/ui/`
- Domain/service: `src/features/lessonsLearned/lib/` and `src/features/lessonsLearned/api/`
- Routing/navigation: `src/app/router/router.jsx`, `src/layouts/ProjectLayout/ProjectLayout.jsx`
- Deletion integration: `src/features/projects/api/projectDeletionService.js`, `projectDeletionDraftKeys.js`

Keep this document aligned with ADR-047, the feature code and any subsequent production QA evidence.
