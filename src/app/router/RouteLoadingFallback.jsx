// Initial loading UI for direct visits to lazy routes.
export function RouteLoadingFallback() {
  return (
    <div role="status" aria-live="polite">
      Loading HelmSight…
    </div>
  )
}
