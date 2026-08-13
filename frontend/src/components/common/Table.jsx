import { useState } from "react";

function StatusBadge({ status }) {
  const val = typeof status === "object" && status !== null ? (status.label || status.id || status.name || "—") : (status || "—");
  const styles = {
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    running: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    planned: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300",
    pending: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
    maintenance: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    down: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    stopped: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    idle: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
    cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  };
  const style = styles[val] || "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {val}
    </span>
  );
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
      const cmp = aVal == null && bVal == null ? 0 : (aVal ?? "") < (bVal ?? "") ? -1 : (aVal ?? "") > (bVal ?? "") ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  return (
    <div className="ui-table-wrap overflow-x-auto print:overflow-visible print:rounded-none print:border-none print:shadow-none">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--color-border-soft)] bg-[var(--color-surface-thead)] text-[12px] font-medium text-[var(--color-text-muted)]">
            {columns.map((col) => {
              const isActionsCol = col.key === "actions" || col.printHidden;
              return (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium ${
                    isActionsCol ? "print:hidden" : ""
                  } ${
                    sortable && col.sortable !== false ? "cursor-pointer select-none hover:bg-[var(--color-surface-hover)]" : ""
                  }`}
                  onClick={() => (col.sortable !== false && sortable) && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              className="border-b border-[#f0f0f4] text-[var(--color-text)] last:border-b-0 hover:bg-[#fafafa] transition-colors"
            >
              {columns.map((col) => {
                const isActionsCol = col.key === "actions" || col.printHidden;
                return (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 text-[13px] ${
                      isActionsCol ? "print:hidden" : ""
                    }`}
                  >
                    {col.render
                      ? col.render(row)
                      : col.statusBadge
                      ? <StatusBadge status={row[col.key]} />
                      : typeof row[col.key] === "object" && row[col.key] !== null
                      ? (row[col.key].label || row[col.key].name || row[col.key].title || row[col.key].id || JSON.stringify(row[col.key]))
                      : (row[col.key] ?? "—")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {sortedData.length === 0 && (
        <div className="ui-empty">
          {emptyState || (
            <p>No data available</p>
          )}
        </div>
      )}
    </div>
  );
}

export { StatusBadge };