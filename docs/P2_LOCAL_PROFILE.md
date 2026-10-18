# P2-B — Local Profile, Settings & Personalized Greeting

Status: Merged into `main` via PR #6 (`6509f41`); production smoke test accepted on 2026-10-14. Repository-wide HTML Nu validation later completed (47/47 routes, 0 errors, 0 warnings; PR #23). Strict CSS 0/0 and comprehensive accessibility certification are not claimed.

## Contract

- Initial local demo profile: `Andrii Dolzhenko`, `Project Manager`, initials `AD`. No photo is preloaded.
- `firstName` is required for user edits (1–60 Unicode characters). `lastName` is optional (0–60). `role` is required (2–60). Inputs are whitespace-normalized before persistence.
- The portfolio greeting uses `firstName` only. Legacy stored `displayName` values are read and migrated without a destructive storage reset. An old blank name still renders the generic greeting, but cannot be newly saved as blank.
- Avatar uses a stored photo or the first character of first and last name; when there is no name, it shows `PM`. A single clipped avatar with a solid border avoids separately rasterized shadow rings and bright halos. The photo format and 5 MB upload limit are presented on separate hint lines.
- Optional uploads accept JPG, PNG or WebP up to 5 MiB. The photo editor previews the centered crop; drag and three sliders permit manual positioning and zoom. A 512×512 processed WebP or JPEG data URL (maximum 450,000 characters) is saved with the profile form; photo removal persists immediately without submitting unsaved text edits.
- Data remains in `helmsight:p0:v1:profile` through `storageAdapter` and Redux thunk; no new dependency, backend, session, password or other credential storage is added.
- Profile route: `/settings`, opened from the desktop avatar menu or the mobile drawer profile summary. Sidebar navigation stays project-oriented. Desktop header hosts the theme control and avatar menu, without a redundant settings gear. At <=780px, only the brand and hamburger stay in the header; theme, one profile entry and Exit workspace live in the drawer. In the app, clicking the brand returns to `/projects`; `Exit workspace` goes to `/` without claiming to end a real session or clearing stored data. Account security remains unavailable until authentication is integrated.

## Acceptance checks

- Save first name, optional last name and role; reload and verify persistence, greeting, initials, header profile and restored inputs.
- Verify required-name and role validation, Unicode, maximum lengths, storage quota/unavailable errors and unchanged old data after a rejected save.
- Verify legacy `displayName` migration and generic greeting for empty legacy profile.
- Try JPG, PNG, WebP; reject wrong MIME, zero-length and >5 MiB input, verify 512px output, crop drag, sliders, Cancel, Escape, Remove, persistent photo and initials fallback.
- Verify Projects navigation, header brand return to portfolio, mobile drawer controls, avatar menu keyboard and outside dismissal, Exit workspace landing navigation without storage deletion, direct `/settings` route and photo dialog focus. Verify removing a photo survives refresh even without Save profile and does not submit unsaved names.
- Verify Light/Dark/System, narrow viewports, responsive layout, keyboard navigation and reduced motion.
- Run ESLint, Vitest, Vite build, Node tooling tests, and appropriate production CSS validation. No existing W3C warning debt is represented as resolved.

## Local QA and release evidence — 2026-10-13

- **Automated:** `npm run check` passed on macOS: ESLint without errors/warnings; Vitest **228/228 tests, 55 test files**; Vite production build **185 modules transformed**. The focused AppLayout/SettingsPage suite also passed **12/12** after the navigation cleanup.
- **Regressions covered:** first-name greeting and legacy profile migration, persisted profile fields, photo removal immediately without saving in-progress name/role edits (including after reload), router/mobile navigation, and theme control keyboard interaction.
- **Manual visual review:** user-recorded Desktop Light/Dark profile flows, avatar border and hover/open trigger, profile form, and menu placement were reviewed and accepted. A complete cross-browser, all-breakpoint, screen-reader and reduced-motion audit has **not** been established by these recordings.
- **Production CSS, forced W3C `css3svg`:** 28/28 assets verified, 0 errors, 0 unverified/pending. Normal (`warning=1`): **18/28 raw 0/0**, **76 warnings** affecting 10 chunks. Extended (`warning=2`): **0/28 raw 0/0**, **2,918 warnings** affecting all 28 chunks. No diagnostic suppression or warning-level reduction was used.
- **Normal warnings:** 43 notices that dynamic CSS custom properties cannot be checked statically, 18 vendor-prefixed mask advisories, and 15 WebKit multiline-clamp advisories. These are classified by type, not proven harmless in every browser/state. Extended warnings primarily concern CSS cascade redefinitions and color/background pair checks; they are not equivalent to 2,918 application defects.
- **Gate interpretation:** CSS error gate **PASS for this local build**; strict CSS 0/0 **NOT MET**; ADR-042 formal warning adjudication/sign-off **OPEN**. Refer to [`W3C_BATCH_AUDIT.md`](W3C_BATCH_AUDIT.md) and [`CSS_VALIDATION_POLICY.md`](CSS_VALIDATION_POLICY.md).
- **Release follow-up:** the feature was merged via PR #6 and verified in production. Earlier local QA results remain historical evidence, not a claim that every check was rerun after merge. Full cross-browser/accessibility QA and outstanding validation sign-off remain open.

## Post-merge production evidence — 2026-10-14

- Pull request: [#6](https://github.com/andrii-dolzhenko/helmsight/pull/6), merged into `main`.
- Merge commit: `6509f41`.
- Production route: https://helmsight.vercel.app/settings.
- Production smoke test: confirmed by the project owner on 2026-10-14.
- The 228-test result and W3C CSS counts above belong to the earlier local QA snapshot; no new complete test run or independent CI audit is claimed here.
- Strict raw W3C CSS 0/0 and ADR-042 formal sign-off remain open.
- The 2026-10-14 production smoke test alone did not establish formal rendered HTML validation or comprehensive accessibility/cross-browser coverage. Formal HTML Nu validation was subsequently completed repository-wide in PR #23; comprehensive accessibility/cross-browser certification is not claimed.

## Architecture and navigation notes

- Profile data belongs to the existing `features/profile` service and Redux slice; UI is in the profile feature plus `/settings` page. It uses the versioned browser storage adapter, **not** a backend account or permissions model.
- `Profile & Settings` is deliberately reached via the desktop avatar popover or the mobile drawer profile summary. There is no duplicated settings gear or extra mobile Settings link. The mobile drawer contains the theme selection, profile entry and `Exit workspace` action.
- The application logo returns to `/projects`; `Exit workspace` navigates to `/` without deleting local data or making a logout/security claim.
- Photo uploads are edited in the client before saving; `Remove photo` persists at once, while typed but unsaved profile details remain unchanged in storage.
