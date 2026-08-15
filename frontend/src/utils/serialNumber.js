/**
 * Display serial number for tabular rows (UI-only, not persisted).
 * serialOffset = (currentPage - 1) * rowsPerPage
 */
export function getSerialNumber(rowIndex, { page = 1, pageSize = 10, serialOffset } = {}) {
  const base =
    typeof serialOffset === "number" && Number.isFinite(serialOffset)
      ? serialOffset
      : (Math.max(1, page) - 1) * pageSize;
  return base + rowIndex + 1;
}

export function columnsIncludeSerial(columns = []) {
  return columns.some(
    (col) =>
      col?.key === "_sno" ||
      col?.key === "sno" ||
      col?.label === "S.No." ||
      col?.label === "S.No" ||
      col?.label === "#"
  );
}

export const SERIAL_COLUMN_KEY = "_sno";

export const SERIAL_COLUMN = {
  key: SERIAL_COLUMN_KEY,
  label: "S.No.",
  sortable: false,
  align: "center",
  width: "3rem",
  minWidth: "3rem",
  className: "w-12 min-w-[3rem] whitespace-nowrap",
  cellClassName: "text-[var(--color-text-muted)]",
  render: (_row, _col, rowIndex, serialOffset = 0) => serialOffset + rowIndex + 1,
};
