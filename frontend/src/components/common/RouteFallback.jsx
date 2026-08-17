/**
 * Lightweight fallback while a lazy route chunk loads.
 * Keeps shell (sidebar/nav) visible – avoids full-screen spinner on every navigation.
 */
export default function RouteFallback() {
  return (
    <div
      className="ui-card ui-card--padded flex min-h-[12rem] flex-col items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"
        aria-hidden
      />
      <p className="mt-3 text-sm text-[var(--color-text-muted)]">Loading…</p>
    </div>
  );
}
