# Stage 38 — Equal fill and border color pilot

Status: **experimental — awaiting independent W3C audit and visual QA**.

## Audited starting point

- 2026-10-11, `css3svg`, `warning=1`, `--force`.
- 26/26 assets checked, 17 assets 0/0, 1 error, **47 warnings**, 0 unverified.
- `index-*.css`: 8 warnings; 3 are “Same color for background-color and border-color”.
- Do not change or remove registered radar `@property`, masks, line clamping, calendar or runtime CSS tokens in this pilot.

## Hypothesis and minimal experiment

Three existing declarations visually duplicate the background color into a 1px border:

1. `actionButtons.css` primary fill: remove the explicit `border-color` of the default state.
2. `actionButtons.css` primary hover: remove the explicit `border-color` of the hovered state.
3. `ProjectLayout.module.css` active tab: remove the explicit `border-color` of the selected tab.

Their *base selectors already set* `border: 1px solid transparent`. With the default CSS `background-clip: border-box`, a solid background paints behind that transparent border while retaining the same 1px border width and pill geometry. No explicit background clipping change is introduced. The `.tab.active:hover` rule keeps its existing independent accent-mixed border and background; secondary/danger buttons are unchanged.

This is a **visual equivalence hypothesis**, not a demonstrated pixel-for-pixel guarantee. In particular, inspect pill perimeter anti-aliasing, selected tab and button hover states in both themes; revert on visible change.

## Review and acceptance

- `git apply --check` and `git diff --check` pass.
- `npm run check` passes (lint, 124 existing Vitest tests, build).
- `node --test scripts/*.test.mjs` passes (68 existing Node tests).
- `node scripts/w3c-radar-production-check.mjs` passes.
- `npm run w3c:audit -- --warning=1 --force` checks all 26 production CSS assets.
- Primary action buttons: normal, hover, disabled, focus, Light/Dark, narrow display; visually unchanged.
- Project workspace tabs: active, active:hover, inactive:hover, keyboard focus, Light/Dark, mobile; visually unchanged.
- No runtime or screenshot-based assessment has been performed by the patch author. The expected warning delta (up to three) is **not yet verified**.
- Do not commit or merge until independent W3C and browser checks pass.

## Rollback

If W3C warnings increase, if no reduction justifies the changes, or visual regression is observed, reverse only the exact lines changed by this pilot (as shown in `git diff`). Do not restore or discard unrelated Stage 37 changes.
