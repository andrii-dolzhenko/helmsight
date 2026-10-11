# Stage 20 — Project Overview error localization

## Evidence

- The user-verified Stage 19 main audit reports **3 W3C errors / 7 warnings** in `ProjectOverviewPage` (`css3svg`, `warning=1`). `MetricsPage` has **0 errors / 2 warnings**.
- Stage 18 minimized a Project Overview stylesheet from **238 rules to 1**. The retained `._radarPulse_...` rule reproduces **1 error / 1 warning**.
- Earlier Stage 17 inventory reported the `radarPulse.background-image` declaration alone as 0/0. Thus removing the radar gradient or assuming it is the sole problem is not justified.
- The full file contains **three** W3C errors. Minimizing one failing rule did not identify all errors.

## What this diagnostic patch does

Adds an opt-in, strict-bound CLI to run two **independent** investigations of the current `dist/assets/ProjectOverviewPage-*.css`:

1. `--mode=radar`: isolates declarations of the compiled `._radarPulse_...` rule. The subset may require **multiple interacting declarations**; the script preserves the original selector and declaration order. If the minimum request budget is exhausted or the W3C API fails, the result is reported as partial/unverified.
2. `--mode=remaining`: removes **exactly that single radar rule from an in-memory copy**, then minimizes a separate W3C error in the remaining production stylesheet if the trimmed file still fails. The actual CSS assets remain unchanged. It does **not** claim this removed rule is a production fix or that the remaining W3C errors equal a simple subtraction.

Both modes use the existing `validate()` SOAP client, the CSS3+SVG/normal-warning settings, bounded W3C calls, a 1.6-second inter-request delay, and a separate `w3c-audit/stage20-*` report namespace. Neither mode changes production CSS or the main `summary-normal.md`.

## Apply and test

From the project root, using the patch extracted from this Stage 20 ZIP:

```bash
git apply --check ~/Downloads/HS20_Overview.patch
git apply ~/Downloads/HS20_Overview.patch
git diff --check
node --test scripts/w3c-overview-isolate.test.mjs
npm run check
```

## Run diagnostics

```bash
node scripts/w3c-overview-isolate.mjs --mode=radar --dry-run
node scripts/w3c-overview-isolate.mjs --mode=radar --max=24
node scripts/w3c-overview-isolate.mjs --mode=remaining --dry-run
node scripts/w3c-overview-isolate.mjs --mode=remaining --max=24
```

Output (each mode: `.css`, `.json`, `.md`):

- `w3c-audit/stage20-radar.*`
- `w3c-audit/stage20-overview-remaining.*`

Upload both Markdown and JSON reports plus both reduced CSS fragments and the terminal log. **Do not run `npm run w3c:audit` again solely for Stage 20** because this diagnostic patch changes no stylesheet. W3C pass/fail for the project remains the last official full audit, 17/26 CSS assets at 0/0; 3 errors and 46 warnings (Stage 19).

Do not paste isolated CSS fragments back into `src/`. Preserve dynamic radar animation, SVG masks, theme tokens, mobile layout and CPI/SPI status semantics. Choose any production correction only after specific failure sources are verified.
