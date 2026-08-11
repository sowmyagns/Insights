import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";

const inputBase =
  "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-2.5 text-sm placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all";

export function SearchBar({ value, onChange, placeholder = "Search...", onClear }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex-1 min-w-[200px] max-w-sm">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t("common.search")}
        className={`${inputBase} !pl-10 !pr-10`}
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(""); onClear?.(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function FilterSelect({ label, value, options, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
      )}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={`${inputBase} py-2 min-w-[120px]`}
      >
        <option value="">{placeholder ?? "All"}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SearchFilter({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchKeys,
  filters = [],
  filterValues,
  onFilterChange,
  resultCount,
  children,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchBar
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />
      {filters.map((f) => (
        <FilterSelect
          key={f.key}
          label={f.label}
          value={filterValues?.[f.key]}
          options={f.options}
          onChange={(v) => onFilterChange?.(f.key, v)}
          placeholder={f.placeholder}
        />
      ))}
      {resultCount != null && (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {resultCount} results
        </span>
      )}
      {children}
    </div>
  );
}
