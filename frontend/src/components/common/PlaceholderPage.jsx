import { Construction, ArrowLeft, LayoutDashboard } from "lucide-react";
import Button from "./Button";

/**
 * Friendly "coming soon" / empty module page – consistent UX across placeholder routes.
 */
export default function PlaceholderPage({ title, description }) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="ui-card overflow-hidden p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-success-soft)] dark:bg-teal-900/30">
          <Construction className="h-7 w-7 text-teal-600 dark:text-teal-400" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="ui-hint mx-auto mt-3 max-w-sm">
          {description || `${title} is not available yet. We're building it to keep your workflow smooth.`}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" to="/">
            <LayoutDashboard className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}
