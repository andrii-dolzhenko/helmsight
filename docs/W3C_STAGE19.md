# Stage 19 — Live `:target` Highlight Refactor (MetricsPage)

## Evidence

The Stage 18 full-stylesheet minimizer reduced `MetricsPage-BeOfebrJ.css`
from 155 top-level nodes to one `.indexCard:target` rule. The isolated rule
returned one W3C error under `css3svg` / `warning=1`. Its `border-color` and
`box-shadow` contain status-dependent nested `color-mix()` expressions.
This does **not** prove which individual declaration caused the error.

## Change

- Keep the exact two original color computations and their percentage values.
- Factor them into two scoped CSS custom properties on `.indexCard:target`.
- Reference those values in the visible `border-color` and `box-shadow`.
- Retain the original `--index-accent`, `healthy/watch/pressure/notAvailable`
  state selectors, shadow geometry, and anchor target behavior.
- Update the strict Vite production-transform allowlist only for the two
  changed declarations. Unknown runtime tokens continue to fail the build.
- Add regression tests for the original calculations and strict allowlist.

No React components, Redux, routes, or CSS in other modules are changed.

## Apply (from project root)

```sh
git apply --check ~/Downloads/HelmSight_Stage19.patch
git apply ~/Downloads/HelmSight_Stage19.patch
git diff --check
npm run w3c:preview:test
npm run w3c:audit:test
npm run w3c:repro:test
npm run check
npm run w3c:audit
```

The main audit should revalidate the changed `MetricsPage-*.css`. It must
be checked before claiming 0/0. A parser warning or error is not hidden.

## Finish locating the remaining overview errors

After the successful build, run:

```sh
npm run w3c:repro -- --only=ProjectOverviewPage --max=24
```

Send the three files `w3c-audit/css-repro-ProjectOverviewPage.{md,json,css}`
and `w3c-audit/summary-normal.md`, plus the command output. The reproducer
isolates **one** positive-error fragment even if the complete overview CSS
still has multiple distinct errors. It does not establish that the other errors
share the same cause.

## Visual regression check

In a fresh `npm run preview` tab, open `Metrics & EVM`, follow a link that
navigates to a CPI/SPI index card (or open a card hash target), and inspect the
focused/target highlight in Light and Dark. Confirm the inset accent and
outer halo still change with healthy/watch/pressure state; also check narrow
layout. This visual test is separate from the W3C result.
