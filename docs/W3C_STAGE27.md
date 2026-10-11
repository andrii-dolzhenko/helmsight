# HelmSight — Stage 27: indexGauge layered gradients

## Decision

Stage 24 identified the multi-layer dynamic `background-image` on `.indexGauge` as the W3C `css3svg` background-image failure. Stage 25 verified a temporary two-element layering approach: 2→1 validator errors while retaining `@property`. Stage 26 rejected the prototype because the strict Vite pilot expected the original single unresolved declaration.

Stage 27 applies that reviewed split to source and updates only the exact `ProjectOverviewPage` allowlist multiset: the original combined unresolved `background-image` becomes two separately reviewed dynamic `background-image` declarations. No wildcard or general relaxation is introduced.

## Design invariants

- The base `.indexGauge` retains the exact live linear gradient and `--gauge-surface-start` calculation.
- `.indexGauge::before` holds the identical 8%-accent translucent radial halo.
- `position: relative` + `isolation: isolate` on the card and `z-index: -1` on the pseudo-element position the halo *over the card's own background, under its content*. The pseudo-element is outside grid flow and has the card radius.
- Gauge status accents, EVM progress, dark-theme mappings, SVG radar, `@property --radar-wave-radius`, `@keyframes` and reduced-motion rules are unchanged.
- Stage 12 changes the expected unresolved count from 24 to 25 (1 former combined declaration → 2 reviewed declarations). Stage 13 recognizes both selectors. Stage 27 adds positive and fail-closed regression tests.

## Verification (run from repo root)

```sh
git apply --check ~/Downloads/HS27_IndexGauge_Layers.patch
git apply ~/Downloads/HS27_IndexGauge_Layers.patch
git diff --check
npm run w3c:preview:test
npm run check
node scripts/w3c-radar-production-check.mjs
npm run w3c:audit -- --only=ProjectOverviewPage --force
```

Review `w3c-audit/summary-normal.md` and the current `report-normal.json`. Target: no `background-image` error and a remaining `Unrecognized at-rule “@property”` under the selected legacy validation profile; this is *not* yet verified on the new Vite build.

Manual QA: compare Gauge cards in Light/Dark themes across healthy/watch/pressure/not-available states and narrow/wide layouts, including progress rings and radar waves. The W3C validator is not a substitute for browser QA.

**Historical diagnostic warning:** Stage 23–26 scripts operate on the old build hash/old unsplit source; do not rerun them on the Stage 27 production implementation. Stage 27 keeps their reports for provenance.
