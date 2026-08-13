/** Shared Settings UI primitives */

export function SettingsCard({ title, description, icon: Icon, soft, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-3.5 ui-card p-4 text-left transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${soft}`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <span
            aria-hidden
            className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-700 dark:text-slate-600 dark:group-hover:text-teal-400"
          >
            →
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </button>
  );
}

export function PanelShell({ title, description, children, actions, eyebrow = "Settings" }) {
  return (
    <div className="animate-in fade-in slide-in-from-right-2 space-y-5 duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="ui-eyebrow">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-0.5 ui-title">
            {title}
          </h2>
          {description && (
            <p className="ui-subtitle">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function SectionCard({ title, children, className = "" }) {
  return (
    <section
      className={`ui-card p-5 sm:p-6 ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, className = "" }) {
  return (
    <label className={`block text-sm font-medium text-slate-700 dark:text-slate-300 ${className}`}>
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputClass =
  "ui-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

export function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/80">
      <span>
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{description}</span>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
      />
    </label>
  );
}

export function SkeletonCards({ count = 9 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[4.5rem] animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
        />
      ))}
    </div>
  );
}
