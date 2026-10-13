# W3C production CSS — batch audit (2026-10-10)

## Scope

Audit **compiled** Vite CSS (`dist/assets/*.css`), not `.module.css` source previews. The validator uses the same profile as the manual screenshots: **CSS Level 3 + SVG** (`css3svg`), with warnings enabled. Default `warning=1` matches the W3C web form’s **Normal report** setting; `--warning=2` requests **All warnings** for an additional, strictly more verbose review. This is an external network validation stage, never part of `npm run check` or normal Vite builds.

The public W3C service requests at least 1 second between automated validation requests. `w3c:audit` waits >= 1.6 seconds between requests and uses the documented SOAP 1.2 response. There are no additional npm dependencies.

## First use

```sh
npm run w3c:audit:test
npm run check                 # existing 117 application tests + lint + build
npm run w3c:audit -- --dry-run
npm run w3c:audit -- --only=StatusToast --max=1  # normal report; compare with web upload
npm run w3c:audit -- --warning=2 --only=StatusToast --max=1 # optional all-warnings diagnostics
npm run w3c:audit -- --max=3                     # only after normal report agrees with web UI
npm run w3c:audit                              # remaining assets, cached by SHA-256
```

The **normal** run produces `w3c-audit/report-normal.json` and `w3c-audit/summary-normal.md`. The **all-warnings** run uses `w3c-audit/report.json` and `w3c-audit/summary.md` (preserving earlier Stage 6 results). Both report pairs are ignored by Git. Results are per *production CSS asset* with source hash, remote validation status, error/warning totals and, where provided in SOAP, diagnostic messages/lines.

## Status interpretation

- `pass`: W3C returned a valid result and **0 Errors / 0 Warnings**.
- `issues`: remote validator returned one or more errors or warnings, or validity false. A pass is always scoped to its explicitly recorded warning level; normal-report 0/0 does not imply all-warnings 0/0.
- `unverified`: HTTP, SOAP/parse, timeout, or service failure; never count as pass.
- `pending`: selected build assets not yet validated, e.g. after `--max=3`.

Use `npm run w3c:audit -- --only=Risk` to target a filename substring. If you need to re-run *unchanged* styles (e.g. validator software changed), use `npm run w3c:audit -- --force`. A new build hash triggers re-validation by default; identical content reuses a previous W3C result.

If a run encounters a server problem, it records `unverified` and moves on; the process exits unsuccessfully when there are any `issues` or `unverified` assets. A `--max=3` smoke test is partial by design; pending chunks remain visible in the report. Avoid running concurrent audits against the public service.

## Workflow after the baseline

1. Send `w3c-audit/summary-normal.md` / `report-normal.json` for the matching web-form validation; include the extended report when needed.
2. Group findings by production chunk and issue category. Multiple source CSS Modules can be merged into one chunk by Vite.
3. Extend `scripts/w3c-vite-pilot.mjs` allowlist only for tested, source-audited CSS Modules with no unresolved runtime values.
4. Treat `--roadmap-position`, progress/gauge values, component state and other React-supplied custom properties separately; do not replace them blindly.
5. Rebuild and rerun W3C audit to validate changed chunks. Inspect Light/Dark/System, responsive layouts and keyboard behavior for affected pages.
6. HTML validation is a separate gate. A 0/0 result here does not claim full app validation.

**External disclosure:** The audit submits the contents of the built CSS files to the public W3C validator, analogous to the manual W3C file-upload flow. Do not run it on proprietary or secret CSS that may not be sent externally.

## Known verification boundary

- Stage 5: `RiskEditorPage-ChD8e7bi.css` showed 0 Errors / 0 Warnings in the user-provided screenshot; `npm run w3c:preview:test` 17/17, Vitest 117/117, lint and Vite build passed on the user's Mac.
- The batch audit's parsing, warning preservation, cache, and partial-progress logic were tested locally with simulated SOAP responses. Live W3C testing on the user's Mac confirmed SOAP transport works; `warning=2` returned six additional advisories for StatusToast, which the normal web form had shown as 0/0.

API references: https://jigsaw.w3.org/css-validator/manual.html.en and https://jigsaw.w3.org/css-validator/api.html.

## HTTP 500 from the initial batch tool (2026-10-10)

The original Stage 6 client posted `application/x-www-form-urlencoded`. W3C's browser direct-input form uses `multipart/form-data`; an incompatible POST payload is a plausible cause of consistent HTTP 500 responses. This patch uses `FormData` and lets Node/fetch set the correct multipart boundary. An HTTP error also includes a short, text-only response excerpt (never the submitted CSS). Repeated 500 responses are not retried automatically.

This is a transport correction, not evidence that production CSS passes validation. The remote service was not accessible from the patch-authoring environment. Validate a *single* file first (`--only=StatusToast --max=1`) and share its terminal output if it remains `UNVERIFIED`. Do not run all 26 files again until a live SOAP response succeeds. The old `unverified` entries remain visible until rechecked, which is intentional.

Reference: https://github.com/w3c/css-validator/blob/main/validator.html.en (direct-input form encoding); https://jigsaw.w3.org/css-validator/api.html (SOAP output).

## Warning verbosity and reporting (2026-10-10)

- The W3C web upload/direct-input forms select `warning=1` (*Normal report*). SOAP/HTTP requests may default to `warning=2`, so the level is always sent explicitly. We do not use `warning=no` or `warning=0` to manufacture a green result.
- `warning=2` is a separate extended diagnostics mode: e.g. StatusToast had 0 errors and 6 extended warnings (4 redefinitions and 2 text/background contrast advisories) while its manual normal report was 0/0. These advisories remain recorded and should be assessed for visual/accessibility risk.
- Both audit modes maintain separate SHA-256 caches/reports and never reuse one mode’s result as a pass in the other mode.
- Explicitly record `profile=css3svg; warning=1` when claiming the matching web-form 0/0; do not claim all-warnings compliance unless separately checked at `warning=2`.
- Avoid removing valid responsive cascades or dark-theme overrides merely to silence `warning=2` redefinition advisories.

## P1 Safe Project Deletion — CSS checkpoint (2026-10-12)

**Scope:** `feature/p1-safe-project-deletion`, after the Archived
Grid/List responsive correction and the targeted Portfolio text-contrast
adjustment. Results refer to the latest local production build.

| W3C css3svg metric | Normal (`warning=1`) | Extended (`warning=2`) |
| --- | ---: | ---: |
| Production CSS assets verified | 27/27 | 27/27 |
| Errors | **0** | **0** |
| Warnings | **39** | **2,833** |
| Assets with 0 errors / 0 warnings | 18 | 0 |
| Assets with issues | 9 | 27 |
| Unverified | 0 | 0 |
| Pending | 0 | 0 |

### Production CSS artifact

The current artifact is `ProjectsPage-IE4jF4q6.css`.

- Normal: 0 errors, 9 warnings.
- Extended: 0 errors, 190 warnings.
- Both warning counts are unchanged from the preceding build,
  `ProjectsPage-BRNnBOfG.css`.
- An earlier responsive correction increased the extended count from
  189 to 190. The specific diagnostic responsible for that earlier
  difference has not been isolated.

### Warning classification

Normal-profile diagnostics:
- 33 vendor-extension advisories for intentional `-webkit-*` CSS.
- 6 notices that dynamic CSS variables cannot be statically checked.

Extended-profile diagnostics:
- 1,496 color/background cascading advisories.
- 1,297 CSS property redefinition advisories.
- 33 vendor-extension advisories.
- 6 dynamic CSS-variable notices.
- 1 generic font-family fallback advisory.

The above categories account for all reported warnings. Classification
is not proof that every individual warning is harmless.

The source font stacks include generic fallbacks:
`Inter, ui-sans-serif, system-ui, sans-serif` and
`--font-display: Georgia, 'Times New Roman', serif`.
The precise source of the single minified-bundle font advisory has
not been independently isolated.

The redefinition notices may arise from intentional responsive and
theme cascades, but this explanation has not been established for
every occurrence. Color/background advisories do not themselves
measure computed-text contrast and must not be described as confirmed
accessibility failures or automatically dismissed as safe.

### Contrast and regression review

Targeted contrast improvements were applied to:
- `.header p`
- `.metaGrid dt`
- `.health_notAssessed`, `.health_loading`, `.health_unavailable`

These use a theme-aware blend of muted and primary text colors.
The changes do not alter global design tokens or Archived Grid/List
action layouts.

After the changes:
- ESLint, 207/207 Vitest tests and production Vite build passed.
- Both forced W3C CSS profiles completed with 0 errors and 0
  unverified/pending assets.
- The project owner visually reviewed the updated UI without
  reporting regressions.
- Earlier production preview startup and hard-reload checks passed.
- Light/Dark/System, responsive and keyboard-dialog workflows were
  manually reviewed; the new contrast styling was visually rechecked.
- W3C Nu validated `dist/index.html`: 0 HTML errors and 0 warnings.
  Dynamically rendered SPA markup was outside this specific check.
- Manual Reduced Motion smoke review covered Portfolio, Radar,
  Governance, mobile navigation and Reports. Computed CSS animation
  timing reflected the reduced-motion rule; this is not an exhaustive
  JavaScript-animation audit.

These checks do not constitute a comprehensive automated WCAG
contrast audit for every route and state.

### Gate interpretation — ADR-042

**W3C CSS Error Gate: PASS.**
All 27 current production CSS assets were verified with 0 errors.

**Strict raw W3C 0/0 target: NOT MET.**
The raw Normal and Extended warning totals remain 39 and 2,833.
No warnings were suppressed or relabeled as raw W3C PASS.

**Deployment Gate: PENDING FINAL SIGN-OFF.**
ADR-042 permits `PASS WITH DOCUMENTED WARNINGS` only after warning
adjudication and the other applicable release checks are complete.
Remaining review includes final warning-risk adjudication,
any required dynamic-route HTML/accessibility checks and explicit
release approval. The static HTML entry point and selected
reduced-motion workflows have been verified. Zero CSS errors alone is not complete deployment approval.

### Evidence

Local generated reports, intentionally ignored by Git:
- `w3c-audit/report-normal.json`
- `w3c-audit/summary-normal.md`
- `w3c-audit/report.json`
- `w3c-audit/summary.md`

The canonical policy is `docs/CSS_VALIDATION_POLICY.md`.
The canonical decision is ADR-042 — CSS Warning-Adjudicated
Deployment Gate. Preserve original diagnostics and asset hashes
when reviewing future changes.

## P1 post-merge and production verification (2026-10-13)

- PR #4 was merged into `main` on 2026-10-12 at
  22:49:23 UTC+03:00 (merge commit `d29253c`).
- GitHub CI completed successfully for the PR.
- Vercel Preview functional smoke test passed: project creation,
  archiving, exact-name safeguard, permanent deletion and
  persistence after reload.
- Production application load and the deletion/reload workflow
  were confirmed by the project owner.
- Lighthouse Desktop Accessibility reported 100 on the
  production Archived Projects page. This is not a full WCAG audit.
- The latest recorded W3C CSS validation covered 27/27 assets
  with zero errors in both profiles.
- Strict raw W3C 0/0 remains NOT MET: 39 Normal warnings and
  2,833 Extended warnings.
- Merge and deployment occurred before formal ADR-042
  warning-risk adjudication and release sign-off. These remain
  open as post-release follow-up; deployment does not constitute
  retroactive approval.

## P2-B local production CSS audit — 2026-10-13 (feature branch, before PR)

This section **supersedes only the earlier numerical snapshots for the current P2-B checkout**. P0.1/P1 history above remains unchanged. The project owner ran `npm run check` and forced W3C validation against the freshly built CSS. Source commit/PR and deployed versions have **not** been verified.

| Metric | Normal `--warning=1 --force` | Extended `--warning=2 --force` |
| --- | ---: | ---: |
| Production CSS assets verified | **28 / 28** | **28 / 28** |
| W3C errors | **0** | **0** |
| W3C warnings | **76** | **2,918** |
| Assets with raw 0/0 | **18 / 28** | **0 / 28** |
| Assets with diagnostics | **10 / 28** | **28 / 28** |
| Unverified / pending | **0 / 0** | **0 / 0** |

Normal-level diagnostics are **43 dynamic CSS-variable static-analysis notices**, **18 `-webkit-mask-*` compatibility notices**, and **15 `-webkit-line-clamp` / `-webkit-box-*` notices**. The most affected P2-B chunk (`SettingsPage`) has 27 normal warnings, all dynamic-variable notices. These warnings were not removed by changing theme tokens or dropping compatibility CSS solely to make the report green.

Extended diagnostics are substantially more verbose; typical examples are media-query/theming property redefinitions and rules that specify a text or background color without an explicit matching declaration. W3C cannot establish the final computed contrast across all dynamic themes, so neither the warnings nor their absence would alone certify accessible contrast. Extended warning counts must **not** be compared to Normal counts as a trend or relabeled as source errors.

**Quality status:** zero-error CSS gate **PASS for the audited local build**, strict raw 0/0 **NOT MET** at both levels. W3C warning-risk adjudication and formal ADR-042 sign-off remain **OPEN**. Revisit outstanding diagnostic risk independently before claiming a release gate is fully satisfied. The project owner also reported ESLint clean, Vitest **228/228** across **55** test files and Vite build **185** transformed modules. The P2-B avatar and navigation visual flow was accepted in recorded browser QA, but no comprehensive cross-browser/accessibility certification or public deployment verification is implied.

Generated reports are not committed: `w3c-audit/summary-normal.md`, `w3c-audit/report-normal.json`, `w3c-audit/summary.md`, `w3c-audit/report.json`. Keep the files or relevant run excerpts with the feature-review evidence. This snapshot does not alter the documented strict CSS target or waive warnings.
