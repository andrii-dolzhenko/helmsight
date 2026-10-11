# Stage 22 — fix malformed radar masks in Vite production CSS

## Evidence (provided Stage 21 source and Vite CSS)

- Source `.radarPulse` had a `-webkit-mask` shorthand followed by four standard mask longhands.
- Emitted `ProjectOverviewPage-C1M6zba2.css` instead contained `mask-image:;`,
  `mask-position:;`, `mask-size:;`, `mask-repeat:;` and empty WebKit
  longhands. This is malformed **production output**, irrespective of W3C's
  support for `@property` and newer gradients.
- In the **same emitted chunk**, `.healthHero::before` (with both families of
  explicit longhands) compiled normally. Match that existing pattern.
- The user-provided W3C report counted 9 errors / 7 warnings for this chunk,
  including one `background-image` diagnostic and eight unexplained validator
  template messages. Do not claim these nine errors are all caused by masks.

## Scope

- Replace only the WebKit shorthand in `.radarPulse` with equivalent **four WebKit longhands**.
  The four existing standards-based longhands remain as is.
- Preserve URL, alignment, size, repetition, `@property`, keyframes,
  30-second pulse, and reduced-motion rules.
- Add 2 source/transform checks to `w3c-theme-preview.test.mjs`.
- Add a production regression smoke check reading the final `dist/assets` CSS,
  so passing a source-level test alone cannot hide empty compiled declarations.

## Apply (repo root)

```sh
git apply --check ~/Downloads/HS22_Radar_Production.patch
git apply ~/Downloads/HS22_Radar_Production.patch
git diff --check
npm run w3c:preview:test
npm run check
node scripts/w3c-radar-production-check.mjs
npm run w3c:audit -- --only=ProjectOverviewPage --force
```

The last command requests a new validation rather than relying on cached
results. Send the terminal output and `w3c-audit/summary-normal.md`.
If the production smoke check fails, do NOT treat the W3C results as reliable
proof of a fix. Restore the original Stage 22 file changes only after reviewing
its output and the Vite build result; do not reset other pending project work.

## Browser QA

Check the Project Overview radar in both themes and at desktop widths,
including motion and `prefers-reduced-motion`, and check a narrow viewport.
No claimed W3C reduction or browser QA until run on the user's project.
