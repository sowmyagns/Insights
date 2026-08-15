import Button from "./Button";

export default function PageActionBar({ children, className = "" }) {
  return <div className={["flex flex-wrap gap-2", className].filter(Boolean).join(" ")}>{children}</div>;
}

export function PageActionGroup({ children, className = "" }) {
  return <div className={["flex flex-wrap gap-2", className].filter(Boolean).join(" ")}>{children}</div>;
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
        <Button
          type="button"
          variant="outline"
          onClick={onImport}
          leftIcon={ImportIcon ? <ImportIcon className="h-4 w-4 shrink-0" /> : undefined}
        >
          {importLabel}
        </Button>
      ) : null}
      {exportExcelVisible && onExportExcel ? (
        <Button
          type="button"
          variant="outline"
          onClick={onExportExcel}
          leftIcon={ExportExcelIcon ? <ExportExcelIcon className="h-4 w-4 shrink-0" /> : undefined}
        >
          {exportExcelLabel}
        </Button>
      ) : null}
      {exportPdfVisible && onExportPdf ? (
        <Button
          type="button"
          variant="outline"
          onClick={onExportPdf}
          leftIcon={ExportPdfIcon ? <ExportPdfIcon className="h-4 w-4 shrink-0" /> : undefined}
        >
          {exportPdfLabel}
        </Button>
      ) : null}
      {printVisible && onPrint ? (
        <Button
          type="button"
          variant="outline"
          onClick={onPrint}
          leftIcon={PrintIcon ? <PrintIcon className="h-4 w-4 shrink-0" /> : undefined}
        >
          {printLabel}
        </Button>
      ) : null}
      {refreshVisible && onRefresh ? (
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          leftIcon={RefreshIcon ? <RefreshIcon className="h-4 w-4 shrink-0" /> : undefined}
        >
          {refreshLabel}
        </Button>
      ) : null}
    </div>
  );
}
