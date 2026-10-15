# P2-03 — Decision Lab (ADR-050)

Status: **Implemented in feature branch; local review, validation and merge pending**. This document describes the intended deliverable, not proof of production availability.

## Purpose and entry

- Replace the desktop bottom-of-sidebar “A clearer tomorrow.” panel with an interactive Decision Lab card (blue-gradient brain icon, green accents). On mobile the lab entry appears in the navigation drawer.
- A modal opens over the **current route**; there is no dedicated global page or route. Close via ×, Escape, Close for now, or Back to workspace after completion. Background interaction is inert, scroll is locked and focus is restored to the entry control.
- Modal has a bounded viewport height with internal scrolling; Light/Dark/System use existing theme variables. Reduced-motion mode omits hover transforms/transitions where relevant.

## Curated daily scenarios

- Nine static, stable-ID project-management cases (risk, scope, stakeholders, budgets, quality, resources, reporting and communication), each with four possible approaches and contextual feedback.
- Every local calendar day contains **three** cases. The batch is selected with a deterministic civil-day ordinal modulo three; batches do not overlap within three consecutive days. On the fourth day the cycle repeats. There is no claim that all cases are completely new each day.
- Dates use browser-local `getFullYear/getMonth/getDate`, not UTC `toISOString`; a session's selected date is frozen while the modal remains open. A new date is evaluated when reopened.
- Answer selection is transient until Submit. Submitting saves the answer and enters a feedback stage; closing/reloading resumes the feedback stage. Next scenario advances once; after the third response, the user enters a completion summary.
- Completion reports how many decisions aligned with the scenario's recommended approach; alternatives are discussed as trade-offs, not punitive scores. Users can review all three saved answers and reopen a completed session without duplicate answers.

## Persistence and boundaries

- Data lives in `storageAdapter` under the versioned key `decisionLab:sessions:v1`. It contains `version: 1` and per-day sessions (`dayKey`, `phase`, `answers`). Only stable scenario/option identifiers are saved, not duplicated learning content.
- The service validates stored session shape and ownership of each answer within the corresponding daily batch. Malformed data produces a visible error, without automatic destructive reset. Previous sessions are retained for up to 30 civil days when a submission occurs.
- No Redux slice: state is local to a global modal, with a small feature-service boundary for persistence. No network, external dependency, account, sharing, AI generation, XP, streaks or rankings.
- `isDailySetAvailable(session)` is available for future P2-12 Header Notifications: a local once-per-day first-visit reminder for an unfinished daily session. **No notification center or automatic popup is implemented in this feature.**

## Files and checks

- `src/features/decisionLab/lib/scenarios.js`: curated cases and feedback.
- `src/features/decisionLab/lib/dailyDecisionLab.js`: date rotation and completion calculations.
- `src/features/decisionLab/api/decisionLabService.js`: validated local persistence.
- `src/features/decisionLab/ui/`: brain icon, entry card, dialog and responsive styles.
- `src/layouts/AppLayout/`: shell entry and modal host.

Automated tests cover three-day non-overlapping rotation, civil dates, data validation, submission/advance, resumability, completion/review, Escape/focus return and mobile entry. Run `npm run check`, `node --test scripts/*.test.mjs`, `npm run w3c:preview:test`, then real browser Light/Dark/System, 440px/768px/desktop, keyboard and formal W3C HTML/CSS validation. **Strict raw CSS 0/0 remains an open P2 phase target until verified.**

## Related decisions

- ADR-013 — frontend architecture and `storageAdapter`.
- ADR-038 — navigation separation.
- ADR-042 — CSS validation and warning adjudication.
- ADR-043 — P2 Decision Lab scope and notification boundary.
- ADR-050 — approved detailed daily quiz and overlay behavior.
