# Stage 24 — pinpoint the remaining indexGauge gradient diagnostic

## Confirmed by Stage 23

On the same production CSS (matching SHA-256):

- Original `ProjectOverviewPage` → **2 errors / 10 warnings**.
- Temporarily removing only `@property --radar-wave-radius` → **1 error**.
- Temporarily removing `@property` and `.indexGauge`'s `background-image` → **0 errors**.
- Removing the `.radarPulse` or `.gaugeRing` background image did **not** eliminate that final error.

The gradient and the registration are independent *validator diagnostic* sources. Neither result proves that the modern CSS in the authored file is invalid.

## Goal

Determine whether W3C's remaining `background-image` error is caused by the radial gradient, the linear gradient, their combination, or the dynamic color functions within them. Preserve the live state colors, both Light/Dark themes, the SVG mask and animation.

## Scope / safety

- **No change to `src/`, `dist/`, `vite.config.js` or runtime behavior.**
- The diagnostic temporarily excludes `@property` from each copy to isolate the gauge error only; production keeps it.
- Literal-color variants exist **only in W3C requests**; they are not suggested replacements for the actual design.
- Uses the existing W3C SOAP client and PostCSS; no new packages.
- Checks the production CSS SHA-256 against the Stage 23 report to guard against stale comparisons.

## Commands (from project root)

```sh
git apply --check ~/Downloads/HS24_IndexGauge_Isolation.patch
git apply ~/Downloads/HS24_IndexGauge_Isolation.patch
node --check scripts/w3c-index-gauge-isolate.mjs
node scripts/w3c-index-gauge-isolate.mjs --dry-run
node scripts/w3c-index-gauge-isolate.mjs
```

The last command performs eight independent W3C requests with a minimum 1.6 seconds between request starts. Reports:

- `w3c-audit/stage24-gauge-isolation.md`
- `w3c-audit/stage24-gauge-isolation.json`

**Next:** provide `stage24-gauge-isolation.md`; choose a spec-correct solution only once the affected gradient layer is verified. Do not delete `@property`, replace dynamic colors with fixed ones, or change the radar animation to game the validator.
