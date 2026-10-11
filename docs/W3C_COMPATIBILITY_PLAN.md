# Strict W3C compatibility — controlled build experiment

Status: **controlled, opt-in production CSS pilots; not full-project approval**.

## QA contract

The instructor's 0 Errors / 0 Warnings requirement applies to the generated HTML and CSS actually delivered. This experiment must not change the prescribed React + Vite + Redux Toolkit stack, project flows, navigation, editing, data storage, light/dark/system themes, or responsive behavior.

The pilot `MeetingNoteEditorPage` has already reached **0 CSS Errors / 0 CSS Warnings** in its user-run W3C validation. This does **not** validate the other CSS chunks, nor all route HTML. The pilot also changes the CSS target to Safari 18+, which needs a documented browser support decision before merge.

## Why a global search-and-replace would be unsafe

The current source contains both:
- **Global inherited tokens** from `src/shared/styles/global.css`: colors, shadows, spacing, fonts, responsive tokens. Most uses can be resolved into per-theme declarations.
- **Context-sensitive or JavaScript-fed custom properties**: `--roadmap-position`, `--gauge-progress`, `--delivery-stack-collapsed-height`, `--index-accent`, `--health-accent`, the landing-local `--color-brand-wordmark`, and other component-local state. These cannot be replaced with just the global light/dark palette.

Replacing the second category with global static constants would break functional UI. It must be migrated separately, with appropriate JavaScript and visual regression coverage.

## Safe experiment commands

```sh
# From the repository root (after npm ci):
npm run w3c:preview -- --file src/shared/ui/StatusToast/StatusToast.module.css
npm run w3c:preview -- --all
node --test scripts/w3c-theme-preview.test.mjs
```

The script **only writes to `w3c-preview/`**, which is Git-ignored. It does not change `src/`, `dist/`, `vite.config.js`, or npm build scripts. It reads root theme definitions, expands safe `var(--token)` uses and static `color-mix(in srgb, ...)` expressions, emits extra dark selectors, and reports every non-convertible declaration rather than guessing.

`w3c-preview/report.json` includes every unhandled case with a source line number. Generated files are **source-level previews**, not automatically deployable CSS: CSS Modules still require Vite to scope selectors. Do not upload a `.module.css` preview directly to the W3C validator; evaluate a compiled production CSS asset after a reviewed integration step.

## Findings on the uploaded QA snapshot (2026-10-09)

- 43 CSS source files were scanned.
- 1,649 declaration values could be statically resolved with this conservative prototype.
- 867 supplemental dark selector blocks were generated.
- 57 declaration values remain unresolved; they must not be discarded. They include runtime values, scoped local state tokens, `currentColor` blends, and shared Brand overrides.

These numbers are **static transformation counts only**. They are not W3C Validator results, proof of equivalent appearance, or an estimate of finished production changes.

## Next integration gates, in order

1. First inspect preview CSS and JSON for a simple component, such as StatusToast. Check cascade specificity and imported component styles.
2. Move a *single* reviewed generated module into a temporary integration branch and run `npm run check`; verify desktop/mobile, light/dark/system, keyboard navigation and inline errors in the browser. Keep rollback possible.
3. Validate its **compiled `dist/assets/*.css`** file through W3C (0/0 goal). Repeat with one complex page before allowing automated production transforms.
4. Cover the 57 unresolved declarations one by one. Use component-specific selectors or direct React styles for runtime values where appropriate, not arbitrary fallback values.
5. Resolve remaining vendor prefixes and font warnings. Avoid silently increasing minimum browser targets for unrelated features.
6. For full-project sign-off: validate all CSS chunks and actual rendered HTML routes; run `npm ci`, `npm run check`, test browser scenarios, inspect console, and verify README and HW-15 requirements against implementation.

## Limitations

- This script is a **conservative feasibility prototype**, not a CSS variable polyfill and not a CSS compiler.
- It does not model arbitrary inherited custom property overrides, `@property` interpolation, container-query scope, special runtime states, or CSS @keyframe variable resolution.
- `color-mix()` uses sRGB arithmetic for supported colors; browser rendering must be compared before production use.
- Some complex selectors and modern CSS may need dedicated handling before fully automated conversion. Never edit W3C warning settings to claim an actual 0-warning result.


## Production-only StatusToast integration pilot

`vite.config.js` uses the production-only `w3cApprovedCssPilots()` before
CSS Modules compilation. StatusToast has independently passed W3C 0/0 and a
recorded light/dark visual check. The allowlist is being incrementally expanded.

## Second controlled production pilot — 2026-10-09

The allowlist now includes exactly three CSS Modules:

- `src/shared/ui/StatusToast/StatusToast.module.css` — W3C 0/0 verified in production output.
- `src/features/evm/ui/EvmHelp.module.css` — **pending emitted CSS validation and browser QA**.
- `src/features/managementActions/ui/ManagementActionsHelp.module.css` — **pending emitted CSS validation and browser QA**.

The two Help modules each have 16 static substitutions, 9 dark-theme overrides,
and 0 unresolved declarations in the read-only source preview. The plugin
stops the production build if an approved module later introduces an
unresolved token. Unapproved CSS and `npm run dev` remain untouched.

Run `npm run w3c:preview:test && npm run check`, then locate these production
assets with `find dist/assets -name 'EvmHelp-*.css'` and
`find dist/assets -name 'ActionEditorPage-*.css'`. The Management
Actions Help module is imported by the Action Editor and may share its
CSS chunk with other, as-yet-unconverted modules. Distinguish warnings from
unconverted neighbors from warnings newly introduced by this pilot; do NOT
claim W3C 0/0 for the whole chunk until every contributing CSS module passes. Inspect both Help
dialogs in Light and Dark, including Escape, scroll, focus, backdrop and
mobile width. Results must be explicitly recorded before approving another
CSS module. Browser compatibility / the Safari 18+ CSS target remain open.


## Stage 3: validator results and contained Action Editor expansion — 2026-10-10

The user validated the emitted stage-2 CSS with W3C CSS Level 3 + SVG:

- `EvmHelp-*.css`: **0 errors / 1 warning**, from an unquoted multi-word fallback font after CSS minification.
- `ActionEditorPage-*.css`: **0 errors / 27 warnings**, including 26 CSS custom-property warnings from adjacent, unconverted form/editor modules and one fallback-font warning.

The stage-3 allowlist additionally covers only `ActionEditorPage.module.css`
and `ManagementActionForm.module.css`. Their isolated previews contain
respectively **10 / 55** static substitutions, **5 / 33** dark overrides,
and **0 unresolved** declarations. The existing Help modules remain approved
as separate pilots.

To prevent the CSS optimizer from producing an unquoted multi-word fallback
font family, compiled W3C-pilot declarations using the exact HelmSight display
stack `Georgia, 'Times New Roman', serif` become `Georgia, serif`. This
preserves the preferred Georgia face and generic serif fallback while dropping
the intermediate named fallback only for compiled pilot CSS. The authoring
`--font-display` token and unapproved CSS remain unchanged. Verify rendering
on systems where Georgia is absent before broad adoption.

Stage-3 output still requires W3C validation of BOTH emitted chunks and a
Light/Dark/System visual regression (including the full Management Action form,
not only its Help dialog). Unit tests and screenshots do not preapprove W3C 0/0
for either chunk. Do not broaden the allowlist until verified.


## Stage 8: safe batch for remaining project, risk and shell modules — 2026-10-10

The completed Stage-7 **normal** W3C batch audit (actual compiled CSS, `css3svg`,
`warning=1`) confirmed **12/26** production CSS chunks at **0 errors / 0
warnings**, with **11 recorded errors** and **593 warnings** across the full
bundle. `SuccessCriterionEditorPage` had 7 custom-property warnings left from
its separately imported Help module. This is a snapshot, not an estimate of
Stage-8 success.

This Stage-8 patch approves **nine** additional zero-unresolved CSS Modules:
`SuccessCriteriaHelp`, the Project Editor page and Project Form, Governance
Forms, ThemeControl, ProjectsPage, RisksPage, AppLayout and ProjectLayout.
The CSS resolver emits static light values and scoped dark-theme overrides
only for these allowlisted CSS Modules before CSS Modules compilation.

The project and shell CSS modules cover a broad interface surface. Test project
creation/editing, form validation, governance forms, portfolio list/grid,
filters, risk register statuses, mobile navigation and Light/Dark/System themes
in `npm run preview` (production build), not just in the development server.

**Do not declare the 26 files valid based on preview counts:** the Projects and
Risks bundles have `-webkit-*` line-clamp/mask warnings; the Project Editor
bundle has WebKit date-picker pseudo-element warnings; Governance also imports
a page module with scoped runtime variables. Those warnings need separate,
behaviour-preserving work. The `Metrics`, `ProjectOverview`, `Reports`,
`Meetings`, `Milestones` and `Actions` page modules with unresolved contextual
properties remain explicitly unapproved.

Quality gate: `npm run w3c:preview:test && npm run w3c:audit:test && npm run
check && npm run w3c:audit`. Compare the new `w3c-audit/summary-normal.md`
with Stage 7; expect SHA-cache reuse for unaffected assets and fresh W3C
verification of changed emitted chunks. Neither Node unit tests nor source
previews establish that the W3C service has returned 0/0 for the new bundle.


## Stage 9: targeted static CSS and landing fallback — 2026-10-10

The user-run Stage-8 `css3svg`, `warning=1` audit verified **13/26 CSS
chunks at 0 errors / 0 warnings**; 11 errors and 427 warnings remain.
The Stage-8 screen recording showed mobile/desktop navigation, Risk Register,
Project Overview and Success Criteria in the light theme. That does not
constitute full Dark/System/keyboard/browser QA.

Stage 9 opts in two additional CSS Modules, both reporting **0 unresolved
values** in the read-only preview:

- `features/evm/ui/EvmHistoricalTrends.module.css` — 16 static replacements,
  7 dark selectors; imported into the Metrics page, which also contains unsafe
  runtime-driven CSS and therefore **will not necessarily reach 0/0**.
- `pages/SuccessCriteriaPage/SuccessCriteriaPage.module.css` — 74 static
  replacements and 32 dark selectors; its existing WebKit multiline
  truncation is explicitly preserved. The W3C error reported for this chunk
  needs separate diagnosis; successful token replacement does not fix it.

Landing Page has one W3C warning caused by an unquoted multi-word fallback
font family in the minified production output. The single landing heading
font declaration now uses `Georgia, serif` (matching the existing W3C-pilot
strategy). When Georgia is installed, typography should remain unchanged;
when it is absent, the fallback face may differ. The scoped landing wordmark
and other runtime/scoped variables remain intact, and the Landing module is
**not** added to the CSS transformer allowlist.

Verify with `npm run w3c:preview:test && npm run w3c:audit:test && npm run
check && npm run w3c:audit`. Compare the three affected production chunks
(`LandingPage`, `SuccessCriteriaPage`, `MetricsPage`) and verify the landing
headline, EVM trend charts, success statuses/cards and text clipping in
Light/Dark/mobile. Other file warnings and undocumented SOAP error counts
must not be reported as resolved without W3C confirmation.

## Stage 10: hybrid static/live CSS Modules — 2026-10-10

The user-run Stage 9 CSS `css3svg`, `warning=1` audit confirmed **14/26**
production chunks at **0 errors / 0 warnings**, with **10 recorded errors** and
**377 warnings** remaining (all 26 verified or reused from SHA cache).
The attached Stage 9 recording sampled Landing, Metrics/EVM historical charts
and Success Criterion editing in narrow/mobile layouts and Light/Dark; this is
not full automated visual, accessibility or cross-browser coverage.

Five complex page CSS Modules have many **static theme** substitutions but also
small sets of legitimate **live declarations**. Stage 10 allows these modules
through the existing build-time transform **only when the actual unresolved
property + reason multiset exactly matches the reviewed set**:

| Module | Static values | Dark rule clones | Deliberately live declarations |
| --- | ---: | ---: | --- |
| ActionsPage | 97 | 43 | one `--action-target-shadow` box-shadow |
| MeetingsPage | 61 | 32 | one `currentColor` color-mix box-shadow |
| MilestonesPage | 81 | 41 | four runtime roadmap position/width values |
| GovernancePage | 78 | 42 | seven scoped charter gap/padding values |
| ReportsPage | 150 | 84 | four `currentColor` color-mix box-shadows |

There is **no blanket acceptance of unknown runtime tokens**: a newly added,
removed, duplicated or changed unresolved declaration in these modules fails
the production build (as do any unresolved declarations in other approved
modules). The listed live declarations remain CSS `var()`/`color-mix()` at
runtime; changing their meaning to static color/position is unsafe.

W3C 0/0 is **not expected for every affected chunk** because these declared
runtime CSS functions remain, and the source includes WebKit truncation in
Actions/Milestones. The existing reported `MeetingsPage`/`MilestonesPage`/
`ReportsPage` SOAP error counts have no useful message; inspect full W3C web
validator output separately before claiming those errors corrected.

Run `npm run w3c:preview:test && npm run w3c:audit:test && npm run check && npm
run w3c:audit` and compare per-chunk error/warning counts. Test Light/Dark,
mobile layout, live roadmap geometry and the Report/Meeting forms; retain
existing WebKit multiline clipping and print behavior. Do not change source
components or override their currentColor-based shadows for validation alone.


### Stage 11 — two isolated W3C cleanup cases (candidate, 2026-10-10)

- `ReportsPage.module.css`: removed `cursor: default` from `@media print`.
  Cursor styling has no meaningful printed output. Screen interaction and all
  printed grid/spacing/background rules are unchanged. Expected: remove the
  sole `cursor` print-media warning in `ReportsPage-*.css`.
- `MeetingsPage.module.css`: a solid primary button was assigning the same
  `--color-text` to `background` and `border-color`. The 1px border remains,
  but is transparent, letting the opaque background paint beneath it by the
  default `background-clip: border-box`. The dark/light fill and foreground
  continue to come from theme tokens. Expected: remove the two same-color
  warnings (verify with production W3C and browser QA). Check forced-colors
  rendering separately; do not infer complete accessibility from 0/0.
- Stage 10's expected static-token count for Meetings changes 61 → 60 because
  the redundant border token is gone; hybrid runtime `currentColor` remains.
- These two changes do **not** address the 7 outstanding validator errors on
  Metrics/Project Overview, or vendor extension warnings in other chunks.

### Stage 12 — exact-live dashboard theme transformation (candidate, 2026-10-10)

**Input:** User-verified Stage-11 `css3svg`, `warning=1` production audit:
17/26 CSS assets at 0 errors / 0 warnings; 7 errors and 142 warnings
remain. All seven reported errors belong to MetricsPage (2) and
ProjectOverviewPage (5). Those pages contain `background` gradients with
status-dependent `color-mix()` and several values whose sources are runtime
JS / scoped CSS variables. W3C's incomplete `$esc.xml($error_msg)` messages
do **not** identify the exact offending gradient declarations.

The Stage-12 candidate adds **only two** page CSS Modules to the production
pre-CSS-Modules static-theme transformer. It resolves only previously
reviewed global design tokens, preserving exact local, status and runtime
properties; the build fails closed if any new/deleted/changed unresolved
property/reason entry appears:

| Module | Static resolutions | Dark theme rules | Intentionally live declarations |
| --- | ---: | ---: | ---: |
| MetricsPage.module.css | 73 | 38 | 7 (local `--index-accent`) |
| ProjectOverviewPage.module.css | 123 | 67 | 24 (health/summary/gauge accents, ring progress, radar wave and collapsed height) |

This is **not** an attempt to inline health values or freeze conic-gradient
progress. The existing source CSS, React/JSX components, calculations and
status classes remain unchanged. Expected immediate benefit: fewer static
`var()` warnings in the emitted two CSS chunks. The seven W3C errors and
some warnings may remain, and must not be described as fixed until W3C
actually validates the new production artifacts. A `color-mix()` nested in a
gradient may still trigger a validator parsing error despite being supported
by browsers. Do not suppress, ignore, or miscount these errors as passes.

Verification order:

1. `git apply --check ~/Downloads/HelmSight_Stage12.patch` then apply.
2. `git diff --check && npm run w3c:preview:test && npm run w3c:audit:test && npm run check`.
3. `npm run w3c:audit` and review the new per-file error/warning counts for
   **MetricsPage and ProjectOverviewPage**, including W3C SOAP details.
4. `npm run preview` and verify both pages in Light/Dark/System and narrow
   widths: CPI/SPI performance cards, historical EVM trends and calculations,
   Portfolio Health hero, gauge ring progress, severity/health accent classes,
   radar artwork, collapsed delivery stack. Compare old and new screenshots.
5. If W3C continues to report background-gradient parsing errors, isolate
   the exact offending declarations in a subsequent *small*, separately
   validated change. Do not drop or fake the gradients merely for 0/0.

The full cross-browser / forced-colors / keyboard / HTML QA remains open.

## Stage 13: isolate W3C background shorthand parser errors — 2026-10-10

The user-run Stage 12 audit (`css3svg`, `warning=1`) verified all 26
production chunks: **17/26 at 0 errors / 0 warnings**, **6 W3C errors** and
**45 warnings**. Five error records were poorly described by the SOAP service
(`$esc.xml($error_msg)`); errors remain limited to Metrics (2) and Project
Overview (4). The Stage 12 screen recording sampled desktop/light/dark and
narrow-screen layout; it is not a complete cross-browser check.

Stage 13 changes six narrowly identified background shorthands to their
appropriate `background-image` (five gradients) or `background-color` (one
solid color) longhand. This preserves each original CSS value, its scoped
accent, `color-mix()`, stop positions and dynamic progress. None of the
runtime expressions are replaced by a hardcoded color. Background longhands
also make W3C diagnostics more specific than the compound `background`
shorthand. These declarations have no sibling background shorthand or image
within their target rules; the existing background shorthand reset behavior
is not needed there. For properties dependent on status, color-mix, or animated
progress, runtime browser rendering is still authoritative.

**This stage is a controlled diagnostic/compatibility change, not a W3C
pass guarantee.** The CSS3+SVG profile may still reject valid nested
`color-mix()` / gradient / `var()` expressions even when supplied through the
correct longhand. Never hide or reclassify those errors, and do not remove
the dynamic graphics just to make the counts green. The strict expected-live
list is updated only for the six property names; the same six values remain
unresolved by design, and the existing fail-closed gate remains intact.

Run: `npm run w3c:preview:test && npm run w3c:audit:test && npm run check &&
npm run w3c:audit`. Compare Metrics and Overview 2/1 and 4/7 baseline
respectively. Check light/dark desktop and narrow screen, including health
hero, performance status cards, CPI/SPI gauge rings, radar pulse, and
trend charts. If the six errors persist, isolate the validator's failed
value separately before another change; preserve the original browser CSS.

## Stage 14: isolated W3C gradients diagnosis — 2026-10-10

Stage 13 changed six reviewed `background` declarations to longhands, but the
user-run W3C `css3svg` audit still shows 17/26 at 0/0 and six errors: Metrics
2/1 and Overview 4/7. The errors now name `background-image` rather than
`background`; therefore a shorthand-only fix is inadequate. No production CSS
is changed in Stage 14.

Run `npm run w3c:probe -- --dry-run` first. The script then runs six small,
**isolated snippets** derived verbatim from the current production CSS via
`npm run w3c:probe`. It uses the same public W3C SOAP API and Normal warning
profile, waits >=1.6 seconds between requests, and writes diagnostic-only
`w3c-audit/gradient-probes.{json,md}`. Probe results never overwrite the
normal 26-file audit or count as application-level passes. Server faults
remain `unverified`.

The selected declarations are Metrics `.indexCard` and `.indexState`, and
Overview `.healthHero`, `.indexGauge`, `.gaugeRing`, `.radarPulse`. This is an
initial hypothesis set; results cannot prove there are no other errors.
The isolated CSS has no enclosing theme/cascade, so the test diagnoses W3C
value parser behavior, not browser appearance. Preserve all live accent,
conic-progress, and radar animation values until validated alternatives are
visually tested. Run `npm run w3c:probe:test` before any network call.
