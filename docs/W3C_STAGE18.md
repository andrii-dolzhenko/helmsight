# Stage 18 — Minimal W3C CSS Error Reproduction

## Why

The latest Stage 17 inventory found **one invalid isolated gradient out of 14**, yet
full-sheet W3C validation still reports **four errors** across `MetricsPage` and
`ProjectOverviewPage`. Therefore, isolated gradient outcomes do not account for
all full-stylesheet errors. No production CSS is changed in this stage.

## Operation

In the project root, first confirm `npm run check` is green. Then:

```sh
npm run w3c:repro:test
npm run w3c:repro -- --only=MetricsPage --dry-run
npm run w3c:repro -- --only=MetricsPage --max=24
```

Send these files for diagnosis:

- `w3c-audit/css-repro-MetricsPage.md`
- `w3c-audit/css-repro-MetricsPage.json`
- `w3c-audit/css-repro-MetricsPage.css`

If a fragment reproduces the failure, a follow-up run can isolate the other page:

```sh
npm run w3c:repro -- --only=ProjectOverviewPage --max=24
```

This uses a bounded delta-debugging process on **top-level PostCSS nodes**. It
validates candidate subsets against the public W3C service (`css3svg`,
`warning=1`) with a **minimum 1.6 second pause** between requests, retaining
the surrounding CSS context where needed. A CSS fragment is written alongside
results; it is diagnostic only and must never replace the production CSS.

A response marked `budget-exhausted` is a **partial** reduction, not a proof that
the reported fragment is minimal. `unverified` means W3C returned no usable
response; it must never count as passing. `baseline-passed` means the normalized
full stylesheet failed to reproduce the previous error — in that case, do not
make a production change, and compare the baseline request with the main audit.

## Safety

- No source or `dist/` assets are modified.
- No CSS rules are deleted from the application.
- Separate output files avoid overwriting `w3c-audit/report-normal.json`.
- The public W3C service receives subsets of your already-public-facing CSS.
- Do not re-run the full `w3c:audit` during this diagnostic-only stage.
