# HelmSight — P0.1 Stage 42: one-line risk list fallback pilot

Status: **PILOT / NOT YET ACCEPTED**. No commit until local production W3C audit and actual React visual QA confirm a safe result.

## Scope and rationale

- Approved baseline after Stage 39 and the Stage 40 decision: **1 W3C Error / 41 Warnings**; **26/26 CSS assets checked**, **18/26 literal 0/0**. Stage 41 independently demonstrated that the standard `@property` rule drives smooth radar animation; the W3C Error remains reported, not suppressed.
- Decision `DEC-P01-40-A`: preserve current browser compatibility; do not delete necessary mask or two-line clipping declarations.
- Of **34** WebKit/vendor warnings, **18** refer to `-webkit-mask-*` (8 in `ProjectOverviewPage`, 6 in `ProjectsPage`, 4 in `index`); **16** to legacy line clipping (3 each in `ActionsPage`, `MilestonesPage`, `ProjectsPage`, `SuccessCriteriaPage`, and 4 in `RisksPage`). These are audit counts, not 34 confirmed defects.
- Existing `RisksPage.module.css` shared rule `.identity p, .listIdentity p, .plan p` uses the **three-property** `-webkit-box` two-line clipping combination. That shared rule remains unchanged.
- The separate `.listIdentity p` override uses `-webkit-line-clamp: 1` to display **one line** in List View. That additional declaration is the single pilot target. The 2-line clipping of risk cards and plans is untouched.

## Isolated source change

In `src/pages/RisksPage/RisksPage.module.css` only, change the `.listIdentity p` override to:

```css
.listIdentity p {
  display: block;
  font-size: var(--ui-list-description-size);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

`display: block` overrides the shared legacy `display: -webkit-box` **for this selector only**, ensuring standard inline-axis ellipsis. `overflow: hidden` is explicit here even though the shared rule already contains it. The inherited group declarations `-webkit-box-orient` and `-webkit-line-clamp: 2` remain in the stylesheet for other selectors; they are inapplicable when this element uses `display: block`. No CSS build plugin, browser target, validator profile, component, or JS changes.

## Preliminary independent rendering evidence

Synthetic fixture reproducing the relevant source rules and list-row grid was tested in headless Linux Chromium. This is **not a full HelmSight React/browser regression test**. For both short and long example descriptions, the paragraph was rendered before and after the override in viewport widths **353, 768, 1024, 1440 px**. Geometry comparison on long text:

| Viewport | Before height | After height | Before width | After width |
| ---: | ---: | ---: | ---: | ---: |
| 353 | 21.0625 px | 21.0625 px | 323.8125 px | 323.8125 px |
| 768 | 21.0625 px | 21.0625 px | 734 px | 734 px |
| 1024 | 21.0625 px | 21.0625 px | 990 px | 990 px |
| 1440 | 21.0625 px | 21.0625 px | 488.25 px | 488.25 px |

The original was vendor-clamped to one line; the new variant uses `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Computed line height remained identical. Exact glyph-level/pixel identity and cross-browser behavior remain to be verified. The synthetic fixture cannot prove correct appearance in the live app.

## Expected results, not yet verified

- **Hypothesis:** W3C Normal `1 Error / 40 Warnings` (one `-webkit-line-clamp` warning removed); `RisksPage` **4 → 3 Warnings**; remaining 25 CSS assets unchanged, all 26 audited.
- Under no circumstances claim W3C `0/0` or accept an unverified/pending CSS asset.
- No change to the Stage 41 `@property` compatibility status, 18 prefix mask warnings, 15 remaining two-line legacy warnings, or seven dynamic-variable warnings.
- Note that W3C may diagnose an unexpected warning in the newly serialized production chunk; use real audit results as the source of truth.

## Required acceptance checks

Run after applying this exact pilot:

```bash
npm run check
node --test scripts/*.test.mjs
node scripts/w3c-radar-production-check.mjs
npm run w3c:audit -- --warning=1 --force
cat w3c-audit/summary-normal.md
```

Visual QA in the actual HelmSight **Risk Register → List View**, with a long risk description and narrow/wide viewport, in Light and Dark modes. Confirm a single visible line with ellipsis, unchanged row height and neighboring fields, and unchanged two-line descriptions in Grid View. Confirm keyboard access to risk actions. A synthetic test alone is not acceptance evidence.

**Rollback only Stage 42:** `git apply -R ~/Downloads/HS42_Risk_List_Ellipsis_Pilot.patch` after `git apply --reverse --check ...` (only if Stage 42 is still uncommitted and no subsequent changes overlap), then rebuild/audit. Retain approved Stages 37–41.

## References

- MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-overflow
- MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/line-clamp
