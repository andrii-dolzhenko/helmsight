# HelmSight — GitHub Pages backup and PR delivery

## Deployments

| Target | Public URL | Source | Vite base |
| --- | --- | --- | --- |
| Primary (Vercel) | https://helmsight.vercel.app/ | `main` | `/` |
| Backup (GitHub Pages) | https://andrii-dolzhenko.github.io/helmsight/ | `main` | `/helmsight/` |

Do not change the default Vite base to `/helmsight/`. The GitHub Actions build passes `--base=/helmsight/` only for Pages. React Router's `basename: import.meta.env.BASE_URL` matches each deployment automatically.

## Enable GitHub Pages once

Open **Repository → Settings → Pages → Build and deployment → Source → GitHub Actions**. Make sure the repository is eligible for GitHub Pages. GitHub Actions must also be enabled for the repository. A workflow in `.github/workflows/pages.yml` executes automated checks for pull requests but only deploys after a merge/push to `main`, or a manual run from `main`.

A first deployment may not happen until the Pages source is configured. Check **Actions → HelmSight GitHub Pages** and **Settings → Pages** for the deployed URL.

## Pull request workflow

1. Start from a clean and updated `main`.
2. Create `feature/github-pages-backup`.
3. Apply the narrowly scoped patch. Run all checks and the Pages production build locally.
4. Commit and push the feature branch.
5. Open a pull request **authored by `andrii-dolzhenko`**, targeted to `main`. Review the GitHub Actions checks.
6. Merge into `main`; never force-push to `main`.
7. Confirm a successful **deploy** job and test the backup demo.

PRs are valuable review records, but **Pull Shark** achievement eligibility is controlled by GitHub, and merges to your own repository may not count. For reliable badge progression, also make genuine contributions to other people's projects; never create meaningless PRs just for a badge.

## Local quality checks

```bash
npm run check
node --test scripts/*.test.mjs
npm run build -- --base=/helmsight/
grep -n '/helmsight/assets/' dist/index.html
```

The Pages workflow performs ESLint, Vitest and standalone Node tests without calling the external W3C service. This does **not** waive the phase CSS Quality Gate in `docs/CSS_VALIDATION_POLICY.md`.

## SPA routes and limitations

GitHub Pages does not support server-side SPA rewrites for repository project sites. The workflow copies the built `index.html` to `404.html`, which renders the React app when a deep link is requested directly. GitHub Pages may still return HTTP **404** for that path; use the Vercel URL as the canonical demo when HTTP 200 responses are important.

Check the home page, `/helmsight/projects`, a project detail route, internal navigation, hard refresh of nested routes, Light/Dark modes, radar visuals and Chrome Console. Routes can be exercised with the seeded demo project.

The app persists data in browser `localStorage` and cannot synchronize user data between `helmsight.vercel.app` and `andrii-dolzhenko.github.io`. GitHub Pages is a **deployment backup**, not a live-data backup.
