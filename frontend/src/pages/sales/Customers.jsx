import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { createPortal } from "react-dom";

import Loader from "../../components/common/Loader";
import AddNewPartyModal from "../../components/sales/AddNewPartyModal";
import { useToast } from "../../context/ToastContext";
import usePageRefresh from "../../hooks/usePageRefresh";
import { deleteCustomer, getCustomers } from "../../api/salesApi";
import { enrichApiCustomer, REPORT_TYPES, WORKFLOW_STEPS } from "../../data/customersMasterData";
import { exportToExcel } from "../../utils/exportUtils";
import { apiErrorMessage } from "../../utils/apiError";

const PAGE_BG = "var(--color-bg)";
const ACCENT = "#0f6d84";
const PAGE_SIZES = [20, 50, 100];

function blankOr(value) {
  if (value == null) return "";
  const s = String(value).trim();
  return !s || s === "—" ? "" : s;
}

function DeleteConfirmModal({ open, onClose, onConfirm, busy }) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose?.()}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white px-8 py-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 grid h-[72px] w-[72px] place-items-center rounded-full bg-[#fee2e2]">
          <Trash2 className="h-9 w-9 text-[#ef4444]" strokeWidth={1.75} />
        </div>
        <h3 className="text-[28px] font-bold leading-tight text-[#1a1a1f]">Delete Customer?</h3>
        <p className="mt-3 text-[14px] leading-relaxed text-[#5a5a66]">
          Are you sure you want to delete this Customer?
          <br />
          This action is not reversible.
        </p>
        <div className="mt-7 grid grid-cols-2 gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl bg-[#eceef4] py-3 text-[15px] font-semibold text-[#1a1a1f] disabled:opacity-60"
          >
            No
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-xl bg-[#ef5350] py-3 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Customers() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [partyOpen, setPartyOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const loadCustomers = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await getCustomers();
      const rows = Array.isArray(res.data) ? res.data : [];
      setCustomers(rows.map((row) => enrichApiCustomer(row)));
    } catch (err) {
      if (isRefresh) throw err;
      setCustomers([]);
      addToast("Could not load customers", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  usePageRefresh(() => loadCustomers(true));

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Deep-link: /sales/customers?create=1 or /sales/customers/create → open create modal
  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    setEditing(null);
    setPartyOpen(true);
    navigate("/sales/customers", { replace: true });
  }, [searchParams, navigate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [
        c.company,
        c.name,
        c.gstin,
        c.email,
        c.phone,
        c.address_line1 || c.billing_address,
        c.city,
        c.state,
        c.pincode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [customers, query]);

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const onExport = () => {
    exportToExcel(
      filtered.map((c) => ({
        ...c,
        company: c.company || c.name || "",
        address_line1: c.address_line1 || c.billing_address || "",
      })),
      [
        { key: "company", label: "Customer Name" },
        { key: "gstin", label: "GSTIN" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Mobile No." },
        { key: "address_line1", label: "Address" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "pincode", label: "Pincode" },
      ],
      "customers"
    );
    addToast("Exported to Excel", "success");
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      if (typeof deleting.id === "number") await deleteCustomer(deleting.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deleting.id));
      setDeleting(null);
      addToast("Customer deleted", "success");
    } catch (err) {
      addToast(apiErrorMessage(err, "Could not delete customer."), "error");
    } finally {
      setDeletingBusy(false);
    }
  };

  if (loading) return <Loader label="Loading customers..." />;

  const withGstin = customers.filter((c) => c.gstin && c.gstin !== "—").length;

  return (
    <div className="min-h-full" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            { label: "Total Customers", value: customers.length, color: "#0f6d84" },
            { label: "Filtered", value: filtered.length, color: "#6b4eff" },
            { label: "With GSTIN", value: withGstin, color: "#16a34a" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3">
              <p className="text-[11px] font-medium text-[#6b6b76]">{k.label}</p>
              <p className="mt-0.5 text-[22px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
        <div className="ui-card p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full rounded-full border border-[#e8e8ee] bg-[#f3f3f6] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#a0a0ab] focus:border-[#d0d0d8] focus:bg-white"
              />
            </div>
            <Link
              to="/sales/customers/bulk-import"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e4ea] bg-[#f3f3f6] px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f] hover:bg-[#ececf0]"
            >
              <Upload className="h-4 w-4" />
              Bulk Import
            </Link>
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e4ea] bg-[#f3f3f6] px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f] hover:bg-[#ececf0]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export (xlsx)
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setPartyOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f]"
              style={{ background: ACCENT, color: "#fff" }}
            >
              <Plus className="h-4 w-4" />
              Create Customer
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#ececf0]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#e8e8ee] bg-[#f5f5f5] text-[12px] font-medium text-[#6b6b76]">
                    <th className="px-4 py-3 font-medium">Customer Name</th>
                    <th className="px-4 py-3 font-medium">GSTIN</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Mobile No.</th>
                    <th className="px-4 py-3 font-medium">Address</th>
                    <th className="px-4 py-3 font-medium">City</th>
                    <th className="px-4 py-3 font-medium">State</th>
                    <th className="px-4 py-3 font-medium">Pincode</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="border-b border-[#f0f0f4] text-[#1a1a1f] last:border-b-0">
                      <td className="px-4 py-3.5">{c.company || c.name || ""}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{blankOr(c.gstin)}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{blankOr(c.email)}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{blankOr(c.phone)}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">
                        {blankOr(c.address_line1 || c.billing_address)}
                      </td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{blankOr(c.city)}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{blankOr(c.state)}</td>
                      <td className="px-4 py-3.5 text-[#4a4a55]">{blankOr(c.pincode)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(c);
                              setPartyOpen(true);
                            }}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[#e4e6fc]"
                            title="Edit"
                            aria-label="Edit customer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(c)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444] hover:bg-[#fcdada]"
                            title="Delete"
                            aria-label="Delete customer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length === 0 ? (
              <div className="px-4 py-16 text-center text-[13px] text-[#8a8a96]">No data available</div>
            ) : null}
          </div>

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
                className="grid h-8 min-w-8 place-items-center rounded border border-[var(--color-primary)] px-2 text-[13px] font-semibold"
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
        </div>
      </div>


      <AddNewPartyModal
        open={partyOpen}
        customer={editing}
        onClose={() => {
          setPartyOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          setPartyOpen(false);
          setEditing(null);
          loadCustomers();
        }}
      />
      <DeleteConfirmModal
        open={Boolean(deleting)}
        busy={deletingBusy}
        onClose={() => !deletingBusy && setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
