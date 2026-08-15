import { getSerialNumber } from "../../utils/serialNumber";

/** Compact S.No. header for raw HTML tables */
export function SerialNumberHeader({ className = "" }) {
  return (
    <th
      className={`w-12 min-w-[3rem] px-2 py-3 text-center text-[var(--text-xs)] font-medium text-[var(--color-text-muted)] ${className}`}
    >
      S.No.
    </th>
  );
}

/** Compact S.No. cell for raw HTML tables */
export function SerialNumberCell({
  rowIndex,
  page = 1,
  pageSize = 10,
  serialOffset,
  className = "",
}) {
  return (
    <td
      className={`ui-num w-12 min-w-[3rem] px-2 py-3 text-center text-[var(--text-sm)] text-[var(--color-text-muted)] ${className}`}
    >
      {getSerialNumber(rowIndex, { page, pageSize, serialOffset })}
    </td>
  );
}
