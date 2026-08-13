import useAuth from "../../../hooks/useAuth";

export default function DashboardHero({ now }) {
  const { user } = useAuth();

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1e293b] to-[#0f3460] p-6 text-white shadow-[0_8px_32px_rgba(15,23,42,0.25)] sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--color-primary)]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[#22C55E]/15 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-200/90">{greeting}, {user?.name || "Admin"}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Insights Iva Command Center
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-300">
            Unified view of production, inventory, quality, and shop floor performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">Live Status</p>
            <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Plant Operational
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">Date & Time</p>
            <p className="mt-0.5 text-sm font-medium">{dateStr}</p>
            <p className="text-lg font-bold tabular-nums">{timeStr}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
