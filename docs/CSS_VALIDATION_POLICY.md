# HelmSight — CSS Validation & Quality Gates

**Status:** Active project standard · applies to P0 baseline and releases P1, P2, P3
**Maintained throughout:** design, implementation, review, regression QA and phase acceptance
**Scope:** all CSS Modules, global styles, generated Vite CSS bundles, theme variants and supported viewport states

## 1. Non-negotiable quality objective

At the end of **every upcoming phase (P1, P2 and P3)**, the **target acceptance result is 0 errors and 0 warnings** from the selected HTML/CSS validation profiles. This is a phase-level quality objective, with any validator-compatibility exception requiring an explicit decision and honest raw counts. For **P0.1**, the separately recorded Stage 44 decision accepts **0 errors with 39 reviewed warnings** in the Normal profile; this is **not** a 0/0 result or a silent waiver for P1–P3.

- Validate the **real production output** as well as the source CSS. A clean source file does not guarantee clean CSS after PostCSS/Vite transformations.
- Audit **100% of the CSS assets in the current build**. Any `unverified`, `pending`, unselected, stale, or failed-to-fetch result blocks a claim of clean validation.
- Record actual raw counts. **Never** relabel warnings as passes, lower warning severity to make the headline green, filter failing assets, or remove necessary styling/behavior just to satisfy an obsolete validator.
- A 0/0 claim is valid only for a specified validator, version/profile, warning level, build, and full set of files. Keep separate results for `--warning=1` (normal) and `--warning=2` (all warnings).
- If valid modern CSS is unsupported by the selected validator, mark the gate **BLOCKED — validator compatibility**, verify conformance using a suitable modern specification-aware tool and runtime checks, and document the decision. **Do not report 0/0** while raw W3C results still contain errors/warnings.
- No new errors/warnings should be introduced during a phase. Existing P0 validation debt must be resolved or explicitly escalated before declaring P1/P2/P3 fully compliant with the 0/0 target.

The target is intentionally strict. Some existing warnings arise from compatibility fallbacks and dynamic CSS syntax that the historic `css3svg` profile cannot statically evaluate. A literal 0/0 under that profile may require a standards-aware validator update or a design trade-off. Neither is assumed to be solved today.

## 2. P0 historical baseline — 11 October 2026

This is **measured historical status**, not proof that the 0/0 release target has been reached:

| Metric | Result |
| --- | ---: |
| Production CSS files found and verified | 26 / 26 |
| Assets with 0 errors / 0 warnings | 17 |
| Assets with at least one issue | 9 |
| Total validator errors | **1** |
| Total validator warnings | **49** |
| Unverified / pending | **0 / 0** |
| W3C profile | `css3svg`, normal warnings (`--warning=1`) |

**Only error:** `ProjectOverviewPage` → `Unrecognized at-rule “@property”`. The registration `@property --radar-wave-radius` is used to animate the radar wave. It was retained deliberately rather than sacrificing animation for a misleading validation pass.

**49 warnings, grouped by reported message:**

| Category | Count | Handling |
| --- | ---: | --- |
| `-webkit-line-clamp`, `-webkit-box-orient`, `-webkit-box` | 16 | Review actual need and modern equivalent; preserve working truncation |
| `-webkit-mask-*` | 18 | Cross-browser fallback; preserve standards-based `mask-*` equivalents |
| CSS variables not statically checked | 7 | Check runtime tokens across themes/states; do not freeze dynamic values |
| `::-webkit-calendar-picker-indicator` | 3 | Review platform-specific date input behavior |
| Font-stack vendor-extension notes | 2 | Assess whether these are parser/profile advisories |
| Same background and border color | 3 | Check deliberate design vs contrast/visibility concern |
| **Total** | **49** | All remain open until resolved or explicitly classified |

The 49-warning total is from the **normal** profile. The `--warning=2` audit may return additional notices; it must be recorded separately, not compared as the same metric.

Baseline evidence: `w3c-audit/summary-normal.md` and `w3c-audit/report-normal.json` generated locally (these outputs are ignored by Git). For persistent history, preserve the aggregate numbers here and reference `docs/W3C_STAGE27.md` and `docs/W3C_BATCH_AUDIT.md`. P0 application checks and browser QA were successful, but **P0 did not achieve the raw W3C 0/0 target**.


### P0.1 update — Stage 40 compatibility decision (2026-10-11)

The **historical P0 baseline above remains 1 error / 49 warnings**. After verified Stages 37–39, the latest *normal-profile* production audit is **26/26 checked, 18/26 literal 0/0, 1 error / 41 warnings, 0 unverified, 0 pending** (Stage 39, 2026-10-11). Do not confuse this later state with the original baseline.

**Approved `DEC-P01-40-A`: preserve browser compatibility and existing CSS fallbacks.** No removal of prefixed `mask-*`, legacy `-webkit-line-clamp` behavior, dynamic custom properties, or the standards-defined radar `@property` merely to silence the legacy validator; no change to browser transformation targets. CSS `build.cssTarget` in Vite is **not** an independently verified browser-support promise. Firefox 114 predates support for `@property`, so radar animation parity in older Firefox is not assumed and must be checked as progressive enhancement.

**Recorded W3C decision:** `BLOCKED — VALIDATOR COMPATIBILITY` for **literal 0/0 under the current `css3svg`, warning=1 profile**. This is *not* a W3C PASS, not a blanket declaration that all emitted CSS is independently standards-validated, and not evidence that all older browsers have passed QA. Keep original diagnostics and separate normal vs all-warnings profiles. The strict 0/0 release objective for P1–P3 remains in force, subject to documented adjudication rather than suppression. Details and pending browser-test matrix: [`docs/W3C_P01_STAGE40_COMPATIBILITY.md`](W3C_P01_STAGE40_COMPATIBILITY.md).

### P0.1 measured update — Stages 44–45 (2026-10-12)

**Status: CSS ERROR GATE PASSED; full P0.1 release acceptance pending.** Stage 40 and Stage 41 figures above are retained as historical snapshots, **not** the current W3C result. From the user-provided forced normal-profile audit after Stage 45 (`2026-10-12T06:30:10.617Z`):

| Measurement | Latest Stage 45 production result |
| --- | ---: |
| W3C validator / scope | `css3svg`, `--warning=1 --force` |
| CSS assets checked | **26/26** |
| **W3C Errors** | **0** |
| **W3C Warnings** | **39** |
| Literal error- and warning-free assets | **18/26** |
| Assets with warnings | **8/26** |
| Unverified / pending | **0 / 0** |
| ESLint / Vite production build / radar guard | **PASS / PASS / PASS** |
| Vitest / standalone Node tests | **126/126 / 74/74** |

This means the **zero-CSS-errors goal is achieved in the audited local production build**, not that every CSS file is 0/0 or that the deployed sites have been updated. Do not describe this as an unqualified W3C 0/0 PASS. The **39 warnings** remain recorded as 18 vendor-prefixed masking, 15 vendor-prefixed multiline-clamp and 6 runtime-variable static-analysis notices. Preserve prefixed fallbacks and true dynamic variables under compatibility decision `DEC-P01-40-A`; do not change the warning level, suppress messages or omit assets.

Stage 44 replaced the CSS `@property --radar-wave-radius` registration with the standard JS `CSS.registerProperty()` API. Its behavior has been tested in Chromium and the 74 Node tests, and a user video shows desktop Light/Dark radar animation. This **supersedes only** the earlier Stage 40 instruction to retain registration specifically as a CSS at-rule; preserving the radar, accessibility rules and compatibility fallbacks remains mandatory. The older-browser matrix, full reduced-motion QA after the patch, `--warning=2` audit, and `data-hash-target` List-mode QA are **not independently closed** by the above result.

Stage 45 changes `.main` from `overflow: hidden` to `overflow: clip`, preventing `scrollIntoView()` from scrolling a hidden internal container. The user supplied two browser QA videos with no reproduced freeze, and the subsequent complete run passed **126/126 Vitest, 74/74 Node tests (including the new scroll regression guard), radar guard, 26/26 forced CSS audit with 0 Errors / 39 Warnings, and `git diff --check`**. The hash-target explicit marker in Management Actions remains a **separate OPEN browser gate**; the scroll fix does not prove it works.

P0.1 acceptance decision: **allow 39 disclosed compatibility/static-analysis warnings for this phase** once functional, Git and deployment release gates are met. The original P1–P3 0/0 objective remains a future quality target, subject to explicit review rather than automatic inheritance of this P0.1 exception. See [`W3C_P01_STAGE44_JS_PROPERTY_PILOT.md`](W3C_P01_STAGE44_JS_PROPERTY_PILOT.md) and [`P01_RELEASE_GATE.md`](P01_RELEASE_GATE.md).

## 3. Lessons learned from CSS validation (Stages 13–27)

1. **Validate the output, not only the input.** A legitimate `mask` refactor produced empty values such as `mask-image: ;` in a Vite bundle. ESLint, Vitest and a successful build did not catch the visual risk. Stage 22 introduced a separate production-mask regression check.
2. **Use matching prefixed and standard mask longhands.** Keep `-webkit-mask-image/position/size/repeat` and `mask-image/position/size/repeat` complete when needed. Avoid combining a shorthand in one family with longhands in the other without testing the compiled result.
3. **Don't overinterpret validator counts.** The W3C SOAP response once returned raw strings like `$esc.xml($error_msg)` instead of useful diagnostics. Always reproduce and isolate before changing code.
4. **Isolate failures with temporary variants.** Stages 23–25 found the separate `@property` error and the multi-layer dynamic `.indexGauge` gradient issue without changing production sources during investigation.
5. **Preserve the appearance by splitting CSS layers.** Stage 27 kept the original dynamic radial halo and linear surface gradient, distributing them between `.indexGauge::before` and `.indexGauge`. Do not replace theme/status colors with fixed literals just to satisfy validation.
6. **Keep dynamic tokens live.** Status accents, `--gauge-progress`, gradients, Light/Dark overrides and reduced-motion behavior are product requirements. A workaround must not freeze their runtime meaning.
7. **Use an exact, fail-closed Vite allowlist.** After restructuring `.indexGauge`, the CSS pilot initially rejected 25 dynamic declarations. Stage 27 updated only the reviewed declarations and added positive plus rejection tests. No wildcard bypass.
8. **Treat modern standards separately from legacy parser support.** `@property` is part of modern CSS but remains unrecognized by the chosen `css3svg` validator. Do not delete a required registration for a cosmetic green badge.
9. **Keep stage diagnostics reproducible but don't misuse old snapshots.** Stage 23–26 probes were tied to an older build/source shape. Never run them against the Stage 27 structure and infer a current regression.
10. **Review visual and accessibility behavior too.** Each CSS change needs Light/Dark, responsive, interaction and `prefers-reduced-motion` checks. W3C alone cannot establish functional correctness.

## 4. Rules while writing new CSS

- Prefer current standard CSS properties and well-supported syntax; use prefixes only when there is a demonstrated compatibility need.
- Avoid obsolete hacks, silent invalid declarations, unnecessary duplicate rules and unreviewed vendor extensions.
- For any dynamic `color-mix()`, gradient, CSS variable or calculation, check it against all required theme/status combinations.
- Avoid complex dynamic gradients in a single property if simple equivalent layering can preserve the design and improve validation.
- If a property is known to trigger a W3C parser limitation, record this at implementation time and investigate early rather than carrying an unexplained error into phase closure.
- Do not modify strict allowlists just to make code compile. Any allowlist change must pin the exact dynamic declarations and include a negative (reject unexpected value) test.
- Respect `prefers-reduced-motion`, maintain visible focus, readable contrast, responsive layout and SVG/icon rendering.
- Never erase browser compatibility, animations, data-dependent states or accessibility to manipulate validator counts.

## 5. Repeatable validation procedure

### During a feature or pull request

1. Inspect affected source CSS/JSX and document the intended dynamic behavior.
2. Run `npm run lint`, `npm run test:run` and the relevant CSS-pilot test(s).
3. Run `npm run build` and inspect relevant generated CSS; check for empty or malformed declarations.
4. Smoke-test on supported browsers, Light/Dark/System themes, desktop/tablet/mobile and keyboard/reduced-motion paths relevant to the change.
5. For CSS changes, validate the affected new build CSS with W3C **without relying solely on a cached old SHA**. Do not wait for the phase-end batch to discover regressions.
6. Resolve new errors and warnings or stop/raise a compatibility blocker. Add regression tests for any fixed class of failure.

### At the end of P1, P2 and P3 (phase gate)

Run from the repository root:

```bash
npm ci
npm run w3c:preview:test
node --test scripts/*.test.mjs
npm run check
node scripts/w3c-radar-production-check.mjs
npm run w3c:audit -- --warning=1 --force
npm run w3c:audit -- --warning=2 --force
```

The radar-specific check is retained as long as the SVG radar implementation exists. `--force` bypasses SHA cache; allow sufficient time for network requests. W3C runs are remote and may fail independently of application quality. Assess each run's report; a script exiting successfully **does not itself mean** that W3C returned 0/0.

Review:

- `w3c-audit/report-normal.json` + `summary-normal.md` (warning level 1)
- `w3c-audit/report.json` + `summary.md` (warning level 2)
- Actual `dist/assets/*.css` and manifest/build output
- W3C HTML validation of the deployed/served markup (for rendered UI, inspect appropriate rendered snapshots where relevant)
- Browser Console/DevTools Issues (application-origin errors and warnings), viewport and theme QA, keyboard/reduced-motion smoke tests

**Mandatory acceptance checks for each W3C profile:** `total === verified`, `unverified === 0`, `pending === 0`, `errors === 0`, `warnings === 0`, and **every asset** must have `status: "pass"`. Verify the report's `generatedAt`, `profile`, `warningLevel`, and each asset's build hash. If any condition fails, the 0/0 gate is **not passed**.

### Phase completion matrix

| Gate | Required outcome |
| --- | --- |
| ESLint | 0 errors / 0 warnings |
| Vitest and standalone Node tests | 100% pass, 0 failures |
| Production build | Successful, no invalid emitted declarations |
| Production CSS W3C (normal + all warnings) | Target **0 errors / 0 warnings** across 100% verified assets |
| HTML validator | Target **0 errors / 0 warnings** for all agreed validated pages/snapshots |
| Browser Console and DevTools Issues | 0 reproducible application-origin errors/warnings |
| Responsive, themes, dynamic states, animations | No visual or functional regressions |
| Accessibility checks | No unresolved critical/serious issues; keyboard and reduced-motion behavior verified |
| Documentation | Current report, issue register, decision trail, and QA evidence updated |

**Result statuses:** `PASS` only with complete evidence; `FAIL` for actual defects; `BLOCKED — VALIDATOR COMPATIBILITY` if the current profile cannot interpret standards-based CSS; `UNVERIFIED` for incomplete/network-failed audits. A blocked or unverified result is **not** 0/0 and must not be presented as a pass.

## 6. Phase-by-phase commitments

| Phase | Validation commitment | Evidence required |
| --- | --- | --- |
| **P0** (baseline) | Capture existing debt without disguising it; current measured raw result is **1 error / 49 warnings** | Historical report and known causes |
| **P1** | Fix or adjudicate all baseline issues; keep new CSS free of additional warnings; run the full 0/0 acceptance gate | Fresh full-build raw reports and visual QA |
| **P2** | Re-run exactly the same gate after additions and refactors; resolve regressions before release | Fresh full-build reports, tests and browser QA |
| **P3** (final frontend phase) | Final 0/0 target plus end-to-end regression and deployed build validation | Signed-off validation evidence and final acceptance report |

The backlog owns the feature contents of P1–P3; this policy defines **quality requirements**, not feature promises or delivery dates. A prior phase's pass never substitutes for validating the current build.

## 7. Issue triage and documentation

For each nonzero W3C message record: affected production asset/hash, source CSS selector/declaration, exact diagnostic, reproducer or isolation step, whether the source is standards-valid, runtime impact, chosen resolution, regression test and owner/status. Keep the original warning visible while the issue is open.

Prioritize actual broken production output first, then real standards violations, then compatibility warnings and validator/parser limitations. Before accepting an exception, document the reason, alternate standards evidence, tested browsers, and approver; **the raw W3C gate remains nonzero and cannot be stamped as PASS**.

Copy and fill this template at each phase review:

```text
Phase: P1 / P2 / P3
Commit/build SHA:
Validation profile and warning level:
CSS assets: total / verified / unverified / pending
W3C CSS: errors / warnings
W3C HTML: errors / warnings; validated routes/snapshots
ESLint: errors / warnings
Vitest + Node: passed / failed
Build: PASS / FAIL
Console / DevTools: errors / warnings
Themes, breakpoints, keyboard, reduced motion: PASS / FAIL
Unresolved items (with evidence):
Gate decision: PASS / FAIL / BLOCKED / UNVERIFIED
Reviewer / date:
```

## 8. Existing documentation

- `docs/W3C_COMPATIBILITY_PLAN.md` — earlier CSS compatibility decisions
- `docs/W3C_BATCH_AUDIT.md` — production asset audit setup and interpretation
- `docs/W3C_STAGE16.md` through `docs/W3C_STAGE27.md` — investigation history and narrow changes
- `docs/STAGE28_ROUTE_FALLBACK.md` — separate React Router Console warning remediation
- `docs/TEXT_INPUT_LIMITS.md` — independent input validation policy

**Document ownership:** this file is the **canonical ongoing CSS validation policy**. Stage-specific files are historical evidence, not new or conflicting acceptance criteria. Update this document whenever the phase gate, supported browsers, or validation tooling changes.
