import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * In-page toolbar under the global Navbar title.
 * Page name lives in Navbar via getPageTitle — avoid repeating it here unless showTitle.
 */
export default function PageHeader({
  title,
  subtitle,
  action,
  backTo,
  backLabel = "Back",
  eyebrow,
  showTitle = false,
}) {
  const hasBody = Boolean(backTo || eyebrow || (showTitle && title) || subtitle || action);
  if (!hasBody) return null;

  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        )}
        {eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}
        {showTitle && title ? (
          <h2 className={`${eyebrow ? "mt-0.5" : ""} ui-title`}>
            {title}
          </h2>
        ) : null}
        {subtitle && (
          <p className={`${showTitle && title ? "mt-1" : ""} ui-subtitle`}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </header>
  );
}
