import { Check, Trash2 } from "lucide-react";

const TYPE_STYLES = {
  information: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-800",
  error: "bg-red-50 text-red-700",
  production: "bg-indigo-50 text-indigo-700",
  inventory: "bg-orange-50 text-orange-700",
  quality: "bg-violet-50 text-violet-700",
  maintenance: "bg-sky-50 text-sky-700",
  sales: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  hr: "bg-pink-50 text-pink-700",
  finance: "bg-yellow-50 text-yellow-800",
  system: "bg-slate-100 text-slate-600",
};

const PRIORITY_DOT = {
  low: "bg-slate-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationItem({
  notification,
  onOpen,
  onMarkRead,
  onDelete,
}) {
  const isRead = notification.is_read ?? notification.read;
  const typeStyle = TYPE_STYLES[notification.type] || TYPE_STYLES.information;
  const priorityDot = PRIORITY_DOT[notification.priority] || PRIORITY_DOT.medium;

  return (
    <li
      className={`group border-b border-slate-100 last:border-b-0 ${
        isRead ? "bg-white opacity-75" : "bg-blue-50/40"
      }`}
    >
      <div className="flex items-start gap-2 px-3 py-3">
        <button
          type="button"
          onClick={() => onOpen(notification)}
          className="flex min-w-0 flex-1 gap-3 text-left hover:opacity-90"
        >
          <span
            className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
              isRead ? "bg-slate-300" : priorityDot
            }`}
          />
          <span className="min-w-0 flex-1">
            <span className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${typeStyle}`}>
                {notification.type}
              </span>
              {notification.module && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {notification.module}
                </span>
              )}
            </span>
            <p className={`truncate text-sm ${isRead ? "font-medium text-slate-600" : "font-semibold text-slate-900"}`}>
              {notification.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notification.message}</p>
            <p className="mt-1 text-[10px] text-slate-400">
              {formatDate(notification.created_at)}
              {notification.created_by ? ` · ${notification.created_by}` : ""}
            </p>
          </span>
        </button>
        <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {!isRead && (
            <button
              type="button"
              title="Mark as read"
              onClick={() => onMarkRead(notification)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-[#2563EB]"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            title="Delete"
            onClick={() => onDelete(notification)}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}
