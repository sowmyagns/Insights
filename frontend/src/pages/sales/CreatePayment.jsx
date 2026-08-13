import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Loader from "../../components/common/Loader";
import { getInvoices, createPayment } from "../../api/salesApi";
import useTenantId from "../../hooks/useTenantId";
import { useToast } from "../../context/ToastContext";
import {
  MANUFACTURING_EVENTS,
  notifyManufacturingSpine,
} from "../../utils/manufacturingEvents";

export default function CreatePayment() {
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

  useEffect(() => {
    getInvoices(tenantId)
      .then((r) => {
        const d = r?.data;
        setInvoices(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
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
      navigate("/sales/payments");
    } catch (err) {
      addToast(err.response?.data?.detail || "Payment failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading..." />;

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    marginTop: 6,
    border: "1px solid #d1d5db",
    borderRadius: 6,
  };

  return (
    <div style={{ maxWidth: 500 }} className="space-y-4 p-4">
      <h2>Record Payment</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, marginTop: 16 }}>
        <label>
          Invoice *
          <select
            value={form.invoice_id}
            onChange={(e) => setForm((f) => ({ ...f, invoice_id: e.target.value }))}
            required
            style={inputStyle}
          >
            <option value="">Select invoice</option>
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoice_number} — {inv.customer_name || "N/A"} — ₹{(Number(inv.grand_total) || 0).toFixed(2)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount *
          <input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            required
            style={inputStyle}
          />
        </label>
        <label>
          Payment date *
          <input
            type="date"
            value={form.payment_date}
            onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))}
            required
            style={inputStyle}
          />
        </label>
        <label>
          Method
          <select
            value={form.method}
            onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
            style={inputStyle}
          >
            {["cash", "bank", "upi", "card", "neft"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notes
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            style={inputStyle}
            rows={2}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 18px",
            background: "#14b8a6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save payment"}
        </button>
      </form>
    </div>
  );
}
