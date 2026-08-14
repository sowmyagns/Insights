import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, MoreVertical, Pencil, Plus, Search, User } from "lucide-react";

import CreateAccountModal from "../../components/accounts/CreateAccountModal";
import { COA_TABS } from "../../data/chartOfAccounts";
import {
  createChartAccount,
  createSubAccount,
  fetchChartOfAccounts,
  updateChartAccount,
} from "../../api/chartOfAccountsSync";
import { exportToCsv } from "../../utils/exportUtils";
import { useToast } from "../../context/ToastContext";
import { apiErrorMessage } from "../../utils/apiError";

const PAGE_BG = "var(--color-bg)";
const PAGE_SIZES = [10, 20, 50];

const SORT_OPTIONS = [
  { id: "name-asc", label: "Alphabetically (A-Z)" },
  { id: "name-desc", label: "Alphabetically (Z-A)" },
  { id: "updated-desc", label: "Last Updated Date (Newest First)" },
  { id: "updated-asc", label: "Last Updated Date (Oldest First)" },
  { id: "balance-desc", label: "Balance (High to Low)" },
  { id: "balance-asc", label: "Balance (Low to High)" },
];

function updatedTs(account) {
  if (account?.updatedAt) return new Date(account.updatedAt).getTime() || 0;
  return 0;
}

function sortAccounts(list, sortId) {
  const next = [...list];
  next.sort((a, b) => {
    switch (sortId) {
      case "name-desc":
        return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
      case "updated-desc":
        return updatedTs(b) - updatedTs(a);
      case "updated-asc":
        return updatedTs(a) - updatedTs(b);
      case "balance-desc":
        return (Number(b.balance) || 0) - (Number(a.balance) || 0);
      case "balance-asc":
        return (Number(a.balance) || 0) - (Number(b.balance) || 0);
      case "name-asc":
      default:
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
  });
  return next;
}

function SortByMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-[13px] font-medium text-[#1a1a1f] ${
          open ? "border-[#cfcfd6] bg-[#f3f3f6]" : "border-[#cfcfd6] bg-[#f3f3f6] hover:bg-[#ececf0]"
        }`}
      >
        <ArrowUpDown className="h-4 w-4 text-[#6b6b76]" />
        Sort By
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 min-w-[260px] rounded-lg border border-[#cfcfd6] bg-white py-1 shadow-lg">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={`block w-full px-4 py-2.5 text-left text-[13px] hover:bg-[#f7f7f9] ${
                value === opt.id ? "bg-[#fff8e6] font-semibold text-[#1a1a1f]" : "text-[#1a1a1f]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatBalance(amount, side) {
  const n = Number(amount) || 0;
  const formatted = n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return { text: `₹ ${formatted}`, side: side || "DR" };
}

function Pagination({ page, pageSize, total, onPage, onPageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#6b6b76]">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="rounded-md border border-[#cfcfd6] bg-white px-2.5 py-1.5 outline-none focus:border-[#6b4eff]"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span>
          {from}-{to} of {total}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="grid h-8 w-8 place-items-center rounded-md border border-[#cfcfd6] bg-white disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, idx) =>
          p === "…" ? (
            <span key={`e-${idx}`} className="px-1">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              className={`grid h-8 min-w-8 place-items-center rounded-md px-2 text-[13px] font-semibold ${
                p === page
                  ? "border border-[#e0b400] text-[#1a1a1f]"
                  : "border border-[#cfcfd6] bg-white text-[#1a1a1f] hover:bg-[#f7f7f9]"
              }`}
              style={p === page ? { background: "#0025D4" } : undefined}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="grid h-8 w-8 place-items-center rounded-md border border-[#cfcfd6] bg-white disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RowMenu({ account, onAddSub, onEdit, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-30 mt-1 min-w-[190px] rounded-lg border border-[#e4e4ea] bg-white py-1 shadow-lg"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[#3a3a42] hover:bg-[#f7f7f9]"
        onClick={() => {
          onAddSub?.(account);
          onClose?.();
        }}
      >
        <Plus className="h-4 w-4 text-[#8b8b96]" />
        Add Sub-account
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[#3a3a42] hover:bg-[#f7f7f9]"
        onClick={() => {
          onEdit?.(account);
          onClose?.();
        }}
      >
        <Pencil className="h-4 w-4 text-[#8b8b96]" />
        Edit Account
      </button>
    </div>
  );
}

export default function ChartOfAccountsV2() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [subParent, setSubParent] = useState(null);
  const [menuId, setMenuId] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const rows = await fetchChartOfAccounts();
      setAccounts(rows);
    } catch (err) {
      setAccounts([]);
      if (!isRefresh) addToast(apiErrorMessage(err, "Failed to load chart of accounts"), "error");
      if (isRefresh) throw err;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  usePageRefresh(() => load(true));

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = accounts.filter((a) => {
      if (tab !== "all" && a.type !== tab) return false;
      if (!q) return true;
      return `${a.name} ${a.type} ${a.group} ${a.description || ""}`.toLowerCase().includes(q);
    });
    return sortAccounts(list, sortBy);
  }, [accounts, tab, search, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, pageSize, sortBy]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleSave = async (payload) => {
    try {
      if (editing) {
        if (!editing.apiId) {
          addToast("Cannot update unsynced account", "error");
          return;
        }
        await updateChartAccount(editing.apiId, { ...editing, ...payload });
        addToast("Account updated", "success");
        setEditing(null);
        setModalOpen(false);
        await load();
        return;
      }

      if (payload.isSubAccount && payload.parentId) {
        await createSubAccount(payload.parentId, {
          id: payload.id,
          name: payload.name,
          balance: payload.balance || 0,
          side: payload.side || "DR",
          type: payload.type || "Asset",
        });
        addToast("Sub-account created", "success");
      } else {
        await createChartAccount({
          id: payload.id || `acc-${Date.now()}`,
          name: payload.name,
          type: payload.type,
          group: payload.group,
          balance: payload.balance || 0,
          side: payload.side || "DR",
        });
        addToast("Account created", "success");
      }
      setEditing(null);
      setSubParent(null);
      setModalOpen(false);
      await load();
    } catch (err) {
      addToast(apiErrorMessage(err, "Failed to save account"), "error");
    }
  };

  const handleExport = () => {
    const columns = [
      { key: "name", label: "Accounts" },
      { key: "type", label: "Account Type" },
      { key: "group", label: "Groups" },
      { key: "balance", label: "Balance" },
      { key: "side", label: "Side" },
      { key: "childCount", label: "Sub Accounts" },
    ];
    exportToCsv(filtered, columns, "chart-of-accounts");
    addToast("Exported CSV", "success");
  };

  const thClass =
    "border-b border-r border-[#d8d8de] bg-[#f7f7f9] px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-[#5c5c66] last:border-r-0";
  const tdClass = "border-b border-r border-[#e4e4ea] px-4 py-3.5 align-middle last:border-r-0";

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-[#6b6b76]" style={{ background: PAGE_BG }}>
        Loading chart of accounts…
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-[#cfcfd6] bg-white shadow-sm">
          {/* Tabs */}
          <div className="flex gap-0 overflow-x-auto border-b border-[#cfcfd6] bg-[#fafafa]">
            {COA_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 border-b-[3px] border-r border-[#e4e4ea] px-5 py-3 text-[14px] font-medium transition-colors last:border-r-0 ${
                  tab === t.id
                    ? "border-b-[#6b4eff] bg-white text-[#1a1a1f]"
                    : "border-b-transparent text-[#6b6b76] hover:bg-white hover:text-[#1a1a1f]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#cfcfd6] bg-white px-4 py-3.5 sm:px-5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search accounts…"
                className="w-full rounded-lg border border-[#cfcfd6] bg-white py-2.5 pl-10 pr-4 text-[14px] text-[#1a1a1f] placeholder:text-[#9a9aa5] focus:border-[#6b4eff] focus:outline-none focus:ring-2 focus:ring-[#6b4eff]/20"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setSubParent(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white"
              style={{ background: "#0025D4" }}
            >
              + Create Account
            </button>
            <SortByMenu value={sortBy} onChange={setSortBy} />
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfcfd6] bg-[#f3f3f6] px-3.5 py-2.5 text-[13px] font-medium text-[#1a1a1f] hover:bg-[#ececf0]"
            >
              <Download className="h-4 w-4 text-[#6b6b76]" />
              Export (csv)
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[14px]">
              <thead>
                <tr>
                  <th className={`${thClass} min-w-[240px]`}>Accounts</th>
                  <th className={`${thClass} min-w-[180px]`}>Account Type / Groups</th>
                  <th className={`${thClass} min-w-[140px] text-right`}>Balance</th>
                  <th className={`${thClass} w-[72px] text-center`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border-b border-[#e4e4ea] px-4 py-16 text-center text-[14px] text-[#6b6b76]">
                      No accounts found.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((a) => {
                    const bal = formatBalance(a.balance, a.side);
                    const isCr = bal.side === "CR";
                    return (
                      <tr
                        key={a.id}
                        className="cursor-pointer hover:bg-[#fafafa]"
                        onClick={() => navigate(`/accounts/chart-of-accounts/${a.id}`)}
                      >
                        <td className={tdClass}>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-[#1a1a1f]">{a.name}</span>
                            {a.custom ? (
                              <User className="h-3.5 w-3.5 shrink-0 text-[#9a9aa5]" aria-label="Custom" />
                            ) : null}
                          </div>
                          {a.childCount ? (
                            <div className="mt-0.5 text-[12px] text-[#9a9aa5]">
                              {a.childCount} accounts
                            </div>
                          ) : null}
                        </td>
                        <td className={tdClass}>
                          <div className="font-semibold text-[#1a1a1f]">{a.type}</div>
                          <div className="text-[12px] text-[#6b6b76]">{a.group}</div>
                        </td>
                        <td className={`${tdClass} text-right tabular-nums`}>
                          <span className="text-[#1a1a1f]">{bal.text}</span>{" "}
                          <span
                            className={
                              isCr ? "font-medium text-[#e11d48]" : "font-medium text-[#1a1a1f]"
                            }
                          >
                            {bal.side}
                          </span>
                        </td>
                        <td
                          className={`${tdClass} relative text-center`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setMenuId((id) => (id === a.id ? null : a.id))}
                            className="inline-grid h-8 w-8 place-items-center rounded-md border border-[#e4e4ea] bg-[#f3f3f6] text-[#6b4eff] hover:bg-[#ececf0]"
                            aria-label="Actions"
                          >
                            <MoreVertical className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          {menuId === a.id ? (
                            <RowMenu
                              account={a}
                              onAddSub={(acc) => {
                                setEditing(null);
                                setSubParent(acc);
                                setModalOpen(true);
                              }}
                              onEdit={(acc) => {
                                setSubParent(null);
                                setEditing(acc);
                                setModalOpen(true);
                              }}
                              onClose={() => setMenuId(null)}
                            />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-[#cfcfd6] bg-[#fafafa] px-4 py-3 sm:px-5">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPage={setPage}
              onPageSize={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <CreateAccountModal
        open={modalOpen}
        account={editing}
        asSubAccount={Boolean(subParent) && !editing}
        defaultParentId={subParent?.id || ""}
        parentOptions={accounts}
        preset={
          subParent && !editing
            ? { type: subParent.type, group: subParent.group }
            : null
        }
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          setSubParent(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
