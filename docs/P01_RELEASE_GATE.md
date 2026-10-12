# HelmSight — P0.1 release gate and deployment checklist

**Document status:** LOCAL QA PARTIALLY CLEARED — Git review and deployment acceptance remain open; not an approval to merge.
**Branch:** `chore/p0-css-validation` (reported by user).
**Known remote baselines:** GitHub repository `andrii-dolzhenko/helmsight`, Vercel main demo `https://helmsight.vercel.app/`, GitHub Pages backup `https://andrii-dolzhenko.github.io/helmsight/`. Their *current* deployed commits have not been inspected for this release.

## 1. Measured local evidence, 12 October 2026

Source: user's complete final Stage 45 terminal output (2026-10-12T06:30:10.617Z W3C report), browser recordings from 09:22–09:24, and hash-target direct-link recording from 09:37:15 on 2026-10-12. W3C used profile `css3svg`, `--warning=1 --force` on actual Vite production CSS.

- **0 CSS Errors / 39 Warnings**, 26/26 verified, 18/26 literal 0/0, 8 assets with warnings, unverified 0, pending 0. No suppression, exclusion or warning-level change.
- ESLint PASS; Vite build PASS; Vitest **126/126**; Node tests **74/74**; radar production check PASS.
- Radar's JS-registered `--radar-wave-radius` uses `CSS.registerProperty()`, preserving smooth pulse on supporting browsers. Desktop Light/Dark video shows the pulse after the patch.
- The 39 W3C warnings: **18 mask-prefixed**, **15 multiline-clamp-prefixed**, **6 dynamic CSS variables**. Warnings remain genuine diagnostics, explicitly accepted for P0.1 under `DEC-P01-40-A` subject to release review. Do **not** assert W3C 0 warnings.
- **Scroll-freeze update:** Stage 45 replaced `.main { overflow: hidden }` with `overflow: clip`. User recordings show repeat navigation recovering normal scroll; browser Console verified `mainOverflow: clip`, `mainScrollTop: 0`. A new Node guard passed in the 74 tests. Accepted for tested paths.
- **Hash-target partial acceptance (2026-10-12 09:37:15):** an actual `#action-...` deep link to Atlas Modernization / Publish executive reporting cadence produces a visible green target outline in Grid and List. In List, DevTools confirms `elementFound: true`, `explicitMarker: "true"`, `nativeTarget: false`, and a nonempty accent `boxShadow`. This demonstrates the React marker fallback after a direct-link load and a view switch; it does not independently demonstrate an Attention queue SPA click or a Dark-mode switch within this recording.
- **Not verified:** whether deployed Vercel/Pages versions contain this branch; cross-browser older-version matrix; full reduced-motion QA after the JS registration patch; real Attention queue SPA click with hash marker; Git remote CI status.

## 2. Release blockers and acceptance gates

| Gate | Current status | Closure evidence needed |
| --- | --- | --- |
| Automated checks / production W3C **0 errors** | PASS in user's Stage 45 checkout | Rerun after any additional source patch |
| Radar desktop visuals Light/Dark | PASS in Stage 44 supplied video | Recheck after deployment |
| Attention queue scroll-freeze fix | PASS for tested paths (Stage 45) | Optional cross-browser smoke; ensure `.main.scrollTop` stays `0` |
| Reduced motion / responsive radar | PARTIAL | Confirm reduced-motion pulse disabled; <=1120 px disabled; optional fallback-browser QA |
| Management Actions hash highlighting in Grid and List | **PARTIAL — direct-link Light/Grid and Light/List PASS** | Real Overview Attention queue SPA click with `explicitMarker: "true"` and Dark-mode view switch remain to confirm; direct-link fallback already proven |
| Full local Git diff review | **OPEN** | Reviewed `git status`, staged paths including untracked docs, `git diff --cached`, `git diff --check`, no unrelated files/secrets |
| PR + CI | **OPEN** | PR URL, successful CI checks, reviewed diff and merge SHA |
| Deployment | **OPEN** | Vercel/Pages publish evidence and production smoke checks |

## 3. Management Actions — diagnostic without editing data

Prerequisite: use an existing project that has Management Actions. **Prefer the real Overview Attention queue link** to the action. As a separate deep-link test, directly open a full URL ending in a valid `#action-...`, then refresh once. *Do not rely only on manually assigning `location.hash` from Console*, since that can bypass the React Router navigation update being assessed.

In Actions Grid and List, with URL fragment present, run (read-only):

```js
(() => {
  const id = decodeURIComponent(location.hash.slice(1));
  const el = document.getElementById(id);
  const marked = [...document.querySelectorAll('[data-hash-target="true"]')];
  const routerFocusId = history.state?.usr?.focusTargetId ?? '';
  console.table({
    hashId: id || 'none',
    elementFound: Boolean(el),
    nativeTarget: el?.matches(':target') ?? false,
    explicitMarker: el?.dataset.hashTarget ?? 'none',
    markedElementIds: marked.map((node) => node.id).join(', ') || 'none',
    routerFocusId: routerFocusId || 'none',
    stateHashAgree: !routerFocusId || routerFocusId === id,
    borderColor: el ? getComputedStyle(el).borderColor : 'N/A',
    boxShadow: el ? getComputedStyle(el).boxShadow : 'N/A',
  });
})();
```

**PASS condition:** matching action exists and `explicitMarker === 'true'` (the native `:target` may independently be false), a visible accent halo/border appears without manually resetting the hash, and switching Grid/List/Light/Dark preserves the correct target with no unexpected scroll jumps or new history entries. If still `explicitMarker: 'none'`, collect the complete table and **fix the synchronization** before merging. A highlight in Grid caused only by native `:target` does **not** prove the React fallback works in List.

## 4. Source review before commit

```bash
cd ~/WebstormProjects/helmsight
git status -sb
git diff --check
git diff --stat
git ls-files --others --exclude-standard
git diff --name-status
```

Review that changes are restricted to documented P0.1 source/test/policy files, including Stages 37–44, the new P1 backlog document, and approved hash-target follow-up. New docs will not appear in `git diff` until staged. Before any `git add`, inspect untracked items; **do not run `git add .` blindly**.

After QA is PASS, stage the reviewed paths (replace `[reviewed paths]` with exact file names):

```bash
git add -- [reviewed paths]
git diff --cached --check
git diff --cached --stat
git diff --cached --name-status
git diff --cached  # inspect actual code, tests, documentation, and any secrets
```

If there are untracked docs, include only the files that actually exist. Do not add `dist/`, `node_modules/`, W3C cache, downloaded patches, `.env*`, or test fixture data. Do not use force-push, `git reset --hard`, or an unreviewed `git add -A`.

## 5. Commit, PR and release procedure (ONLY after Gates 2–4 PASS)

```bash
# Verify current branch and upstream before creating history.
git branch --show-current
git remote -v
git status -sb
# One reviewed commit for the accumulated P0.1 changes.
git commit -m "fix: complete P0.1 CSS error-free validation"
git push -u origin chore/p0-css-validation
```

Create a pull request **`chore/p0-css-validation` → `main`**, title: `fix: complete HelmSight P0.1 CSS validation (0 W3C errors)`. Include the exact validation profile and 39 warnings in its body, plus CI results and a link to browser QA evidence. Prefer GitHub's web interface; if GitHub CLI is installed and authenticated, `gh pr create --base main --head chore/p0-css-validation` is an alternative. Do not claim a PR exists before receiving its URL.

Require successful CI and review of the final PR diff before merging; record merge commit. Confirm any deploy triggers in `.github/workflows/` and Vercel project settings rather than assuming both deployments run automatically.

After merge, inspect **both** demo URLs in fresh sessions. Test landing/assets, portfolio, route refresh, project overview radar, themes, Grid/List, hash deep-link and console errors; confirm GitHub Pages base path and Vercel deep route. Compare deployed commit with the actual merged revision where the hosting provider exposes it. LocalStorage is origin-scoped, so data on localhost, Vercel and GitHub Pages can differ; do not treat differing projects as deploy bugs.

Record PR URL, merge SHA, CI run, Vercel deploy identifier, Pages workflow run and browser QA verdict in the release notes **after** they exist.

## 6. PR description draft

**Summary:** P0.1 CSS validation: 0 W3C CSS errors in all 26 production assets without removing radar animation.

**Changes:** font stacks, equal fill/border cleanup, native date control, safe single-line risk ellipsis, Action Register target shadow and hash synchronization, JS typed radar custom property registration with updated production guard, `.main` scroll-freeze fix using `overflow: clip`; versioned W3C evidence, P1 safe project deletion backlog.

**Validation:** `npm run check` (126/126 Vitest), standalone Node (74/74), radar production guard PASS; forced W3C `css3svg --warning=1` **0 Errors / 39 Warnings**, 26/26 assets checked, 0 unverified/pending. **Not a 0/0 W3C result.**

**Compatibility:** prefixed masks and multiline clipping intentionally retained; remaining six dynamic-variable warnings are static-analysis limitations. No intentional new browser minimum.

**Release gate:** direct-link hash QA passed in Grid/List (Light); capture a real Attention queue SPA-link check (and Dark-theme state) plus PR CI evidence before merge.
