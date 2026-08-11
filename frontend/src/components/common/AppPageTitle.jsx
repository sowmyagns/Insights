/**
 * Single app chrome page title — rendered in Navbar for every shell route.
 * Titles come from getPageTitle(pathname) / breadcrumb pathLabels.
 */
export default function AppPageTitle({ title }) {
  return (
    <h1 className="truncate text-base font-bold tracking-tight text-[#002C66] dark:text-slate-100 sm:text-lg">
      {title}
    </h1>
  );
}
