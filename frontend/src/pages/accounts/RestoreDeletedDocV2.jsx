import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownWideNarrow, CalendarDays, ChevronLeft, ChevronRight, Filter, RotateCcw, Search, Trash2, X } from "lucide-react";

import { useToast } from "../../context/ToastContext";

const PAGE_BG = "var(--color-bg)";
const ACCENT = "#0f6d84";

const DOC_TYPES = [
  "All Documents",
  "Invoice",
  "Quotation",
  "Proforma Invoice",
  "E-Way Bill",
  "Purchase",
  "Delivery Challan",
  "Credit Note",
  "Debit Note",
  "Payment Receipt",
  "Payment Made",
  "Purchase Order",
];

const SORT_OPTIONS = [
  { id: "recent", label: "Recently deleted" },
  { id: "name-asc", label: "Item name - A to Z" },
  { id: "name-desc", label: "Item name - Z to A" },
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toIso(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDisplayDate(iso) {
  if (!iso) return "dd/mm/yyyy";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function parseIso(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fyRange(forDate = new Date()) {
  const y = forDate.getFullYear();
  const m = forDate.getMonth();
  const startY = m >= 3 ? y : y - 1;
  return {
    from: `${startY}-04-01`,
    to: `${startY + 1}-03-31`,
  };
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function MonthCalendar({ monthDate, rangeFrom, rangeTo, onPick }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const total = daysInMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= total; d += 1) cells.push(d);

  const from = parseIso(rangeFrom);
  const to = parseIso(rangeTo);

  const label = monthDate.toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="min-w-[220px]">
      <div className="mb-2 text-center text-[13px] font-semibold text-[#1a1a1f]">{label}</div>
      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-[#9a9aa5]">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="h-8" />;
          const iso = `${year}-${pad2(month + 1)}-${pad2(day)}`;
          const date = new Date(year, month, day);
          const inRange =
            from && to && date >= from && date <= to
              ? true
              : from && !to && iso === rangeFrom;
          const isEdge = iso === rangeFrom || iso === rangeTo;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPick(iso)}
              className={`h-8 rounded-md text-[12px] ${
                isEdge
                  ? "bg-[#0f6d84] font-semibold text-[#1a1a1f]"
                  : inRange
                    ? "bg-[#fff6d0] text-[#1a1a1f]"
                    : "text-[#1a1a1f] hover:bg-[#f3f3f6]"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [leftMonth, setLeftMonth] = useState(() => startOfMonth(parseIso(from) || new Date()));
  const [activePreset, setActivePreset] = useState("FY current");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setDraftFrom(from);
    setDraftTo(to);
  }, [open, from, to]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const presets = useMemo(() => {
    const now = new Date();
    const today = toIso(now);
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(lastWeekStart.getDate() - 6);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const q = Math.floor(now.getMonth() / 3);
    const lastQStartMonth = (q - 1 + 4) % 4 * 3;
    const lastQYear = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastQStart = new Date(lastQYear, lastQStartMonth, 1);
    const lastQEnd = new Date(lastQYear, lastQStartMonth + 3, 0);
    const fyNow = fyRange(now);
    const fyPrevStart = Number(fyNow.from.slice(0, 4)) - 1;
    return [
      { id: "Today", from: today, to: today },
      { id: "Yesterday", from: toIso(yest), to: toIso(yest) },
      { id: "Last week", from: toIso(lastWeekStart), to: today },
      { id: "Last month", from: toIso(lastMonthStart), to: toIso(lastMonthEnd) },
      { id: "Last quarter", from: toIso(lastQStart), to: toIso(lastQEnd) },
      {
        id: `FY ${String(fyPrevStart).slice(2)}-${String(fyPrevStart + 1).slice(2)}`,
        from: `${fyPrevStart}-04-01`,
        to: `${fyPrevStart + 1}-03-31`,
      },
      {
        id: `FY ${String(fyPrevStart + 1).slice(2)}-${String(fyPrevStart + 2).slice(2)}`,
        from: fyNow.from,
        to: fyNow.to,
      },
      { id: "All Time", from: "2000-01-01", to: today },
    ];
  }, []);

  const pickDay = (iso) => {
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(iso);
      setDraftTo("");
      setActivePreset("");
      return;
    }
    if (iso < draftFrom) {
      setDraftTo(draftFrom);
      setDraftFrom(iso);
    } else {
      setDraftTo(iso);
    }
    setActivePreset("");
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-[#d8d8e0] bg-white px-3 py-2 text-[13px] text-[#1a1a1f] shadow-sm"
      >
        <CalendarDays className="h-4 w-4 text-[#9a9aa5]" />
        <span>
          {formatDisplayDate(from)} → {formatDisplayDate(to)}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-40 flex overflow-hidden rounded-xl border border-[#e4e4ea] bg-white shadow-2xl">
          <div className="w-[150px] border-r border-[#ececf0] bg-[#fafafa] py-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setDraftFrom(p.from);
                  setDraftTo(p.to);
                  setActivePreset(p.id);
                  setLeftMonth(startOfMonth(parseIso(p.from) || new Date()));
                }}
                className={`block w-full px-3 py-2 text-left text-[13px] ${
                  activePreset === p.id
                    ? "bg-[#fff6d0] font-semibold text-[#1a1a1f]"
                    : "text-[#4a4a55] hover:bg-[#f3f3f6]"
                }`}
              >
                {p.id}
              </button>
            ))}
          </div>
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setLeftMonth((m) => addMonths(m, -1))}
                className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f3f3f6]"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setLeftMonth((m) => addMonths(m, 1))}
                className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f3f3f6]"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-6">
              <MonthCalendar
                monthDate={leftMonth}
                rangeFrom={draftFrom}
                rangeTo={draftTo}
                onPick={pickDay}
              />
              <MonthCalendar
                monthDate={addMonths(leftMonth, 1)}
                rangeFrom={draftFrom}
                rangeTo={draftTo}
                onPick={pickDay}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!draftFrom || !draftTo) return;
                  onChange({ from: draftFrom, to: draftTo });
                  setOpen(false);
                }}
                className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#1a1a1f]"
                style={{ background: ACCENT }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FiltersDrawer({ open, onClose, selected, onApply }) {
  const [draft, setDraft] = useState(selected);

  useEffect(() => {
    if (open) setDraft(selected);
  }, [open, selected]);

  if (!open) return null;

  const toggle = (type) => {
    if (type === "All Documents") {
      setDraft(["All Documents"]);
      return;
    }
    let next = draft.filter((x) => x !== "All Documents");
    if (next.includes(type)) next = next.filter((x) => x !== type);
    else next = [...next, type];
    if (!next.length) next = ["All Documents"];
    setDraft(next);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/35"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="flex h-full w-full max-w-[380px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-4">
          <h2 className="text-[18px] font-bold text-[#1a1a1f]">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#6b6b76] hover:bg-[#f3f3f6]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-2 text-[13px] font-semibold text-[#1a1a1f]">Doc. Type</div>
          <div className="flex flex-wrap gap-2">
            {DOC_TYPES.map((type) => {
              const active = draft.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggle(type)}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                    active
                      ? "border-[#93c5fd] bg-[#dbeafe] text-[var(--color-primary-dark)]"
                      : "border-[#d8d8e0] bg-white text-[#4a4a55]"
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-[#ececf0] px-5 py-4">
          <button
            type="button"
            onClick={() => setDraft(["All Documents"])}
            className="rounded-xl bg-[#ececf0] py-3 text-[14px] font-semibold text-[#1a1a1f]"
          >
            Clear Filter
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="rounded-xl py-3 text-[14px] font-semibold text-[#1a1a1f]"
            style={{ background: ACCENT }}
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function RestoreDeletedDocV2() {
  const { addToast } = useToast();
  const defaultFy = useMemo(() => fyRange(new Date()), []);

  const [from, setFrom] = useState(defaultFy.from);
  const [to, setTo] = useState(defaultFy.to);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [docTypes, setDocTypes] = useState(["All Documents"]);
  const [selected, setSelected] = useState([]);
  const [rows, setRows] = useState([]);
  const sortRef = useRef(null);

  useEffect(() => {
    if (!sortOpen) return undefined;
    const onDown = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [sortOpen]);

  const filtered = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          String(r.reference || "").toLowerCase().includes(q) ||
          String(r.party_name || "").toLowerCase().includes(q)
      );
    }
    if (!docTypes.includes("All Documents")) {
      list = list.filter((r) => docTypes.includes(r.doc_type));
    }
    if (sortBy === "name-asc") {
      list.sort((a, b) => String(a.reference || "").localeCompare(String(b.reference || "")));
    } else if (sortBy === "name-desc") {
      list.sort((a, b) => String(b.reference || "").localeCompare(String(a.reference || "")));
    } else {
      list.sort((a, b) => String(b.deleted_at || "").localeCompare(String(a.deleted_at || "")));
    }
    return list;
  }, [rows, search, docTypes, sortBy]);

  const allChecked = filtered.length > 0 && selected.length === filtered.length;

  const toggleAll = () => {
    if (allChecked) setSelected([]);
    else setSelected(filtered.map((r) => r.id));
  };

  const restoreOne = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
    addToast("Document restored", "success");
  };

  const restoreSelected = () => {
    if (!selected.length) return;
    setRows((prev) => prev.filter((r) => !selected.includes(r.id)));
    setSelected([]);
    addToast(`${selected.length} document(s) restored`, "success");
  };

  return (
    <div className="min-h-full" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-3 flex justify-end">
          <DateRangePicker
            from={from}
            to={to}
            onChange={({ from: f, to: t }) => {
              setFrom(f);
              setTo(t);
            }}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#e4e4ea] bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#ececf0] px-4 py-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9aa5]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full rounded-full border border-transparent bg-[#f0f0f4] py-2.5 pl-10 pr-4 text-[13px] outline-none placeholder:text-[#9a9aa5] focus:border-[#c4b5fd] focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#d8d8e0] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f]"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>

            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setSortOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#d8d8e0] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f]"
              >
                <ArrowDownWideNarrow className="h-4 w-4" />
                Sort by
              </button>
              {sortOpen ? (
                <div className="absolute right-0 z-20 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-[#e4e4ea] bg-white py-1 shadow-xl">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.id);
                        setSortOpen(false);
                      }}
                      className={`block w-full px-3 py-2.5 text-left text-[13px] ${
                        sortBy === opt.id
                          ? "bg-[#f3f3f6] font-semibold text-[#1a1a1f]"
                          : "text-[#1a1a1f] hover:bg-[#f7f7fa]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {selected.length > 0 ? (
              <button
                type="button"
                onClick={restoreSelected}
                className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold text-[#1a1a1f]"
                style={{ background: ACCENT }}
              >
                <RotateCcw className="h-4 w-4" />
                Restore ({selected.length})
              </button>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="bg-[#f0f0f4] text-[12px] font-semibold text-[#6b6b76]">
                  <th className="w-12 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-[#cfcfd6]"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3.5 font-semibold">Doc. Reference Info.</th>
                  <th className="px-4 py-3.5 font-semibold">Party Name</th>
                  <th className="px-4 py-3.5 font-semibold">Amount</th>
                  <th className="px-4 py-3.5 font-semibold">Doc. Deleted Date</th>
                  <th className="px-4 py-3.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const checked = selected.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-[#ececf0] text-[13px] text-[#1a1a1f]"
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelected((prev) =>
                              checked ? prev.filter((x) => x !== row.id) : [...prev, row.id]
                            )
                          }
                          className="h-4 w-4 rounded border-[#cfcfd6]"
                        />
                      </td>
                      <td className="px-4 py-3.5">{row.reference}</td>
                      <td className="px-4 py-3.5">{row.party_name}</td>
                      <td className="px-4 py-3.5">{row.amount}</td>
                      <td className="px-4 py-3.5">{row.deleted_at}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => restoreOne(row.id)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f5e9] text-[#16a34a]"
                            title="Restore"
                            aria-label="Restore"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRows((prev) => prev.filter((r) => r.id !== row.id));
                              addToast("Document permanently removed", "success");
                            }}
                            className="grid h-8 w-8 place-items-center rounded-full bg-[#fde8e8] text-[#ef4444]"
                            title="Delete permanently"
                            aria-label="Delete permanently"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <div className="px-4 py-20 text-center text-[13px] text-[#9a9aa5]">
                No data available
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <FiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        selected={docTypes}
        onApply={setDocTypes}
      />
    </div>
  );
}
