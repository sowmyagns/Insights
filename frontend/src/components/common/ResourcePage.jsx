import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AdminModal from "../admin/AdminModal";
import DataTable from "./DataTable";
import EmptyState from "./EmptyState";
import PageHeader from "./PageHeader";
import SkeletonTable from "./SkeletonTable";
import { ErrorState, OfflineState } from "./states";
import useAuth from "../../hooks/useAuth";
import usePageRefresh from "../../hooks/usePageRefresh";
import { useNetworkStatus } from "../../context/NetworkStatusContext";
import { useToast } from "../../context/ToastContext";

/**
 * Generic list + create page for simple CRUD-style modules.
 * Handles loading (skeleton), error+retry, offline, empty, no-results,
 * form validation, and success toast.
 */
export default function ResourcePage({
  title,
  subtitle,
  columns,
  fetcher,
  createFn,
  fields: fieldsProp,
  formFields,
  searchKeys = [],
  filters = [],
  createLabel = "+ New",
  emptyTitle = "Nothing here yet",
  emptyDescription = "Records will appear here once created.",
  emptyIcon = "clipboard",
  rowActions,
  transformPayload,
}) {
  const fields = fieldsProp || formFields || [];
  const { user } = useAuth();
  const { addToast } = useToast();
  const { online, markRequestStart, markRequestEnd, registerRetry } = useNetworkStatus();
  const tenantId = user?.tenant_id ?? 1;

  // Operators are read-only — hide all create / edit / delete actions
  const isOperator = (user?.role ?? user?.role_name ?? "").toLowerCase() === "operator";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  const initialForm = useMemo(() => {
    const f = {};
    fields.forEach((field) => {
      f[field.name] = field.default ?? field.defaultValue ?? "";
    });
    return f;
  }, [fields]);

  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; }, [fetcher]);

  const reload = useCallback(async ({ soft = false } = {}) => {
    if (!soft) setLoading(true);
    setLoadError("");
    markRequestStart();
    try {
      const res = await fetcherRef.current();
      if (res && res.data !== undefined) {
        const fetched = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setRows(fetched);
      } else {
        setRows([]);
      }
    } catch (err) {
      if (soft) {
        // Keep existing rows on soft refresh failure.
        const detail = err.response?.data?.detail;
        setLoadError(
          typeof detail === "string"
            ? detail
            : !navigator.onLine
              ? "You appear to be offline."
              : "Failed to load data"
        );
        throw err;
      } else {
        const detail = err.response?.data?.detail;
        setLoadError(
          typeof detail === "string"
            ? detail
            : !navigator.onLine
              ? "You appear to be offline."
              : "Failed to load data"
        );
        setRows([]);
      }
    } finally {
      markRequestEnd();
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markRequestStart, markRequestEnd]);

  const softReload = useCallback(() => reload({ soft: true }), [reload]);

  useEffect(() => {
    reload();
  // only run on mount (reload is stable)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => registerRetry(reload), [registerRetry, reload]);
  usePageRefresh(softReload);

  const openModal = () => {
    setForm(initialForm);
    setFieldErrors({});
    setOpen(true);
  };

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const buildPayload = () => {
    const values = { ...form };
    fields.forEach((field) => {
      const v = values[field.name];
      if (field.type === "number") {
        values[field.name] = v === "" || v == null ? null : Number(v);
      } else if (field.type === "datetime") {
        values[field.name] = v ? new Date(v).toISOString() : new Date().toISOString();
      } else if (field.type === "date") {
        values[field.name] = v === "" || v == null ? null : v;
      } else if (v === "") {
        values[field.name] = field.required ? v : null;
      }
    });
    const base = { tenant_id: tenantId, ...values };
    return transformPayload ? transformPayload(base) : base;
  };

  const validateForm = () => {
    const errors = {};
    fields.forEach((f) => {
      const v = form[f.name];
      if (f.required && (v === "" || v == null)) {
        errors[f.name] = `${f.label} is required`;
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      addToast("Please fix the highlighted fields", "error");
      return;
    }
    setSaving(true);
    try {
      await createFn(buildPayload());
      addToast("Created successfully", "success");
      setOpen(false);
      await reload();
    } catch (err) {
      const detail = err.response?.data?.detail;
      addToast(typeof detail === "string" ? detail : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const tableColumns = rowActions && !isOperator
    ? [
        ...columns,
        {
          key: "__actions",
          label: "Actions",
          render: (row) => rowActions(row, reload),
        },
      ]
    : columns;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          createFn && !isOperator ? (
            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {createLabel}
            </button>
          ) : null
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {loading ? (
          <SkeletonTable rows={6} cols={Math.min(columns.length || 5, 6)} />
        ) : !online && loadError ? (
          <OfflineState onRetry={reload} />
        ) : loadError ? (
          <ErrorState description={loadError} onRetry={reload} />
        ) : (
          <DataTable
            columns={tableColumns}
            data={rows}
            searchPlaceholder="Search..."
            searchKeys={searchKeys}
            filters={filters}
            emptyState={
              <EmptyState
                icon={emptyIcon}
                title={emptyTitle}
                description={emptyDescription}
                actionLabel={createFn ? createLabel.replace(/^\+\s*/, "") : undefined}
                onAction={createFn ? openModal : undefined}
              />
            }
          />
        )}
      </div>

      {createFn && !isOperator && (
        <AdminModal title={title} subtitle="Create a new record" open={open} onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((field) => {
                const invalid = Boolean(fieldErrors[field.name]);
                const inputClass = `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 dark:bg-slate-700 dark:text-slate-100 ${
                  invalid
                    ? "border-red-400 focus:ring-red-400 dark:border-red-500"
                    : "border-slate-300 focus:ring-teal-500 dark:border-slate-600"
                }`;
                return (
                  <div key={field.name} className={field.full ? "sm:col-span-2" : ""}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {field.label}
                      {field.required && <span className="text-red-500"> *</span>}
                    </label>
                    {field.type === "select" ? (
                      <select
                        value={form[field.name] ?? ""}
                        onChange={(e) => setField(field.name, e.target.value)}
                        aria-invalid={invalid}
                        className={inputClass}
                      >
                        <option value="">Select...</option>
                        {(field.options || []).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={form[field.name] ?? ""}
                        onChange={(e) => setField(field.name, e.target.value)}
                        rows={3}
                        placeholder={field.placeholder}
                        aria-invalid={invalid}
                        className={inputClass}
                      />
                    ) : (
                      <input
                        type={
                          field.type === "datetime"
                            ? "datetime-local"
                            : field.type || "text"
                        }
                        step={field.step}
                        value={form[field.name] ?? ""}
                        onChange={(e) => setField(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        aria-invalid={invalid}
                        className={inputClass}
                      />
                    )}
                    {invalid ? (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors[field.name]}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
