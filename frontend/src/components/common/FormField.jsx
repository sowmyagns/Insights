import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const inputBase =
  "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const labelBase = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

export function FormField({ label, error, hint, required, children }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className={labelBase}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function Input({
  label,
  error,
  hint,
  required,
  icon: Icon,
  type = "text",
  className = "",
  onFocus,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (visible ? "text" : "password") : type;

  const handleFocus = (e) => {
    const target = e.target;
    onFocus?.(e);
    setTimeout(() => {
      try {
        target.select();
      } catch (err) {}
    }, 0);
  };

  const handleChange = (e) => {
    if (type === "number" && e.target.value) {
      if (/^0+[1-9]/.test(e.target.value)) {
        e.target.value = e.target.value.replace(/^0+/, "");
      }
    }
    onChange?.(e);
  };

  return (
    <FormField label={label} error={error} hint={hint} required={required}>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        )}
        <input
          type={inputType}
          className={`${inputBase} ${Icon ? "pl-10" : ""} ${isPassword ? "pr-11" : ""} ${error ? "border-red-500 dark:border-red-500" : ""} ${className}`}
          onFocus={handleFocus}
          onChange={handleChange}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40 dark:hover:text-slate-200"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-4 w-4 shrink-0" /> : <Eye className="h-4 w-4 shrink-0" />}
          </button>
        ) : null}
      </div>
    </FormField>
  );
}

export function Select({
  label,
  error,
  hint,
  required,
  options = [],
  placeholder = "Select...",
  className = "",
  ...props
}) {
  return (
    <FormField label={label} error={error} hint={hint} required={required}>
      <select
        className={`${inputBase} ${error ? "border-red-500 dark:border-red-500" : ""} ${className}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

export function Textarea({
  label,
  error,
  hint,
  required,
  rows = 3,
  className = "",
  ...props
}) {
  return (
    <FormField label={label} error={error} hint={hint} required={required}>
      <textarea
        rows={rows}
        className={`${inputBase} resize-y min-h-[80px] ${error ? "border-red-500 dark:border-red-500" : ""} ${className}`}
        {...props}
      />
    </FormField>
  );
}

export function FormRow({ children, className = "" }) {
  return (
    <div className={`grid gap-4 ${className.includes("grid-cols") ? className : `sm:grid-cols-2 ${className}`}`.trim()}>
      {children}
    </div>
  );
}
