import { useCallback } from "react";

import ResourcePage from "../../components/common/ResourcePage";
import { StatusBadge } from "../../components/common/Table";
import { useToast } from "../../context/ToastContext";
import { getAlerts, createAlert, acknowledgeAlert } from "../../api/alertsApi";

const ALERT_TYPES = [
  { value: "low_stock", label: "Low Stock" },
  { value: "machine_failure", label: "Machine Failure" },
  { value: "production_delay", label: "Production Delay" },
  { value: "maintenance", label: "Maintenance" },
  { value: "quality", label: "Quality" },
  { value: "general", label: "General" },
];

const SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export default function AlertsView({
  title,
  subtitle,
  alertType = null,
  allowCreate = true,
  syncOnLoad = false,
}) {
  const { addToast } = useToast();

  const fetcher = useCallback(
    () =>
      getAlerts(
        alertType
          ? { alert_type: alertType, sync_low_stock: syncOnLoad || alertType === "low_stock" }
          : {}
      ),
    [alertType, syncOnLoad]
  );

  const rowActions = useCallback(
    (row, reload) => {
      if (row.status === "acknowledged" || row.status === "resolved") {
        return <span className="text-xs text-slate-400">Acknowledged</span>;
      }
      return (
        <button
          type="button"
          onClick={async () => {
            try {
              await acknowledgeAlert(row.id);
              addToast("Alert acknowledged");
              await reload();
            } catch (err) {
              addToast(err.response?.data?.detail || "Failed to acknowledge", "error");
            }
          }}
          className="rounded-lg border border-teal-200 px-3 py-1 text-xs font-medium text-[var(--color-success)] hover:bg-[var(--color-success-soft)] dark:border-teal-800 dark:text-teal-300"
        >
          Acknowledge
        </button>
      );
    },
    [addToast]
  );

  return (
    <ResourcePage
      title={title}
      subtitle={subtitle}
      fetcher={fetcher}
      createFn={allowCreate ? createAlert : undefined}
      createLabel="+ New Alert"
      emptyTitle="No alerts"
      emptyDescription="You're all caught up. New alerts will appear here."
      searchKeys={["title", "message"]}
      filters={[
        {
          key: "severity",
          label: "Severity",
          placeholder: "All severities",
          options: SEVERITIES,
        },
        {
          key: "status",
          label: "Status",
          placeholder: "All statuses",
          options: [
            { value: "active", label: "Active" },
            { value: "acknowledged", label: "Acknowledged" },
            { value: "resolved", label: "Resolved" },
          ],
        },
      ]}
      columns={[
        { key: "title", label: "Title" },
        { key: "alert_type", label: "Type" },
        {
          key: "severity",
          label: "Severity",
          render: (r) => <StatusBadge status={r.severity} />,
        },
        {
          key: "status",
          label: "Status",
          render: (r) => <StatusBadge status={r.status} />,
        },
        { key: "triggered_at", label: "Triggered" },
      ]}
      rowActions={rowActions}
      fields={[
        { name: "title", label: "Title", required: true, full: true },
        {
          name: "alert_type",
          label: "Type",
          type: "select",
          required: true,
          default: alertType || "general",
          options: ALERT_TYPES,
        },
        {
          name: "severity",
          label: "Severity",
          type: "select",
          default: "medium",
          options: SEVERITIES,
        },
        { name: "triggered_at", label: "Triggered At", type: "datetime", required: true },
        { name: "message", label: "Message", type: "textarea", full: true },
      ]}
    />
  );
}
