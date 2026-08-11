import { useCallback, useEffect, useMemo, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { IndianRupee, TrendingDown, Users, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import DataTable from "../../components/common/DataTable";
import FinanceFilters from "../../components/finance/FinanceFilters";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getAREnriched, getARSummary } from "../../api/accountsApi";
import { formatInr, statusColor, agingColor } from "../../data/financeMasterData";

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p>
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

const INITIAL_AR_SUMMARY = {
  total_receivables: 0,
  received_today: 0,
  overdue: 0,
  pending_collection: 0,
  credit_customers: 0,
  aging_0_30: 0,
  aging_31_60: 0,
  aging_61_90: 0,
  aging_90_plus: 0,
};

export default function AccountsReceivable() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(INITIAL_AR_SUMMARY);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [financialYear, setFinancialYear] = useState("All Years");
  const [month, setMonth] = useState("All Months");
  const [branch, setBranch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.allSettled([getARSummary(), getAREnriched()]);

  usePageRefresh(load);

      if (sumRes.status === "fulfilled" && sumRes.value?.data) setSummary(sumRes.value.data);
      if (listRes.status === "fulfilled" && listRes.value?.data) setRows(listRes.value.data);
    } catch {
      setSummary(INITIAL_AR_SUMMARY);
      setRows([]);
      addToast("Failed to load accounts receivable data", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const agingData = [
    { bucket: "0–30 Days", amount: summary.aging_0_30 },
    { bucket: "31–60 Days", amount: summary.aging_31_60 },
    { bucket: "61–90 Days", amount: summary.aging_61_90 },
    { bucket: "90+ Days", amount: summary.aging_90_plus },
  ];

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q && ![r.invoice_number, r.customer_name].some((v) => String(v || "").toLowerCase().includes(q)))
        return false;

      const rowBranch = r.branch || (r.id % 2 === 0 ? "Head Office" : "Plant-1");
      if (branch && rowBranch !== branch) return false;

      const issueDateStr = r.issue_date || "";
      if (!issueDateStr) return true;
      const issueDateObj = new Date(issueDateStr);
      if (isNaN(issueDateObj.getTime())) return true;

      if (financialYear && financialYear !== "All Years") {
        const parts = financialYear.split("-");
        if (parts.length === 2) {
          const startYear = parseInt(parts[0], 10);
          const fyStart = new Date(startYear, 3, 1);
          const fyEnd = new Date(startYear + 1, 2, 31, 23, 59, 59);
          if (issueDateObj < fyStart || issueDateObj > fyEnd) return false;
        }
      }

      if (month && month !== "All Months") {
        const selectedMonthIndex = MONTH_NAMES.indexOf(month);
        if (selectedMonthIndex !== -1 && issueDateObj.getMonth() !== selectedMonthIndex) return false;
      }

      return true;
    });
  }, [rows, search, branch, financialYear, month]);

  const columns = [
    { key: "invoice_number", label: "Invoice No" },
    { key: "customer_name", label: "Customer" },
    { key: "issue_date", label: "Invoice Date", render: (r) => String(r.issue_date || "").slice(0, 10) },
    { key: "due_date", label: "Due Date", render: (r) => String(r.due_date || "").slice(0, 10) },
    { key: "amount", label: "Amount", render: (r) => formatInr(r.amount) },
    { key: "paid", label: "Paid", render: (r) => formatInr(r.paid) },
    { key: "balance", label: "Balance", render: (r) => formatInr(r.balance) },
    { key: "days_overdue", label: "Days Overdue" },
    {
      key: "aging_bucket",
      label: "Aging",
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${agingColor(r.aging_bucket)}`}>
          {r.aging_bucket} days
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColor(r.status)}`}>
          {r.status}
        </span>
      ),
    },
  ];

  if (loading) return <Loader label="Loading accounts receivable..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-500">
            Customer invoices, collections, and aging analysis for finance team.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total Receivables" value={formatInr(summary.total_receivables)} icon={IndianRupee} color="bg-blue-600" />
        <KpiCard label="Received Today" value={formatInr(summary.received_today)} icon={Wallet} color="bg-green-600" />
        <KpiCard label="Overdue" value={formatInr(summary.overdue)} icon={TrendingDown} color="bg-red-500" />
        <KpiCard label="Pending Collection" value={formatInr(summary.pending_collection)} icon={IndianRupee} color="bg-amber-500" />
        <KpiCard label="Credit Customers" value={summary.credit_customers} icon={Users} color="bg-indigo-600" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Customer Aging Report</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {agingData.map((a) => (
            <div key={a.bucket} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-xs font-medium text-slate-500">{a.bucket}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatInr(a.amount)}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatInr(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatInr(v)} />
              <Legend />
              <Bar dataKey="amount" name="Outstanding" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <FinanceFilters
        search={search}
        onSearchChange={setSearch}
        financialYear={financialYear}
        onFinancialYearChange={setFinancialYear}
        month={month}
        onMonthChange={setMonth}
        branch={branch}
        onBranchChange={setBranch}
        searchPlaceholder="Search invoice, customer..."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>
    </div>
  );
}
