import { useState } from "react";
import { Info, RefreshCw, Shield } from "lucide-react";

const DATA_SCOPE_OPTIONS = ["All data", "My data", "Team data"];
const FREQUENCY_OPTIONS = ["Daily", "Weekly", "Monthly"];

const ALERTS = [
  { id: "min-stock", name: "Minimum Stock Level", hasDataScope: false },
  { id: "max-stock", name: "Maximum Stock Level", hasDataScope: false },
  { id: "overdue-sales", name: "Overdue Sales Order", hasDataScope: true },
  { id: "overdue-purchase", name: "Overdue Purchase, Service and Sub-Contract Order", hasDataScope: true },
  { id: "overdue-payable", name: "Overdue Payable", hasDataScope: true },
  { id: "overdue-receivable", name: "Overdue Receivable", hasDataScope: true },
  { id: "pending-inv-approval", name: "Pending Inventory Approval", hasDataScope: true },
  { id: "pending-doc-approval", name: "Pending Document Approval", hasDataScope: true },
  { id: "pending-fg-testing", name: "Pending FG Testing", hasDataScope: true },
  { id: "prod-process-complete", name: "Production Process Complete", hasDataScope: true },
  { id: "oc-price-less", name: "OC Item Price less than Item Master Default Price", hasDataScope: true },
  { id: "po-price-greater", name: "PO Item Price greater than Item Master Default Price", hasDataScope: true },
  { id: "price-diff-invoice-oc", name: "Price difference between Invoice and OC Item(s)", hasDataScope: true },
  { id: "price-diff-po-supplier", name: "Price difference between Previous and Current PO Item(s) : Supplier-wise", hasDataScope: true },
  { id: "price-diff-po-all", name: "Price difference between Previous and Current PO Item(s) : Across all suppliers", hasDataScope: true },
  { id: "price-diff-invoice-po", name: "Price difference between Purchase Invoice and PO/SO Item(s)", hasDataScope: true },
  { id: "item-total-diff", name: "Item total difference between Purchase Invoice and PO/SO (Total Amount Before Tax)", hasDataScope: true },
  { id: "po-indent-qty", name: "PO vs Indent Quantity Difference", hasDataScope: true },
  { id: "barcode-expiry", name: "Barcode Expiry for Items", hasDataScope: true },
  { id: "work-order-process", name: "List of Work Orders Where Process Stage Open", hasDataScope: true },
  { id: "mismatch-invoice-qty", name: "Mismatch between Purchase Invoice and PO/SO Quantity", hasDataScope: true },
  { id: "mismatch-inward-qty", name: "Mismatch between Inward and PO Quantity", hasDataScope: true },
  { id: "next-action-sq", name: "Next Action Date for SQ/SE Documents", hasDataScope: true },
  { id: "due-tasks", name: "Due Tasks", hasDataScope: false },
];

export default function SettingsAlertsPreferences() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [whatsappPhone, setWhatsappPhone] = useState("6302828004");
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [alerts, setAlerts] = useState(
    Object.fromEntries(ALERTS.map((a) => [a.id, { enabled: false, dataScope: "All data", frequency: "Daily" }]))
  );

  const updateAlert = (id, key, value) => {
    setAlerts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }));
  };

  const Toggle = ({ checked, onChange }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
        checked ? "bg-teal-600" : "bg-slate-200 dark:bg-slate-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <div className="mx-auto max-w-4xl">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Alerts & Preferences
        </h1>
        <Info className="h-4 w-4 text-slate-400" />
      </div>

      {/* Preferences Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">
          Preferences
        </h2>
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Enable email alerts
            </span>
            <Toggle checked={emailAlerts} onChange={setEmailAlerts} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Enable WhatsApp alerts
            </span>
            <Toggle checked={whatsappAlerts} onChange={setWhatsappAlerts} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Whatsapp Phone No. <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              placeholder="Enter phone number"
              className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={whatsappConsent}
              onChange={(e) => setWhatsappConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              I agree to receive Insights Iva account related information on WhatsApp
            </span>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-green-100 text-green-600 dark:bg-green-900/40">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </span>
          </label>
        </div>
      </div>

      {/* Alert Types Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-base font-semibold text-slate-800 dark:text-slate-100">
          Alert Types
        </h2>
        <div className="space-y-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {ALERTS.map((alert) => (
            <div
              key={alert.id}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0 dark:border-slate-700/50"
            >
              <span className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-300">
                {alert.name}
              </span>
              <div className="flex items-center gap-3">
                {alert.hasDataScope && (
                  <>
                    <button
                      type="button"
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="Refresh"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <select
                      value={alerts[alert.id]?.dataScope ?? "All data"}
                      onChange={(e) => updateAlert(alert.id, "dataScope", e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {DATA_SCOPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </>
                )}
                {!alert.hasDataScope && (
                  <button
                    type="button"
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                <select
                  value={alerts[alert.id]?.frequency ?? "Daily"}
                  onChange={(e) => updateAlert(alert.id, "frequency", e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <Toggle
                  checked={alerts[alert.id]?.enabled ?? false}
                  onChange={(v) => updateAlert(alert.id, "enabled", v)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Settings */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
        >
          Save Settings
        </button>
        <span className="inline-flex items-center gap-1 rounded border border-teal-600 bg-[var(--color-success-soft)] px-2 py-0.5 text-xs font-medium text-[var(--color-success)] dark:border-teal-500 dark:bg-teal-900/30 dark:text-teal-400">
          <Shield className="h-3.5 w-3.5" />
          PRO
        </span>
      </div>

      {/* Feedback */}
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-900/20">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          Don&apos;t see the alert you are looking for?{" "}
          <a href="#" className="font-medium text-teal-600 hover:underline dark:text-teal-400">
            Let us know &gt;
          </a>
        </p>
      </div>
    </div>
  );
}
