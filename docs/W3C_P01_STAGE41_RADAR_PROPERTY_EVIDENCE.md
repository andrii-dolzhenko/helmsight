# HelmSight — P0.1 Stage 41: Radar `@property` CSSOM evidence

**Date:** 2026-10-11. **Status:** Technical investigation completed for the single radar `@property` validator error; **no source-code change**. Browser compatibility verification remains partial. **DEC-P01-40-A** (Compatibility First) remains in effect.

## Original diagnostic and production provenance

- Stage 39 W3C `css3svg`, Normal (`--warning=1 --force`): **1 Error / 41 Warnings**, **26/26** CSS files evaluated, **0 unverified / 0 pending**, **18** assets with literal 0/0.
- Single Error: `Unrecognized at-rule “@property”` in `ProjectOverviewPage-D9aG0eK3.css`.
- Source: `src/pages/ProjectOverviewPage/ProjectOverviewPage.module.css`; Vite production output: `dist/assets/ProjectOverviewPage-D9aG0eK3.css`. This same chunk hash appears in the user's Stage 39 production build.
- Source registration (exact descriptors):

```css
@property --radar-wave-radius {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 8%;
}
```

- Emitted Vite registration, inspected independently: `@property --radar-wave-radius{syntax:"<percentage>";inherits:false;initial-value:8%}`. The emitted `@keyframes` name is CSS-Modules-scoped (`_radarWavePulse_1tdxr_1`), with numeric radius keyframes and mask declarations intact.
- **W3C specification:** https://www.w3.org/TR/css-properties-values-api-1/#at-property-rule — valid registration requires `syntax` and `inherits`, plus `initial-value` for typed syntaxes. All are present; `8%` is a valid computationally independent `<percentage>` initial value.
- **Interpretation:** This isolated validator profile does not recognize the rule, but an unknown-at-rule report does **not** establish that the production CSS violates the current CSS Properties and Values API specification.

## Independent browser-runtime experiment

Executed an isolated reproducible CSSOM probe against the uploaded **production CSS asset** in **headless Chromium 144.0.7559.96 (Linux)**. This is an independent test browser, **not** the user's Chrome 154, Safari, Firefox or a live deployment. The test does not modify project code or production assets.

1. Inject the **complete emitted CSS** into a page with a real CSS-Modules radar element. Inspect `CSSPropertyRule` in `document.styleSheets[0].cssRules`: it exists exactly once, with `name=--radar-wave-radius`, `syntax=<percentage>`, `inherits=false`, `initialValue=8%`.
2. Pause the **actual emitted animation** and sample the computed `--radar-wave-radius` at fixed virtual play times.
3. Repeat using a copy of the same production CSS **with only the single `@property` rule removed**. This is an isolated negative control, not a proposed code patch.
4. Verify the original stylesheet under `prefers-reduced-motion: reduce` at 1440 px, and normal motion at 353 px.

| Animation time | Registered CSS | Control: no `@property` |
| ---: | ---: | ---: |
| 0 ms | 8% | 8% |
| 1000 ms | 31.9554% | 8% |
| 2000 ms | 57.1969% | 68% |
| 3000 ms | 65.9292% | 68% |
| 4000 ms | 67.9963% | 68% |
| 4500 ms | 77.2748% | 78% |

The typed registration provides **continuous interpolation**; removing it produces discrete jumps in the radar radius. The opacity keyframes remain present in both experiments. The test verifies computed CSS behavior, **not** pixel-identical screenshots across engines.

| Production case | Computed animation | Active animations | Result |
| --- | --- | ---: | --- |
| Chromium 144, desktop 1440 px, no motion preference | `_radarWavePulse_1tdxr_1` | 1 | PASS |
| Chromium 144, desktop 1440 px, `reduce` | `none` | 0 | PASS |
| Chromium 144, mobile 353 px, no motion preference | `none` | 0 | PASS |

**Note:** `CSS.supports('(--some-var: 8%)')` tests the general ability to parse a custom property and **does not establish that `@property` was registered**. CSSOM `CSSPropertyRule` inspection and computed animation behavior were used instead.

## Evaluation of possible fixes

- **Delete `@property`: REJECTED.** Direct negative control proved a visual-behavior regression (discrete radius jumps), violating DEC-P01-40-A.
- **Remove only from a validator-only stylesheet / suppress validator errors: REJECTED.** It would not test the actual shipped CSS and would falsify the raw 0/0 gate.
- **Replace with a JavaScript registration or rewrite the visual effect: NOT APPROVED.** It would expand code/dependency/timing surface without demonstrated equivalence across target browsers. Not required to fix an invalid CSS declaration, because none was found.
- **Retain the modern standards-defined registration: ACCEPTED for current P0.1 scope.** Report this specific W3C error as **BLOCKED — VALIDATOR COMPATIBILITY**, with its literal Error count still visible.

## Outstanding checks and acceptance boundary

- **Not verified:** Firefox 114 rendering/fallback, Chrome/Edge 111, Safari 18/iOS 18, physical Android devices. The production CSS `build.cssTarget` is a transformation target, not a certified browser-support policy.
- **Not verified:** reduced-motion behavior in all other engines; headless Chromium 144 was the only independent runtime used here.
- **Not run in Stage 41:** a new W3C batch audit, Vitest or build (there were no code changes). Latest validated Stage 39 baseline remains **1 Error / 41 Warnings**, **18/26** zero-issue assets; no assertion of 0/0.
- The existing `node scripts/w3c-radar-production-check.mjs` guards presence of emitted registration/mask but is **not** a runtime-animation parity test. Stage 41 provides a distinct CSSOM check.
- Progress to Stage 42: inspect vendor-prefixed masking / multi-line clamp warnings **without removing established compatibility fallbacks**. Stages 41–43 do not justify changing W3C profile, suppressing errors, or committing before final review.

**Conclusion:** The single reported W3C `@property` Error is a limitation of the chosen validator profile relative to the standards-defined emitted CSS. The rule is both present and behaviorally necessary for the current effect in tested Chromium. Retain it, disclose the Error, and leave older-browser compatibility QA explicitly open.
