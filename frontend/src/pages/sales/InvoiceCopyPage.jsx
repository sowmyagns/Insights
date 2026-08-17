import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Mail, MessageCircle, Printer, Share2 } from "lucide-react";

import Loader from "../../components/common/Loader";
import TaxInvoiceCopy from "../../components/sales/TaxInvoiceCopy";
import { useToast } from "../../context/ToastContext";
import {
  emailInvoice,
  getInvoiceDetail,
  getInvoiceDocument,
} from "../../api/salesApi";
import { useCompanySettings } from "../../hooks/useCompanySettings";
import { mapDetailToInvoiceCopy } from "../../utils/invoiceCopyData";
import { apiErrorMessage } from "../../utils/apiError";

export default function InvoiceCopyPage() {
  const { id } = useParams();
  const location = useLocation();
  const isDebitNote = location.pathname.includes("/debit-notes/");
  const listPath = isDebitNote ? "/sales/debit-notes" : "/sales/invoices";
  const listLabel = isDebitNote ? "Debit Notes" : "Invoices";
  const docLabel = isDebitNote ? "Debit Note" : "Invoice";
  const { settings } = useCompanySettings();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(Boolean(id));
  const [detail, setDetail] = useState(null);
  const [docPayload, setDocPayload] = useState(null);
  const [busy, setBusy] = useState("");
  const invoiceRef = useRef(null);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      getInvoiceDetail(id).then((r) => r.data),
      getInvoiceDocument(id).then((r) => r.data).catch(() => null),
    ])
      .then(([detailRes, docRes]) => {
        setDetail(detailRes);
        setDocPayload(docRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const copyData = useMemo(() => {
    if (!id) return null;
    if (docPayload) return docPayload;
    return mapDetailToInvoiceCopy(detail, settings || {});
  }, [id, detail, settings, docPayload]);

  const invoiceNo = copyData?.meta?.invoice_no || copyData?.meta?.invoiceNo || id || "";
  const customerEmail = copyData?.buyer?.email || detail?.customer?.email || "";

  const handlePrint = useCallback(() => {
    const el = invoiceRef.current;
    if (!el) return;
    // canvas.outerHTML loses pixel data — convert each canvas to a data-URL img first
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
      <title>Invoice ${invoiceNo}</title>
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
  }, [invoiceRef, invoiceNo]);

  const handleEmail = useCallback(async () => {
    if (!id) {
      addToast("Save the invoice first to email.", "info");
      return;
    }
    const to = window.prompt("Send invoice to email:", customerEmail);
    if (!to) return;
    setBusy("email");
    try {
      await emailInvoice(id, { to_email: to });
      addToast(`Invoice emailed to ${to}`, "success");
    } catch (err) {
      addToast(apiErrorMessage(err, "Could not send email. Check SMTP settings."), "error");
    } finally {
      setBusy("");
    }
  }, [id, customerEmail, addToast]);

  const handleWhatsApp = useCallback(() => {
    const phone = (copyData?.buyer?.phone || "").replace(/\D/g, "");
    const text = encodeURIComponent(
      `Tax Invoice ${invoiceNo} from ${copyData?.seller?.name || "Insights Iva"}. Total: ₹${copyData?.summary?.grand_total ?? copyData?.grandTotal ?? 0}`
    );
    const url = phone
      ? `https://wa.me/${phone.startsWith("91") ? phone : `91${phone}`}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [copyData, invoiceNo]);

  if (loading) return <Loader label={`Loading ${docLabel.toLowerCase()} preview...`} />;

  return (
    <div className="space-y-4 pb-8">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Link to="/sales/invoices" className="text-sm font-semibold text-teal-700 hover:underline">
          ← Back to Invoices
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {!id && <span className="text-sm text-slate-500">Select an invoice to preview.</span>}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            type="button"
            onClick={handleEmail}
            disabled={busy === "email"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            <Mail className="h-4 w-4" /> Email
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
          {id ? (
            <Link
              to={`/sales/invoices/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Share2 className="h-4 w-4" /> Edit {docLabel}
            </Link>
          ) : null}
        </div>
      </div>
      <TaxInvoiceCopy data={copyData} innerRef={invoiceRef} />
    </div>
  );
}
