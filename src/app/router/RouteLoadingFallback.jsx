// Match the static shell in index.html so the initial lazy-route fallback does not flash.
export function RouteLoadingFallback() {
  return (
    <main className="startup-shell" role="status" aria-label="Loading HelmSight">
      <span className="startup-brand" aria-hidden="true">Helm<span>Sight</span></span>
      <span className="startup-wait" aria-hidden="true">
        <span className="startup-spinner" aria-hidden="true" />
        Loading HelmSight…
      </span>
    </main>
  )
}
