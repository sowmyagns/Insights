import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { numberToWordsInr } from "../../utils/invoiceCopyData";
import "./Invoice.css";

/* ── QR canvas ─────────────────────────────────────────────── */
function QRCanvas({ value }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    QRCode.toCanvas(ref.current, value, { width: 70, margin: 1, errorCorrectionLevel: "M" }, () => {});
  }, [value]);
  return <canvas ref={ref} />;
}

/* ═══════════════════════════════════════════════════════════════
   Invoice  –  accepts a `data` prop (same shape as TaxInvoiceCopy)
   ═══════════════════════════════════════════════════════════════ */
export default function Invoice({ data }) {
  if (!data) return null;

  /* ── seller ── */
  const sName  = data.seller?.name    || "INSIGHTS IVA PRIVATE LIMITED";
  const sAddr  = data.seller?.address || "Hyderabad, Telangana";
  const sGstin = data.seller?.gstin   || "";
  const sState = data.seller?.state   || "Telangana";
  const sEmail = data.seller?.email   || "";
  const sCin   = data.seller?.cin     || "";
  const sUdyam = data.seller?.udyam   || "";

  /* ── meta ── */
  const invoiceNo = data.meta?.invoiceNo  || "";
  const date      = data.meta?.date       || "";
  const irn       = data.irn  && data.irn  !== "—" ? data.irn  : "";
  const ackNo     = data.ackNo && data.ackNo !== "—" ? data.ackNo : "";
  const ackDate   = data.ackDate || date;
  const eWayBill  = data.meta?.eWayBillNo || data.meta?.ewayBillNo || data.meta?.eWaybillNo || data.meta?.eway_bill || "";
  const placeOfSupply = data.meta?.placeOfSupply || data.buyer?.state || data.consignee?.state || "";

  /* ── buyer / consignee ── */
  const consigneeName  = data.consignee?.name    || data.buyer?.name    || "";
  const consigneeAddr  = data.consignee?.address || [
    data.consignee?.address,
    data.consignee?.address_line1,
    data.consignee?.address_line2,
    data.consignee?.billing_address,
    data.consignee?.shipping_address,
    data.buyer?.address,
  ].filter(Boolean).join(", ") || "";
  const consigneeGstin = data.consignee?.gstin   || data.buyer?.gstin   || "";
  const buyerName      = data.buyer?.name    || "";
  const buyerAddr      = data.buyer?.address || [
    data.buyer?.address,
    data.buyer?.address_line1,
    data.buyer?.address_line2,
    data.buyer?.billing_address,
    data.buyer?.shipping_address,
  ].filter(Boolean).join(", ") || "";
  const buyerGstin     = data.buyer?.gstin   || "";

  /* ── tax calculations ── */
  const items    = data.items || [];
  const taxable  = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const qtyTotal = items.reduce((s, it) => s + parseFloat(it.qty   || 0), 0);
  const unit0    = items[0]?.unit || "PCS";

  const taxValue = (obj, camelKey, snakeKey) => Number(obj?.[camelKey] ?? obj?.[snakeKey]) || 0;

  const invoiceIgstPct = taxValue(data, "igstPct", "igst_pct") || (items.length === 1 ? taxValue(items[0], "igstPct", "igst_pct") : 0);
  const invoiceCgstPct = taxValue(data, "cgstPct", "cgst_pct") || (items.length === 1 ? taxValue(items[0], "cgstPct", "cgst_pct") : 0);
  const invoiceSgstPct = taxValue(data, "sgstPct", "sgst_pct") || (items.length === 1 ? taxValue(items[0], "sgstPct", "sgst_pct") : 0);

  const itemHasCgstSgst = items.some((item) =>
    taxValue(item, "cgstPct", "cgst_pct") > 0 ||
    taxValue(item, "sgstPct", "sgst_pct") > 0 ||
    Number(item.cgst_amount) > 0 ||
    Number(item.cgstAmount) > 0 ||
    Number(item.sgst_amount) > 0 ||
    Number(item.sgstAmount) > 0
  );

  const itemHasIgst = items.some((item) =>
    taxValue(item, "igstPct", "igst_pct") > 0 ||
    Number(item.igst_amount) > 0 ||
    Number(item.igstAmount) > 0
  );

  const hasCgstSgst = Boolean(
    invoiceCgstPct || invoiceSgstPct ||
    Number(data.cgst_amount) || Number(data.cgstAmount) ||
    Number(data.sgst_amount) || Number(data.sgstAmount) ||
    itemHasCgstSgst
  );

  const isIgst = !hasCgstSgst && Boolean(
    invoiceIgstPct ||
    Number(data.igst_amount) || Number(data.igstAmount) ||
    itemHasIgst
  );

  const igstPct  = invoiceIgstPct || 18;
  const igstAmt  = isIgst ? (Number(data.igst_amount) || Number(data.igstAmount) || Math.round(taxable * igstPct / 100 * 100) / 100) : 0;
  const cgstAmt  = hasCgstSgst ? (Number(data.cgst_amount) || Number(data.cgstAmount) || Math.round(taxable * invoiceCgstPct / 100 * 100) / 100) : 0;
  const sgstAmt  = hasCgstSgst ? (Number(data.sgst_amount) || Number(data.sgstAmount) || Math.round(taxable * invoiceSgstPct / 100 * 100) / 100) : 0;
  const totalTax = isIgst ? igstAmt : cgstAmt + sgstAmt;
  const roundOff = Number(data.roundOff) || 0;
  const grand    = Number(data.grandTotal) || taxable + totalTax + roundOff;
  const fmt      = (n, d = 2) => Number(n).toFixed(d);

  /* ── QR payload — encodes the invoice URL so scanning opens the invoice ── */
  const qrValue = invoiceNo;

  return (
    <div className="invoice-page">

      {/* ── TITLE ─────────────────────────────────────────── */}
      <div className="invoice-title">Tax Invoice</div>

      {/* ── TOP: IRN / Ack info (left)  |  e-Invoice QR (right) ── */}
      <div className="top-section">
        <div className="ack-info">
          <div><strong>IRN :</strong> <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{irn || "—"}</span></div>
          <div><strong>Ack No :</strong> {ackNo || "—"}</div>
          <div><strong>Ack Date :</strong> {ackDate || "—"}</div>
        </div>
        <div className="qr-box">
          <div style={{ marginBottom: 4, fontSize: 9, fontWeight: 700 }}>e-Invoice</div>
          <div style={{ padding: 4, display: "inline-block", lineHeight: 0, background: "#fff" }}>
            {qrValue ? <QRCanvas value={qrValue} /> : (
              <div style={{ width: 70, height: 70, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: "#f8f8f8" }}>QR</div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION A — LEFT: GNS + Consignee + Buyer  |  RIGHT: Meta grid (7 cols) */}
      <table className="meta-table">
        <tbody>

          {/* Row 1 — company cell spans all 7 rows; right = Invoice No | e-Way Bill | Dated */}
          <tr>
            <td rowSpan="7" className="company-cell" style={{ width: "42%", padding: 0, verticalAlign: "top" }}>

              {/* GNS company info */}
              <div className="company-box">
                <div className="logo-box">
                  {data.seller?.logo
                    ? <img src={data.seller.logo} alt="logo" className="logo-img" />
                    : <span className="logo-text">LOGO</span>
                  }
                </div>
                <div className="company-details">
                  <div className="company-title">{sName}</div>
                  {sUdyam && <div style={{ fontSize: 7.8 }}>{sUdyam}</div>}
                  <div style={{ fontSize: 8 }}>{sAddr}</div>
                  <div style={{ fontSize: 8 }}><strong>GSTIN/UIN:</strong> {sGstin || "—"}</div>
                  <div style={{ fontSize: 8 }}><strong>State Name :</strong> {sState}</div>
                  {sCin   && <div style={{ fontSize: 8 }}><strong>CIN :</strong> {sCin}</div>}
                  {sEmail && <div style={{ fontSize: 8 }}><strong>E-Mail :</strong> {sEmail}</div>}
                </div>
              </div>

              {/* Consignee (Ship to) */}
              <div style={{ padding: "2px 4px", borderBottom: "1px solid #000" }}>
                <div style={{ fontSize: 7.8, fontWeight: 700, color: "#333", marginBottom: 0.5 }}>Consignee (Ship to)</div>
                {consigneeName && <div className="bold" style={{ fontSize: 8.5, marginBottom: 0.5 }}>{consigneeName}</div>}
                {consigneeAddr && <div style={{ whiteSpace: "pre-wrap", fontSize: 8, lineHeight: 1.15, marginBottom: 0.5 }}>{consigneeAddr}</div>}
                {(data.consignee?.contact || data.buyer?.contact) && (
                  <div style={{ fontSize: 8, marginBottom: 0.5 }}>Mob: {data.consignee?.contact || data.buyer?.contact}</div>
                )}
                <div style={{ fontSize: 8, marginBottom: 0.5 }}><strong>GSTIN/UIN :</strong> {consigneeGstin || "—"}</div>
                <div style={{ fontSize: 8 }}><strong>State Name :</strong> {data.consignee?.state || data.buyer?.state || "—"}</div>
              </div>

              {/* Buyer (Bill to) */}
              <div style={{ padding: "2px 4px" }}>
                <div style={{ fontSize: 7.8, fontWeight: 700, color: "#333", marginBottom: 0.5 }}>Buyer (Bill to)</div>
                {buyerName && <div className="bold" style={{ fontSize: 8.5, marginBottom: 0.5 }}>{buyerName}</div>}
                {buyerAddr && <div style={{ whiteSpace: "pre-wrap", fontSize: 8, lineHeight: 1.15, marginBottom: 0.5 }}>{buyerAddr}</div>}
                {data.buyer?.contact && <div style={{ fontSize: 8, marginBottom: 0.5 }}>Mob: {data.buyer.contact}</div>}
                <div style={{ fontSize: 8, marginBottom: 0.5 }}><strong>GSTIN/UIN :</strong> {buyerGstin || "—"}</div>
                {data.buyer?.state && <div style={{ fontSize: 8, marginBottom: 0.5 }}><strong>State Name :</strong> {data.buyer.state}</div>}
                {placeOfSupply && <div style={{ fontSize: 8 }}><strong>Place of Supply :</strong> {placeOfSupply}</div>}
              </div>

            </td>

            {/* Row 1 right — 3 pairs: Invoice No. | e-Way Bill No. | Dated */}
            <td className="label" style={{ width: "8%" }}>Invoice No.</td>
            <td className="bold"  style={{ width: "11%" }}>{invoiceNo || "—"}</td>
            <td className="label" style={{ width: "8%" }}>e-Way Bill No.</td>
            <td className="bold"  style={{ width: "11%" }}>{eWayBill || "—"}</td>
            <td className="label" style={{ width: "8%" }}>Dated</td>
            <td style={{ width: "12%" }}>{date || "—"}</td>
          </tr>

          <tr>
            <td className="label">Delivery Note</td>
            <td colSpan="2">{data.meta?.deliveryNote || ""}</td>
            <td className="label">Mode/Terms of Payment</td>
            <td colSpan="2">{data.meta?.modeTerms || ""}</td>
          </tr>

          <tr>
            <td className="label">Reference No. &amp; Date.</td>
            <td colSpan="2">{data.meta?.referenceNo || ""}</td>
            <td className="label">Other References</td>
            <td colSpan="2">{data.meta?.otherRef || data.meta?.otherReference || ""}</td>
          </tr>

          <tr>
            <td className="label">Buyer's Order No.</td>
            <td colSpan="2">{data.meta?.buyersOrderNo || ""}</td>
            <td className="label">Dated</td>
            <td colSpan="2">{data.meta?.buyerOrderDate || ""}</td>
          </tr>

          <tr>
            <td className="label">Dispatch Doc No.</td>
            <td colSpan="2">{data.meta?.dispatchDocNo || ""}</td>
            <td className="label">Delivery Note Date</td>
            <td colSpan="2">{data.meta?.deliveryDate || ""}</td>
          </tr>

          <tr>
            <td className="label">Dispatched through</td>
            <td colSpan="2">{data.meta?.dispatchedThrough || ""}</td>
            <td className="label">Destination</td>
            <td colSpan="2">{placeOfSupply || ""}</td>
          </tr>

          <tr>
            <td className="label">Terms of Delivery</td>
            <td colSpan="5">{data.meta?.termsOfDelivery || ""}</td>
          </tr>

        </tbody>
      </table>

      {/* ══════════════════════════════════════════════════════
          SECTION B — Goods / Items Table
          ══════════════════════════════════════════════════════ */}
      <table className="goods-table">
        <thead>
          <tr>
            <th style={{ width: "4%" }}>Sl No</th>
            <th style={{ width: "44%", textAlign: "left" }}>Description of Goods</th>
            <th style={{ width: "10%" }}>HSN/SAC</th>
            <th style={{ width: "8%" }}>Quantity</th>
            <th style={{ width: "10%" }}>Rate</th>
            <th style={{ width: "6%" }}>Per</th>
            <th style={{ width: "22%", textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>

          {/* Item rows */}
          {items.map((item, idx) => {
            return (
              <tr key={`${item.si || idx}-item`}>
                <td className="text-center">{item.si || idx + 1}</td>
                <td className="description-cell" style={{ textTransform: "uppercase", whiteSpace: "pre-wrap" }}>
                  {item.description || item.item_description || item.product_name || item.name || item.item_name || ""}
                </td>
                <td className="text-center">{item.hsn || item.hsn_code || ""}</td>
                <td className="text-right">{fmt(item.qty)}</td>
                <td className="text-right">{fmt(item.rate)}</td>
                <td className="text-center">{item.unit || unit0}</td>
                <td className="text-right">{fmt(item.amount)}</td>
              </tr>
            );
          })}

          {/* blank filler rows: 7 individual cells preserve vertical column lines */}
          <tr style={{ height: 18 }}>
            <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          </tr>
          <tr style={{ height: 18 }}>
            <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
          </tr>

          {/* ── TAX ROW — ONE single row, multiline cells, all column borders visible ── */}
          <tr style={{ verticalAlign: "top" }}>
            <td></td>

            {/* Description cell: "Less :" left + tax labels right */}
            <td style={{ padding: "3px 6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                <span style={{ fontStyle: "italic", fontWeight: 700, whiteSpace: "nowrap", fontSize: 9 }}>Less :</span>
                <div style={{ textAlign: "right", fontWeight: 700, fontSize: 9, lineHeight: 1.8 }}>
                  {isIgst ? "IGST" : <>CGST<br />SGST</>}
                </div>
              </div>
            </td>

            {/* HSN/SAC */}
            <td></td>
            {/* Quantity */}
            <td></td>

            {/* Rate: empty */}
            <td></td>

            {/* Per: percentage values — matches image column */}
            <td style={{ textAlign: "right", fontSize: 9, lineHeight: 1.8, padding: "3px 5px", verticalAlign: "top" }}>
              {isIgst
                ? <>{igstPct}%</>
                : <>{invoiceCgstPct > 0 ? invoiceCgstPct : 9}%<br />{invoiceSgstPct > 0 ? invoiceSgstPct : 9}%</>
              }
            </td>

            {/* Amount: tax amounts */}
            <td style={{ textAlign: "right", fontSize: 9, lineHeight: 1.8, padding: "3px 5px" }}>
              {isIgst
                ? <>{fmt(igstAmt)}</>
                : <>{fmt(cgstAmt)}<br />{fmt(sgstAmt)}</>
              }
              {roundOff !== 0 && <><br />{roundOff > 0 ? "+" : ""}{fmt(roundOff)}</>}
            </td>
          </tr>

          {/* ── Total row ── */}
          <tr className="goods-total-row">
            <td></td>
            <td colSpan={5} style={{ textAlign: "right", fontWeight: 700 }}>Total</td>
            <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(grand)}</td>
          </tr>

        </tbody>
      </table>

      {/* ── Amount in words ─────────────────────────────────── */}
      <div className="amount-word">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="amount-label">Amount Chargeable (in words)</div>
          <div style={{ fontSize: 9, fontWeight: 700 }}>E. &amp; O.E</div>
        </div>
        <div className="amount-text" style={{ textTransform: "uppercase", marginTop: 2 }}>
          {numberToWordsInr ? numberToWordsInr(grand) : `INR ${grand}`}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECTION C — HSN / Tax Summary Table
          ══════════════════════════════════════════════════════ */}
      <table className="tax-table">
        <thead>
          <tr>
            <th rowSpan="2" style={{ width: "28%" }}>HSN/SAC</th>
            <th rowSpan="2" style={{ width: "16%" }}>Taxable Value</th>
            {isIgst
              ? <th colSpan="2">IGST</th>
              : <><th colSpan="2">CGST</th><th colSpan="2">SGST</th></>}
            <th rowSpan="2" style={{ width: "16%" }}>Total Tax Amount</th>
          </tr>
          <tr>
            {isIgst
              ? <><th>Rate</th><th>Amount</th></>
              : <><th>Rate</th><th>Amount</th><th>Rate</th><th>Amount</th></>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{items[0]?.hsn || "—"}</td>
            <td className="text-right" style={{ fontFamily: "monospace" }}>{fmt(taxable)}</td>
            {isIgst
              ? <><td className="text-right" style={{ fontFamily: "monospace" }}>{igstPct}%</td><td className="text-right" style={{ fontFamily: "monospace" }}>{fmt(igstAmt)}</td></>
              : <><td className="text-right" style={{ fontFamily: "monospace" }}>{invoiceCgstPct}%</td><td className="text-right" style={{ fontFamily: "monospace" }}>{fmt(cgstAmt)}</td>
                 <td className="text-right" style={{ fontFamily: "monospace" }}>{invoiceSgstPct}%</td><td className="text-right" style={{ fontFamily: "monospace" }}>{fmt(sgstAmt)}</td></>}
            <td className="text-right bold" style={{ fontFamily: "monospace" }}>{fmt(totalTax)}</td>
          </tr>
          <tr>
            <td className="text-right bold">Total</td>
            <td className="text-right bold" style={{ fontFamily: "monospace" }}>{fmt(taxable)}</td>
            {isIgst
              ? <><td /><td className="text-right bold" style={{ fontFamily: "monospace" }}>{fmt(igstAmt)}</td></>
              : <><td /><td className="text-right bold" style={{ fontFamily: "monospace" }}>{fmt(cgstAmt)}</td>
                 <td /><td className="text-right bold" style={{ fontFamily: "monospace" }}>{fmt(sgstAmt)}</td></>}
            <td className="text-right bold" style={{ fontFamily: "monospace" }}>{fmt(totalTax)}</td>
          </tr>
        </tbody>
      </table>

      {/* Tax amount in words */}
      <div style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderTop: "none", marginTop: "-1px", padding: "3px 8px", fontSize: 9.5 }}>
        <span style={{ color: "#444" }}>Tax Amount (in words) : </span>
        <strong>{numberToWordsInr ? numberToWordsInr(totalTax) : `INR ${totalTax}`}</strong>
      </div>

      {/* SECTION D: footer table */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderLeft: "1px solid #000", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderTop: "none", marginTop: "-1px", tableLayout: "fixed" }}>
        <tbody>

          {/* ROW 1: Declaration (left) | Rejection Policy (right) */}
          <tr style={{ verticalAlign: "top" }}>
            {/* no borderRight = remove vertical divider between declaration and rejection */}
            <td style={{ width: "50%", borderBottom: "1px solid #000", padding: "5px 8px", fontSize: 9 }}>
              {/* heading underline only under text, not full width */}
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 700, borderBottom: "1px solid #000", paddingBottom: 2 }}>Declaration</span>
              </div>
              <ol style={{ listStyle: "none", paddingLeft: 0, margin: 0, fontSize: 8.5, lineHeight: 1.45 }}>
                <li>1.Certified that the particulars given above are true and correct.</li>
                <li>2.The amount indicated represents the price actually charged and that there is no flow of additional consideration directly or indirectly from the buyer.</li>
                <li>3.All disputes subject to Hyderabad jurisdiction.</li>
                <li>4.Goods once sold cannot be taken back or exchanged.</li>
                <li>5.Cheques subject to realisation.</li>
                <li>6.24% Interest per annum will be charged if the bills are not paid within due date.</li>
                <li>7.Goods Return "As it is" shall be taken back, only within 7 days from the Date of Delivery &amp; the same shall have to be Informed in Writing along with reasons for Goods Return.</li>
              </ol>
              <div style={{ marginTop: 4, fontSize: 8.5 }}>
                <strong>Remarks:</strong> {data.remarks || `Being material sold vide Invoice No : ${invoiceNo}`}
              </div>
            </td>
            <td style={{ width: "50%", borderBottom: "1px solid #000", padding: "5px 8px", fontSize: 9 }}>
              {/* heading underline only under text, not full width */}
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontWeight: 700, borderBottom: "1px solid #000", paddingBottom: 2 }}>Rejection</span>
              </div>
              <ol style={{ listStyle: "none", paddingLeft: 0, margin: 0, fontSize: 8.5, lineHeight: 1.45 }}>
                <li>1.</li>
                <li>2.</li>
                <li>3.</li>
                <li>4.</li>
              </ol>
            </td>
          </tr>

          {/* ROW 2: Prepared by | Verified by | Authorised Signatory */}
          <tr>
            <td colSpan={2} style={{ padding: 0, fontSize: 8.5, fontWeight: 600 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", height: "62px" }}>
                <div style={{ borderRight: "1px solid #000", borderTop: "1px solid #000", padding: "5px 4px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>Prepared by</div>
                  <div style={{ borderTop: "1px solid #000", height: 0 }}></div>
                </div>
                <div style={{ borderRight: "1px solid #000", borderTop: "1px solid #000", padding: "5px 4px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>Verified by</div>
                  <div style={{ borderTop: "1px solid #000", height: 0 }}></div>
                </div>
                <div style={{ borderTop: "1px solid #000", padding: "5px 4px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ textAlign: "right" }}>Authorised Signatory</div>
                  <div style={{ borderTop: "1px solid #000", height: 0 }}></div>
                </div>
              </div>
            </td>
          </tr>

        </tbody>
      </table>

      {/* ── Computer generated note ──────────────────────── */}
      <div className="bottom-note">This is a Computer Generated Invoice</div>

    </div>
  );
}
