/**
 * Single app chrome page title — rendered in Navbar for every shell route.
 * Titles come from getPageTitle(pathname) / breadcrumb pathLabels.
 */
export default function AppPageTitle({ title }) {
  return (
    <h1 className="truncate text-[var(--text-lg)] font-bold tracking-[var(--tracking-tight)] text-[var(--color-text)] sm:text-[var(--text-xl)]">
      {title}
    </h1>
  );
}
