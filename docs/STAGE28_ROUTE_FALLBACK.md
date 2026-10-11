# HelmSight — Stage 28: initial lazy-route fallback

## Symptom

On a hard refresh of a lazy route (for example, `/projects/demo-project`), Chrome Console reported:

> No `HydrateFallback` element provided to render during initial hydration

HelmSight uses `createRoot`, so this is not evidence of server-side hydration. React Router uses the same initial fallback mechanism when an initially matched route has a `lazy` module.

## Minimal change

- Define the accessible `RouteLoadingFallback` component in its own `src/app/router/RouteLoadingFallback.jsx` file to keep React Fast Refresh safe.
- Declare `HydrateFallback` only on the three top-level routes: `/`, the pathless `AppLayout` parent, and `*`.
- Preserve all nested route paths, their `lazy` imports and route layouts unchanged.
- Test the normalized `router.routes[].hydrateFallbackElement` rather than the input `HydrateFallback` property (React Router converts the component into an element). Keep `src/main.jsx` unchanged.

## Checks on the actual project

```bash
npm run lint
npm run test:run
npm run build
```

Open DevTools Console with *Preserve log* enabled and hard-refresh `/`, `/projects`, `/projects/demo-project`, and `/does-not-exist`. Verify the warning is absent. Verify navigation and Light/Dark themes. If any warning remains, capture its complete text; do not suppress `console.warn`.

No claims of a full production test are made until checks run in the user's local HelmSight checkout.
