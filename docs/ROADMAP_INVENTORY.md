# HelmSight — Future Features & Roadmap Inventory

- **Version:** v1.0 (discovery inventory, not approved phase scope)
- **Reviewed:** 2026-10-12
- **Baseline:** HelmSight P0.1, `main` at `64d5f44`, tag `p0.1`; working branch `feature/p1-safe-project-deletion` created by project owner
- **Canonical decisions:** [DECISIONS — Final Project](https://docs.google.com/document/d/1DCgkTPbcTCZDG5zeETErmLlRQ8qAgIPpQevcqnfgs_I/edit), ADR-001 through ADR-040 (live export on 2026-10-12)
**Other sources:** P0.1 `README.md`, `docs/P1_BACKLOG.md`, `docs/P01_RELEASE_GATE.md`, `docs/CSS_VALIDATION_POLICY.md`, approved `HelmSight_P1_SCOPE_FINAL.md`, representative React routes/services/UI and archived HelmSight handoff snapshots.

> **Status:** Inventory only. Proposed phases below are **not approved** scope, backlog, deadlines, budgets, or commitments. The current P1 remains frozen by ADR-040. This file does not amend DECISIONS, create tasks in GitHub, or modify the production repository.

## 1. Interpretation rules

- **Evidence labels:** `Implemented` = supported by P0.1 source/README (not a fresh production QA run); `Partial` = a subset exists; `Missing` = not found in P0.1 UI/routes for the specified feature; `Unverified` = documentation mentions behavior but the complete workflow was not inspected.
- **Decision labels:** `Adopt` = approved concept/rule; `Candidate` = under consideration; `Revisit later` = explicitly deferred; `Out of scope` = intentionally excluded. These **do not** mean implemented. Some adopted ADRs have subsequent refinements/deferrals; use the latest relevant statement.
- **Phase labels:** `P0.1` = delivered historical baseline; `P1 LOCKED` = current frontend/localStorage deletion release; `P2?` = **proposed** next frontend feature release; `P3?` = **proposed** frontend hardening/release stage; `FS?` = later full-stack stage, schedule/stack TBD; `Later?` = optional/stretch/post-course; `Unassigned` = insufficient evidence/decision for a phase.
- **References** are identifiers from the canonical DECISIONS document, not new ADRs. The owner must approve a feature before moving it to a release backlog; do not infer a phase from older phrases such as “P1 / Final Full-Stack”.
- **Do not confuse a global sidebar entry with a project tab:** ADR-038 approves the distinction, not a duplicate navigation link. **User-created/customizable sidebar tabs have no approved requirement** in the reviewed sources.

## 2. Current phase map — proposal, NOT an approval

| Stage | Goal | Entry/exit rules | Status |
| --- | --- | --- | --- |
| P0/P0.1 | HW-15 frontend MVP, QA, CSS cleanup, deployed demo | Historical evidence in repository | Delivered (P0.1 baseline) |
| **P1** | Safe permanent deletion of archived projects, data integrity and release QA | ADR-040, P1 scope, P1-DATA-01 design review, tests and gate | **LOCKED / feature branch open** |
| **P2?** | Selected frontend value: global portfolio flows, navigation, lightweight search, Decision Lab or smaller UX enhancements | New P2 brief, ranked backlog, data/API feasibility, user approval | **Candidate only** |
| **P3?** | Frontend release candidate and quality/accessibility/docs; remaining explicitly selected journeys | Confirmed rubric; release gates | **Candidate only** |
| **FS?** | Backend + DB, identity, permissions, persistence, core integrations/notifications/history | Backend/database course, official final rubric, new ADR(s), migration plan | **Deferred; no fixed phase number** |
| **Later?** | More advanced AI, enterprise integrations, rich planning and polish when justified | User value, security, cost, course boundaries | **Candidate / not committed** |

**Naming conflict to resolve:** ADR-005/006/007 were written when “P1 / Final Full-Stack” meant a *different* stage from the P1 now governed by ADR-040. Preserve the underlying product ambitions but use `FS?` until the actual full-stack release is planned. Existing candidate “P2/P3” plans likewise are not frozen requirements.

## 3. Master feature & capability inventory

Each line is independently trackable. **Proposed stage** is a recommendation, not an approved release allocation. Dependencies and scope gates appear in section 4.

### A. Existing product foundation / baseline verification

| ID | Capability | P0.1 evidence / remaining gap | Decision source | State | Proposed stage |
| --- | --- | --- | --- | --- | --- |
| HS-001 | Project portfolio, create/edit, Active/Archived, Restore, Grid/List | Implemented; permanent Delete separately in P1 | ADR-007, 014, 016, 017 | Implemented | P0.1 |
| HS-002 | Project workspace Overview and scoped project tab navigation | Implemented; **global** Overview is different | ADR-007, 013, 038 | Implemented | P0.1 |
| HS-003 | Project Charter, Stakeholder Register, Communication Plan | Implemented current-revision governance; durable revision history absent | ADR-007, 019, 031 | Implemented/Partial | P0.1 / FS? audit |
| HS-004 | Success Criteria, derived status, ROI/gross/profit margin | Implemented; NPV separately deferred | ADR-008 | Implemented | P0.1 |
| HS-005 | Project Risks, scoring, matrix, Grid/List, detail | Implemented; global portfolio risks, comments, attachments distinct | ADR-022, 023, 038 | Implemented | P0.1 |
| HS-006 | Milestones, progress/status synchronization, roadmap | Implemented; no full scheduler or critical path | ADR-024, 025 | Implemented | P0.1 |
| HS-007 | Management Actions register, owners, priorities, progress | Implemented; recurrence, notifications and real source links deferred | ADR-006, 027 | Implemented/Partial | P0.1 |
| HS-008 | Metrics/EVM baselines, periodic snapshots, calculations and charts | Implemented; richer profile/imports are candidates | ADR-028, 029 | Implemented | P0.1 |
| HS-009 | Weekly Status Reports: Draft/Final, reopen, snapshots, archive/restore, narrative, print | Implemented; approval, distribution and durable full revisions deferred | ADR-032, 033 | Implemented/Partial | P0.1 / FS? |
| HS-010 | Meeting Notes CRUD, details, follow-ups, draft recovery, print/PDF | Implemented; **individual note Archive/Restore not implemented** (ADR-036) | ADR-034, 035, 036 | Implemented/Partial | P0.1 / P2? |
| HS-011 | Portfolio derived health and Needs Attention | Implemented; new portfolio-level global overview distinct | ADR-030, 037 | Implemented | P0.1 |
| HS-012 | Daily Insight in Projects Portfolio Hero | Implemented: deterministic daily selection from **12 local quotes**; curation/verification expansion open | ADR-010, 030 | Implemented/Partial | P0.1 / P2? |
| HS-013 | Desktop-first responsive UX, Light/Dark/System, accessible controls, reduced motion | Implemented baseline; ongoing per-feature QA required | ADR-005, 012, 013, 015, 026 | Implemented/QA ongoing | P0.1 onward |
| HS-014 | Theme-safe branded landing, hero/radar, navigation and common UI conventions | Implemented; optional effects/icon-system work separate | ADR-012, 015, 016, 026, 030 | Implemented/Partial | P0.1 / optional |
| HS-015 | Frontend state/service boundaries, local data persistence, lazy routing and test harness | Implemented; HTTP/DB integration not implemented | ADR-001–003, 013 | Implemented/Partial | P0.1 / FS? |
| HS-016 | ESLint/build/Vitest, GitHub Actions, Vercel and GitHub Pages, documented CSS policy | P0.1 release evidence; runtime/validator gate repeats for each release | ADR-039; P0.1 docs | Implemented/QA ongoing | P0.1 onward |
| HS-017 | Existing sidebar only links Projects; top-right `PM` denotes local workspace | Verified in `src/layouts/AppLayout/AppLayout.jsx`; not global nav or real account | ADR-038, 005 | Partial | P0.1 / P2?/FS? |

### B. Fixed P1 backlog — approved, not yet implemented

| ID | Deliverable | Acceptance / constraints | ADR/source | State | Stage |
| --- | --- | --- | --- | --- | --- |
| HS-018 | Architecture/scope sign-off | Frontend/localStorage + API-ready; backend/database/auth excluded | ADR-040, approved P1 scope | Adopt; completed | **P1 LOCKED** |
| HS-019 | P1-DATA-01 ownership & persistence design | All project-owned keys/drafts; journal/startup hook; failure, stale tab, Atlas seed paths | ADR-040 | Adopt; design pending | **P1 LOCKED** |
| HS-020 | Permanent delete **only from Archived Grid/List** | Recheck archival state at service, never treat Archive as Delete | ADR-014, 040 | Adopt; missing | **P1 LOCKED** |
| HS-021 | Exact-name accessible deletion confirmation | Literal case-sensitive match; cancel/ESC zero writes; focus and pending states | ADR-040 | Adopt; missing | **P1 LOCKED** |
| HS-022 | Coordinated cascade + resumable localStorage intent | Project record last, cross-feature cleanup, no collateral data loss, no false success | ADR-040 | Adopt; missing | **P1 LOCKED** |
| HS-023 | Delete demo-project/Atlas with persistent anti-reseed guard | Cover initial seeds and later versioned report seed migrations, same-origin limitation | ADR-040 | Adopt; missing | **P1 LOCKED** |
| HS-024 | P1 tests, QA, CSS/HTML gates, docs, PR, two-origin release smoke | 12 accepted scenarios; retain W3C raw counts and any documented blockers | ADR-039, 040; P1 scope | Adopt; pending | **P1 LOCKED** |

### C. Frontend product opportunities — not included in P1

| ID | Feature / concrete scope candidate | Why / constraints | ADR(s) | Current evidence | Proposed stage |
| --- | --- | --- | --- | --- | --- |
| HS-025 | **Global Overview** sidebar destination | Portfolio-level signals; do not duplicate per-project Overview or existing Projects hero | 038, 030, 037 | Missing | P2? |
| HS-026 | **Global Risks** | Cross-project register, scope filters, navigate to project Risk Detail | 038, 022, 023 | Missing | P2? |
| HS-027 | **Global Actions** | Cross-project inbox, due/overdue attention, contextual project links | 038, 006, 027 | Missing | P2? |
| HS-028 | **Global Reports** | Cross-project report discovery/history without duplicate report editor | 038, 032, 033 | Missing | P2? |
| HS-029 | **Global Meetings** | Cross-project notes index/history, with project context | 038, 034–036 | Missing | P2? |
| HS-030 | **Global Metrics** | Compare compatible KPIs/health; **never sum PV/EV/AC across unlike measurement bases** | 038, 028, 029 | Missing | P2? (high design cost) |
| HS-031 | Sidebar navigation expansion / information architecture | One global layer + existing project tabs, responsive, role-aware later; no decorative dead links | 038, 026 | Partial (Projects only) | P2? |
| HS-032 | **Decision Lab** professional PM microlearning | Candidate 5–10 curated scenarios, 3–4 answers/explanations, understated secondary placement, **not game/XP** | 011, 005 | Missing | P2? |
| HS-033 | Daily Insight catalog expansion and provenance review | Expand toward ~50–100 **verified** quotes; preserve deterministic date and Projects Hero placement | 010, 030 | Partial (12 records) | P2? (small) |
| HS-034 | Enhanced Daily Insight preferences/context-aware selection | Category preference/project context; backend catalog/sync are later optional | 010, 030 | Missing | Later?/FS? |
| HS-035 | Local Projects search/filter | Distinguish real local Projects search from URL query view switching; verify UX/spec before implementation | 021, 017 | Missing (no text search UI found) | P2? |
| HS-036 | Global autocomplete search across entities | Grouped Risk/Milestone/Report/Action/Meeting results, keyboard navigation, recent items, debounce, no-results state; API-replaceable | 021 | Missing | P2? as local pilot or FS? for scalable backend |
| HS-037 | Meeting Notes Archive/Restore | Current/Archived states, metadata-only archive, no content version increment; deferred by ADR-036 | 035, 036 | Missing | P2? |
| HS-038 | Lessons Learned Register | Structured lessons throughout delivery/closeout, project links, searchable reuse | 018 | Missing | P2? (candidate) |
| HS-039 | Additional Project Starter Pack / reusable artifact templates | Structured template library and starter packs; existing governance forms are not yet a reusable library | 004, 005, 007 | Partial | P2? / FS? |
| HS-040 | Project-level Decision Log / Change Log | Named as starter-pack examples; **not yet approved as standalone implementations** | 005; 004 | Missing | Unassigned |
| HS-041 | Project overview/portfolio “Today's priorities” | Implement only with real portfolio-wide data model and usable action; no empty CTA | 030, 006 | Missing | P2? |
| HS-042 | Cross-module source linking (Risk → Create Action, etc.) | Preserve entity relations; avoid generic task subsystem | 006, 027 | Missing/Unverified | P2? |
| HS-043 | Risk Register search/filter/sort and possible advanced fields | Follow agreed Grid/List behavior; comments/attachments/advanced workflow require scope approval | 022, 023 | Partial | P2? / Later? |
| HS-044 | Advanced project table/filtering, sorting, pagination/virtualization | Conditional on portfolio scale/usability, not required simply because ADR-017 mentions it | 016, 017 | Grid/List exists; advanced table missing | Later? |
| HS-045 | CSV export for selected registers | P0 optional/cut candidate; re-evaluate with real export requirement | 007 | Missing/Unverified | P2? candidate |
| HS-046 | NPV financial criterion | Requires cash-flow periods and discount rates; ROI/margins already implemented | 008 | Missing | Later? |
| HS-047 | Global Settings and Help destinations | Only introduce real global app/workspace settings and help, not duplicated contextual Help | 038, 005 | Partial: theme and contextual Help | P2? / FS? |
| HS-048 | Icon-system consistency / minor UI polish | ADR-026 icon choice remains candidate, no dependency just for style | 026, 012 | Partial | P3? if justified |

### D. Backend, authentication, collaboration & durable persistence

| ID | Feature | Prerequisite and decision status | ADR(s) | Current evidence | Proposed stage |
| --- | --- | --- | --- | --- | --- |
| HS-049 | Backend architecture choice (Express/Node or other course-approved option) | **Revisit later** after backend/database material, rubric and instructor guidance; do not assume Next.js migration | 002, 013, 040 | Not selected | FS? discovery gate |
| HS-050 | Database + migration from origin-local data | Data model, multi-user ownership, seed strategy, migration, API error handling | 002, 005, 013, 040 | No DB | FS? |
| HS-051 | Account creation / sign-in / sign-out and real Profile | Auth and persistent secure sessions; top-right PM badge is NOT an account | 005, 038 | Missing | FS? |
| HS-052 | Google OAuth; optional GitHub sign-in | Google primary candidate, GitHub secondary; provider choice not frozen | 005 | Missing | FS? |
| HS-053 | Workspaces, project membership/invitation, RBAC | Server-enforced roles (PM/User, Owner, Contributor, Viewer, Workspace Admin candidates) | 005, 020 | Missing | FS? |
| HS-054 | Person Picker / people autocomplete | Logged-in user, project/workspace members and manual externals; stable person references | 020 | Missing | FS? after HS-053 |
| HS-055 | Cross-device data synchronization / shared collaboration | Requires DB/auth ownership and consistency model; two deployment origins currently independent | 004, 005, 013 | Missing | FS? |
| HS-056 | Durable revision/audit history, approval/sign-off | Real author identity, immutable history; existing `version` is current revision only | 005, 019, 031, 032 | Partial metadata only | FS? |
| HS-057 | Real share links, report/note distribution, email/export | Auth, permissions, server storage and delivery model; print-to-PDF already exists | 034, 032, 005 | Missing (sharing) | FS? |
| HS-058 | Reminder engine for management actions | Persistent due/reminder dates, recurrence, preferences; no pretend client-side scheduled delivery | 006, 027, 005 | Manual Actions exist; scheduler missing | FS? |
| HS-059 | In-app alerts, email notifications and preferences | Risk/milestone/action/report events, anti-spam, delivery/permissions | 005, 006 | Missing | FS? |
| HS-060 | Scheduled Morning Delivery Brief | Health + overdue actions + upcoming events + freshness; scheduled backend generation/delivery | 004, 005, 006 | Missing | FS? |
| HS-061 | Google Calendar integration | OAuth/security, consent, schedule/timezone, meeting metadata; optional initial integration | 004, 005, 006 | Missing | FS? |
| HS-062 | GitHub read-only delivery signals | API auth, project linking, last-sync state and failure degradation | 004, 005 | Missing | FS? |
| HS-063 | Integration health / background jobs and observability | Retries, freshness, last-known-good, throttling, error status, quotas | 005, 004 | Missing | FS? |
| HS-064 | Automated DB backups, restore procedure and data export/recovery | Select based on chosen DB/hosting; do not simulate browser backup with Pages | 005 | Missing | FS? |
| HS-065 | Backend authorization/security hardening | Server-side validation/access checks, XSS/CSRF as appropriate, secrets, HTTPS, rate/payload limits | 005 | Baseline client quality only | FS? |
| HS-066 | Real user/workspace Settings + sync of preferences | Depends on authenticated identity; local Light/Dark/System already exists | 005, 038, 015 | Partial | FS? |

### E. AI, advanced analytics and optional integrations — gated

| ID | Candidate | Conditions / explicit product boundary | ADR(s) | Current evidence | Suggested stage |
| --- | --- | --- | --- | --- | --- |
| HS-067 | AI-assisted Weekly Status draft | AI drafts only; user reviews/edits; source project data stays canonical | 004, 005, 032 | Missing | FS? optional |
| HS-068 | AI risk/issue advisor | Suggestions, not automatic project decisions; project-data privacy guard | 004, 005 | Missing | FS? optional |
| HS-069 | AI Meeting Intelligence (pasted notes/transcripts) | Structured summary, draft decisions/risks/follow-ups/actions, explicit user accept/edit/reject | 006 | Missing | FS? optional |
| HS-070 | AI-generated follow-up messages | Editable draft only; no autonomous sending | 006 | Missing | FS? optional |
| HS-071 | Native audio/video capture/transcription/diarization | Explicitly beyond core final MVP; privacy/consent/infrastructure risk | 006, 007 | Missing | Later? only |
| HS-072 | Advanced EVM profiles / rates / measurement models | Non-linear PV, custom calendar, hourly rates, dual financial-effort baseline, task earning rules | 028, 029 | Missing | Later? |
| HS-073 | Execution-tool imports (Jira/YouTrack/Asana) | Read-only/derived signals before complex write-back; not a replacement for issue tracking | 028, 029, 004 | Missing | Later?/FS? |
| HS-074 | Advanced reports: templates, approvals, immutable version browsing | Requires product workflow and/or backend audit model | 032, 019 | Missing | FS?/Later? |
| HS-075 | Additional integrations (Slack/Teams/Jira/Linear) | Explicitly later than initial Google/GitHub, unless rubric/user need elevates | 005, 007 | Missing | Later? |
| HS-076 | Advanced AI/personalized Decision Lab or quote selection | Real data signals + explicit privacy/cost and product UX rules | 011, 010 | Missing | Later? |
| HS-077 | Optional marketing motion, video, 3D, richer visual effects | No regression to accessibility/performance; not core app value | 012 | Baseline motion exists | Later? |
| HS-078 | Full offline-first / sync conflicts, enterprise SSO, Superadmin & multi-tenant SaaS | Explicitly not first full-stack MVP; only with validated user demand | 005, 007 | Missing | Later? / out of initial scope |

### F. Exclusions and unapproved interpretation requests

| ID | Feature / interpretation | Treatment | Evidence |
| --- | --- | --- | --- |
| HS-079 | Team tasks, Kanban/Scrum, sprint/backlog, time tracking, team chat | **Out of scope of HelmSight core direction**; do not turn Management Actions into task management | ADR-004, 006, 007 |
| HS-080 | Full Gantt/critical path/WBS, resource-capacity scheduling | **Out of core scope**; milestone roadmap is accepted simpler alternative | ADR-004, 025, 007 |
| HS-081 | Accounting/ERP, taxes, payment reconciliation, full P&L | **Out of core scope**; ROI/margins are management indicators, not bookkeeping | ADR-008 |
| HS-082 | Gamification XP, coins, badges, leaderboards, punitive streaks | **Not adopted**; Decision Lab is professional microlearning | ADR-005, 011 |
| HS-083 | Customizable user-created sidebar tabs | **Not specified/approved**; user request needs separate UX/product brief; ADR-038 concerns *fixed global navigation destinations* | ADR-038 |
| HS-084 | Full FSD rewrite, Next.js migration or backend in P1 | **Explicitly excluded from current P1**, and not justified solely by popularity | ADR-002, 003, 013, 040 |
| HS-085 | Bulk permanent project deletion, Trash/Undo, demo seed-reset UI | **Explicitly out of current P1**; later only via new approval | ADR-040 |

## 4. Dependency map and recommended sequencing

```text
CURRENT P1 (LOCKED)
  HS-019 ownership/draft-key manifest + recovery/seeding design
        -> HS-020..023 archive-only deletion, UI, cascade, Atlas marker
        -> HS-024 regression/validation/release evidence

FRONTEND EXPANSION (all CANDIDATE)
  existing per-project domain stores
        -> global data contracts and scope rules (ADR-038)
        -> HS-025..031 (choose a small first set, not all seven automatically)
        -> HS-036 local global search pilot only if navigation/data ownership supports it
  existing quotes -> HS-033 verified catalog expansion
  existing meeting notes -> HS-037 note archive/restore
  editorial review of content + low UI coupling -> HS-032 Decision Lab
  Project Starter Pack design -> HS-039 templates and HS-040 potential registers

FUTURE FULL-STACK (after course/rubric decision)
  HS-049 backend ADR + HS-050 database schema/migration
        -> HS-051..055 auth/accounts/workspace/RBAC/people/sharing
        -> HS-056,057 audit & protected sharing
        -> HS-058..060 reminders, notifications, Morning Brief
        -> HS-061..063 integrations and freshness/background jobs
        -> HS-064..066 backup/security/account settings
        -> opt-in, privacy-reviewed HS-067..070 AI assistance
```

**Important dependencies/rules:**
1. Global sidebar destinations (ADR-038) need **real cross-project screens**, not links relabeling project-local tabs. Global Metrics cannot mathematically aggregate incompatible EVM units.
2. Account/profile needs backend identity and secure sessions; replacing the `PM` badge with a visual menu alone is **not authentication**.
3. Search may start locally, but must not assume backend API/DB already exists; scalable search may be deferred until the backend.
4. Meeting Notes archive/restore was **conceptually adopted** in ADR-035, then **implementation was deferred** by ADR-036: don't count it as P0 delivered.
5. Daily Insight already works; enhancing provenance and content is not the same as implementing a new quote feature. AI-based dynamic quote generation is not an accepted requirement.
6. Do not make notifications, scheduled emails, shared data, OAuth or AI claims in a pure-localStorage frontend release.

## 5. Prioritization proposal for the next scope workshop

These are **recommendations** (not ADR updates). Before P2 commitment, score each by user impact, demo value, effort, UX complexity, data integrity, rubric relevance and backend dependency.

| Shortlist group | Candidate IDs | Why consider | Key risk |
| --- | --- | --- | --- |
| Quick, low-risk polish | HS-033, HS-035, HS-037 | Improves existing surfaces; small architecture footprint | Quote provenance; meeting lifecycle testing |
| Product differentiator | HS-032, HS-038 | PM learning and knowledge reuse | Content quality; new module ownership |
| Portfolio management value | HS-025, HS-027, HS-026, HS-028, HS-029 | Highest relevance to core cross-project intelligence | Multiple data slices, filtering, navigation, consistency |
| High-design/scale | HS-030, HS-036, HS-039 | Stronger UX and extensibility after baseline | EVM comparability, search indexing, template model |
| Full-stack prerequisites | HS-049–055, HS-065 | Enables durable secure accounts/data | Rubric, model, migration, hosting/security |
| Post-backend enhancements | HS-056–076 | Collaboration, integrations and actionable intelligence | Scheduling, permission/privacy, cost/operational load |

**Suggested P2 sizing rule:** select one main cross-project flow (for example Global Actions *or* Global Overview), plus at most one small independent polish item; require separate capacity estimate after reading requirements. This is **not a P2 decision** and the owner may choose a different emphasis.

## 6. Roadmap decision backlog / open questions

| Decision ticket | Question to resolve | Trigger / owner action |
| --- | --- | --- |
| RD-01 | Confirm official final project rubric, course schedule and actual deadline | Before committing P2/FS releases; instructor/LMS |
| RD-02 | Does “add tabs to left sidebar” mean fixed **global sections** or **user-configurable shortcuts**? | Before Sidebar scope/UX design |
| RD-03 | Which one or two portfolio modules deliver highest value first? | P2 backlog workshop; dependencies on ADR-038 |
| RD-04 | Decision Lab placement, curated question count, scoring/progress retention | Before promoting ADR-011 Candidate |
| RD-05 | Daily Insight catalog verification process and content target | Before HS-033 |
| RD-06 | Global Search local-first pilot vs wait for backend API | Before HS-036 / backend data contracts |
| RD-07 | Meeting Notes Archive/Restore: promote deferred implementation? | Before HS-037; reconcile ADR-035/036 |
| RD-08 | Are Lessons Learned and Starter Pack/Decision Log worth distinct P2 modules? | Before HS-038..040 |
| RD-09 | Backend/DB/API architecture, migration, user/workspace ownership | Backend/database lessons and rubric (ADR-002) |
| RD-10 | Auth provider, sessions, roles and member invitations | After RD-09; ADR-005/020 |
| RD-11 | First integrations and notifications, privacy and sending policies | Once identity/backend exists |
| RD-12 | Remaining W3C warning/compatibility issue classification and release exceptions | Each phase release gate; ADR-039 and CSS policy |
| RD-13 | Reconcile old “P1 / Final Full-Stack” language in historical ADRs **without erasing history** | Roadmap versioning/update decision, not a silent rewrite |
| RD-14 | Confirm P1 design review and synchronize stale `P1_BACKLOG.md` / scope-header statuses | Within current `feature/p1-safe-project-deletion` before production coding |

## 7. Release integrity and evidence limits

- **Current P1 remains:** HS-018–024 only. No Decision Lab, Account, Global Search, new Sidebar modules, backend, DB, AI or integrations may enter P1 by merely appearing in this inventory.
- The accepted P1 scope file still has pre-branch/ADR-recording checkboxes written before the owner created `feature/p1-safe-project-deletion` and ADR-040 was appended; update these **operational status fields** in repository during P1 documentation work without rewriting historical decisions.
- P0.1 W3C `--warning=1` evidence: 26/26 CSS assets, 0 errors and 39 warnings; `--warning=2` current gate not proved. Do not reinterpret as 0/0 or declare a release solely from unit tests.
- Actual current GitHub/Vercel deployments and new production CI have **not** been independently queried during this inventory; source evidence comes from the user-supplied P0.1 archive and prior verified Git transcript.
- Proposed roadmap estimates are intentionally absent pending feature-level design and the instructor's final-project requirements.
- This document tracks **capabilities**, not a promise to implement every conceptual extension.

## 8. Source/ADR coverage matrix

The following generated ledger is intended to make omissions discoverable. Some ADRs are architectural/visual rules rather than backlog features; mapping an ADR into the inventory does not turn it into new scope.

| ADR | Canonical heading | Canonical status (top-level) | Inventory coverage |
| --- | --- | --- | --- |
| ADR-001 | Frontend Baseline | Adopt | HS-015, HS-084 |
| ADR-002 | Backend Architecture | Revisit later | HS-049, HS-084 |
| ADR-003 | Feature-Sliced Design | Candidate | HS-015, HS-084 |
| ADR-004 | Product Direction: Delivery PM Control & Intelligence Workspace | Adopt | HS-039, HS-060–062, HS-067–069, HS-079–080 |
| ADR-005 | Cross-Cutting Product, UX, Security & Reliability Principles | Adopt | HS-013, HS-039–040, HS-049–066, HS-075, HS-078, HS-082 |
| ADR-006 | Management Actions, Reminders & AI-Assisted Meeting Intelligence | Adopt | HS-007, HS-027, HS-042, HS-058–060, HS-069–071, HS-079 |
| ADR-007 | HW-15 Frontend MVP Scope | Adopt | HS-001–016, HS-039, HS-045, HS-079–080 |
| ADR-008 | Success Criteria & Project Financial Metrics | Adopt | HS-004, HS-046, HS-081 |
| ADR-009 | Product Name: HelmSight | Adopt | HS-014 |
| ADR-010 | Daily Insight Quote in Dashboard Hero | Adopt | HS-012, HS-033–034 |
| ADR-011 | Decision Lab: Professional PM Microlearning | Candidate | HS-032, HS-076, HS-082 |
| ADR-012 | HelmSight Visual Identity, Dashboard Surfaces & Marketing Motion | Adopt | HS-013–014, HS-048, HS-077 |
| ADR-013 | Frontend Architecture v1 | Adopt | HS-015, HS-049, HS-084 |
| ADR-014 | Archived Projects UX & Operational Exclusion | Adopt | HS-001, HS-020 |
| ADR-015 | Marketing Landing Theme Isolation | Adopt | HS-013–014, HS-066 |
| ADR-016 | Project Card Size & Text Overflow Rules | Adopt | HS-001, HS-044 |
| ADR-017 | Projects Grid/List View Modes | Adopt | HS-001, HS-044 |
| ADR-018 | Lessons Learned Register | Candidate | HS-038 |
| ADR-019 | Document Control Metadata Pattern | Adopt | HS-003, HS-056 |
| ADR-020 | Person Picker & People Autocomplete | Candidate | HS-054 |
| ADR-021 | Global Search Autocomplete Architecture | Candidate | HS-035–036 |
| ADR-022 | Risk Register Grid/List Views & Risk Detail | Adopt | HS-005, HS-043 |
| ADR-023 | Risks P0 Scope Freeze | Adopt | HS-005, HS-043 |
| ADR-024 | Milestone Progress/Status Synchronization & Responsive Timeline | Adopt | HS-006 |
| ADR-025 | Milestones P0 Scope Freeze | Adopt | HS-006, HS-080 |
| ADR-026 | Shared Module UI Consistency Scale | Adopt | HS-013–014, HS-048 |
| ADR-027 | Management Actions P0 Scope Freeze | Adopt | HS-007, HS-042, HS-058 |
| ADR-028 | Metrics/EVM Measurement Basis & Weekly Snapshot Model | Adopt | HS-008, HS-030, HS-072–073 |
| ADR-029 | Metrics / EVM P0 Scope Freeze | Adopt | HS-008, HS-072–073 |
| ADR-030 | Projects Portfolio Hero, Daily Insight & Projects Navigation Behavior | Adopt | HS-012, HS-033–034, HS-041 |
| ADR-031 | Governance P0 Data Model & Scope Freeze | Adopt | HS-003, HS-056 |
| ADR-032 | Weekly Status Report Data Model & Snapshot Lifecycle | Adopt | HS-009, HS-057, HS-074 |
| ADR-033 | Weekly Status Report P0 Scope Freeze | Adopt | HS-009 |
| ADR-034 | Meeting Notes P0 Print & Sharing Boundary | Adopt | HS-010, HS-057 |
| ADR-035 | Meeting Notes Archive / Restore Lifecycle | Adopt | HS-037 |
| ADR-036 | Meeting Notes P0 Scope Freeze | Adopt | HS-010, HS-037 |
| ADR-037 | Portfolio Derived Project Health P0 Completion | Adopt | HS-011, HS-025 |
| ADR-038 | Global Portfolio Navigation vs Project Workspace Navigation | Adopt | HS-017, HS-025–031, HS-047, HS-083 |
| ADR-039 | Strict W3C CSS Validation & Safe Theme Token Compilation | Candidate (global rollout); approved quality objective | HS-016, HS-024 |
| ADR-040 | P1 Frontend Persistence Boundary and Safe Project Deletion | Adopt | HS-018–024, HS-084–085 |

## 9. Maintenance / source-of-truth workflow

1. Treat this Markdown as a **discovery inventory**; use it to prepare a feature shortlist, not as permission to edit implementation or scope.
2. Once a material product decision is accepted, add/update the **existing canonical** DECISIONS Google Doc with the next ADR, or update an applicable existing ADR; preserve superseded history.
3. Then align the repository `docs/P1_BACKLOG.md` (for P1 only), future phase backlog, README, requirements and architecture docs with the approved scope; link the relevant ADR.
4. During each phase, mark item status `Implemented` only after code/QA evidence; keep `Candidate` and `Deferred` distinct from delivered functionality.
5. Re-run the 40-ADR coverage audit whenever DECISIONS changes.
