# HelmSight — Stage 43 follow-up: SPA hash-target highlight synchronization

Status: **AUTOMATED CHECKS PASSED / DEEP-LINK BROWSER QA PASS; SPA-LINK QA OPEN**. This is an independent navigation QA follow-up to the Stage 43 Actions target-shadow optimization. No other stage is reverted.

## Reproduced symptom (user's Chrome recordings)

- A URL containing `#action-...` was sometimes shown while `document.getElementById(...)` returned an existing element but `element.matches(':target')` was `false` and `document.querySelector(':target')` was empty.
- Resetting and restoring `location.hash` immediately yielded `:target === true` without an app reload. This establishes a discrepancy between the URL fragment and browser-native target selection; the exact underlying router/browser timing cause is **not independently proven**.
- The earlier Stage 43 CSS optimization did not change routes, IDs, or the `:target` selector: the discrepancy is independently visible when the browser has not established the target.

## Source-level investigation

- `ProjectOverviewPage.getDashboardTarget` generates a pathname/hash and navigation state `focusTargetId` for attention queue links.
- `useHashTarget` already scrolls to and focuses the element using `document.getElementById`, including a MutationObserver for delayed rendering. Scroll/focus does **not** force the browser to update CSS `:target`.
- `ActionsPage` renders two mutually exclusive forms for each action (`.card`, `.listRow`) and originally styled them only using `.card:target, .listRow:target`. Swapping Grid/List replaces these DOM elements while the URL fragment stays unchanged.

## Minimal non-destructive fix

1. `useHashTarget(readyKey)` **also returns** its existing resolved `targetId` (`location.state.focusTargetId` with fallback to `location.hash`). Its existing scroll/focus logic and timing remain untouched.
2. `ActionsPage` passes the returned ID to card and list renderers. Only the element whose actual `id` equals the target ID receives `data-hash-target="true"`.
3. Extend **the existing CSS declarations**, without adding new color values, to `.card[data-hash-target='true']` and `.listRow[data-hash-target='true']` while keeping native `:target` selectors for ordinary fragment navigation.
4. Keep URL and history unchanged. Do **not** fake a hash reset and do not change Redux, archive/delete logic, action IDs or dashboard links.
5. Extend hook tests to verify that state-only navigation marks the target, and a Grid/List element replacement retains its target attribute.

The new `data-hash-target` attribute is a **style hook**, not an ARIA announcement. It preserves existing programmatic focus and tab-index semantics. It also works if native `:target` is false when the route renders.

## Acceptance criteria (pending user run)

- `npm run check` passes and Vitest increases from 124 to **126**.
- `node --test scripts/*.test.mjs` retains **69/69**.
- `node scripts/w3c-radar-production-check.mjs` passes.
- Forced production W3C audit confirms 26/26 verified and does not introduce additional errors or warnings; expected baseline remains **1 Error / 39 Warnings**, not W3C 0/0.
- Browser QA: Overview attention link into an actual management action, manual `#action-...` URL, direct reload, Grid/List switch, Light/Dark, and responsive mobile/desktop. For the targeted item, `document.querySelector('[data-hash-target="true"]')?.id` equals decoded URL hash; computed target halo/border is visible *without* a hash reset.
- Navigation regression: no unnecessary history entries, no new scroll jumps on Grid/List switching, and no highlighting of non-target actions.

## Useful devtools check

```js
const id = decodeURIComponent(location.hash.slice(1));
const el = document.getElementById(id);
console.table({
  hash: location.hash,
  elementFound: !!el,
  nativeTarget: el?.matches(':target') ?? false,
  explicitMarker: el?.dataset.hashTarget ?? 'none',
  boxShadow: el ? getComputedStyle(el).boxShadow : 'N/A',
});
```

When `nativeTarget` is `false`, `explicitMarker: 'true'` and the highlighted style demonstrate that the SPA fallback works. The native selector may also become true after reload; both are valid. The fallback does not make a false native `:target` report true.

## Scope and rollback

This patch changes only: `src/shared/hooks/useHashTarget.js`, its existing RTL test, `src/pages/ActionsPage/ActionsPage.jsx`, its CSS Module, and this document. Follow the review/QA process before committing. To roll back only this patch while uncommitted: `git apply --reverse --check <patch>` and `git apply --reverse <patch>`; verify that no later overlapping edits depend on it. Do not revert the separate Stage 43 box-shadow optimization.

## Follow-up observed outcome — 2026-10-11

The user applied the follow-up and ran the full suite: 126/126 Vitest, 69/69 Node initially, then 73/73 Node after Stage 44, with zero new W3C diagnostics. However, the 19:52:09 Chrome video shows **`elementFound: true`, `nativeTarget: false`, `explicitMarker: 'none'`** for a matching hash in List view; the Grid view shows a visible highlight in the recording, but it is not sufficient proof that the React data marker is synchronized after switching. **Do not close browser acceptance based solely on passing unit tests.**

Possible causes worth diagnosing, not yet proven: manual native `location.hash` updates that do not trigger React Router's location state, or precedence of `location.state.focusTargetId` over a newer URL hash. Observe the URL, React Router history state and all `[data-hash-target="true"]` elements before changing the hook. Use the focused diagnostic in `docs/P01_RELEASE_GATE.md`. Do not create new history entries or overwrite the user-selected view just to make the screenshot pass.

**Stage 45 status (2026-10-12):** The separate `overflow: clip` scroll freeze fix was accepted after user browser QA and automated checks. It does **not** close this hash-marker issue. Before PR, a real Overview Attention queue link must produce `data-hash-target="true"` on the matching Management Action in BOTH Grid and List views, and the highlight must survive a view switch without a page refresh. A prior List-mode video showed `explicitMarker: none`; do not mark this gate PASS absent a newer browser check.

## Direct deep-link acceptance evidence — 2026-10-12, 09:37:15

A user Chrome recording reopens Atlas Modernization / Actions from an actual `#action-...` URL targeting **Publish executive reporting cadence**. The correct card has a green outline in Grid; after switching to List, the corresponding row retains its green outline without a manual `location.hash` reset. The List-view DevTools diagnostic reports `elementFound: true`, `explicitMarker: "true"`, `nativeTarget: false`, and a nonempty `boxShadow`. This **PASS** supersedes the earlier `explicitMarker: none` List-mode recording **for the direct-link and Grid/List view-switch scenario**.

**Remaining browser gate:** verify that clicking the real Overview Attention queue link (React Router SPA navigation) yields the explicit marker, and confirm the theme switch while that target is active. Do not interpret the direct-link video as proof of those unrecorded scenarios. All 126 Vitest and 74 standalone Node tests passed after the Stage 45 scroll fix; W3C forced Normal remained **0 Errors / 39 Warnings, 26/26 verified**.
