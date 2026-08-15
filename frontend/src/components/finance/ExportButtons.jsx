import { FileSpreadsheet, FileText, FileDown } from "lucide-react";
import Button from "../common/Button";

export default function ExportButtons({ onExcel, onCsv, onPdf, label = "Export" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {onExcel ? (
        <Button type="button" variant="outline" onClick={onExcel} leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
          {label} Excel
        </Button>
      ) : null}
      {onCsv ? (
        <Button type="button" variant="outline" onClick={onCsv} leftIcon={<FileDown className="h-4 w-4" />}>
          {label} CSV
        </Button>
      ) : null}
      {onPdf ? (
        <Button type="button" variant="outline" onClick={onPdf} leftIcon={<FileText className="h-4 w-4" />}>
          {label} PDF
        </Button>
      ) : null}
    </div>
  );
}
