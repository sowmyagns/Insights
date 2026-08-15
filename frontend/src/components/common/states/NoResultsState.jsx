import { SearchX } from "lucide-react";
import Button from "../Button";

/**
 * Shown when search/filters match nothing (data exists, filters empty it).
 */
export default function NoResultsState({
  query = "",
  title = "No results found",
  description,
  onClear,
  clearLabel = "Clear filters",
  className = "",
}) {
  const desc =
    description ||
    (query
      ? `Nothing matched “${query}”. Try a different keyword or remove filters.`
      : "Nothing matched your current filters. Try adjusting or clearing them.");

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 px-6 py-12 text-center ${className}`}
      role="status"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
        <SearchX className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-4 text-[var(--text-base)] font-semibold text-[var(--color-text)]">{title}</h3>
      <p className="mt-1 max-w-sm text-[var(--text-md)] text-[var(--color-text-muted)]">{desc}</p>
      {onClear ? (
        <Button type="button" variant="secondary" onClick={onClear} className="mt-5">
          {clearLabel}
        </Button>
      ) : null}
    </div>
  );
}
