# HelmSight P0.1 — Stage 37: platform font-stack aliases

## Baseline and evidence

- Source: full forced production CSS audit dated 2026-10-11, W3C profile `css3svg`, warning level `1`.
- Scope: 26/26 files checked, 17 clean, 1 error, 49 warnings, 0 unverified.
- The compiled `index-Co4cLWkd.css` contains two `font-family` declarations containing `-apple-system`, one from `src/shared/styles/global.css` and one from `src/shared/ui/Brand/Brand.module.css`.
- The audit reports two vendor-extension warnings for the corresponding complete font stack.

## Pilot A — initial change

Replace the redundant `-apple-system, BlinkMacSystemFont` entries following `system-ui` in exactly two font declarations. Keep `Inter`, `ui-sans-serif`, `system-ui`, `'Segoe UI'`, and `sans-serif` unchanged. Modern browsers that support `system-ui` select the same system fallback if Inter is unavailable; older browsers still have `'Segoe UI'` and `sans-serif`. This does not alter color, contrast, animation, layout sizing, gradients, masks, runtime CSS tokens, or Vite's strict CSS transformation allowlist.

## Pilot A — observed result (2026-10-11 13:46:31 UTC)

- The forced W3C check validated 26/26 production CSS assets: 17 clean, 1 error, 49 warnings, 0 unverified.
- The two vendor-extension warnings for `-apple-system` disappeared.
- Two new `Family names containing whitespace should be quoted` warnings appeared in `index-BcI-pgg5.css` instead.
- The CSS optimizer serializes the source's quoted `'Segoe UI'` as `Segoe UI` in the production font-family list; the validator complains about that unquoted two-word family name. The previous expectation of 47 warnings was therefore **not met**.
- ESLint, 124 Vitest tests, 68 Node tests, Vite build, and the radar production check all passed.

## Pilot B — minimal follow-up (not yet validated)

Remove only the final named fallback `'Segoe UI'` after `system-ui` in both declarations. The resulting stack is `Inter, ui-sans-serif, system-ui, sans-serif`.

In browsers supporting `system-ui`, this retains the same computed family selection order because `'Segoe UI'` only served as a fallback after `system-ui`. Older browsers without `system-ui` may fall back to generic `sans-serif` instead of Segoe UI; this is an accepted tradeoff **only if** the application's supported-browser policy targets modern browsers. Preserve the `sans-serif` ultimate fallback. No gradient, runtime token, theme, mask, or animation changes.

## Verification and acceptance

1. Run `git diff --check` and `npm run check`.
2. Run `node --test scripts/*.test.mjs` and `node scripts/w3c-radar-production-check.mjs`.
3. Run `npm run w3c:audit -- --warning=1 --force` against the freshly built production assets. Inspect `w3c-audit/summary-normal.md`, not only the command exit status.
4. Pilot B hypothesis (not yet verified): the two family-name warnings disappear; total 1 error / 47 warnings, 17 clean files. No unrelated warnings should change.
5. Compare the landing brand and workspace typography in Light and Dark themes; test with Inter unavailable if practical. Confirm the target browser-support policy allows omitting legacy Segoe UI fallback.

No W3C zero-warning result is claimed for this stage. Do not update the permanent P0 baseline until the actual report confirms the result.

## Next diagnostic groups (not part of this patch)

- 18 `-webkit-mask-*` warnings: do not remove Safari fallbacks without browser-level evidence.
- 16 `-webkit-line-clamp` / `-webkit-box-*`: preserve truncation and responsive layouts.
- 7 dynamic CSS-token warnings: W3C's static-analysis limitation.
- 3 calendar picker pseudo-element warnings: verify native picker UI.
- 3 identical background and border-color warnings: distinguish deliberate fill from real contrast defects.
- 1 `@property` error: validator-profile limitation must not break typed radar animation.

Maintain P0.1 as an unpublished feature branch until full QA passes.
