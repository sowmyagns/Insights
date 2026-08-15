import { ChevronLeft, ChevronRight, Search } from "lucide-react";

export { default as Loader } from "../common/Loader";

/** Ledger-derived design tokens for the Accounting module */
export const ACCOUNTS_PAGE_BG = "#EEF5F9";
export const ACCOUNTS_PURPLE = "#6C4CFF";
export const ACCOUNTS_BLUE = "#0B74D1";
export const ACCOUNTS_TEAL = "#0f6d84";
export const ACCOUNTS_TEXT = "#17264A";
export const ACCOUNTS_TEXT_MUTED = "#64748B";
export const ACCOUNTS_BORDER = "#E2E8F0";
export const ACCOUNTS_TABLE_HEADER = "#F2F0FF";
export const ACCOUNTS_TABLE_HEADER_ALT = "#F8FAFC";
export const ACCOUNTS_PAGE_SIZES = [10, 20, 50];

export function formatAccountsInr(value) {
  const n = Number(value) || 0;
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function accountsPageNumberItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = [1];
  if (current > 3) items.push("ellipsis-start");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p += 1) items.push(p);
  if (current < total - 2) items.push("ellipsis-end");
  if (total > 1) items.push(total);
  return items;
}

export function AccountsPageShell({ children, className = "" }) {
  return (
    <div className={`min-h-full px-4 py-4 sm:px-6 sm:py-5 ${className}`} style={{ background: ACCOUNTS_PAGE_BG }}>
      {children}
    </div>
  );
}

export function AccountsCard({ children, className = "" }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function AccountsTabs({ tabs, active, onChange }) {
  return (
    <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
      <div className="flex overflow-x-auto">
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`relative shrink-0 whitespace-nowrap border-r border-[#E2E8F0] px-4 py-3.5 text-[13px] font-semibold transition-colors last:border-r-0 sm:px-5 ${
                isActive
                  ? "bg-white text-[#6C4CFF] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-[#6C4CFF]"
                  : "bg-[#F8FAFC] text-[#64748B] hover:bg-white hover:text-[#17264A]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AccountsKpiCard({ label, value, sub, icon: Icon, tint, iconColor, valueColor = ACCOUNTS_TEXT }) {
  return (
    <div
      className="flex min-h-[100px] items-center gap-3.5 rounded-xl border border-[#E2E8F0]/50 p-4 shadow-sm"
      style={{ backgroundColor: tint }}
    >
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/70 shadow-sm"
        style={{ color: iconColor }}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[#64748B]">{label}</p>
        <p className="truncate text-[22px] font-bold leading-tight" style={{ color: valueColor }}>
          {value}
        </p>
        {sub ? <p className="mt-0.5 text-[12px] text-[#64748B]">{sub}</p> : null}
      </div>
    </div>
  );
}

export function accountsKpiEntry(label, value, sub, icon, tint, iconColor, valueColor = ACCOUNTS_TEXT) {
  return { label, value, sub, icon, tint, iconColor, valueColor };
}

export function AccountsSearchInput({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={`relative w-full max-w-xl ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-full border border-[#E2E8F0] bg-white py-2.5 pl-10 pr-4 text-[14px] text-[#17264A] placeholder:text-[#94A3B8] focus:border-[#6C4CFF] focus:outline-none focus:ring-2 focus:ring-[#6C4CFF]/20"
      />
    </div>
  );
}

export function AccountsPagination({ page, pageSize, total, onPage, onPageSize, pageSizes = ACCOUNTS_PAGE_SIZES }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] px-1 pt-4 text-[13px] text-[#64748B]">
      <div className="flex flex-wrap items-center gap-2">
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="rounded-md border border-[#E2E8F0] bg-white px-2 py-1.5 text-[13px] text-[#17264A] outline-none focus:border-[#6C4CFF] focus:ring-2 focus:ring-[#6C4CFF]/20"
        >
          {pageSizes.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="font-medium text-[#17264A]">
          {total === 0 ? "0-0 of 0" : `${from}-${to} of ${total}`}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
          className="grid h-8 w-8 place-items-center rounded-md border border-[#E2E8F0] bg-white disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {accountsPageNumberItems(page, totalPages).map((item) =>
          typeof item === "string" ? (
            <span key={item} className="px-1 text-xs text-[#64748B]">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPage(item)}
              className={`grid h-8 min-w-8 place-items-center rounded-md border px-2 text-[13px] font-semibold ${
                item === page
                  ? "border-[#6C4CFF] bg-[#6C4CFF] text-white"
                  : "border-[#E2E8F0] bg-white text-[#17264A] hover:bg-[#F8FAFC]"
              }`}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          className="grid h-8 w-8 place-items-center rounded-md border border-[#E2E8F0] bg-white disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const btnBase =
  "inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function AccountsPrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`${btnBase} bg-[#6C4CFF] text-white hover:bg-[#5a3fe0] focus-visible:outline-[#6C4CFF] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function AccountsBlueButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`${btnBase} text-white hover:opacity-90 focus-visible:outline-[#0B74D1] ${className}`}
      style={{ backgroundColor: ACCOUNTS_BLUE }}
      {...props}
    >
      {children}
    </button>
  );
}

export function AccountsOutlineButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`${btnBase} border border-[#0B74D1] bg-white text-[#0B74D1] hover:bg-[#EEF6FF] focus-visible:outline-[#0B74D1] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function AccountsSecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`${btnBase} border border-[#E2E8F0] bg-white text-[#17264A] hover:bg-[#F8FAFC] focus-visible:outline-[#64748B] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export const accountsTableHeadClass = "bg-[#F2F0FF] text-[12px] font-semibold text-[#17264A]";
export const accountsTableHeadAltClass = "bg-[#F8FAFC] text-[12px] font-semibold text-[#64748B]";
export const accountsTableWrapClass = "overflow-x-auto rounded-xl border border-[#E2E8F0]";
export const accountsTableClass = "min-w-full w-full border-collapse text-left text-[13px]";
export const accountsThClass = "border-b border-[#E2E8F0] px-4 py-3";
export const accountsTdClass = "border-b border-[#E2E8F0] px-4 py-3.5";

export { default as AccountsLoader } from "../common/Loader";
