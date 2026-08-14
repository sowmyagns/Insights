import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Printer } from "lucide-react";

import Loader from "../../components/common/Loader";
import TaxInvoiceCopy from "../../components/sales/TaxInvoiceCopy";
import { useToast } from "../../context/ToastContext";
import { getQuotationDocument } from "../../api/salesApi";

export default function QuotationCopyPage() {
  const { id } = useParams();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [docPayload, setDocPayload] = useState(null);
  const [busy, setBusy] = useState("");
  const invoiceRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    getQuotationDocument(id)
      .then((r) => setDocPayload(r.data))
      .catch(() => addToast("Failed to load quotation", "error"))
      .finally(() => setLoading(false));
  }, [id, addToast]);

  const docNo = docPayload?.meta?.document_no || docPayload?.meta?.quote_number || id || "";

  const handlePrint = useCallback(() => {
    const el = invoiceRef.current;
    if (!el) return;
    const clone = el.cloneNode(true);
    el.querySelectorAll("canvas").forEach((canvas, i) => {
      const img = clone.querySelectorAll("canvas")[i];
      const dataUrl = canvas.toDataURL("image/png");
      const image = document.createElement("img");
      image.src = dataUrl;
      image.style.cssText = canvas.style.cssText;
      image.width = canvas.width;
      image.height = canvas.height;
      img.replaceWith(image);
    });
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>Quotation ${docNo}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        @page { size: A4 portrait; margin: 0; }
        body { background:#fff; }
        .tax-invoice-copy { box-shadow:none !important; margin:0 !important; }
      </style>
    </head><body>${clone.outerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  }, [invoiceRef, docNo]);

  const handleDownloadPdf = useCallback(async () => {
    const el = invoiceRef.current;
    if (!el) return;
    setBusy("pdf");
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const prev = el.style.boxShadow;
      el.style.boxShadow = "none";
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: el.offsetWidth,
        height: el.offsetHeight,
        windowWidth: el.offsetWidth,
      });
      el.style.boxShadow = prev;
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
      pdf.save(`Quotation-${docNo}.pdf`);
      addToast("PDF downloaded.", "success");
    } catch (err) {
      addToast("Could not generate PDF.", "error");
      console.error(err);
    } finally {
      setBusy("");
    }
  }, [docNo, addToast]);

  if (loading) return <Loader label="Loading quotation preview..." />;

  return (
    <div className="space-y-4 pb-8">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Link to="/sales/quotations" className="text-sm font-semibold text-teal-700 hover:underline">
          ← Back to Quotations
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={busy === "pdf"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            <Download className="h-4 w-4" /> {busy === "pdf" ? "Downloading…" : "Download PDF"}
          </button>
          <Link
            to={`/sales/quotations/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            Edit Quotation
          </Link>
        </div>
      </div>
      <TaxInvoiceCopy data={docPayload} innerRef={invoiceRef} title="Quotation" />
    </div>
  );
}
