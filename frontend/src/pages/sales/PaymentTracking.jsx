import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import Loader from "../../components/common/Loader";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import Table from "../../components/common/Table";
import { getPayments, getInvoices } from "../../api/salesApi";
import useTenantId from "../../hooks/useTenantId";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import { formatInr } from "../../data/salesMasterData";

export default function PaymentTracking() {
  const tenantId = useTenantId();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getPayments(tenantId), getInvoices(tenantId)])
      .then(([pr, ir]) => {
        setPayments(pr.data || []);
        setInvoices(ir.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  useManufacturingRefresh(load);

  const invMap = Object.fromEntries((invoices || []).map((i) => [i.id, i]));

  if (loading) return <Loader label="Loading payments..." />;

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">Sales</p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Payment Tracking</h2>
          <p className="mt-1 text-sm text-slate-500">
            Payments update invoice balances, income, and AR journal entries.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/sales/payments/create" className="ui-btn-primary">
            <Plus className="h-4 w-4" /> Record Payment
          </Link>
        </div>
      </div>

      <ManufacturingWorkflowBar currentStepId="payment" />

      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <Table
          columns={[
            { key: "id", label: "Payment#" },
            {
              key: "invoice_id",
              label: "Invoice",
              render: (r) => invMap[r.invoice_id]?.invoice_number ?? `INV-${r.invoice_id}`,
            },
            { key: "payment_date", label: "Date" },
            {
              key: "amount",
              label: "Amount",
              render: (r) => formatInr(r.amount),
            },
            { key: "method", label: "Method" },
            { key: "notes", label: "Notes" },
          ]}
          data={payments}
        />
      </div>
    </div>
  );
}
