# Stage 16 — live gradient color indirection

The Stage 15 differential matrix isolated three combinations that the W3C
`css3svg` validator rejected even though simpler versions of the same CSS
functions passed. This patch **does not replace colors with constants**.

It factors one exact `color-mix()` into a component-local computed CSS custom
property for each affected element:

- `MetricsPage` `.indexCard`: `--index-card-start` preserves the state-dependent
  `--index-accent` mixed with the live surface color.
- `ProjectOverviewPage` `.indexGauge`: `--gauge-surface-start` preserves the
  Light/Dark canvas-and-surface mix while the radial highlight remains live.
- `ProjectOverviewPage` `.gaugeRing`: `--gauge-ring-active` preserves the live
  severity accent and leaves `--gauge-progress` and `--gauge-track` unchanged.

CSS custom properties are resolved on the target element (or inherited when
appropriate), so health colors, dark-mode palettes and ring progress are not
frozen by build-time substitution. The strict Vite allowlist is updated for
**only these three reviewed declarations**. A novel unknown token still fails
closed. No JSX, Redux, services or JavaScript calculations change.

## Verification on Mac

```sh
npm run w3c:preview:test
npm run w3c:audit:test
npm run w3c:probe:test
npm run w3c:matrix:test
npm run check
npm run w3c:audit
```

Review the two freshly generated chunks matching `MetricsPage-*.css` and
`ProjectOverviewPage-*.css` in `w3c-audit/summary-normal.md` and
`report-normal.json`. **0/0 is not assumed**: only the W3C service can confirm
it for these new compiled files. Other unchanged chunks should use the SHA
cache. If issues remain, do not disable live gradients or suppress warnings.

Visually test Metrics and Project Overview under Light, Dark, System (both OS
appearances) and mobile width, with healthy/watch/pressure/unavailable states,
CPI/SPI and the animated gauge. Browser QA must include changing actual values
rather than only viewing seeded screenshots.

Stage 14/15 gradient probe/matrix commands were designed for the old, inline
CSS declarations and intentionally fail closed if re-run against the Stage 16
production output. Their previously saved reports remain valid historical
research; the source-of-truth validation is now the full production CSS audit.
