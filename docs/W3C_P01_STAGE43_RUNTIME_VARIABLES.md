# HelmSight — P0.1 Stage 43: runtime CSS variables review

Status: **ONE-DECLARATION PILOT / not yet accepted**. User must validate production W3C results and real React UI before marking PASS. Do not commit until confirmed.

## Baseline and distribution

Most recent user-confirmed Stage 42 forced production audit: **1 W3C Error / 40 Warnings** (`css3svg`, Normal `--warning=1`), 26/26 checked, 18 CSS files literally 0/0, 8 with issues, 0 unverified and 0 pending. The 1 Error is the independently reviewed modern `@property --radar-wave-radius` validator compatibility issue. Decision `DEC-P01-40-A` preserves older-browser compatibility.

Seven validator warnings say `Due to their dynamic nature, CSS variables are currently not statically checked`:

| W3C production CSS asset | Warning count | Source-level inspection and disposition |
| --- | ---: | --- |
| `ActionsPage` | 1 | **Pilot candidate:** `--action-target-shadow` is a redundant local alias for a theme-resolvable highlight shadow. |
| `MilestonesPage` | 1 | Roadmap positions and widths use `--roadmap-position`, `--roadmap-item-width`, `--roadmap-edge-width` set by content/geometry; preserve live runtime values. |
| `MetricsPage` | 2 | Index cards and `:target` highlights derive from per-state `--index-accent` and local `--index-card-start`, `--index-target-border`, `--index-target-halo`; preserve per-status visuals. |
| `ProjectOverviewPage` | 2 | Live gauge `--gauge-progress`, animated `--radar-wave-radius`, `--delivery-stack-collapsed-height`, and status-scoped accents; preserve animation, measurement, and status semantics. |
| `index` | 1 | Global/theme-specific `var()` remains in non-pilot CSS such as gradient background and theme-dependent components; do not freeze theme tokens or extend the Vite CSS allowlist casually. |
| **Total** | **7** | **One conservative pilot; the remainder requires independent diagnosis, not automatic changes.** |

**Important:** one W3C warning is not necessarily one `var()` declaration. The W3C minified production response reports line 1 and a generic message; the table identifies relevant surviving source-level runtime dependencies, not an experimentally proven one-to-one warning/declaration mapping. Review exact production re-audit before claiming a cause was resolved.

## Stage 43 candidate: Actions Page target shadow

Only `src/pages/ActionsPage/ActionsPage.module.css` changes its `.card:target, .listRow:target` rule:

- Remove redundant custom property `--action-target-shadow`.
- Keep identical existing `border-color`.
- Express the same shadow **directly**: `box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--color-accent) 12%, transparent), var(--shadow-card);`.
- Do not alter markup, anchor/scroll behavior, dimensions, hover/focus styles, CSS targets, or the unrelated runtime declarations.

The already-approved `scripts/w3c-vite-pilot.mjs` strictly checks a complete multiset of unresolved declarations. Remove **only this exact stale exception** from `expectedLiveDeclarations`; do not weaken the fail-closed rule or globally whitelist `var()`. Update the Stage 10 expectations and mutation test in `scripts/w3c-theme-preview.test.mjs`; add a Stage 43 test to assert both theme-specific emitted shadows and zero Actions unresolved CSS declarations.

## Preliminary isolated evidence — not a real build audit

Using the existing HelmSight `w3c-theme-preview.mjs` on the Stage 37 source snapshot:

| Metric | Original | Pilot |
| --- | ---: | ---: |
| Static resolutions in Actions CSS | 97 | 98 |
| Dark selector rules | 43 | 43 |
| Unresolved Actions CSS declarations | 1 | 0 |

In headless Chromium, a synthetic `:target` card fixture produced the **same computed `box-shadow`, border color, width and height** before and after the refactor in both Light and Dark. The values include the previous status-accent halo and the existing global card shadow. These results do not prove pixel-identical behavior on every supported browser and do not certify the full React app.

## Expected results — not yet verified

- **Hypothesis:** W3C `1 Error / 39 Warnings` (ActionsPage `4 → 3 Warnings`, all 26 assets verified). If any warning category changes unexpectedly, pause and inspect the report.
- No change to 18 prefixed mask warnings, 15 two-line clipping warnings, or `@property` Error.
- `npm run check` (124 Vitest), `node --test scripts/*.test.mjs` (now **69**, including the new targeted test), `node scripts/w3c-radar-production-check.mjs`, and full forced W3C audit must all pass their respective criteria. Note that `w3c:audit` may report 1/39 and still not qualify as literal 0/0 PASS.
- Visual QA: **Management Actions** card and list anchor targets (`#...`), Light/Dark, visible highlighted halo and border, narrow and desktop screens. Confirm status highlights and keyboard-focus remain unchanged.

## Commands after applying pilot

```sh
npm run check
node --test scripts/*.test.mjs
node scripts/w3c-radar-production-check.mjs
npm run w3c:audit -- --warning=1 --force
cat w3c-audit/summary-normal.md
```

To safely roll back this exact pilot while uncommitted (only if no later overlapping edits), run `git apply --reverse --check ~/Downloads/HS43_Actions_Target_Shadow_Pilot.patch` then `git apply --reverse ~/Downloads/HS43_Actions_Target_Shadow_Pilot.patch`. Rebuild and audit after rollback. Do not discard Stages 37–42 or P1 backlog.
