import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Bell,
  Boxes,
  CheckCircle2,
  Factory,
  FolderOpen,
  Landmark,
  Layers,
  LayoutDashboard,
  Search,
  SearchX,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { userCanAccessPath } from "../../config/permissions";
import { flattenNavForSearch } from "../../config/sidebarNav";

const EXTRA_ROUTES = [
  { path: "/manufacturing/workflow", labelKey: "erpNav.roleWorkflow", module: "dashboard", sectionKey: null },
  { path: "/alerts", labelKey: "nav.allAlerts", module: "alerts", sectionKey: null },
  {
    path: "/production/reports",
    labelKey: "nav.dailyProductionReports",
    module: "production",
    sectionKey: "erpNav.production",
  },
  { path: "/settings", labelKey: "erpNav.settings", module: "admin", sectionKey: null },
  { path: "/settings/appearance", label: "Appearance", module: "settings", sectionKey: "erpNav.settings" },
];

const MODULE_META = {
  dashboard: { label: "Dashboard", Icon: LayoutDashboard },
  production: { label: "Production", Icon: Factory },
  factoryMonitor: { label: "Factory Monitor", Icon: Factory },
  inventory: { label: "Inventory", Icon: Boxes },
  procurement: { label: "Procurement", Icon: ShoppingCart },
  purchases: { label: "Purchases", Icon: ShoppingCart },
  sales: { label: "Sales", Icon: Wallet },
  hr: { label: "HR", Icon: Users },
  attendance: { label: "Attendance", Icon: Users },
  quality: { label: "Quality", Icon: CheckCircle2 },
  maintenance: { label: "Maintenance", Icon: Wrench },
  alerts: { label: "Alerts", Icon: Bell },
  documents: { label: "Documents", Icon: FolderOpen },
  analytics: { label: "Analytics", Icon: BarChart3 },
  finance: { label: "Finance", Icon: Landmark },
  accounts: { label: "Accounts", Icon: Landmark },
  admin: { label: "Administration", Icon: Settings },
  settings: { label: "Settings", Icon: Settings },
  masters: { label: "Masters", Icon: Layers },
};

function looksLikeTranslationKey(value) {
  return typeof value === "string" && /^[a-z][\w-]*(\.[\w-]+)+$/i.test(value.trim());
}

function humanizeToken(value = "") {
  const token = String(value)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  if (!token) return "";
  return token
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function safeTranslate(t, key) {
  if (!key || typeof key !== "string") return "";
  const translated = t(key);
  if (!translated || translated === key || looksLikeTranslationKey(translated)) return "";
  return translated;
}

function routeLabel(route, t) {
  const translated = safeTranslate(t, route.labelKey);
  if (translated) return translated;
  if (route.label && !looksLikeTranslationKey(route.label)) return route.label;
  if (route.labelKey) return humanizeToken(route.labelKey.split(".").pop());
  if (route.path === "/") return "Dashboard";
  return humanizeToken(route.path.split("/").filter(Boolean).pop());
}

function routeSectionLabel(route, t) {
  if (!route?.sectionKey) return "";
  const translated = safeTranslate(t, route.sectionKey);
  if (translated) return translated;
  if (!looksLikeTranslationKey(route.sectionKey)) return route.sectionKey;
  return humanizeToken(route.sectionKey.split(".").pop());
}

function moduleLabel(module) {
  if (!module) return "General";
  return humanizeToken(String(module));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightText({ text, query }) {
  const q = query.trim();
  if (!q) return <span className="truncate">{text}</span>;
  const parts = String(text).split(new RegExp(`(${escapeRegExp(q)})`, "ig"));
  return (
    <span className="truncate">
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={`${part}-${i}`} className="rounded bg-teal-100 px-0.5 text-inherit dark:bg-teal-900/50">
            {part}
          </mark>
        ) : (
          <span key={`${part}-${i}`}>{part}</span>
        )
      )}
    </span>
  );
}

export default function GlobalSearch({ onSelect, placeholderKey = "common.searchMenuReports" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const routes = useMemo(() => {
    const all = [...flattenNavForSearch(), ...EXTRA_ROUTES];
    const seen = new Set();
    return all
      .filter((r) => {
        if (!r?.path || seen.has(r.path) || !userCanAccessPath(user, r.path)) return false;
        const label = routeLabel(r, t);
        if (!label || looksLikeTranslationKey(label)) return false;
        seen.add(r.path);
        return true;
      })
      .map((r) => {
        const meta = MODULE_META[r.module] || {};
        return {
          ...r,
          label: routeLabel(r, t),
          parentLabel: routeSectionLabel(r, t),
          moduleLabel: meta.label || moduleLabel(r.module),
          Icon: meta.Icon || Search,
        };
      });
  }, [user, t]);

  const matches = useMemo(() => {
    if (!query.trim()) return routes.slice(0, 8);
    const q = query.toLowerCase();
    return routes
      .filter((r) => {
        const section = r.parentLabel && r.parentLabel !== r.label ? r.parentLabel : "";
        const haystack = [r.label, r.moduleLabel, section, r.path].join(" ").toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 12);
  }, [query, routes]);

  const showDropdown = open && (focus || query);
  const hasQuery = Boolean(query.trim());

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!showDropdown || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, showDropdown]);

  const handleSelect = useCallback(
    (path) => {
      navigate(path);
      setQuery("");
      setOpen(false);
      setFocus(false);
      onSelect?.();
    },
    [navigate, onSelect]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      const isModK = (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K");
      if (isModK) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        setFocus(true);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
      if (!showDropdown || matches.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % matches.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + matches.length) % matches.length);
      }
      if (e.key === "Enter" && matches[highlight]) {
        e.preventDefault();
        handleSelect(matches[highlight].path);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showDropdown, matches, highlight, handleSelect]);

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        placeholder={t(placeholderKey)}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setFocus(true);
        }}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-teal-500 dark:focus:bg-slate-900"
        aria-label={t("common.search")}
        aria-expanded={showDropdown}
        aria-controls="global-search-results"
        aria-activedescendant={
          showDropdown && matches[highlight] ? `global-search-option-${highlight}` : undefined
        }
        role="combobox"
        autoComplete="off"
      />
      {showDropdown && (
        <div
          id="global-search-results"
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:min-w-[22rem]"
        >
          {!hasQuery ? (
            <p className="border-b border-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Suggested pages
            </p>
          ) : null}

          {matches.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-8 text-center" role="status">
              <SearchX className="mb-2 h-8 w-8 text-slate-300" aria-hidden />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No matching pages found.</p>
            </div>
          ) : (
            matches.map((r, i) => {
              const selected = i === highlight;
              const section = r.parentLabel && r.parentLabel !== r.label ? r.parentLabel : "";
              const Icon = r.Icon || Search;
              return (
                <button
                  key={r.path}
                  id={`global-search-option-${i}`}
                  data-index={i}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  title={r.label}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(r.path)}
                  className={`flex h-14 w-full items-center gap-3 border-b border-slate-100 px-4 text-left transition-colors last:border-b-0 ${
                    selected
                      ? "bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
                      : "text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      <HighlightText text={r.label} query={query} />
                    </span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      <HighlightText
                        text={section ? `${r.moduleLabel}  ·  ${section}` : r.moduleLabel}
                        query={query}
                      />
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
