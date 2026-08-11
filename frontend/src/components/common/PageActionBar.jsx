import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

export default function PageActionBar({ children, className = "" }) {
  return <div className={["flex flex-wrap gap-2", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function PageActionGroup({ children, className = "" }) {
  return <div className={["flex flex-wrap gap-2", className].filter(Boolean).join(" ")}>{children}</div>;
}

function ActionMenuItem({ onClick, icon: Icon, label, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={["flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50", className]
        .filter(Boolean)
        .join(" ")}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      <span>{label}</span>
    </button>
  );
}

export function ImportExportActionBar({
  onImport,
  onExportExcel,
  onExportPdf,
  onPrint,
  onRefresh,
  importLabel = "Import",
  exportExcelLabel = "Export Excel",
  exportPdfLabel = "Export PDF",
  printLabel = "Print",
  refreshLabel = "Refresh",
  importIcon: ImportIcon,
  exportExcelIcon: ExportExcelIcon,
  exportPdfIcon: ExportPdfIcon,
  printIcon: PrintIcon,
  refreshIcon: RefreshIcon,
  importVisible = true,
  exportExcelVisible = true,
  exportPdfVisible = true,
  printVisible = true,
  refreshVisible = false,
  children,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {importVisible && onImport ? (
        <button
          type="button"
          onClick={onImport}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          {ImportIcon ? <ImportIcon className="h-4 w-4 shrink-0 text-slate-500" /> : null}
          <span>{importLabel}</span>
        </button>
      ) : null}
      {exportExcelVisible && onExportExcel ? (
        <button
          type="button"
          onClick={onExportExcel}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          {ExportExcelIcon ? <ExportExcelIcon className="h-4 w-4 shrink-0 text-slate-500" /> : null}
          <span>{exportExcelLabel}</span>
        </button>
      ) : null}
      {exportPdfVisible && onExportPdf ? (
        <button
          type="button"
          onClick={onExportPdf}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          {ExportPdfIcon ? <ExportPdfIcon className="h-4 w-4 shrink-0 text-slate-500" /> : null}
          <span>{exportPdfLabel}</span>
        </button>
      ) : null}
      {printVisible && onPrint ? (
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          {PrintIcon ? <PrintIcon className="h-4 w-4 shrink-0 text-slate-500" /> : null}
          <span>{printLabel}</span>
        </button>
      ) : null}
      {refreshVisible && onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          {RefreshIcon ? <RefreshIcon className="h-4 w-4 shrink-0 text-slate-500" /> : null}
          <span>{refreshLabel}</span>
        </button>
      ) : null}
    </div>
  );
}

