# P2-12 — Header Notifications (ADR-052)

**Current delivery and QA (2026-10-18):** The described feature is present in the merged `main` frontend and the deployed HelmSight application. Repository-wide rendered HTML QA later verified **47/47 routes, 0 errors, 0 warnings** (PR #23). Production CSS QA later verified **39/39 assets, 0 errors, no per-asset warning regressions**; raw warnings remain and strict CSS 0/0 is **not** achieved. Earlier feature-branch, checklist and QA statements below are preserved as **dated historical evidence**, not current release blockers.


## Purpose and scope

Header Notifications are **actionable alerts, not messages or a permanent inbox**. A compact bell is placed next to the theme control in the global desktop header and between search/menu in mobile. Its unread indicator is branded green in Light (`#08744b`, white count) and neon green in Dark (`#83ffb7`, dark count); System follows the resolved `html[data-theme]`. The bell icon uses the adjacent theme control's button scale and 1.8px SVG stroke. No separate route, libraries or backend services are added.

The panel derives current state from Redux project, risk, management-action and milestone slices, reusing existing severity/schedule functions. It produces alerts for:

- **Decision Lab:** one eligible reminder per browser-local calendar day if the three-question session is unfinished. The reminder links to the *existing* Decision Lab modal; opening it marks the reminder read. It expires after its day or upon completion. Reloading does not create another copy; the set of 9 scenarios repeats every 3 days.
- **Critical risk:** an operational risk in an active project with `critical` severity (open and monitoring risks). Links to risk detail.
- **Overdue action:** an unfinished management action that `getActionAttentionState()` evaluates as overdue. Links to the actions list anchored to the record.
- **Overdue milestone:** an incomplete milestone evaluated overdue by `getMilestoneScheduleState()`. Links to the milestones list anchored to the record.

Archived projects, resolved problems, future deadlines, lower-severity risks and completed Decision Lab sessions are not displayed. No pseudo-events, timestamps or stale report summaries are persisted.

## Interaction, lifecycle and scale

- **All** contains read and unread active (not dismissed) alerts; **Unread** contains unread alerts only. `Mark all read` marks visible active alerts, without hiding them. `Dismiss` hides an individual alert and excludes it from the badge. Opening an alert marks it read.
- An unresolved signal remains active even if older than seven days. The current source data decides when a signal disappears; only read/dismiss **metadata** is retained and cleaned seven days after the signal is observed as resolved. If the same source condition resolves and recurs while the app observes the transition, it becomes a new unread episode. No unseen transitions across closed browser sessions can be reconstructed without an event backend.
- Each alert has a stable project/entity/condition ID. Decision Lab uses the browser-local day key. The storage key `notifications:state:v1` contains `{ version: 1, records }`, with read/dismiss flags and optional removal timestamps, **never cloned project records**. Corrupted storage shows an error rather than destructively resetting data. State is local to the browser origin, not synchronized across users or devices.
- The desktop panel is anchored to the bell (~400px wide, max 560px high). Mobile uses an almost full-width viewport-bounded panel; the header/filters/footer remain visible and the list scrolls internally with overscroll containment. Initially 20 items are rendered; `Show more` reveals 20 more at a time. Sort order: Decision Lab, critical risks, overdue actions, overdue milestones; then earliest relevant deadline, project, entity ID.
- Bell's count is **currently visible unread alerts** (`9+` visually, exact count in button accessible name). Escape, outside click and keyboard focus-out close the panel; Escape restores focus to the bell. Opening the Decision Lab uses its original accessible modal and focus return behavior. No automatic pop-up on page load, server push, service worker, scheduler, toast flood or background polling.

## QA and architecture boundaries

Pure alert selection lives in `features/notifications/lib/`, local read/dismiss metadata in `api/`, and the button/panel in `ui/`; `AppLayout` hosts a shared notification model for desktop/mobile. Existing feature services and the central `storageAdapter` remain canonical. Notification display reacts to loaded Redux state and to browser focus/visibility for day changes; it does **not** promise live delivery while the app is closed.

Validation: `npm run check`, `node --test scripts/*.test.mjs`, `npm run w3c:preview:test`, HTML Nu and both W3C CSS warning profiles, Light/Dark/System including contrast, 440px/768px/desktop, Escape, Tab, outside click, screen reader names, archived/complete/recurrence cases, and a 21+ alert list. ADR-042 allows deployment only after documented warning review; raw 0/0 remains an independent objective.
