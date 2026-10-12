# HelmSight — P0.1 follow-up: Attention queue scroll freeze

Status: **ACCEPTED for observed scroll-freeze fix** after browser and automated QA on 2026-10-12. The separate Management Actions hash-marker QA remains open before merge.

## Reported symptom

In the 2026-10-12 09:07 screen recording, attention-queue links sometimes opened an item
at a scroll offset that the user could not undo using normal upward scrolling.
The problem was inconsistent across Actions, Risks, and Milestones, and navigating
back to Projects could clear it. This is not simply the separate `:target` highlight issue.

## Cause and reproduction

- `src/layouts/AppLayout/AppLayout.module.css`: `.main` used `overflow: hidden` to crop
  decorative overscan from `.main::before` (`inset: -40rem`).
- `src/shared/hooks/useHashTarget.js` calls `element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' })`
  after an attention-queue navigation.
- `overflow: hidden` **still creates a programmatically scrollable container**. The
  40rem decorative overscan makes `.main.scrollHeight` exceed its visible height.
  `scrollIntoView` can therefore change `.main.scrollTop` even though the user cannot
  scroll that container with the mouse wheel. Scrolling `window` back to 0 does not
  reset this nested scroll offset.
- In an isolated Chromium test using the actual AppLayout CSS from the supplied
  HelmSight source archive (viewport 1280x720, similar action target near the end):

  | Style | `.main.scrollTop` after target navigation | `.main.scrollTop` after `window.scrollTo(0,0)` |
  | --- | ---: | ---: |
  | `overflow: hidden` | 315px | 315px |
  | `overflow: clip` | 0px | 0px |

This proves the mechanism independently. The exact user's running DOM was not
instrumented at the freeze moment, so this remains a candidate fix until browser QA.

## Smallest safe fix

Replace **only** `.main { overflow: hidden; }` with `overflow: clip`.
Keep `.main::before` pattern, `inset: -40rem`, stacking, backgrounds and current
`useHashTarget` scrolling/focus logic intact.

`overflow: clip` crops decorative overflow but does not establish a scroll container;
therefore `scrollIntoView` scrolls the actual document instead of hidden `.main`.
This is supported by the CSS targets currently in `vite.config.js`:
Chrome/Edge 111, Firefox 114, Safari/iOS 18. It must be smoke-tested for visible
clipping, keyboard focus and responsive content. Never use `overflow: visible` here:
that would allow the oversized decorative layer to bleed into surrounding layout.

Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow

## Regression protection

`scripts/app-main-scroll.test.mjs` asserts the layout main is not a hidden scroll
container while preserving the decorative pseudo-element. This is a source guard;
the browser QA below remains essential and is not replaced by the Node test.

## Acceptance criteria

1. `git diff --check`, `npm run check`, `node --test scripts/*.test.mjs`,
   `node scripts/w3c-radar-production-check.mjs` all pass.
2. Full production W3C forced audit verifies 26/26 CSS assets with **0 Errors**;
   last verified baseline was 39 Warnings. Report any new warnings honestly.
3. Starting at Atlas Modernization → Overview → Attention queue, activate multiple
   distinct links to Actions, Risks, Milestones and other items. After each navigation,
   scroll **up to the project heading** and back down using mouse wheel/trackpad.
   Switch between destination and Overview without going to Projects.
4. During navigation, `document.querySelector('[data-app-main]')?.scrollTop` remains `0`.
   Test also on direct link reload, Light/Dark and narrow viewport, if possible.
5. Ensure the background pattern is cropped, interactive controls and focused
   elements are not cut off, and there is no new horizontal scrolling.
6. Do not consider Stage 43 hash-marker validation automatically resolved by
   this scroll fix; verify separately.

## Console diagnostics during QA

```js
const main = document.querySelector('[data-app-main]');
console.table({
  route: location.pathname + location.hash,
  documentScrollY: window.scrollY,
  mainOverflow: main ? getComputedStyle(main).overflow : 'not found',
  mainScrollTop: main?.scrollTop ?? 'N/A',
  mainClientHeight: main?.clientHeight ?? 'N/A',
  mainScrollHeight: main?.scrollHeight ?? 'N/A',
});
```

Desired: `mainOverflow: 'clip'` and `mainScrollTop: 0`. Browser scroll position
`documentScrollY` changes normally as the user scrolls.

## Rollback

Before further overlapping edits, `git apply --reverse --check <patch>` and then
`git apply --reverse <patch>`. Keep the existing P0.1 changes untouched.

## Acceptance evidence — 2026-10-12

Two user Chrome recordings (`09.22.32.mov` and `09.23.55.mov`) show repeated navigation with no trapped scroll and a console snapshot with `mainOverflow: clip`, `mainScrollTop: 0`. A subsequent complete user terminal run confirms **126/126 Vitest**, **74/74 Node tests** (including `app main clips its background without becoming a hidden scroll container`), clean lint/build, radar guard PASS, `git diff --check` PASS, and W3C Normal full forced **26/26 checked, 0 Errors / 39 Warnings, 0 unverified/pending**. This is a pass for tested scenarios, not proof of every legacy browser or route. The separate `data-hash-target` fallback in Actions List view remains open.
