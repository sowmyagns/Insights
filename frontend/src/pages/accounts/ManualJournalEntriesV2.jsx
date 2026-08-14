import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight, MoreVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { nextManualJournalNumber } from "../../data/manualJournals";
import {
  deleteManualJournalOnApi,
  fetchManualJournals,
} from "../../api/manualJournalSync";
import { apiErrorMessage } from "../../utils/apiError";
import { useToast } from "../../context/ToastContext";

const PAGE_BG = "var(--color-bg)";
const PAGE_SIZES = [10, 20, 50];

function fyStartIso() {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-04-01`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatSlash(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  return `${d}/${m}/${y}`;
}

function formatInr(amount) {
  const n = Number(amount) || 0;
  return `₹ ${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Pagination({ page, pageSize, total, onPage, onPageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#6b6b76]">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="rounded-md border border-[#cfcfd6] bg-white px-2.5 py-1.5 outline-none"
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
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="grid h-8 min-w-8 place-items-center rounded-md border border-[#e0b400] px-2 text-[13px] font-semibold text-[#1a1a1f]"
          style={{ background: "#0025D4" }}
        >
          {page}
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="grid h-8 w-8 place-items-center rounded-md border border-[#cfcfd6] bg-white disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RowMenu({ entry, onEdit, onDelete, onClose }) {
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
      className="absolute right-0 top-full z-30 mt-1 min-w-[160px] rounded-lg border border-[#e4e4ea] bg-white py-1 shadow-lg"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[#3a3a42] hover:bg-[#f7f7f9]"
        onClick={() => {
          onEdit?.(entry);
          onClose?.();
        }}
      >
        <Pencil className="h-4 w-4 text-[#8b8b96]" />
        Edit
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[#c0392b] hover:bg-[#fef2f2]"
        onClick={() => {
          onDelete?.(entry);
          onClose?.();
        }}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>
  );
}

export default function ManualJournalEntriesV2() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(fyStartIso);
  const [toDate, setToDate] = useState(todayIso);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [menuId, setMenuId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchManualJournals();
        if (!cancelled) setEntries(rows);
      } catch (err) {
        if (!cancelled) {
          setEntries([]);
          addToast(apiErrorMessage(err, "Failed to load journals"), "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      const d = e.date || "";
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      if (!q) return true;
      return `${e.voucherNumber} ${e.name} ${e.narration}`.toLowerCase().includes(q);
    });
  }, [entries, search, fromDate, toDate]);

  useEffect(() => {
    setPage(1);
  }, [search, fromDate, toDate, pageSize]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const goNew = () => navigate("/accounts/journal-entries/new");

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete journal #${entry.voucherNumber}?`)) return;
    try {
      await deleteManualJournalOnApi(entry);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id && e.apiId !== entry.apiId));
      addToast("Journal entry deleted", "success");
    } catch (err) {
      addToast(apiErrorMessage(err, "Failed to delete journal"), "error");
    }
  };

  const th =
    "border-b border-r border-[#d8d8de] bg-[#f7f7f9] px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-[#5c5c66] last:border-r-0";
  const td = "border-b border-r border-[#e4e4ea] px-4 py-3.5 align-middle text-[13px] last:border-r-0";

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-[#6b6b76]" style={{ background: PAGE_BG }}>
        Loading journals…
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-[#cfcfd6] bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#cfcfd6] px-4 py-3.5 sm:px-5">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full rounded-full border border-[#cfcfd6] bg-white py-2.5 pl-10 pr-4 text-[14px] text-[#1a1a1f] placeholder:text-[#9a9aa5] focus:border-[#6b4eff] focus:outline-none"
              />
            </div>
            <label className="inline-flex items-center gap-2 rounded-full border border-[#cfcfd6] bg-white px-3 py-2 text-[13px] text-[#1a1a1f]">
              <Calendar className="h-4 w-4 text-[#6b6b76]" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[108px] border-0 bg-transparent text-[12px] outline-none"
              />
              <span className="text-[#9a9aa5]">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[108px] border-0 bg-transparent text-[12px] outline-none"
              />
            </label>
            <button
              type="button"
              onClick={goNew}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white"
              style={{ background: "#0025D4" }}
            >
              <Plus className="h-4 w-4" />
              New Journal Entry
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Journal No.</th>
                  <th className={th}>Date</th>
                  <th className={th}>Journal Entry Name</th>
                  <th className={`${th} text-right`}>Amount</th>
                  <th className={th}>Narration</th>
                  <th className={`${th} w-[72px] text-center`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="text-[14px] text-[#6b6b76]">
                        No Journal Entries available, Create new entry
                      </div>
                      <button
                        type="button"
                        onClick={goNew}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-bold text-white"
                        style={{ background: "#0025D4" }}
                      >
                        <Plus className="h-4 w-4" />
                        New Journal Entry
                      </button>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((e) => (
                    <tr key={e.id} className="hover:bg-[#fafafa]">
                      <td className={`${td} font-semibold text-[#6b4eff]`}>
                        {e.voucherNumber || "—"}
                      </td>
                      <td className={`${td} text-[#6b6b76]`}>{formatSlash(e.date)}</td>
                      <td className={`${td} font-medium text-[#1a1a1f]`}>{e.name || "—"}</td>
                      <td className={`${td} text-right tabular-nums font-medium`}>
                        {formatInr(e.debit || e.amount || 0)}
                      </td>
                      <td className={`${td} text-[#6b6b76]`}>{e.narration || "—"}</td>
                      <td className={`${td} relative text-center`}>
                        <button
                          type="button"
                          onClick={() => setMenuId((id) => (id === e.id ? null : e.id))}
                          className="inline-grid h-8 w-8 place-items-center rounded-md border border-[#e4e4ea] bg-[#f3f3f6] text-[#6b4eff] hover:bg-[#ececf0]"
                          aria-label="Actions"
                        >
                          <MoreVertical className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                        {menuId === e.id ? (
                          <RowMenu
                            entry={e}
                            onEdit={() =>
                              navigate(`/accounts/journal-entries/${e.id}/edit`)
                            }
                            onDelete={handleDelete}
                            onClose={() => setMenuId(null)}
                          />
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
    </div>
  );
}
