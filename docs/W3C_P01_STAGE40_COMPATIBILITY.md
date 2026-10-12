# HelmSight — P0.1 Stage 40: CSS Compatibility Review

Status: **Decision A approved — preserve browser compatibility; documentation-only. W3C 0/0 remains blocked.**
Evidence: W3C production audit on 2026-10-11 after accepted Stage 37–39 experiments.
Validator: W3C `css3svg`, `--warning=1 --force`, all **26/26** production CSS assets evaluated, **0 unverified**, **0 pending**.

## Verified baseline

| Metric | Original P0.1 | After Stage 39 |
| --- | ---: | ---: |
| W3C errors | 1 | 1 |
| W3C warnings | 49 | 41 |
| Assets with literal 0/0 | 17/26 | 18/26 |
| Assets with issues | 9 | 8 |

Baseline source: user-provided `w3c-audit/summary-normal.md` generated `2026-10-11T14:22:25.628Z`. The fresh count is **1 error / 41 warnings**; no literal 0/0 claim.

## Full remaining diagnostic inventory

| Category | Count | Locations / mechanism | Stage 40 disposition |
| --- | ---: | --- | --- |
| `-webkit-mask-*` vendor extension | 18 | Project Overview 8, Projects 6, shared index 4 | Retain prefixed and standard longhands; no browser-target increase |
| `-webkit-line-clamp`, `-webkit-box-orient`, `display: -webkit-box` | 16 | Actions 3; Milestones 3; Projects 3; Risks 4; Success Criteria 3 | Retain established multiline clipping behavior |
| CSS custom properties cannot be statically checked | 7 | Actions 1; Metrics 2; Milestones 1; Overview 2; index 1 | Keep live theme/status variables; static verification remains incomplete |
| W3C unrecognized `@property` | **1 error** | Project Overview radar custom-property registration | Retain standards-defined rule; log legacy-validator limitation and browser fallback QA |

### Compatibility and standards evidence

1. **CSS masking**: Vite `build.cssTarget` currently lists `chrome111`, `edge111`, `firefox114`, `safari18`, `ios18`. This is a CSS **transformation target**, not by itself a formally agreed supported-browser matrix. Unprefixed `mask-image` is supported in Chrome/Edge starting around **120**, whereas legacy versions use `-webkit-mask-image`. Removing the prefixed counterparts purely to quiet W3C may break rendering in browsers represented by this build target. Existing source uses matching prefixed and standard longhands.
2. **Multi-line truncation**: MDN explicitly documents `-webkit-line-clamp` with `display: -webkit-box` and `-webkit-box-orient: vertical` as a fully specified behavior retained for legacy support. Unprefixed `line-clamp` is not Baseline across major browsers. Blindly removing those declarations may eliminate the ellipsis/clamping behavior.
3. **Dynamic CSS variables**: Seven messages are informational limits of static analysis. Replacing runtime theme/status/accent values with constants is not a semantically neutral W3C fix.
4. **`@property`**: Defined by the W3C CSS Properties and Values API Level 1 specification. The `css3svg` validator's unknown-at-rule report is insufficient to establish invalid source CSS. Radar production guard currently confirms registration and SVG mask are preserved; it is **not** a complete standards or browser compatibility test.

5. **`@property` in older Firefox**: The registration uses `syntax: '<percentage>'`, `inherits: false`, `initial-value: 8%`, matching the required descriptors of the W3C specification. Firefox only supports `@property` beginning with version 128, so Firefox 114 (included in `cssTarget`) cannot be assumed to interpolate the registered radar custom property identically. The core page and static radar representation must remain usable; test this as progressive enhancement rather than claiming animation parity. A source/production guard confirms CSS is emitted but does not prove rendering in Firefox 114.

References:
- W3C CSS Properties and Values API §3: https://www.w3.org/TR/css-properties-values-api-1/#at-property-rule
- MDN `@property` (browser compatibility): https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40property
- MDN mask-image: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mask-image
- MDN line-clamp: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/line-clamp
- MDN Browser Compatibility Data mask-image: https://chromium.googlesource.com/external/github.com/mdn/browser-compat-data/+/refs/tags/v6.0.14/css/properties/mask-image.json

## Decision record — Stage 40 / Compatibility First (approved 2026-10-11)

**Decision ID:** `DEC-P01-40-A`

**Chosen option:** A — preserve existing browser compatibility.

**Scope:** P0.1 CSS validation and future CSS changes until an explicit new browser-support policy is approved.

**Code change:** None. No modifications to CSS, JSX, service logic, Vite targets, validator warning level, audit scripts, or radar guard.

### Non-negotiable implementation rules

1. **Preserve the existing transformation targets** in `vite.config.js`: `chrome111`, `edge111`, `firefox114`, `safari18`, `ios18`. These are build configuration values, *not* evidence that every browser/version has passed runtime QA. No browser support range is widened or narrowed by this document.
2. **Masking:** Retain complete `-webkit-mask-*` and standard `mask-*` pairs where currently used. Never delete vendor-prefixed fallbacks solely to reduce W3C warnings. Inspect compiled Vite output to detect empty or mismatched declarations.
3. **Text truncation:** Retain the legacy, specified three-part `-webkit-line-clamp` technique where it provides actual multi-line ellipses. Do not substitute height/overflow-only clipping or standard `line-clamp` without proof of identical results across agreed browsers.
4. **Runtime variables:** Retain dynamic status, progress and theme tokens. Do not freeze `var()` to static values for validator satisfaction or broaden the W3C preprocessor allowlist without focused tests.
5. **Radar:** Retain `@property` and the reduced-motion media query. Treat the typed custom-property animation as progressive enhancement on a browser lacking this feature; verify the base radar remains visible/usable there. Do not introduce a JavaScript polyfill or delete the effect in this stage.
6. **Audit integrity:** Keep `css3svg`, `--warning=1` (normal) and `--warning=2` (all warnings) distinct; check 100% of emitted CSS with `unverified = pending = 0`. Do not suppress, filter, omit, or recode warnings/errors.

### Acceptance and evidence register

| Check / obligation | Existing evidence | Status after decision A |
| --- | --- | --- |
| Latest W3C normal audit | Stage 39, 2026-10-11: 26/26 checked, 18 clean, **1 error / 41 warnings** | **BLOCKED — VALIDATOR COMPATIBILITY**, not 0/0 |
| ESLint, Vitest, standalone Node, production build, radar guard | Stage 39 user log: PASS, 124/124, 68/68, build PASS, radar PASS | PASS for the Stage 39 build only; not a new Stage 40 run |
| Modern desktop themes and native date picker | Stage 38–39 user video QA | Partial UI evidence, not an older-browser certificate |
| Chrome/Edge 111 masks and clamped text | Configuration and source inspection only | **NOT YET RUNTIME VERIFIED** |
| Firefox 114 base radar and reduced-motion behavior without `@property` support | Source/specification compatibility review | **NOT YET RUNTIME VERIFIED** |
| Safari 18 / iOS 18 masking, clamp, theme and responsive behavior | Targets declared in Vite | **NOT YET RUNTIME VERIFIED** |
| Standards-aware independent check of `@property` in emitted CSS | Stage 41 independent Chromium 144 CSSOM and animation comparison; see `docs/W3C_P01_STAGE41_RADAR_PROPERTY_EVIDENCE.md` | **VERIFIED IN CHROMIUM 144**; older browsers still open |
| W3C `--warning=2` full production audit after Stage 39 | Not included in supplied 1/41 normal-profile report | **NOT YET RUN** |

**Gate rule:** Stage 40 is a documented compatibility decision, **not** a successful W3C 0/0 audit. The selected legacy W3C profile has 1 reported error and 41 warnings. Keep these raw numbers, references and open browser checks visible at phase reviews. Any P1/P2/P3 release claiming 0/0 must meet the canonical `docs/CSS_VALIDATION_POLICY.md` gate or be explicitly marked blocked — never relabeled PASS.

## Safe next checks (research, not automated deletion)

- Confirm product-supported browser versions explicitly (current `cssTarget` is only a build setting); until then preserve the existing prefixed fallbacks.
- Inventory the **actual selectors, screenshots and computed values** for masks and line-clamp at representative viewport sizes and both themes. Compare with a reference build; use an older target browser when feasible to test the actual compatibility gap.
- For `@property`, inspect `syntax`, `inherits`, `initial-value` against W3C spec and verify radar animation in a real browser, including reduced-motion handling. Keep the production guard.
- Assess whether a genuinely **equivalent** standards-only implementation exists. Require before/after behavioral proof, not just a reduced W3C warning count.
- If exact behavior cannot be retained while satisfying this W3C profile, record **BLOCKED — VALIDATOR COMPATIBILITY** with raw counts and standards evidence under `docs/CSS_VALIDATION_POLICY.md`; do not suppress or exclude assets or falsify literal 0/0.

**Stage 40 conclusion:** **Decision A approved**; no further warnings will be removed by breaking cross-browser fallbacks. The classification is compatibility triage, not validation acceptance. The confirmed 1/41 normal-profile audit remains the baseline until a new production build is audited. Pending older-browser tests and alternate conformance tooling remain open tasks.

**Stage 41 update (2026-10-11):** Independent production CSSOM check confirmed the radar `@property` registration, continuous interpolation with registration, discrete jumps in an otherwise identical unregistered control, and disabled animation at reduced motion / mobile width. Evidence: `docs/W3C_P01_STAGE41_RADAR_PROPERTY_EVIDENCE.md`. This does not close older-browser runtime QA or change the literal W3C 1/41 baseline.

**Stage 44 later outcome (2026-10-11, superseding Stage 40 radar registration implementation only):** The approved compatibility-first principle remains in place; the radar's typed registration is now performed via `CSS.registerProperty()` in the lazily loaded Project Overview JS module, rather than a CSS `@property` at-rule. The user's subsequent full forced W3C normal audit reports **0 Errors / 39 Warnings (26/26 checked, 0 unverified/pending)**. This update is an observed later state; all 1/41 figures in this Stage 40 document are historical. See `docs/W3C_P01_STAGE44_JS_PROPERTY_PILOT.md`.

**Stage 45 latest measurement (2026-10-12):** The forced Normal W3C audit again verified 26/26 production CSS assets: **0 Errors / 39 Warnings**, 0 unverified/pending. Compatibility decision `DEC-P01-40-A` remains in force.
