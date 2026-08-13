import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-teal-600 dark:text-teal-400">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        The page you are looking for does not exist or you may not have permission to view it.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-success)]"
        >
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    </div>
  );
}
