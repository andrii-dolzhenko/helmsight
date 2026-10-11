# Stage 25 — Validate alternative gradient composition

Stage 24 showed both dynamic gradients pass independently; together they trigger one W3C error.

This is **not** a production styling patch. The diagnostic script clones the actual emitted CSS in memory and tests the same two gradients split across `.indexGauge` and `.indexGauge::before`, retaining both dynamic expressions and their stacking order. `@property` is preserved for one probe and stripped only in a second diagnostic probe.

The generated report tests whether the proposed CSS architecture is accepted by the public W3C endpoint before modifying app code. Production application, Vite strict allowlist and Stage 13/16 tests will have to be updated together in a later step.

## Commands

From repository root, after unzipping the archive into `~/Downloads`:

```sh
git apply --check ~/Downloads/HS25_IndexGauge_Layers_Probe.patch
git apply ~/Downloads/HS25_IndexGauge_Layers_Probe.patch
git diff --check
node --check scripts/w3c-index-gauge-layers-probe.mjs
node scripts/w3c-index-gauge-layers-probe.mjs --dry-run
node scripts/w3c-index-gauge-layers-probe.mjs
```

The script requires the existing Stage 23 JSON and corresponding unmodified production CSS (verified by SHA-256). It writes only `w3c-audit/stage25-layering-probe.md` and `.json`.

**Do not remove `@property` or alter production styles based on a temporary validation report.**

## Expected interpretation (not yet verified)

- `baseline`: 2 errors, 10 warnings (prior W3C report).
- `split-with-registration`: ideally 1 error (the pre-existing `@property` validator problem).
- `split-without-registration`: ideally 0 errors.

If these counts differ, inspect the actual messages; do not assume the split is a fix.
