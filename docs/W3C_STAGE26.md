# Stage 26 — preflight before applying indexGauge layer changes

## Why

Stage 25 proved that splitting the runtime radial and linear gradients removes the
`background-image` error under W3C `css3svg` (with `@property` still present).
The application has a strict `w3cApprovedCssPilots` Vite transform. Merely passing
W3C on a virtual **compiled CSS** is not enough to guarantee that the **source CSS**
compiles with that transform.

## What this stage does

- **Adds only** `scripts/w3c-index-gauge-preflight.mjs` and this document.
- Reads `ProjectOverviewPage.module.css`, builds a virtual two-element version
  (`.indexGauge` with linear background + `::before` with dynamic radial layer).
- Calls the real Vite CSS pilot twice: on the unchanged source and proposed version.
- Checks that the resulting CSS still contains both live gradient tokens and `@property`.
- Writes reports to `w3c-audit/stage26-preflight.md` and `.json`.
- Does **not** change the source, the build, the strict allowlist, or any application files.
- Makes **no** online requests.

## Apply (project root, after extracting ZIP into Downloads)

```bash
git apply --check ~/Downloads/HS26_IndexGauge_Source_Preflight.patch
git apply ~/Downloads/HS26_IndexGauge_Source_Preflight.patch
git diff --check
node --check scripts/w3c-index-gauge-preflight.mjs
node scripts/w3c-index-gauge-preflight.mjs
```

`STAGE 26 PREFLIGHT PASS` means source change should be compatible with the
current Vite pilot but is **not** proof of a passing production build or visual
parity. If it prints `REJECTED`, **do not edit CSS yet**; read the report and
update only the specifically rejected pilot signatures in the eventual production patch.

Share `w3c-audit/stage26-preflight.md` and terminal output. Then we can prepare
the minimal production patch, update Stage 13/16 tests, rebuild, and re-run W3C.
