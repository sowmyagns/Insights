import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeftRight, Building2, ClipboardList, History, Package, PackageMinus, PackagePlus, PackageX, RotateCcw, Search, Warehouse, X } from "lucide-react";

import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import StoreManagerNav from "../../components/inventory/StoreManagerNav";
import useAuth from "../../hooks/useAuth";
import { isProductionManager } from "../../config/permissions";
import { useToast } from "../../context/ToastContext";
import {
  createPrFromLowStock,
  getInventoryDashboard,
  getStoreDashboard,
  getWarehouseSummary,
} from "../../api/inventoryApi";
import { getVendorSummary } from "../../api/procurementApi";
import { getProducts as getMasterProducts } from "../../api/productsApi";
import { enrichApiProduct } from "../../data/productsMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import {
  MANUFACTURING_EVENTS,
  notifyManufacturingSpine,
} from "../../utils/manufacturingEvents";

function Kpi({ label, value, icon: Icon, tone = "slate", to }) {
  const tones = {
    primary: "bg-[var(--color-primary)]",
    emerald: "bg-[var(--color-success)]",
    amber: "bg-[var(--color-warning)]",
    red: "bg-[var(--color-danger)]",
    sky: "bg-[var(--color-info)]",
    teal: "bg-[var(--color-secondary)]",
    slate: "bg-[var(--color-neutral)]",
    orange: "bg-[var(--color-warning)]",
  };
  const card = (
    <div className="ui-card p-4 min-h-[86px] flex flex-col justify-between min-w-0 overflow-hidden transition hover:-translate-y-0.5" title={typeof label === "string" ? label : undefined}>
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <p className="truncate text-[11px] font-medium text-[var(--color-text-muted)] leading-tight sm:text-xs min-w-0 flex-1">{label}</p>
        {Icon && (
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${tones[tone]}`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="truncate text-xl font-bold tabular-nums text-[var(--color-text)] leading-none sm:text-2xl">{value ?? "—"}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

function QuickAction({ to, icon: Icon, label, hint }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 ui-card p-4 transition hover:border-[var(--color-primary-light)] hover:bg-[var(--color-primary-soft)]/50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
    </Link>
  );
}

const WORKFLOW = [
  "Dashboard",
  "Products",
  "Stock In",
  "Material Request",
  "Issue",
  "Return",
  "Transfer",
  "History",
];

export default function InventoryDashboard() {
  const { user } = useAuth();
  const isPM = isProductionManager(user);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [whSummary, setWhSummary] = useState(null);
  const [vendorCount, setVendorCount] = useState(0);
  const [invItems, setInvItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [prBusy, setPrBusy] = useState(null);
  const searchWrapRef = useRef(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [dRes, sumRes, invRes, prodRes, vendorRes] = await Promise.allSettled([
        getStoreDashboard(),
        getWarehouseSummary(),
        getInventoryDashboard(),
        getMasterProducts(),
        getVendorSummary(),
      ]);
      const anyRejected = [dRes, sumRes, invRes, prodRes, vendorRes].every(
        (r) => r.status === "rejected"
      );
      if (anyRejected && isRefresh) {
        throw new Error("Failed to refresh inventory data");
      }
      setDash(dRes.status === "fulfilled" ? dRes.value?.data || {} : {});
      setWhSummary(sumRes.status === "fulfilled" ? sumRes.value?.data : null);
      setInvItems(invRes.status === "fulfilled" ? invRes.value?.data || [] : []);
      setProducts(
        prodRes.status === "fulfilled"
          ? (prodRes.value?.data || []).map((row) => enrichApiProduct(row))
          : []
      );
      const vData = vendorRes.status === "fulfilled" ? vendorRes.value?.data : null;
      setVendorCount(
        Number(vData?.total_vendors ?? vData?.total ?? vData?.active_vendors ?? 0) || 0
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useManufacturingRefresh(() => load(true));

  const lowStockItems = useMemo(
    () => (invItems || []).filter((i) => i.needs_reorder).slice(0, 5),
    [invItems]
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) =>
        `${p.product_code || ""} ${p.name || ""} ${p.category || ""} ${p.warehouse || ""} ${p.sku || ""}`
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 8);
  }, [products, search]);

  useEffect(() => {
    const onPointerDown = (e) => {
      if (!searchWrapRef.current?.contains(e.target)) setSearchOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const clearSearch = () => {
    setSearch("");
    setSearchOpen(false);
  };

  const createPr = async (item) => {
    setPrBusy(item.id);
    try {
      const res = await createPrFromLowStock({ item_id: item.id });
      addToast(`Purchase Requisition ${res.data.mr_number} created`);
      notifyManufacturingSpine(MANUFACTURING_EVENTS.DASHBOARD_REFRESH, {});
      load();
    } catch (err) {
      addToast(err?.response?.data?.detail || "Could not create PR", "error");
    } finally {
      setPrBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <StoreManagerNav />
        <Loader label="Loading store dashboard…" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <StoreManagerNav />

      <PageHeader subtitle="Stock health, warehouses, and daily store operations at a glance." />

      <div ref={searchWrapRef} className="ui-card relative p-3 sm:p-4">
        <div className="relative max-w-xl">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--color-text-icon)]"
            aria-hidden
          />
          <input
            type="text"
            role="searchbox"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search products…"
            className="ui-input w-full !rounded-full !pl-10 !pr-10"
            aria-expanded={searchOpen && Boolean(search.trim())}
            aria-controls="store-dashboard-search-results"
            autoComplete="off"
          />
          {search ? (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--color-text-icon)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {searchOpen && search.trim() ? (
          <ul
            id="store-dashboard-search-results"
            className="absolute left-3 right-3 z-20 mt-2 max-h-72 max-w-xl overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg sm:left-4"
            role="listbox"
          >
            {searchResults.length === 0 ? (
              <li className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No products found</li>
            ) : (
              searchResults.map((p) => (
                <li key={p.id} role="option">
                  <Link
                    to={p.id ? `/masters/products/${p.id}/edit` : "/masters/products"}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-[var(--text-sm)] hover:bg-[var(--color-surface-muted)]"
                    onClick={clearSearch}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[var(--color-text)]">{p.name}</span>
                      <span className="block truncate text-[var(--text-xs)] text-[var(--color-text-muted)]">
                        {[p.product_code || p.sku, p.category, p.warehouse].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[var(--text-xs)] font-semibold text-[var(--color-text-muted)]">
                      {p.current_stock ?? "—"} {p.unit || ""}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Total Products" value={dash.total_products} icon={Package} tone="primary" to="/masters/products" />
        {!isPM && <Kpi label="Vendors" value={vendorCount} icon={Building2} tone="slate" to="/procurement/vendors" />}
        <Kpi label="Low Stock Items" value={dash.low_stock_items} icon={AlertTriangle} tone="amber" to="/alerts/low-stock" />
        <Kpi label="Out of Stock" value={dash.out_of_stock_items} icon={PackageX} tone="red" to="/masters/products" />
        <Kpi label="Pending Requests" value={dash.pending_material_requests} icon={ClipboardList} tone="sky" to="/inventory/material-requests" />
        <Kpi
          label="Warehouse Utilization"
          value={`${dash.warehouse_utilization_pct ?? whSummary?.storage_utilization_pct ?? 0}%`}
          icon={Warehouse}
          tone="teal"
          to="/inventory/warehouses"
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Quick actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {!isPM && <QuickAction to="/masters/products/create" icon={Package} label="Add Product" hint="Product master" />}
          {!isPM && <QuickAction to="/procurement/vendors" icon={Building2} label="Vendors" hint="Supplier master" />}
          <QuickAction to="/inventory/stock-in" icon={PackagePlus} label="Stock In" hint="Receive materials" />
          <QuickAction to="/inventory/material-requests" icon={ClipboardList} label="Material Request" hint="From production" />
          <QuickAction to="/inventory/issue-materials" icon={PackageMinus} label="Issue Materials" hint="Approve & issue" />
          <QuickAction to="/inventory/stock-return" icon={RotateCcw} label="Stock Return" hint="Return unused" />
          <QuickAction to="/inventory/stock-transfer" icon={ArrowLeftRight} label="Stock Transfer" hint="Between warehouses" />
          <QuickAction to="/inventory/warehouses" icon={Warehouse} label="Warehouses" hint="Locations & capacity" />
          <QuickAction to="/inventory/history" icon={History} label="Inventory History" hint="Full audit trail" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ui-card p-5">
          <h3 className="text-sm font-semibold text-slate-800">Low stock alerts</h3>
          {lowStockItems.length === 0 ? (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700">
              No low stock items right now.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {lowStockItems.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-amber-900">{item.name}</p>
                    <p className="text-xs text-amber-800">
                      Current {item.total_quantity ?? 0} · Min {item.reorder_level ?? "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={prBusy === item.id}
                    onClick={() => createPr(item)}
                    className="rounded-lg bg-[var(--color-success)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-success-hover)] disabled:opacity-50"
                  >
                    Create Purchase Requisition
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ui-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Daily store workflow</h3>
          <ol className="flex flex-wrap items-center gap-2">
            {WORKFLOW.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-success)] text-[10px] text-white">
                    {i + 1}
                  </span>
                  {step}
                </span>
                {i < WORKFLOW.length - 1 ? <span className="text-slate-300">→</span> : null}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-slate-500">
            Every movement is recorded digitally with automatic stock updates — no paper registers.
          </p>
        </section>
      </div>
    </div>
  );
}
