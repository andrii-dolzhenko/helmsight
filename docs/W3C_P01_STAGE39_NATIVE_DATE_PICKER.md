# HelmSight P0.1 — Stage 39: Native Date Picker Pilot

## Status

**Experimental / NOT ACCEPTED.** No changes are committed or deployed. This patch removes WebKit-specific styling from the native date-picker indicator in the Project Form. This is a browser-compatibility experiment, not a proven visually neutral change.

## Evidence and hypothesis

- Baseline after Stage 38: 26/26 production CSS assets audited, 1 W3C error, 44 W3C warnings, 17 files clean 0/0.
- `ProjectEditorPage` production CSS has three warnings referencing `::-webkit-calendar-picker-indicator`.
- The source rule occurs in `src/features/projects/ui/ProjectForm.module.css` and styles icon border radius, opacity, padding, cursor, background on hover, and transition.
- This pilot removes exactly the two rules targeting the vendor-specific pseudo-element. It retains the native `input[type=date]` field, browser calendar popup, `color-scheme` in light/dark, and the input's `:focus-visible` styling. No JavaScript/React logic is touched.
- Forecast (NOT verified): 1 Error / 41 Warnings. W3C may classify other output differently; judge only the new complete report.

## Important UI trade-off

Deleting the pseudo-element rules **can change the appearance/hover affordance of the calendar icon**. Accept only if browser visual and keyboard testing confirms native appearance and usability meet requirements. Do not merge merely to decrease warning counts.

## Application / rollback

From the existing cleanly understood `chore/p0-css-validation` branch (Stage 37–38 changes preserved):

```bash
git apply --check ~/Downloads/HS39_Native_Date_Picker_Pilot.patch && \
  git apply ~/Downloads/HS39_Native_Date_Picker_Pilot.patch
git diff --check
git status -sb
```

If the pilot fails acceptance, reverse **only this patch**, leaving Stages 37–38 intact:

```bash
git apply --reverse --check ~/Downloads/HS39_Native_Date_Picker_Pilot.patch && \
  git apply --reverse ~/Downloads/HS39_Native_Date_Picker_Pilot.patch
```

The documentation file belongs to this pilot and should only be staged/committed if accepted.

## QA gates

1. `npm run check`
2. `node --test scripts/*.test.mjs`
3. `node scripts/w3c-radar-production-check.mjs`
4. `npm run w3c:audit -- --warning=1 --force`
5. Verify the new report is complete (`26/26`, `unverified=0`, `pending=0`) and compare errors/warnings.
6. **Browser QA:** Create and Edit Project forms; start and target date fields; open the native calendar; select a date; click outside; repeat with keyboard focus, Tab, Enter/Space and arrows where available; both Light/Dark/System; desktop Chrome/Safari if available, mobile device emulator; hover/focus on the native icon and field.
7. Compare the old and new icon's hit area, alignment and discoverability. If degraded, reject and revert.

## Guardrails

Do not change the Vite transformation allowlist, theme variables, `@property`, `mask` properties, or other warning families here. Do not commit before running QA and reviewing the complete diff.
