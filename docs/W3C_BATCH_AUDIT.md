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
