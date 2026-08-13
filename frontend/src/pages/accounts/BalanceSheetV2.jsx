import { useEffect, useState } from "react";
import usePageRefresh from "../../hooks/usePageRefresh";
import { createPortal } from "react-dom";
import { Calendar, FileDown, FileText, Info, X } from "lucide-react";

import { getBalanceSheet } from "../../api/accountsApi";
import { REPORT_TYPES, addAccountingReport } from "../../data/accountingReports";
import { useToast } from "../../context/ToastContext";
import useSettings from "../../context/SettingsContext";

/* ─── Which labels are group headings (bold) vs sub-items (indented) ─────── */
/* These match the backend label names exactly — no data is hardcoded here,   */
/* only the visual style rule (heading vs item).                               */
const HEADING_LABELS = new Set([
  "Capital Account",
  "Loans (Liability)",
  "Current Liabilities",
  "Branch / Divisions",
  "Profit & Loss A/c",
  "FIXED ASSET",
  "Current Assets",
  "Suspense A/c",
  "Miscelleneous Expenses Written Off",
  "Raw Material",
]);

/* Which labels render italic (match backend label names) */
const ITALIC_LABELS = new Set([
  "Reserves & Surplus",
  "BRANCH NOIDA",
  "HEAD OFFICE STICON",
  "Opening Balance",
  "Current Period",
  "Depreciation Reserve",
  "Inverter -Amaraon",
  "Capital Subsidy Receivable",
  "GST ON RCM",
]);

/* ─── helpers ───────────────────────────────────────────────────────────── */
const FONT = "Arial, Helvetica, sans-serif";

function fmt(v) {
  const n = Number(v) || 0;
  if (n === 0) return "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtTotal(v) {
  return (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function fyLabel(iso) {
  const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
  const y = d.getFullYear(), m = d.getMonth();
  const sy = m >= 3 ? y : y - 1;
  return `${sy}-${sy+1}`;
}
function fyStart(iso) {
  const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
  const y = d.getFullYear(), m = d.getMonth();
  const sy = m >= 3 ? y : y - 1;
  return `${sy}-04-01`;
}
function shortDate(iso) {
  if (!iso) return "";
  const dt  = new Date(`${iso}T00:00:00`);
  const day = String(dt.getDate()).padStart(2,"0");
  const mon = dt.toLocaleString("en-GB", { month: "short" });
  const yr  = String(dt.getFullYear()).slice(-2);
  return `${day}-${mon}-${yr}`;
}
function dispDate(iso) {
  if (!iso) return "";
  const [y,m,d] = String(iso).split("-");
  return `${d}/${m}/${y}`;
}

/* ─── inline styles ─────────────────────────────────────────────────────── */
const BASE_TD = {
  border: "1px solid #c8c8c8",
  fontFamily: FONT,
  fontSize: 12,
  color: "#111",
  verticalAlign: "middle",
  padding: "4px 8px",
  height: "26px",
  background: "#fff",
};
const headingTd = (extra = {}) => ({ ...BASE_TD, fontWeight: 700, ...extra });
const itemTd    = (extra = {}) => ({ ...BASE_TD, fontWeight: 400, paddingLeft: 20, ...extra });
const emptyTd   = (extra = {}) => ({ ...BASE_TD, ...extra });
const amtTd     = (bold, extra = {}) => ({
  ...BASE_TD,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  fontWeight: bold ? 700 : 400,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  ...extra,
});
const totalTd = (extra = {}) => ({
  ...BASE_TD,
  fontWeight: 700,
  background: "#e8e8e8",
  borderTop: "2px solid #666",
  padding: "6px 8px",
  ...extra,
});
const thTd = (extra = {}) => ({
  ...BASE_TD,
  background: "#e8e8e8",
  fontWeight: 700,
  padding: "7px 8px",
  borderBottom: "1px solid #aaa",
  height: "auto",
  ...extra,
});

const DIV_R = { borderRight: "2px solid #666" };
const DIV_L = { borderLeft:  "2px solid #666" };

/* ─── Generate Modal ────────────────────────────────────────────────────── */
function GenerateModal({ open, onClose, onGenerate, defaultFrom, defaultTo }) {
  const [reportName, setReportName] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(defaultTo);
  useEffect(() => {
    if (!open) return;
    setReportName(""); setFrom(defaultFrom); setTo(defaultTo);
  }, [open, defaultFrom, defaultTo]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-2xl bg-[#f7f7f9] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-[18px] font-bold text-[#1a1a1f]">Generate Balance Sheet</h2>
          <button type="button" onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-[#d8d8e0] bg-white text-[#6b6b76] hover:bg-[#f0f0f4]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 pb-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#3a3a42]">
              Report Name <span className="text-[#e11d48]">*</span>
            </label>
            <input value={reportName} onChange={(e) => setReportName(e.target.value)}
              placeholder="Enter Report Name"
              className="w-full rounded-lg border border-[#1a1a1f] bg-white px-3 py-2.5 text-[14px] outline-none placeholder:text-[#a0a0ab]" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#3a3a42]">
              Select Date Range <span className="text-[#e11d48]">*</span>
            </label>
            <div className="relative flex items-center gap-2 rounded-lg border border-[#cfcfd6] bg-white px-3 py-2.5">
              <Calendar className="h-4 w-4 shrink-0 text-[#9a9aa5]" />
              <span className="min-w-0 flex-1 text-[13px] text-[#1a1a1f]">
                {dispDate(from)} → {dispDate(to)}
              </span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="absolute right-0 top-0 h-full w-1/2 cursor-pointer opacity-0" />
            </div>
          </div>
          <div className="flex gap-2.5 rounded-lg bg-[#ececf0] px-3 py-3 text-[12.5px] text-[#5a5a66]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#6b6b76]" />
            <p>Once generated, find the report in Accounting Reports.</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-[#d0d0d8] bg-white px-4 py-2.5 text-[14px] font-medium text-[#1a1a1f] hover:bg-[#f0f0f4]">
            Cancel
          </button>
          <button type="button"
            onClick={() => onGenerate({ reportName: reportName.trim(), from, to })}
            style={{ background: "#F5C518" }}
            className="rounded-lg px-4 py-2.5 text-[14px] font-bold text-[#1a1a1f]">
            Generate Report
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Main ──────────────────────────────────────────────────────────────── */
export default function BalanceSheetV2() {
  const { addToast }    = useToast();
  const { companyName } = useSettings();

  const [asOf,       setAsOf]       = useState(todayIso());
  const [modalOpen,  setModalOpen]  = useState(false);
  const [loading,    setLoading]    = useState(true);

  /* Raw rows straight from the backend — no hardcoding */
  const [liabilities, setLiabilities] = useState([]);   // [{label, amount}]
  const [assets,      setAssets]      = useState([]);   // [{label, amount}]

  /* ── fetch from backend ── */
  const load = (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    return getBalanceSheet()
      .then((res) => {
        const d = res.data || {};
        setLiabilities(d.liabilities || []);
        setAssets(d.assets      || []);
      })
      .catch((err) => {
        if (!isRefresh) { setLiabilities([]); setAssets([]); }
        if (isRefresh) throw err;
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  usePageRefresh(() => load(true));

  /* ── totals: sum only heading-row amounts (consistent with displayed data) ── */
  const totalLiab  = liabilities
    .filter((r) => HEADING_LABELS.has(r.label))
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const totalAsset = assets
    .filter((r) => HEADING_LABELS.has(r.label))
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const rowCount = Math.max(liabilities.length, assets.length);

  const handleGenerate = ({ reportName, from, to }) => {
    if (!reportName) { addToast("Report name is required", "error"); return; }
    if (!from || !to) { addToast("Select a date range", "error"); return; }
    setAsOf(to);
    addAccountingReport({ name: reportName, type: REPORT_TYPES.BALANCE_SHEET, from, to, status: "Ready" });
    setModalOpen(false);
    addToast(`"${reportName}" generated. Find it under Accounting Reports.`, "success");
  };

  const fyRange = `${shortDate(fyStart(asOf))} to ${shortDate(asOf)}`;

  /* ── CSV export ── */
  const exportCsv = () => {
    const rows = [["Liabilities", "Amount", "Assets", "Amount"]];
    const count = Math.max(liabilities.length, assets.length);
    for (let i = 0; i < count; i++) {
      const L = liabilities[i] || {};
      const R = assets[i] || {};
      rows.push([L.label || "", L.amount ? fmt(Number(L.amount)) : "", R.label || "", R.amount ? fmt(Number(R.amount)) : ""]);
    }
    rows.push(["Total", fmtTotal(totalLiab), "Total", fmtTotal(totalAsset)]);
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `BalanceSheet_${fyRange}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ── PDF export ── */
  const exportPdf = async () => {
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"), import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(14); doc.setFont(undefined, "bold");
      doc.text("Balance Sheet", 14, 14);
      doc.setFontSize(9); doc.setFont(undefined, "normal");
      doc.text(fyRange, 14, 20);
      const count = Math.max(liabilities.length, assets.length);
      const body = [];
      for (let i = 0; i < count; i++) {
        const L = liabilities[i] || {};
        const R = assets[i] || {};
        const lBold = HEADING_LABELS.has(L.label);
        const rBold = HEADING_LABELS.has(R.label);
        body.push([
          { content: L.label || "", styles: lBold ? { fontStyle: "bold" } : {} },
          { content: L.amount ? fmt(Number(L.amount)) : "", styles: { halign: "right" } },
          { content: R.label || "", styles: rBold ? { fontStyle: "bold" } : {} },
          { content: R.amount ? fmt(Number(R.amount)) : "", styles: { halign: "right" } },
        ]);
      }
      body.push([
        { content: "Total", styles: { fontStyle: "bold" } },
        { content: fmtTotal(totalLiab), styles: { halign: "right", fontStyle: "bold" } },
        { content: "Total", styles: { fontStyle: "bold" } },
        { content: fmtTotal(totalAsset), styles: { halign: "right", fontStyle: "bold" } },
      ]);
      autoTable(doc, {
        startY: 24,
        head: [["Liabilities", `as at ${shortDate(asOf)}`, "Assets", `as at ${shortDate(asOf)}`]],
        body,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [228, 228, 228], textColor: 0, fontStyle: "bold" },
        columnStyles: { 1: { halign: "right" }, 3: { halign: "right" } },
      });
      doc.save(`BalanceSheet_${fyRange}.pdf`);
    } catch (e) { console.error(e); alert("PDF generation failed."); }
  };

  /* ── render one label cell ── */
  function renderLabel(row) {
    if (!row) return "";
    if (HEADING_LABELS.has(row.label))
      return <strong style={{ fontWeight: 700 }}>{row.label}</strong>;
    if (ITALIC_LABELS.has(row.label))
      return <em style={{ fontStyle: "italic" }}>{row.label}</em>;
    return row.label;
  }

  function labelStyle(row, extra = {}) {
    if (!row) return emptyTd(extra);
    if (HEADING_LABELS.has(row.label)) return headingTd(extra);
    return itemTd(extra);
  }

  function isHeading(row) {
    return row && HEADING_LABELS.has(row.label);
  }

  return (
    <div style={{ background: "#fff", fontFamily: FONT, fontSize: 12, color: "#111",
                  padding: "20px 24px 40px", minHeight: "100%", boxSizing: "border-box" }}>

      {/* title + button */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                    flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 12, color: "#555", margin: 0, padding: 0 }}>{fyRange}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={exportCsv}
            style={{ display: "inline-flex", alignItems: "center", gap: 6,
                     background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6,
                     padding: "7px 14px", fontSize: 12, fontWeight: 700,
                     color: "#1d4ed8", cursor: "pointer", fontFamily: FONT }}>
            <FileDown size={14} /> CSV
          </button>
          <button onClick={exportPdf}
            style={{ display: "inline-flex", alignItems: "center", gap: 6,
                     background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 6,
                     padding: "7px 14px", fontSize: 12, fontWeight: 700,
                     color: "#be123c", cursor: "pointer", fontFamily: FONT }}>
            <FileText size={14} /> PDF
          </button>
          <button onClick={() => setModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6,
                     background: "#F5C518", border: "none", borderRadius: 6,
                     padding: "7px 14px", fontSize: 12, fontWeight: 700,
                     color: "#111", cursor: "pointer", fontFamily: FONT }}>
            <Calendar size={13} />
            Select Date and Generate Report
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading…</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #bbb", borderRadius: 4 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", borderSpacing: 0,
                          fontSize: 12, fontFamily: FONT, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "40%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>

            <thead>
              <tr>
                <th colSpan={2} style={thTd({ textAlign: "center", fontWeight: 700, borderRight: "2px solid #666" })}>
                  Liabilities
                </th>
                <th colSpan={2} style={thTd({ textAlign: "center", fontWeight: 700, borderLeft: "none" })}>
                  Assets
                </th>
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: rowCount }).map((_, i) => {
                const L = liabilities[i] || null;
                const R = assets[i]      || null;
                return (
                  <tr key={i}>
                    {/* left label */}
                    <td style={labelStyle(L)}>{renderLabel(L)}</td>
                    {/* left amount — only for heading rows */}
                    <td style={amtTd(isHeading(L), DIV_R)}>
                      {isHeading(L) ? fmt(L.amount) : ""}
                    </td>
                    {/* right label */}
                    <td style={labelStyle(R, DIV_L)}>{renderLabel(R)}</td>
                    {/* right amount — only for heading rows */}
                    <td style={amtTd(isHeading(R))}>
                      {isHeading(R) ? fmt(R.amount) : ""}
                    </td>
                  </tr>
                );
              })}

              {/* total row — sum of heading amounts only */}
              <tr>
                <td style={totalTd({ textAlign: "left" })}>Total</td>
                <td style={totalTd({ textAlign: "right", fontVariantNumeric: "tabular-nums", ...DIV_R })}>
                  {fmtTotal(totalLiab)}
                </td>
                <td style={totalTd({ textAlign: "left", ...DIV_L })}>Total</td>
                <td style={totalTd({ textAlign: "right", fontVariantNumeric: "tabular-nums" })}>
                  {fmtTotal(totalAsset)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <GenerateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onGenerate={handleGenerate}
        defaultFrom={fyStart(asOf)}
        defaultTo={asOf}
      />
    </div>
  );
}
