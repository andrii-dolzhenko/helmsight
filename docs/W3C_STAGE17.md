# Stage 17 — inventory every literal gradient in error-bearing CSS chunks

After Stage 16 the W3C CSS3+SVG normal audit reports `MetricsPage` 1 error / 1 warning and `ProjectOverviewPage` 3 errors / 7 warnings. The Stage 14/15 probes inspect the **old** form of the declarations and are not evidence about the Stage 16 build.

This stage adds a **read-only diagnostic tool**; it makes **no changes** to React, CSS, theme tokens, gradients, SVG, Vite production output, or the original W3C audit. It enumerates every literal `linear-gradient`, `radial-gradient`, or `conic-gradient` in `background`/`background-image` rules in the **current compiled assets**, not just the three historic suspects. Each declaration is submitted individually to W3C with `css3svg`, `warning=1`. Reports and source assets are not overwritten.

```bash
npm run w3c:inventory:test
npm run check
npm run w3c:inventory -- --dry-run
npm run w3c:inventory
```

Reports: `w3c-audit/gradient-inventory.md` and `w3c-audit/gradient-inventory.json`. If an HTTP/SOAP error occurs, the affected case is `unverified`; never interpret it as a pass. Delay between requests is 1.6 seconds. The public service receives each isolated CSS declaration. For a small smoke test: `npm run w3c:inventory -- --only=MetricsPage`.

**Interpretation:** An isolated declaration may pass even if its stylesheet fails. A failing declaration identifies a candidate for remediation, not proof of invalid browser CSS. Do not copy simplified test colors into production. Future CSS changes still require the full 26-file audit and Light/Dark/System/mobile regression testing.
