# Stage 15 — gradient differential diagnostic (no production changes)

Stage 14 isolated six dashboard declarations: three passed the CSS3+SVG W3C validator and three failed (`indexCard`, `indexGauge`, `gaugeRing`). The failures do not prove the original styles are invalid according to contemporary browser specifications. This matrix determines which syntactic features trigger the validator's legacy profile.

## Commands

After applying the Stage 15 patch **on top of Stage 14 + Vitest hotfix**, the current `dist` from the successful Stage 14 production build is sufficient. This diagnostic does not change production CSS or require a new build.

```sh
npm run w3c:matrix:test
npm run w3c:matrix -- --dry-run
npm run w3c:matrix -- --only=indexCard
npm run w3c:matrix -- --only=indexGauge
npm run w3c:matrix -- --only=gaugeRing
```

Use a single `--only=` target first; the script also accepts `--max=N` (up to 16) for partial diagnostic runs. By default, it checks all 16 variants. The public W3C service is queried at least 1.6 seconds apart. Results are written to **`w3c-audit/gradient-matrix.md`** and **`w3c-audit/gradient-matrix.json`**. Each run replaces those two diagnostic files; save earlier files before selecting another `--only=` target if you want to compare all three. The regular `report-normal.json` and `summary-normal.md` stay untouched.

Variants are deliberately simplified to isolate CSS parser behavior: static diagnostic colors, constant percentages and single-layer gradients are **not visually equivalent to HelmSight** and must never be copied to production as a purported fix. The tool enforces exact expected tokens and stops if the reviewed declarations change. HTTP failures remain `unverified`. A clean synthetic result does not constitute validation of the original production asset.

After results are reviewed, prefer standards-compliant authoring and maintain dynamic behavior even if the legacy `css3svg` profile cannot interpret a feature. Any production change requires separate W3C, Light/Dark/System, mobile, interactive chart, and accessibility QA.
