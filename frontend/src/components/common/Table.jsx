import { useState } from "react";

function StatusBadge({ status }) {
  const val =
    typeof status === "object" && status !== null
      ? status.label || status.id || status.name || "—"
      : status || "—";

  const key = String(val).toLowerCase().replace(/\s+/g, "_");
  const toneMap = {
    completed: "success",
    running: "success",
    delivered: "success",
    approved: "success",
    active: "success",
    paid: "success",
    resolved: "success",
    in_progress: "info",
    processing: "info",
    open: "info",
    planned: "neutral",
    pending: "neutral",
    draft: "neutral",
    idle: "neutral",
    cancelled: "neutral",
    canceled: "neutral",
    inactive: "neutral",
    maintenance: "warning",
    overdue: "warning",
    warning: "warning",
    down: "danger",
    stopped: "danger",
    failed: "danger",
    rejected: "danger",
    critical: "danger",
    error: "danger",
  };
  const tone = toneMap[key] || "neutral";

  return <span className={`ui-badge ui-badge--${tone}`}>{val}</span>;
}

export default function Table({ columns, data, emptyState, sortable }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const handleSort = (key) => {
    if (!sortable || !key) return;
    const nextDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(nextDir);
  };

  const sortedData = [...data];
  if (sortKey && sortable) {
    sortedData.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp =
        aVal == null && bVal == null
          ? 0
          : (aVal ?? "") < (bVal ?? "")
            ? -1
            : (aVal ?? "") > (bVal ?? "")
              ? 1
              : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  return (
    <div className="ui-table-wrap overflow-x-auto print:overflow-visible print:rounded-none print:border-none print:shadow-none">
      <table className="w-full border-collapse text-left text-[var(--text-sm)]">
        <thead>
          <tr className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-thead)] text-[var(--text-xs)] font-medium text-[var(--color-text-muted)]">
            {columns.map((col) => {
              const isActionsCol = col.key === "actions" || col.printHidden;
              const align =
                col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
              return (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium ${align} ${
                    isActionsCol ? "print:hidden" : ""
                  } ${
                    sortable && col.sortable !== false
                      ? "cursor-pointer select-none hover:bg-[var(--color-surface-hover)]"
                      : ""
                  }`}
                  onClick={() => col.sortable !== false && sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1.5">{col.label}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              className="border-b border-[var(--color-border-muted)] text-[var(--color-text)] last:border-b-0 hover:bg-[var(--color-surface-muted)]/60 transition-colors"
            >
              {columns.map((col) => {
                const isActionsCol = col.key === "actions" || col.printHidden;
                const align =
                  col.align === "right"
                    ? "text-right tabular-nums"
                    : col.align === "center"
                      ? "text-center"
                      : "";
                return (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 text-[var(--text-sm)] ${align} ${
                      isActionsCol ? "print:hidden" : ""
                    }`}
                  >
                    {col.render
                      ? col.render(row)
                      : col.statusBadge
                        ? <StatusBadge status={row[col.key]} />
                        : typeof row[col.key] === "object" && row[col.key] !== null
                          ? row[col.key].label ||
                            row[col.key].name ||
                            row[col.key].title ||
                            row[col.key].id ||
                            JSON.stringify(row[col.key])
                          : (row[col.key] ?? "—")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {sortedData.length === 0 && (
        <div className="ui-empty">{emptyState || <p>No data available</p>}</div>
      )}
    </div>
  );
}

export { StatusBadge };
