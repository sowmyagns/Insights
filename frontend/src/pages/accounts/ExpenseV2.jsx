import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Search, Settings } from "lucide-react";

import AddExpenseModal from "../../components/accounts/AddExpenseModal";
import {
  categoryIcon,
  fetchExpenseCategories,
} from "../../data/expenseCategories";
import { createExpense, deleteExpense, listExpenses } from "../../api/accountsApi";
import { exportToCsv, exportToExcel, exportToPdf } from "../../utils/exportUtils";
import { useToast } from "../../context/ToastContext";
import useTenantId from "../../hooks/useTenantId";
import usePageRefresh from "../../hooks/usePageRefresh";
import { apiErrorMessage, asArray } from "../../utils/apiError";

const PAGE_BG = "var(--color-bg)";
const PAGE_SIZES = [10, 20, 50];
const ACCENT = "#f97316";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function parseExpenseMeta(description) {
  const raw = String(description || "");
  if (raw.startsWith("{")) {
    try {
      return JSON.parse(raw);
    } catch {
      /* fall through */
    }
  }
  const parts = raw.split("|||");
  if (parts.length >= 2) {
    return { payment_mode: parts[0], note: parts.slice(1).join("|||") };
  }
  return { payment_mode: "CASH", note: raw };
}

function mapApiExpense(row) {
  const meta = parseExpenseMeta(row.description);
  return {
    id: row.id,
    tag: row.category || "Other",
    category: row.category || "Other",
    category_id: String(row.category || "other").toLowerCase().replace(/\s+/g, "-"),
    date: row.expense_date ? String(row.expense_date).slice(0, 10) : "",
    spend_for: row.vendor || "—",
    payment_mode: meta.payment_mode || "CASH",
    note: meta.note || "",
    amount: Number(row.amount) || 0,
  };
}

function Pagination({ page, pageSize, total, onPage, onPageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ececf0] px-1 pt-4 text-[13px] text-[#6b6b76]">
      <div className="flex items-center gap-2">
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="rounded border border-[#e4e4ea] bg-white px-2 py-1 outline-none"
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
          className="grid h-8 w-8 place-items-center rounded border border-[#e4e4ea] bg-white disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="grid h-8 min-w-8 place-items-center rounded px-2 text-[13px] font-semibold text-[#1a1a1f]"
          style={{ background: "#0f6d84" }}
        >
          {page}
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="grid h-8 w-8 place-items-center rounded border border-[#e4e4ea] bg-white disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ExpenseV2() {
  const { addToast } = useToast();
  const tenantId = useTenantId();
  const [tab, setTab] = useState("all");
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(daysAgoIso(36));
  const [toDate, setToDate] = useState(todayIso());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [expRes, cats] = await Promise.all([
        listExpenses(tenantId),
        fetchExpenseCategories(),
      ]);


      setExpenses(asArray(expRes.data).map(mapApiExpense));
      setCategories(cats);
    } catch (err) {
      setExpenses([]);
      addToast(apiErrorMessage(err, "Failed to load expenses"), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, tenantId]);

  usePageRefresh(() => load(true));

  useEffect(() => {
    load();
  }, [load]);

  const inRange = (date) => {
    if (!date) return true;
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (!inRange(e.date)) return false;
      if (!q) return true;
      return `${e.tag} ${e.category} ${e.spend_for} ${e.payment_mode}`.toLowerCase().includes(q);
    });
  }, [expenses, search, fromDate, toDate]);

  const categoryRows = useMemo(() => {
    const map = new Map();
    filtered.forEach((e) => {
      const key = e.category_id || e.category || "other";
      const prev = map.get(key) || {
        id: key,
        category: e.category || "Other",
        tag: e.tag || e.category || "Other",
        count: 0,
        amount: 0,
      };
      prev.count += 1;
      prev.amount += Number(e.amount || 0);
      map.set(key, prev);
    });
    return [...map.values()].sort((a, b) => a.category.localeCompare(b.category));
  }, [filtered]);

  const pageRows =
    tab === "all"
      ? filtered.slice((page - 1) * pageSize, page * pageSize)
      : categoryRows.slice((page - 1) * pageSize, page * pageSize);
  const total = tab === "all" ? filtered.length : categoryRows.length;

  const onSaveExpense = async (row) => {
    try {
      await createExpense({
        tenant_id: tenantId,
        category: row.category || row.tag || "Other",
        vendor: row.spend_for || null,
        amount: Number(row.amount) || 0,
        expense_date: row.date,
        description: JSON.stringify({
          payment_mode: row.payment_mode || "CASH",
          note: row.note || "",
          category_id: row.category_id || null,
        }),
      });
      addToast("Expense added.", "success");
      await load();
    } catch (err) {
      addToast(apiErrorMessage(err, "Failed to save expense"), "error");
    }
  };

  const onDeleteExpense = async (row) => {
    if (!row?.id) return;
    if (!window.confirm(`Delete expense "${row.spend_for}"?`)) return;
    try {
      await deleteExpense(row.id);
      addToast("Expense deleted", "success");
      await load();
    } catch (err) {
      addToast(apiErrorMessage(err, "Failed to delete expense"), "error");
    }
  };

  const exportColsAll = [
    { key: "tag", label: "Tag" },
    { key: "category", label: "Category" },
    { key: "date", label: "Date" },
    { key: "spend_for", label: "Spend For" },
    { key: "payment_mode", label: "Payment Mode" },
    { key: "amount", label: "Amount" },
  ];

  const onPdf = () => {
    if (tab === "all") exportToPdf(filtered, exportColsAll, "Expenses", "expenses");
    else
      exportToPdf(
        categoryRows,
        [
          { key: "tag", label: "Tag" },
          { key: "category", label: "Category" },
          { key: "count", label: "No of Expenses" },
          { key: "amount", label: "Amount" },
        ],
        "Category Wise Expenses",
        "expenses-category"
      );
    addToast("PDF exported.");
  };

  const onExcel = () => {
    if (tab === "all") exportToExcel(filtered, exportColsAll, "expenses");
    else
      exportToCsv(
        categoryRows,
        [
          { key: "tag", label: "Tag" },
          { key: "category", label: "Category" },
          { key: "count", label: "No of Expenses" },
          { key: "amount", label: "Amount" },
        ],
        "expenses-category"
      );
    addToast("Excel exported.");
  };

  const chartMax = Math.max(...categoryRows.map((r) => r.amount), 1);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-[#6b6b76]" style={{ background: PAGE_BG }}>
        Loading expenses…
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: PAGE_BG }}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
        <Link
          to="/accounts/expenses/settings"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f6d84] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#1a1a1f]"
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
      </div>

      <div className="mx-4 mt-4 overflow-hidden rounded-t-2xl border border-b-0 border-[#e4e4ea] bg-white sm:mx-6">
        <div className="relative flex gap-6 px-4 pt-3">
          {[
            { id: "all", label: "All Expenses" },
            { id: "category", label: "Category Wise" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setPage(1);
              }}
              className={`relative pb-3 text-[14px] font-semibold ${
                tab === t.id ? "text-[#1a1a1f]" : "text-[#6b6b76]"
              }`}
            >
              {t.label}
              {tab === t.id ? (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full"
                  style={{ background: ACCENT }}
                />
              ) : null}
            </button>
          ))}
        </div>
        </div>

      <div className="mx-4 mb-6 rounded-b-2xl border border-[#e4e4ea] bg-white p-4 sm:mx-6 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search"
                className="w-full rounded-full border border-[#e4e4ea] bg-white py-2.5 pl-10 pr-4 text-[14px] outline-none focus:border-[#0f6d84] focus:ring-2 focus:ring-[#0f6d84]/25"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[#e4e4ea] bg-white px-3 py-2 text-[13px]">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="outline-none"
              />
              <span className="text-[#9a9aa5]">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="rounded-lg bg-[#0f6d84] px-4 py-2.5 text-[13px] font-bold text-white"
            >
              + Add Expense
            </button>
            <button
              type="button"
              onClick={onPdf}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e4ea] bg-white px-3 py-2.5 text-[13px] font-bold"
            >
              <FileText className="h-4 w-4 text-[#ef4444]" /> PDF
            </button>
            <button
              type="button"
              onClick={onExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e4ea] bg-white px-3 py-2.5 text-[13px] font-bold"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#22c55e]" /> Excel
            </button>
          </div>
        </div>

        {tab === "all" ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#e4e4ea]">
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead className="bg-[#f3f3f6] text-[12px] font-semibold text-[#6b6b76]">
                  <tr>
                    {["Tag", "Category", "Date", "Spend For", "Payment Mode", "Amount", "Action"].map(
                      (h) => (
                        <th key={h} className="border-b border-[#e4e4ea] px-4 py-3">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center text-sm text-[#9a9aa5]">
                        No expenses found for the selected range.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row) => (
                      <tr key={row.id} className="border-b border-[#ececf0] hover:bg-[#fafafa]">
                        <td className="px-4 py-3">{row.tag}</td>
                        <td className="px-4 py-3">{row.category}</td>
                        <td className="px-4 py-3">{formatDisplayDate(row.date)}</td>
                        <td className="px-4 py-3 font-semibold">{row.spend_for}</td>
                        <td className="px-4 py-3">{row.payment_mode}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold">
                          ₹{Number(row.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="text-[12px] font-semibold text-[#6b4eff] hover:underline"
                              onClick={() =>
                                addToast(
                                  `${row.spend_for || "Expense"} · ${row.category} · ₹${Number(row.amount || 0).toFixed(2)} · ${row.payment_mode}${row.note ? ` · ${row.note}` : ""}`,
                                  "info"
                                )
                              }
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className="text-[12px] font-semibold text-[#dc2626] hover:underline"
                              onClick={() => onDeleteExpense(row)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPage={setPage}
              onPageSize={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          </>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="overflow-x-auto rounded-xl border border-[#e4e4ea]">
                <table className="min-w-full border-collapse text-left text-[13px]">
                  <thead className="bg-[#f3f3f6] text-[12px] font-semibold text-[#6b6b76]">
                    <tr>
                      {["Tag", "Category", "No of Expenses", "Amount"].map((h) => (
                        <th key={h} className="border-b border-[#e4e4ea] px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-14 text-center text-sm text-[#9a9aa5]">
                          No data available
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((row) => {
                        const cat = categories.find((c) => c.id === row.id);
                        const Icon = categoryIcon(cat?.icon);
                        return (
                          <tr key={row.id} className="border-b border-[#ececf0] hover:bg-[#fafafa]">
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white"
                                style={{ background: cat?.color || "#6b6b76" }}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold">{row.category}</td>
                            <td className="px-4 py-3">{row.count}</td>
                            <td className="px-4 py-3 tabular-nums font-semibold">
                              ₹{Number(row.amount || 0).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPage={setPage}
                onPageSize={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-[#e4e4ea]">
              <div className="bg-[#dbeafe] px-4 py-3 text-[14px] font-bold text-[#1a1a1f]">
                Category Wise Expense Chart
              </div>
              <div className="min-h-[280px] p-4">
                {categoryRows.length === 0 ? (
                  <p className="py-16 text-center text-sm text-[#9a9aa5]">
                    No category data for the selected range.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {categoryRows.map((row) => (
                      <div key={row.id}>
                        <div className="mb-1 flex justify-between text-[12px]">
                          <span className="font-medium text-[#4a4a55]">{row.category}</span>
                          <span className="tabular-nums">₹{Number(row.amount).toFixed(0)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#ececf0]">
                          <div
                            className="h-full rounded-full bg-[#6b4eff]"
                            style={{ width: `${Math.max(6, (row.amount / chartMax) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <AddExpenseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        categories={categories}
        onSave={onSaveExpense}
      />
    </div>
  );
}
