import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, FileDown, FileSpreadsheet, Search } from "lucide-react";

import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import { getDailyReports, getProductionOrders } from "../../api/productionApi";
import { enrichApiOrder } from "../../data/productionPlanningMasterData";
import { exportToExcel, exportToPdf } from "../../utils/exportUtils";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import useTenantId from "../../hooks/useTenantId";

const PAGE_BG = "var(--color-bg)";
const YELLOW = "var(--color-cta)";
const PAGE_SIZES = [20, 50, 100];

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function DailyReports() {
  const tenantId = useTenantId();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const [reportsRes, ordersRes] = await Promise.all([
        getDailyReports(tenantId, params).catch(() => ({ data: [] })),
        getProductionOrders().catch(() => ({ data: [] })),
      ]);

      let list = reportsRes.data || [];
      const apiOrders = ordersRes.data || [];
      let localOrders = [];
      try {
        const stored = localStorage.getItem("smrt_local_production_orders");
        if (stored) localOrders = JSON.parse(stored);
      } catch (e) {}

      const allOrders = [...localOrders, ...apiOrders];

      list = list.map((rep) => {
        let p = Number(rep.produced_quantity ?? rep.actual_quantity ?? 0);
        let g = Number(rep.good_qty ?? rep.good_quantity ?? 0);
        let r = Number(rep.reject_qty ?? rep.scrap_quantity ?? 0);

        if (p <= 0) {
          const match = allOrders.find(
            (o) =>
              o.order_number === rep.work_order_number ||
              `WO-${o.order_number}` === rep.work_order_number ||
              `WO-P0-${o.id}` === rep.work_order_number ||
              `PO-${o.id}` === rep.work_order_number ||
              (o.product_name && rep.product_name && o.product_name.toLowerCase().trim() === rep.product_name.toLowerCase().trim())
          );
          if (match) {
            const matchEnriched = enrichApiOrder(match);
            p = Number(matchEnriched.produced_quantity ?? matchEnriched.actual_quantity ?? 0);
            g = Number(matchEnriched.good_qty ?? matchEnriched.good_quantity ?? 0);
            r = Number(matchEnriched.reject_qty ?? matchEnriched.scrap_quantity ?? 0);
          }
        }

      const calc = p > 0 ? p : (g + r > 0 ? g + r : rep.produced_quantity);
        return {
          ...rep,
          produced_quantity: calc != null && calc > 0 ? calc : rep.produced_quantity,
          good_qty: g > 0 ? g : (calc > 0 ? calc - r : 0),
          scrap_quantity: r > 0 ? r : rep.scrap_quantity,
        };
      });

      // Sync good_qty from reports back to localStorage production orders
      try {
        const stored = localStorage.getItem("smrt_local_production_orders");
        if (stored && list.length > 0) {
          let localPOs = JSON.parse(stored);
          let changed = false;
          list.forEach((rep) => {
            const g = Number(rep.good_qty ?? 0);
            const p = Number(rep.produced_quantity ?? 0);
            if (g > 0 || p > 0) {
              localPOs = localPOs.map((po) => {
                const nameMatch = po.product_name && rep.product_name &&
                  po.product_name.toLowerCase().trim() === rep.product_name.toLowerCase().trim();
                const orderMatch = po.order_number === rep.work_order_number ||
                  `WO-${po.order_number}` === rep.work_order_number;
                if (nameMatch || orderMatch) {
                  changed = true;
                  return {
                    ...po,
                    good_qty: Math.max(Number(po.good_qty ?? 0), g),
                    produced_quantity: Math.max(Number(po.produced_quantity ?? 0), p > 0 ? p : g),
                  };
                }
                return po;
              });
            }
          });
          if (changed) {
            localStorage.setItem("smrt_local_production_orders", JSON.stringify(localPOs));
          }
        }
      } catch (e) {}

      setReports(list);
    } catch (error) {
      console.error("Failed to load daily reports", error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, dateFrom, dateTo]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useManufacturingRefresh(loadReports);

  const columns = [
    { key: "report_date", label: t("dashboard.date"), render: (r) => formatDate(r.report_date) },
    { key: "product_name", label: t("dashboard.product"), render: (r) => r.product_name || r.product_id || "—" },
    { key: "work_order_number", label: t("production.workOrder"), render: (r) => r.work_order_number || r.work_order_id || "—" },
    { key: "machine_name", label: t("production.machine"), render: (r) => r.machine_name || r.machine_id || "—" },
    { key: "shift", label: "Shift", render: (r) => typeof r.shift === "object" ? (r.shift?.label || r.shift?.id || "—") : (r.shift || "—") },
    { key: "operator_name", label: "Operator", render: (r) => r.operator_name || "—" },
    { key: "planned_quantity", label: "Planned Quantity", render: (r) => (r.planned_quantity != null ? r.planned_quantity : "—") },
    {
      key: "produced_quantity",
      label: t("dashboard.produced"),
      render: (r) => {
        const planned = Number(r.planned_quantity || 0);
        const prod = Number(r.produced_quantity ?? r.actual_quantity ?? 0);
        const good = Number(r.good_qty ?? r.good_quantity ?? r.accepted_quantity ?? 0);
        const reject = Number(r.scrap_quantity ?? r.reject_qty ?? r.rejected_quantity ?? 0);
        if (prod > 0) return prod;
        if (good > 0 || reject > 0) return good + reject;
        if (r.status === "completed" || r.status === "closed" || r.status === "done") return planned;
        return prod;
      },
    },
    { key: "scrap_quantity", label: t("dashboard.scrap"), render: (r) => r.scrap_quantity ?? 0 },
    { key: "downtime_minutes", label: t("dashboard.downtime"), render: (r) => (r.downtime_minutes ? `${r.downtime_minutes} min` : "0 min") },
    { key: "notes", label: "Notes", render: (r) => r.notes || "—" },
  ];

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter((r) =>
      String(r.work_order_number || "").toLowerCase().includes(q) ||
      String(r.product_name || "").toLowerCase().includes(q) ||
      String(r.machine_name || "").toLowerCase().includes(q) ||
      String(r.operator_name || "").toLowerCase().includes(q) ||
      String(r.notes || "").toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  useEffect(() => { setPage(1); }, [searchQuery, pageSize]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const paginatedReports = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize]);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const emptyState = (
    <EmptyState
      icon="chart"
      title={t("production.noDataAvailable")}
      description={t("production.noDailyReports")}
    />
  );

  return (
    <div className="min-h-full pb-8" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <div>
          <p className="mt-0.5 text-xs text-slate-500">{t("production.dailyReportsSubtitle")}</p>
        </div>

        <div className="ui-card p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                type="search"
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[#d0d0d8] focus:bg-white"
              />
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-[#e4e4ea] bg-[#f3f3f6] px-3 py-2 text-xs"
              />
              <span>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-[#e4e4ea] bg-[#f3f3f6] px-3 py-2 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => exportToExcel(reports, columns, "daily-reports")}
              disabled={!reports.length}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f] disabled:opacity-50"
              style={{ background: YELLOW }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => exportToPdf(reports, columns, "Daily Production Reports", "daily-reports")}
              disabled={!reports.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e4ea] bg-[#f3f3f6] px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f] hover:bg-[#ececf0] disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </button>
          </div>

          {loading ? (
            <Loader label="Loading daily production reports..." />
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-[#ececf0]">
                <DataTable
                  columns={columns}
                  data={paginatedReports}
                  showSearch={false}
                  pagination={false}
                  emptyState={emptyState}
                />
              </div>

              {/* Pagination Bar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#6b6b76]">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded border border-[#e2e2e8] bg-white px-2 py-1 outline-none"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span>{total === 0 ? "0-0 of 0" : `${from}-${to} of ${total}`}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="grid h-8 min-w-8 place-items-center rounded border border-[#e0b400] px-2 text-[13px] font-semibold"
                    style={{ background: "#fff2b8" }}
                  >
                    {page}
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="grid h-8 w-8 place-items-center rounded border border-[#e2e2e8] bg-white disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}