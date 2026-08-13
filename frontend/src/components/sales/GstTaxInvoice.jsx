import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { numberToWordsInr } from "../../utils/invoiceCopyData";
import "./GstTaxInvoice.css";

function QRCanvas({ value, size = 100 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    QRCode.toCanvas(ref.current, value, { width: size, margin: 1, errorCorrectionLevel: "M" }, () => {});
  }, [value, size]);
  return <canvas ref={ref} aria-label="E-Invoice QR code" />;
}

function fmt(n, d = 3) {
  return Number(n || 0).toFixed(d);
}
function fmt2(n) {
  return Number(n || 0).toFixed(2);
}

/**
 * Classic Indian GST Tax Invoice — matches the Stic-On style reference layout.
 */
export default function GstTaxInvoice({ data }) {
  if (!data) return null;

  const seller    = data.seller    || {};
  const meta      = data.meta      || {};
  const buyer     = data.buyer     || {};
  const consignee = data.consignee || buyer;
  const dispatch  = data.dispatch  || {};
  const items     = data.items     || [];
  const summary   = data.summary   || {};
  const payment   = data.payment   || {};

  const taxMode = data.tax_mode || data.taxMode || (data.isIgst ? "igst" : "cgst_sgst");
  const isIgst  = taxMode === "igst";

  const irn      = data.irn      || "";
  const ackNo    = data.ackNo    || data.ack_no    || "";
  const ackDate  = data.ackDate  || data.ack_date  || "";

  const taxable   = Number(summary.taxable_value  ?? summary.taxableTotal  ?? items.reduce((s, it) => s + Number(it.taxable_amount ?? it.amount ?? 0), 0));
  const cgstTotal = Number(summary.cgst_total     ?? summary.cgstTotal     ?? data.cgst_amount  ?? data.cgstAmount  ?? 0);
  const sgstTotal = Number(summary.sgst_total     ?? summary.sgstTotal     ?? data.sgst_amount  ?? data.sgstAmount  ?? 0);
  const igstTotal = Number(summary.igst_total     ?? summary.igstTotal     ?? data.igst_amount  ?? data.igstAmount  ?? 0);
  const roundOff  = Number(summary.round_off      ?? data.roundOff         ?? 0);
  const grand     = Number(summary.grand_total    ?? data.grandTotal       ?? taxable + cgstTotal + sgstTotal + igstTotal + roundOff);
  const qtyTotal  = summary.qty_total ?? items.reduce((s, it) => s + parseFloat(it.qty || 0), 0);
  const totalTax  = isIgst ? igstTotal : cgstTotal + sgstTotal;

  const qrValue = [
    `Seller:${seller.name}`,
    seller.gstin    ? `GSTIN:${seller.gstin}`       : "",
    meta.invoice_no ? `Invoice:${meta.invoice_no}`   : "",
    meta.date       ? `Date:${meta.date}`             : "",
    buyer.name      ? `Buyer:${buyer.name}`           : "",
    buyer.gstin     ? `BuyerGSTIN:${buyer.gstin}`    : "",
    `Total:${grand}`,
    irn && irn !== "—" ? `IRN:${irn}` : "",
  ].filter(Boolean).join("|");

  const declaration = (data.declaration || "").split("\n").filter(Boolean);
  const defaultDeclaration = [
    "Certified that the particulars given above are true and correct",
    "The amount indicated represents the price actually charged and that there is no flow of additional consideration directly or indirectly from the buyer.",
    "All disputes subject to Hyderabad jurisdiction.",
    "Goods once sold cannot be taken back or exchanged.",
    "Cheques subject to realisation.",
    "24% Interest per annum will be charged if the bills are not paid within due days.",
    "Goods Return "As it is" shall be taken back, only within 7 days from the Date of Delivery & the same shall have to be intimated in "Writing" along with reasons for Goods Return.",
  ];

  const rejection = (data.rejection_policy || "").split("\n").filter(Boolean);
  const defaultRejection = [
    "Loose Winding & Tight Release",
    "Printability on face paper",
    "Loop Tack, Peel Adhesion and Shear Strength (15% tolerance) are less than what is mentioned in our Technical Data Sheet.",
    "For all Rejection and Quality Claims, End user Email /Samples for evaluation is mandatory.",
    "For application issues End user visit by Stic On Papers Private Limited team is mandatory.",
    "No rejection claim will be accepted if above conditions are not fulfilled.",
    "We are not responsible for material application related issues.",
    "Any quantity discrepancies are only accepted within 24 hours from the receipt of the material",
    "Any quality discrepancies are only accepted within 7 working days from the receipt of the Material (Unconverted Rolls Only)",
  ];

  const declLines = declaration.length ? declaration : defaultDeclaration;
  const rejLines  = rejection.length  ? rejection  : defaultRejection;

  // Build HSN summary grouped by HSN code
  const hsnMap = {};
  items.forEach((it) => {
    const key = it.hsn || "—";
    if (!hsnMap[key]) hsnMap[key] = { hsn: key, taxable: 0, cgst: 0, sgst: 0, igst: 0, rate: it.igst_pct ?? it.igstPct ?? it.cgst_pct ?? it.cgstPct ?? 0 };
    hsnMap[key].taxable += Number(it.taxable_amount ?? it.amount ?? 0);
    hsnMap[key].cgst    += Number(it.cgst_amount ?? it.cgstAmount ?? 0);
    hsnMap[key].sgst    += Number(it.sgst_amount ?? it.sgstAmount ?? 0);
    hsnMap[key].igst    += Number(it.igst_amount ?? it.igstAmount ?? 0);
  });
  const hsnRows = Object.values(hsnMap);
  if (!hsnRows.length) {
    hsnRows.push({ hsn: "—", taxable, cgst: cgstTotal, sgst: sgstTotal, igst: igstTotal, rate: 0 });
  }

  return (
    <article className="gti-wrap" aria-label="GST Tax Invoice">

      {/* ── Top label row ─────────────────────────────── */}
      <div className="gti-top-labels">
        <span className="gti-top-labels__title">Tax Invoice</span>
        {(data.eInvoice || data.e_invoice_enabled || irn) && (
          <span className="gti-top-labels__einv">e-Invoice</span>
        )}
      </div>

      {/* ── IRN / Ack / QR row ────────────────────────── */}
      {(irn || ackNo) && (
        <div className="gti-irn-row">
          <div className="gti-irn-row__left">
            {irn   && <p><strong>IRN</strong> : <span className="gti-irn-row__irn">{irn}</span></p>}
            {ackNo && <p><strong>Ack No.</strong> : {ackNo}</p>}
            {ackDate && <p><strong>Ack Date</strong> : {ackDate}</p>}
          </div>
          <div className="gti-irn-row__qr">
            {qrValue ? <QRCanvas value={qrValue} size={100} /> : <div className="gti-qr-ph">QR</div>}
          </div>
        </div>
      )}

      {/* ── Seller + Invoice meta ─────────────────────── */}
      <table className="gti-table gti-seller-table">
        <tbody>
          <tr>
            {/* Seller block */}
            <td className="gti-seller-cell" rowSpan={5}>
              {seller.logo
                ? <img src={seller.logo} alt={seller.name} className="gti-seller-logo" />
                : <div className="gti-seller-logo-fb">{(seller.name || "GNS").substring(0, 3).toUpperCase()}</div>
              }
              <div className="gti-seller-info">
                <p className="gti-seller-name">{seller.name || "—"}</p>
                <p>{seller.address}</p>
                {seller.gstin   && <p>GSTIN/UIN: {seller.gstin}</p>}
                {seller.udyam   && <p>UDYAM: {seller.udyam}</p>}
                {seller.state   && <p>State Name : {seller.state}{seller.state_code ? `, Code : ${seller.state_code}` : ""}</p>}
                {seller.cin     && <p>CIN: {seller.cin}</p>}
                {seller.email   && <p>E-Mail : {seller.email}</p>}
                {seller.phone   && <p>Phone : {seller.phone}</p>}
              </div>
            </td>
            {/* Invoice No / eWay / Date */}
            <td className="gti-meta-label">Invoice No.</td>
            <td className="gti-meta-label">e-Way Bill No.</td>
            <td className="gti-meta-label">Dated</td>
          </tr>
          <tr>
            <td className="gti-meta-val gti-bold">{meta.invoice_no || meta.invoiceNo || "—"}</td>
            <td className="gti-meta-val">{meta.eway_bill_no || meta.eWayBillNo || "—"}</td>
            <td className="gti-meta-val gti-bold">{meta.date || "—"}</td>
          </tr>
          <tr>
            <td className="gti-meta-label">Delivery Note</td>
            <td className="gti-meta-label" colSpan={2}>Mode/Terms of Payment</td>
          </tr>
          <tr>
            <td className="gti-meta-val">{meta.delivery_note || meta.deliveryNote || "—"}</td>
            <td className="gti-meta-val gti-bold" colSpan={2}>{payment.terms || meta.payment_terms || "Advance"}</td>
          </tr>
          <tr>
            <td className="gti-meta-label">Reference No. &amp; Date.</td>
            <td className="gti-meta-label" colSpan={2}>Other References</td>
          </tr>
        </tbody>
      </table>

      {/* Reference / Buyer Order row */}
      <table className="gti-table">
        <tbody>
          <tr>
            <td className="gti-meta-label" style={{width:"25%"}}>Reference No. &amp; Date.</td>
            <td className="gti-meta-val" style={{width:"25%"}}>{meta.reference_no || meta.referenceNo || ""}</td>
            <td className="gti-meta-label" style={{width:"25%"}}>Other References</td>
            <td className="gti-meta-val" style={{width:"25%"}}>{meta.other_references || ""}</td>
          </tr>
          <tr>
            <td className="gti-meta-label">Buyer's Order No.</td>
            <td className="gti-meta-val">{meta.buyer_order_no || meta.buyerOrderNo || ""}</td>
            <td className="gti-meta-label">Dated</td>
            <td className="gti-meta-val">{meta.buyer_order_date || ""}</td>
          </tr>
          <tr>
            <td className="gti-meta-label">Dispatch Doc No.</td>
            <td className="gti-meta-val">{dispatch.doc_no || dispatch.docNo || ""}</td>
            <td className="gti-meta-label">Delivery Note Date</td>
            <td className="gti-meta-val">{dispatch.delivery_note_date || ""}</td>
          </tr>
          <tr>
            <td className="gti-meta-label">Dispatched through</td>
            <td className="gti-meta-val">{dispatch.dispatch_through || dispatch.dispatchThrough || dispatch.transport_name || ""}</td>
            <td className="gti-meta-label">Destination</td>
            <td className="gti-meta-val gti-bold">{dispatch.destination || buyer.city || ""}</td>
          </tr>
          <tr>
            <td className="gti-meta-label" colSpan={4}>Terms of Delivery</td>
          </tr>
          <tr>
            <td className="gti-meta-val" colSpan={4}>{dispatch.delivery_terms || dispatch.deliveryTerms || ""}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Consignee + Buyer ─────────────────────────── */}
      <table className="gti-table">
        <tbody>
          <tr>
            <td className="gti-party-header" style={{width:"50%"}}>Consignee (Ship to)</td>
            <td className="gti-party-header" style={{width:"50%"}}>Buyer (Bill to)</td>
          </tr>
          <tr>
            <td className="gti-party-cell">
              <p className="gti-party-name">{consignee.name || buyer.name || "—"}</p>
              <p>{consignee.address || buyer.shipping_address || buyer.address || ""}</p>
              {(consignee.phone || buyer.phone) && <p>Mob: {consignee.phone || buyer.phone}</p>}
              {(consignee.gstin || buyer.gstin) && <p>GSTIN/UIN : {consignee.gstin || buyer.gstin}</p>}
              {(consignee.state || buyer.state) && (
                <p>State Name : {consignee.state || buyer.state}{(consignee.state_code || buyer.state_code) ? `, Code : ${consignee.state_code || buyer.state_code}` : ""}</p>
              )}
            </td>
            <td className="gti-party-cell">
              <p className="gti-party-name">{buyer.name || "—"}</p>
              <p>{buyer.billing_address || buyer.address || ""}</p>
              {buyer.phone && <p>Mob: {buyer.phone}</p>}
              {buyer.gstin && <p>GSTIN/UIN : {buyer.gstin}</p>}
              {buyer.state && (
                <p>State Name : {buyer.state}{buyer.state_code ? `, Code : ${buyer.state_code}` : ""}</p>
              )}
              {buyer.place_of_supply && <p>Place of Supply : {buyer.place_of_supply}</p>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Line items table ──────────────────────────── */}
      <table className="gti-table gti-items-table">
        <thead>
          <tr>
            <th className="gti-th" style={{width:"4%"}}>Sl No.</th>
            <th className="gti-th" style={{width:"32%"}}>Description of Goods</th>
            <th className="gti-th" style={{width:"10%"}}>HSN/SAC</th>
            <th className="gti-th" style={{width:"10%"}}>Quantity</th>
            <th className="gti-th" style={{width:"10%"}}>Rate</th>
            <th className="gti-th" style={{width:"5%"}}>per</th>
            <th className="gti-th" style={{width:"10%"}}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.si || idx}>
              <td className="gti-td gti-center">{item.si || idx + 1}</td>
              <td className="gti-td">
                <strong>{item.description || item.item_description || item.product_name || ""}</strong>
                {item.product_code && <div className="gti-item-code">{item.product_code}</div>}
              </td>
              <td className="gti-td gti-center">{item.hsn || "—"}</td>
              <td className="gti-td gti-right">
                {fmt(item.qty)} {item.unit || ""}
              </td>
              <td className="gti-td gti-right">{fmt(item.rate)}</td>
              <td className="gti-td gti-center">{item.unit || "PCS"}</td>
              <td className="gti-td gti-right">{fmt(item.taxable_amount ?? item.amount)}</td>
            </tr>
          ))}

          {/* Tax rows */}
          <tr className="gti-tax-row">
            <td className="gti-td" colSpan={2}></td>
            <td className="gti-td gti-right gti-bold" colSpan={2}>
              {isIgst ? "IGST" : "CGST"}
            </td>
            <td className="gti-td gti-center">
              {isIgst
                ? `${fmt2(items[0]?.igst_pct ?? items[0]?.igstPct ?? 0)} %`
                : `${fmt2(items[0]?.cgst_pct ?? items[0]?.cgstPct ?? 0)} %`
              }
            </td>
            <td className="gti-td"></td>
            <td className="gti-td gti-right">
              {isIgst ? fmt(igstTotal) : fmt(cgstTotal)}
            </td>
          </tr>
          {!isIgst && (
            <tr className="gti-tax-row">
              <td className="gti-td" colSpan={2}></td>
              <td className="gti-td gti-right gti-bold" colSpan={2}>SGST</td>
              <td className="gti-td gti-center">{fmt2(items[0]?.sgst_pct ?? items[0]?.sgstPct ?? 0)} %</td>
              <td className="gti-td"></td>
              <td className="gti-td gti-right">{fmt(sgstTotal)}</td>
            </tr>
          )}
          {roundOff !== 0 && (
            <tr className="gti-tax-row">
              <td className="gti-td" colSpan={2}></td>
              <td className="gti-td gti-right gti-bold" colSpan={2}>ROUNDED OFF</td>
              <td className="gti-td"></td>
              <td className="gti-td"></td>
              <td className="gti-td gti-right">{roundOff < 0 ? `(-)${fmt(Math.abs(roundOff))}` : fmt(roundOff)}</td>
            </tr>
          )}

          {/* Blank filler rows */}
          {[...Array(Math.max(0, 6 - items.length))].map((_, i) => (
            <tr key={`blank-${i}`}>
              <td className="gti-td gti-blank" colSpan={7}>&nbsp;</td>
            </tr>
          ))}

          {/* Total row */}
          <tr className="gti-total-row">
            <td className="gti-td gti-bold" colSpan={2}>Total</td>
            <td className="gti-td"></td>
            <td className="gti-td gti-right gti-bold">{fmt(qtyTotal)} {items[0]?.unit || ""}</td>
            <td className="gti-td" colSpan={2}></td>
            <td className="gti-td gti-right gti-bold gti-grand">₹ {fmt2(grand)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Amount in words ───────────────────────────── */}
      <table className="gti-table">
        <tbody>
          <tr>
            <td className="gti-meta-label" style={{width:"30%"}}>Amount Chargeable (in words)</td>
            <td className="gti-meta-val gti-right gti-small-italic" style={{width:"70%"}}>E. &amp; O.E</td>
          </tr>
          <tr>
            <td className="gti-words-cell" colSpan={2}>
              <strong>INR {numberToWordsInr(grand)}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── HSN-wise tax summary ──────────────────────── */}
      <table className="gti-table gti-hsn-table">
        <thead>
          <tr>
            <th className="gti-th" rowSpan={2}>HSN/SAC</th>
            <th className="gti-th" rowSpan={2}>Taxable Value</th>
            {isIgst ? (
              <th className="gti-th" colSpan={2}>IGST</th>
            ) : (
              <>
                <th className="gti-th" colSpan={2}>Central Tax</th>
                <th className="gti-th" colSpan={2}>State Tax</th>
              </>
            )}
            <th className="gti-th" rowSpan={2}>Total Tax Amount</th>
          </tr>
          <tr>
            {isIgst ? (
              <><th className="gti-th">Rate</th><th className="gti-th">Amount</th></>
            ) : (
              <><th className="gti-th">Rate</th><th className="gti-th">Amount</th><th className="gti-th">Rate</th><th className="gti-th">Amount</th></>
            )}
          </tr>
        </thead>
        <tbody>
          {hsnRows.map((row, i) => {
            const rowTax = isIgst ? row.igst : row.cgst + row.sgst;
            const cgstPct = items.find(it => it.hsn === row.hsn)?.cgst_pct ?? 0;
            const sgstPct = items.find(it => it.hsn === row.hsn)?.sgst_pct ?? 0;
            const igstPct = items.find(it => it.hsn === row.hsn)?.igst_pct ?? 0;
            return (
              <tr key={i}>
                <td className="gti-td">{row.hsn}</td>
                <td className="gti-td gti-right">{fmt2(row.taxable)}</td>
                {isIgst ? (
                  <><td className="gti-td gti-center">{fmt2(igstPct)}%</td><td className="gti-td gti-right">{fmt2(row.igst)}</td></>
                ) : (
                  <>
                    <td className="gti-td gti-center">{fmt2(cgstPct)}%</td>
                    <td className="gti-td gti-right">{fmt2(row.cgst)}</td>
                    <td className="gti-td gti-center">{fmt2(sgstPct)}%</td>
                    <td className="gti-td gti-right">{fmt2(row.sgst)}</td>
                  </>
                )}
                <td className="gti-td gti-right">{fmt2(rowTax)}</td>
              </tr>
            );
          })}
          {/* Totals */}
          <tr className="gti-hsn-total">
            <td className="gti-td gti-bold">Total</td>
            <td className="gti-td gti-right gti-bold">{fmt2(taxable)}</td>
            {isIgst ? (
              <><td className="gti-td"></td><td className="gti-td gti-right gti-bold">{fmt2(igstTotal)}</td></>
            ) : (
              <>
                <td className="gti-td"></td>
                <td className="gti-td gti-right gti-bold">{fmt2(cgstTotal)}</td>
                <td className="gti-td"></td>
                <td className="gti-td gti-right gti-bold">{fmt2(sgstTotal)}</td>
              </>
            )}
            <td className="gti-td gti-right gti-bold">{fmt2(totalTax)}</td>
          </tr>
        </tbody>
      </table>

      {/* Tax amount in words */}
      <table className="gti-table">
        <tbody>
          <tr>
            <td className="gti-meta-label" style={{width:"30%"}}>Tax Amount (in words) :</td>
            <td className="gti-words-cell"><strong>INR {numberToWordsInr(totalTax)}</strong></td>
          </tr>
        </tbody>
      </table>

      {/* ── Declaration + Rejection Policy ───────────── */}
      <table className="gti-table">
        <tbody>
          <tr>
            <td className="gti-party-header" style={{width:"50%"}}>Declaration</td>
            <td className="gti-party-header" style={{width:"50%"}}>Rejection Policy :</td>
          </tr>
          <tr>
            <td className="gti-decl-cell" style={{verticalAlign:"top"}}>
              <ol className="gti-decl-list">
                {declLines.map((d, i) => <li key={i}>{d.replace(/^\d+\.\s*/, "")}</li>)}
              </ol>
              {data.remarks && (
                <p className="gti-remarks"><strong>Remarks :</strong> {data.remarks}</p>
              )}
            </td>
            <td className="gti-decl-cell" style={{verticalAlign:"top"}}>
              <ol className="gti-decl-list">
                {rejLines.map((r, i) => <li key={i}>{r.replace(/^\d+\.\s*/, "")}</li>)}
              </ol>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Signature footer ──────────────────────────── */}
      <table className="gti-table gti-sig-table">
        <tbody>
          <tr>
            <td className="gti-sig-cell" style={{width:"33%"}}>
              <span className="gti-sig-label">Prepared by</span>
              <span className="gti-sig-line">{data.prepared_by || data.preparedBy || ""}</span>
            </td>
            <td className="gti-sig-cell" style={{width:"33%"}}>
              <span className="gti-sig-label">Verified by</span>
              <span className="gti-sig-line">{data.verified_by || data.verifiedBy || ""}</span>
            </td>
            <td className="gti-sig-cell gti-right" style={{width:"34%"}}>
              <span className="gti-sig-company">for {seller.name || "Company"}</span>
              <span className="gti-sig-auth">Authorised Signatory</span>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="gti-disclaimer">This is a Computer Generated Invoice</p>
    </article>
  );
}
