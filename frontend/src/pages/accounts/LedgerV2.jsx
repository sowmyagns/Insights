import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Eye, Mail, MoreVertical, Pencil, Search, Trash2, UserPlus } from "lucide-react";

import Loader from "../../components/common/Loader";
import AddLedgerCustomerModal from "../../components/accounts/AddLedgerCustomerModal";
import AddLedgerVendorModal from "../../components/accounts/AddLedgerVendorModal";
import AddBankCashModal from "../../components/accounts/AddBankCashModal";
import AddExpenseIncomeModal from "../../components/accounts/AddExpenseIncomeModal";
import AdjustBalanceModal from "../../components/accounts/AdjustBalanceModal";
import ContraEntryModal from "../../components/accounts/ContraEntryModal";
import DeleteBankModal from "../../components/accounts/DeleteBankModal";
import DownloadLedgerModal from "../../components/accounts/DownloadLedgerModal";
import SendLedgerModal from "../../components/accounts/SendLedgerModal";
import SendLedgerMailModal from "../../components/accounts/SendLedgerMailModal";
import { useToast } from "../../context/ToastContext";
import { deleteCustomer, getCustomers } from "../../api/salesApi";
import { deleteVendor, getVendors } from "../../api/procurementApi";
import {
  adjustLedgerBalance,
  contraLedgerEntry,
  deleteLedgerAccount,
  fetchLedgerCashAccounts,
  fetchLedgerOtherAccounts,
  saveLedgerCashAccount,
  saveLedgerOtherAccount,
} from "../../api/ledgerAccountsSync";
import { exportToCsv, exportToExcel, exportToPdf } from "../../utils/exportUtils";
import { apiErrorMessage, asArray } from "../../utils/apiError";

const PAGE_BG = "var(--color-bg)";
const PAGE_SIZES = [10, 20, 50];

const TABS = [
  { id: "debtors", label: "Debtors (Customers)", accent: "#6b4eff" },
  { id: "creditors", label: "Creditors (Vendors)", accent: "#22c55e" },
  { id: "both", label: "Both (Customer and Vendor)", accent: "#6b4eff" },
  { id: "cash", label: "Cash and Banks", accent: "#f97316" },
  { id: "other", label: "Other Accounts", accent: "#ef4444" },
];

function partyRow(row, kind) {
  const balance = Number(row.balance ?? row.outstanding ?? row.receivable ?? 0);
  return {
    id: `${kind}-${row.id}`,
    sourceId: row.id,
    kind,
    company_name: row.name || row.company_name || "—",
    phone: row.phone || row.mobile || "",
    email: row.email || "",
    city: row.city || "N/A",
    gst_type: row.gst_registration_type || row.gst_type || "N/A",
    gstin: row.gstin || row.gst_number || "",
    balance,
    balance_label: kind === "vendor" ? "Payable" : "Receivable",
  };
}

function ActionIcons({ onView, onEdit, onSendLedger, onDelete, deleteLabel = "Delete Transaction" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <div className="relative flex items-center gap-1.5" ref={rootRef}>
      <button
        type="button"
        title="View"
        onClick={onView}
        className="grid h-8 w-8 place-items-center rounded-full bg-[#0025D4] text-white hover:opacity-90"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Edit"
        onClick={onEdit}
        className="grid h-8 w-8 place-items-center rounded-full bg-[#0025D4] text-white hover:opacity-90"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="More"
        onClick={() => setMenuOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-full bg-[#0025D4] text-white hover:opacity-90"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {menuOpen ? (
        <div className="absolute right-0 top-9 z-30 min-w-[180px] overflow-hidden rounded-md border border-[#e4e4ea] bg-white py-1 shadow-lg">
          {onDelete ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#1a1a1f] hover:bg-[#f5f5f7]"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4 text-[#6b6b76]" />
              {deleteLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#1a1a1f] hover:bg-[#f5f5f7]"
            onClick={() => {
              setMenuOpen(false);
              onSendLedger?.();
            }}
          >
            <Mail className="h-4 w-4 text-[#6b6b76]" />
            Send Ledger
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Pagination({ page, pageSize, total, onPage, onPageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) pages.push(i);

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
        <span className="ml-1 font-medium text-[#1a1a1f]">
          {total === 0 ? "1-0 of 0" : `${from}-${to} of ${total}`}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
          className="rounded p-1.5 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            className={`grid h-8 min-w-8 place-items-center rounded px-2 text-[13px] font-bold ${
              n === page ? "bg-[#0025D4] text-white" : "bg-white text-[#1a1a1f] hover:bg-[#f7f7f9]"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          className="rounded p-1.5 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function LedgerV2() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("debtors");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [otherAccounts, setOtherAccounts] = useState([]);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [sendLedger, setSendLedger] = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [contraOpen, setContraOpen] = useState(false);
  const [bankCashOpen, setBankCashOpen] = useState(false);
  const [editCashAccount, setEditCashAccount] = useState(null);
  const [expenseIncomeOpen, setExpenseIncomeOpen] = useState(false);
  const [editOtherAccount, setEditOtherAccount] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [cRes, vRes, cashRes, otherRes] = await Promise.allSettled([
        getCustomers(),
        getVendors(),
        fetchLedgerCashAccounts(),
        fetchLedgerOtherAccounts(),
      ]);


      const cData = cRes.status === "fulfilled" ? cRes.value?.data : [];
      const vData = vRes.status === "fulfilled" ? vRes.value?.data : [];
      setCustomers(asArray(cData));
      setVendors(asArray(vData));
      setCashAccounts(cashRes.status === "fulfilled" ? cashRes.value || [] : []);
      setOtherAccounts(otherRes.status === "fulfilled" ? otherRes.value || [] : []);
    } catch {
      setCustomers([]);
      setVendors([]);
      setCashAccounts([]);
      setOtherAccounts([]);
      addToast("Could not load ledger parties.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  usePageRefresh(() => load(true));

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [tab]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];
  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const isPartyTab = tab === "debtors" || tab === "creditors" || tab === "both";

  const partyRows = useMemo(() => {
    const c = customers.map((r) => partyRow(r, "customer"));
    const v = vendors.map((r) => partyRow(r, "vendor"));
    if (tab === "debtors") return c;
    if (tab === "creditors") return v;
    if (tab === "both") {
      return [...c, ...v].sort((a, b) => a.company_name.localeCompare(b.company_name));
    }
    return [];
  }, [customers, vendors, tab]);

  const accountRows = useMemo(() => {
    if (tab === "cash") return cashAccounts;
    if (tab === "other") return otherAccounts;
    return [];
  }, [tab, cashAccounts, otherAccounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = isPartyTab ? partyRows : accountRows;
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = isPartyTab
        ? `${r.company_name} ${r.phone} ${r.city} ${r.gstin} ${r.gst_type}`
        : `${r.name} ${r.account_type} ${r.description}`;
      return hay.toLowerCase().includes(q);
    });
  }, [isPartyTab, partyRows, accountRows, search]);

  const total = filtered.length;
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const onDownload = ({ format = "PDF", includeZeroBalance = false } = {}) => {
    const baseRows = isPartyTab ? partyRows : accountRows;
    const q = search.trim().toLowerCase();
    let rows = !q
      ? baseRows
      : baseRows.filter((r) => {
          const hay = isPartyTab
            ? `${r.company_name} ${r.phone} ${r.city} ${r.gstin} ${r.gst_type}`
            : `${r.name} ${r.account_type} ${r.description}`;
          return hay.toLowerCase().includes(q);
        });

    if (isPartyTab && !includeZeroBalance) {
      rows = rows.filter((r) => Number(r.balance || 0) !== 0);
    }

    const columns = isPartyTab
      ? [
          { key: "company_name", label: "Company Name" },
          { key: "phone", label: "Phone" },
          { key: "city", label: "City" },
          { key: "gst_type", label: "GST Type" },
          { key: "gstin", label: "GSTIN" },
          { key: "balance", label: "Balance" },
        ]
      : [
          { key: "name", label: "Account Name" },
          { key: "account_type", label: "Account Type" },
          { key: "description", label: "Description" },
          { key: "balance", label: "Balance" },
        ];

    const title =
      tab === "creditors"
        ? "Creditors (Vendors) Ledger"
        : tab === "debtors"
          ? "Debtors (Customers) Ledger"
          : `Ledger - ${tab}`;
    const filename = `ledger-${tab}`;

    if (format === "CSV") {
      exportToCsv(rows, columns, filename);
    } else if (format === "PDF") {
      exportToPdf(rows, columns, title, filename);
    } else {
      exportToExcel(rows, columns, filename);
    }
    addToast(`${format} download started.`);
  };

  const onMail = () => setMailOpen(true);

  const addCashAccount = async (account) => {
    try {
      const payload = editCashAccount
        ? { ...editCashAccount, ...account, apiId: editCashAccount.apiId }
        : account;
      await saveLedgerCashAccount(payload);
      const rows = await fetchLedgerCashAccounts();
      setCashAccounts(rows);
      setEditCashAccount(null);
      addToast(editCashAccount ? "Account updated." : "Account added.", "success");
    } catch (err) {
      addToast(apiErrorMessage(err, "Failed to save account"), "error");
    }
  };

  const onAdjustBalance = async ({ accountId, type, amount, remark }) => {
    const account = cashAccounts.find((a) => String(a.id) === String(accountId));
    if (!account?.apiId) {
      addToast("Account not synced", "error");
      return;
    }
    try {
      await adjustLedgerBalance({ account, type, amount, remark });
      setCashAccounts(await fetchLedgerCashAccounts());
      addToast(type === "add" ? "Money added." : "Money withdrawn.", "success");
    } catch (err) {
      addToast(apiErrorMessage(err, "Failed to adjust balance"), "error");
    }
  };

  const onContraEntry = async ({ fromId, toId, amount, remark }) => {
    const fromAccount = cashAccounts.find((a) => String(a.id) === String(fromId));
    const toAccount = cashAccounts.find((a) => String(a.id) === String(toId));
    if (!fromAccount?.apiId || !toAccount?.apiId) {
      addToast("Accounts not synced", "error");
      return;
    }
    try {
      await contraLedgerEntry({ fromAccount, toAccount, amount, remark });
      setCashAccounts(await fetchLedgerCashAccounts());
      addToast("Contra entry saved.", "success");
    } catch (err) {
      addToast(apiErrorMessage(err, "Failed to save contra entry"), "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.scope === "cash" || deleteTarget.scope === "other") {
      const list = deleteTarget.scope === "cash" ? cashAccounts : otherAccounts;
      const row = list.find((a) => String(a.id) === String(deleteTarget.id));
      if (!row?.apiId) {
        addToast("Account not synced", "error");
        setDeleteTarget(null);
        return;
      }
      try {
        await deleteLedgerAccount(row.apiId);
        if (deleteTarget.scope === "cash") {
          setCashAccounts(await fetchLedgerCashAccounts());
          addToast("Bank deleted.", "success");
        } else {
          setOtherAccounts(await fetchLedgerOtherAccounts());
          addToast("Account deleted.", "success");
        }
      } catch (err) {
        addToast(apiErrorMessage(err, "Failed to delete account"), "error");
      }
      setDeleteTarget(null);
      return;
    }
    if (deleteTarget.scope === "party") {
      try {
        if (deleteTarget.kind === "vendor") {
          await deleteVendor(deleteTarget.id);
          setVendors((rows) => rows.filter((v) => String(v.id) !== String(deleteTarget.id)));
          addToast("Vendor deleted.", "success");
        } else {
          await deleteCustomer(deleteTarget.id);
          setCustomers((rows) => rows.filter((c) => String(c.id) !== String(deleteTarget.id)));
          addToast("Customer deleted.", "success");
        }
      } catch (err) {
        addToast(apiErrorMessage(err, "Failed to delete party"), "error");
      }
      setDeleteTarget(null);
      return;
    }
    addToast("Delete is only available for Cash/Bank accounts here.", "info");
    setDeleteTarget(null);
  };

  const saveOtherAccount = async (account) => {
    try {
      const payload = editOtherAccount
        ? { ...editOtherAccount, ...account, apiId: editOtherAccount.apiId }
        : account;
      await saveLedgerOtherAccount(payload);
      setOtherAccounts(await fetchLedgerOtherAccounts());
      setEditOtherAccount(null);
      addToast(editOtherAccount ? "Account updated." : "Account added.", "success");
    } catch (err) {
      addToast(apiErrorMessage(err, "Failed to save account"), "error");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" style={{ background: PAGE_BG }}>
        <Loader label="Loading ledger…" />
      </div>
    );
  }

  const totalBalance = filtered.reduce((s, r) => s + (Number(r.balance || r.balance_label && r.balance || 0)), 0);

  return (
    <div className="min-h-full" style={{ background: PAGE_BG }}>

      <div className="mx-4 mt-4 grid grid-cols-2 gap-3 sm:mx-6 sm:grid-cols-4">
        {[
          { label: "Total Customers", value: customers.length, color: "#0025D4" },
          { label: "Total Vendors", value: vendors.length, color: "#22c55e" },
          { label: "Cash / Bank Accounts", value: cashAccounts.length, color: "#f97316" },
          { label: "Other Accounts", value: otherAccounts.length, color: "#6b4eff" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-[#e4e4ea] bg-white px-4 py-3">
            <p className="text-[11px] font-medium text-[#6b6b76]">{k.label}</p>
            <p className="mt-0.5 text-[20px] font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-4 overflow-hidden rounded-t-2xl border border-b-0 border-[#e4e4ea] bg-[#f3f3f6] sm:mx-6">
        <div className="relative flex overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative z-[1] shrink-0 whitespace-nowrap border-r border-[#e4e4ea] px-4 py-3.5 text-[13px] font-semibold transition-colors duration-300 last:border-r-0 ${
                  active ? "bg-white" : "text-[#6b6b76] hover:text-[#1a1a1f]"
                }`}
                style={active ? { color: t.accent } : undefined}
              >
                {t.label}
              </button>
            );
          })}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 h-[3px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              width: `${100 / TABS.length}%`,
              left: `${(100 / TABS.length) * Math.max(0, tabIndex)}%`,
              background: activeTab.accent,
            }}
          />
        </div>
      </div>

      <div className="mx-4 mb-6 rounded-b-2xl border border-[#e4e4ea] bg-white p-4 sm:mx-6 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-[16px] font-bold text-[#1a1a1f]">
            {isPartyTab ? "Summary Of Transactions" : "List Of Accounts"}
          </h2>
        </div>

        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full rounded-full border border-[#e4e4ea] bg-white py-2.5 pl-10 pr-4 text-[14px] text-[#1a1a1f] placeholder:text-[#9a9aa5] focus:border-[#0025D4] focus:outline-none focus:ring-2 focus:ring-[#0025D4]/25"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tab === "debtors" ? (
              <button
                type="button"
                onClick={() => setAddCustomerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0025D4] px-4 py-2.5 text-[13px] font-bold text-white hover:opacity-90"
              >
                <UserPlus className="h-4 w-4" /> Add Customer
              </button>
            ) : null}
            {tab === "creditors" ? (
              <button
                type="button"
                onClick={() => setAddVendorOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0025D4] px-4 py-2.5 text-[13px] font-bold text-white hover:opacity-90"
              >
                <UserPlus className="h-4 w-4" /> Add Vendor
              </button>
            ) : null}
            {tab === "cash" ? (
              <>
                <button
                  type="button"
                  onClick={() => setAdjustOpen(true)}
                  className="rounded-lg border border-[#0025D4] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0025D4]"
                >
                  Adjust Balance
                </button>
                <button
                  type="button"
                  onClick={() => setContraOpen(true)}
                  className="rounded-lg border border-[#0025D4] bg-white px-3 py-2.5 text-[13px] font-bold text-[#0025D4]"
                >
                  Contra Entry (Bank/Cash Transfer)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditCashAccount(null);
                    setBankCashOpen(true);
                  }}
                  className="rounded-lg bg-[#0025D4] px-4 py-2.5 text-[13px] font-bold text-white"
                >
                  Add Bank/Cash
                </button>
              </>
            ) : null}
            {tab === "other" ? (
              <button
                type="button"
                onClick={() => {
                  setEditOtherAccount(null);
                  setExpenseIncomeOpen(true);
                }}
                className="rounded-lg bg-[#0025D4] px-4 py-2.5 text-[13px] font-bold text-white"
              >
                Add Expense/Income
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setDownloadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0025D4] px-4 py-2.5 text-[13px] font-bold text-white"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            {isPartyTab ? (
              <button
                type="button"
                onClick={onMail}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#0025D4] bg-white px-4 py-2.5 text-[13px] font-bold text-[#0025D4]"
              >
                <Mail className="h-4 w-4" /> Send On Mail
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e4e4ea]">
          <div className="overflow-x-auto">
            {isPartyTab ? (
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead className="bg-[#f3f3f6] text-[12px] font-semibold text-[#6b6b76]">
                  <tr>
                    {["Company Name", "Phone", "City", "GST Type", "GSTIN", "Balance", "Action"].map((h) => (
                      <th key={h} className="border-b border-[#e4e4ea] px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-14 text-center text-sm text-[#9a9aa5]">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row) => (
                      <tr key={row.id} className="border-b border-[#ececf0] hover:bg-[#fafafa]">
                        <td className="px-4 py-3 font-semibold text-[#1a1a1f]">{row.company_name}</td>
                        <td className="px-4 py-3 text-[#4a4a55]">{row.phone || "—"}</td>
                        <td className="px-4 py-3 text-[#4a4a55]">{row.city || "N/A"}</td>
                        <td className="px-4 py-3 text-[#4a4a55]">{row.gst_type || "N/A"}</td>
                        <td className="px-4 py-3 text-[#4a4a55]">{row.gstin || "—"}</td>
                        <td className="px-4 py-3">
                          <p
                            className={`text-[12px] font-semibold ${
                              row.kind === "vendor" ? "text-[#ef4444]" : "text-[#22c55e]"
                            }`}
                          >
                            {row.balance_label}
                          </p>
                          <p className="tabular-nums font-semibold text-[#1a1a1f]">
                            {Number(row.balance || 0).toFixed(2)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <ActionIcons
                            onView={() =>
                              navigate(`/accounts/ledger/${row.kind}/${row.sourceId}`, {
                                state: {
                                  name: row.company_name,
                                  email: row.email || "",
                                  balance: row.balance || 0,
                                },
                              })
                            }
                            onEdit={() => {
                              if (row.kind === "vendor") {
                                const full = vendors.find((v) => String(v.id) === String(row.sourceId));
                                setEditVendor(full || { id: row.sourceId, name: row.company_name, ...row });
                                return;
                              }
                              const full = customers.find((c) => String(c.id) === String(row.sourceId));
                              setEditCustomer(full || { id: row.sourceId, name: row.company_name, ...row });
                            }}
                            onSendLedger={() =>
                              setSendLedger({
                                name: row.company_name,
                                email: row.email || "",
                              })
                            }
                            deleteLabel="Delete Party"
                            onDelete={() =>
                              setDeleteTarget({
                                id: row.sourceId,
                                scope: "party",
                                kind: row.kind,
                                name: row.company_name,
                                title: "Delete Party",
                                message: `Are you sure you want to delete ${row.company_name}?`,
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead className="bg-[#f3f3f6] text-[12px] font-semibold text-[#6b6b76]">
                  <tr>
                    {["Account Name", "Account Type", "Description", "Balance", "Action"].map((h) => (
                      <th key={h} className="border-b border-[#e4e4ea] px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-14 text-center text-sm text-[#9a9aa5]">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row) => (
                      <tr key={row.id} className="border-b border-[#ececf0] hover:bg-[#fafafa]">
                        <td className="px-4 py-3 font-semibold text-[#1a1a1f]">{row.name}</td>
                        <td className="px-4 py-3 text-[#4a4a55]">{row.account_type}</td>
                        <td className="px-4 py-3 text-[#4a4a55]">{row.description || "—"}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold">
                          {Number(row.balance || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <ActionIcons
                            onView={() =>
                              navigate(`/accounts/ledger/${tab === "cash" ? "cash" : "other"}/${row.id}`, {
                                state: {
                                  name: row.name,
                                  balance: row.balance || 0,
                                },
                              })
                            }
                            onEdit={() => {
                              if (tab === "cash") {
                                setEditCashAccount(row);
                                setBankCashOpen(true);
                                return;
                              }
                              if (tab === "other") {
                                setEditOtherAccount(row);
                                setExpenseIncomeOpen(true);
                                return;
                              }
                              addToast(`Edit ${row.name}`, "info");
                            }}
                            onSendLedger={() =>
                              setSendLedger({
                                name: row.name,
                                email: "",
                              })
                            }
                            deleteLabel="Delete Transaction"
                            onDelete={() =>
                              setDeleteTarget({
                                id: row.id,
                                scope: tab === "cash" ? "cash" : "other",
                                name: row.name,
                                title: tab === "cash" ? "Delete Bank" : "Delete Account",
                                message:
                                  tab === "cash"
                                    ? "Are you sure you want to delete this bank?"
                                    : "Are you sure you want to delete this account?",
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      </div>

      <AddLedgerCustomerModal
        open={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onSaved={() => load()}
      />
      <AddLedgerCustomerModal
        open={Boolean(editCustomer)}
        customer={editCustomer}
        onClose={() => setEditCustomer(null)}
        onSaved={() => load()}
      />
      <AddLedgerVendorModal
        open={addVendorOpen}
        onClose={() => setAddVendorOpen(false)}
        onSaved={() => load()}
      />
      <AddLedgerVendorModal
        open={Boolean(editVendor)}
        vendor={editVendor}
        onClose={() => setEditVendor(null)}
        onSaved={() => load()}
      />
      <SendLedgerModal
        open={Boolean(sendLedger)}
        onClose={() => setSendLedger(null)}
        partyName={sendLedger?.name || ""}
        partyEmail={sendLedger?.email || ""}
      />
      <DownloadLedgerModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        onDownload={onDownload}
      />
      <SendLedgerMailModal
        open={mailOpen}
        onClose={() => setMailOpen(false)}
      />
      <AdjustBalanceModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        accounts={cashAccounts}
        onConfirm={onAdjustBalance}
      />
      <ContraEntryModal
        open={contraOpen}
        onClose={() => setContraOpen(false)}
        accounts={cashAccounts}
        onConfirm={onContraEntry}
      />
      <AddBankCashModal
        open={bankCashOpen}
        account={editCashAccount}
        onClose={() => {
          setBankCashOpen(false);
          setEditCashAccount(null);
        }}
        onSave={addCashAccount}
      />
      <AddExpenseIncomeModal
        open={expenseIncomeOpen}
        account={editOtherAccount}
        onClose={() => {
          setExpenseIncomeOpen(false);
          setEditOtherAccount(null);
        }}
        onSave={saveOtherAccount}
      />
      <DeleteBankModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.title || "Delete Bank"}
        message={deleteTarget?.message || "Are you sure you want to delete this bank?"}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
