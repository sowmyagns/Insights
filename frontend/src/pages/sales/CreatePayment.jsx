import { useEffect, useState } from "react";
import { ArrowLeft, IndianRupee, ReceiptText, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import Loader from "../../components/common/Loader";
import { getInvoices, createPayment } from "../../api/salesApi";
import useTenantId from "../../hooks/useTenantId";
import { useToast } from "../../context/ToastContext";
import {
  MANUFACTURING_EVENTS,
  notifyManufacturingSpine,
} from "../../utils/manufacturingEvents";

const inputClass = "ui-input mt-1.5";

export default function CreatePayment({ onClose } = {}) {
  const tenantId = useTenantId();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();
  const preselectedInvoice = searchParams.get("invoice_id");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState({
    tenant_id: tenantId,
    invoice_id: preselectedInvoice || "",
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    method: "cash",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getInvoices(tenantId)
      .then((r) => {
        const d = r?.data;
        setInvoices(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load invoices right now.");
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (error) setError("");
  };

  const closeForm = () => {
    if (onClose) {
      onClose();
      return;
    }
    navigate("/sales/payments");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await createPayment({
        ...form,
        tenant_id: tenantId,
        invoice_id: Number(form.invoice_id),
        amount: Number(form.amount),
      });

      notifyManufacturingSpine(MANUFACTURING_EVENTS.PAYMENT_RECORDED, {
        payment_id: res.data?.id,
        invoice_id: Number(form.invoice_id),
      });

      addToast("Payment recorded — AR journal posted");
      if (onClose) {
        onClose();
      } else {
        navigate("/sales/payments");
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message;
      setError(
        typeof detail === "string"
          ? detail
          : "Failed to record payment. Please check the form and try again."
      );
      addToast(detail || "Payment failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading..." />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-xl">
        <div className="ui-card overflow-hidden shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-600">
                <ReceiptText className="h-4 w-4" />
                Payment
              </div>
              <h2 className="mt-2 text-[1.4rem] font-bold leading-tight text-slate-900">Record Payment</h2>
              <p className="mt-1 text-sm text-slate-500">
                Capture customer payment details and record the settlement against an invoice.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                Invoice <span className="text-red-500">*</span>
                <select
                  value={form.invoice_id}
                  onChange={setField("invoice_id")}
                  required
                  className={inputClass}
                >
                  <option value="">Select invoice</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.customer_name || "N/A"} — ₹
                      {(Number(inv.grand_total) || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Amount <span className="text-red-500">*</span>
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={setField("amount")}
                    required
                    placeholder="0.00"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Payment Date <span className="text-red-500">*</span>
                <input
                  type="date"
                  value={form.payment_date}
                  onChange={setField("payment_date")}
                  required
                  className={inputClass}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Payment Method
                <select value={form.method} onChange={setField("method")} className={inputClass}>
                  {["cash", "bank", "upi", "card", "neft"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                Notes
                <textarea
                  value={form.notes}
                  onChange={setField("notes")}
                  rows={3}
                  placeholder="Add payment reference or remarks"
                  className={`${inputClass} resize-none`}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
              <button type="button" onClick={closeForm} className="ui-btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="ui-btn-hr">
                <ReceiptText className="h-4 w-4" />
                {saving ? "Saving..." : "Save Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
