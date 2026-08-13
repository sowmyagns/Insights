import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { numberToWordsInr } from "../../utils/invoiceCopyData";

/* ─── QR canvas – small 80px, encodes invoice number ─── */
function QRCanvas({ value }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value || "INVOICE", { width: 80, margin: 1 }, () => {});
  }, [value]);
  return <canvas ref={ref} style={{ display: "block" }} />;
}

/* ─── Shared border / font constants ─── */
const BD  = "1px solid #000";
const FF  = "Arial, Helvetica, sans-serif";
const TBL = { width: "100%", borderCollapse: "collapse" };

/* Standard data cell */
function dc(extra = {}) {
  return { border: BD, padding: "2px 4px", fontSize: "8px", fontFamily: FF, verticalAlign: "top", lineHeight: "1.35", color: "#000", ...extra };
}
/* Bold header label cell */
function lc(extra = {}) {
  return { border: BD, padding: "2px 4px", fontSize: "7.5px", fontWeight: "bold", fontFamily: FF, verticalAlign: "top", lineHeight: "1.35", color: "#000", ...extra };
}
/* Centred column header (items table) */
function hc(extra = {}) {
  return { border: BD, padding: "4px 3px", fontSize: "8px", fontWeight: "bold", fontFamily: FF, background: "#fff", textAlign: "center", verticalAlign: "middle", color: "#000", ...extra };
}

export default function TaxInvoiceCopy({ data }) {
  if (!data) return null;

  const items     = Array.isArray(data.items) ? data.items : [];
  const seller    = data.seller    || {};
  const buyer     = data.buyer     || {};
  const consignee = data.consignee || buyer;
  const meta      = data.meta      || {};
  const dispatch  = data.dispatch  || {};
  const payment   = data.payment   || {};
  const summary   = data.summary   || {};
  const taxMode   = data.tax_mode || data.taxMode || (data.isIgst ? "igst" : "cgst_sgst");
  const isIgst    = taxMode === "igst";

  /* ── seller ── */
  const sName  = seller.name    || "INSIGHTS IVA PRIVATE LIMITED";
  const sAddr  = seller.address || "";
  const sGstin = seller.gstin   || "";
  const sUdyam = seller.udyam   || "";
  const sCin   = seller.cin     || "";
  const sEmail = seller.email   || "";
  const sState = seller.state
    ? `${seller.state}${seller.state_code ? `, Code : ${seller.state_code}` : ""}`
    : "";

  /* ── meta ── */
  const invoiceNo    = meta.invoice_no   || meta.invoiceNo   || "";
  const date         = meta.date         || "";
  const eWayBill     = meta.eway_bill_no || meta.eWayBillNo  || "";
  const payTerms     = payment.terms || meta.payment_terms || meta.modeTerms || "Advance";
  const refNo        = meta.reference_no || "";
  const otherRefs    = meta.other_references || "";
  const buyerOrderNo = meta.buyer_order_no  || "";
  const buyerOrderDt = meta.buyer_order_date || "";
  const delivNote    = meta.delivery_note   || "";

  /* ── dispatch ── */
  const dispatchDoc = dispatch.lr_number || dispatch.vehicle_no || "";
  const dispatchDt  = dispatch.delivery_note_date || dispatch.dispatch_date || "";
  const dispThrough = dispatch.dispatch_through || dispatch.transport_name || dispatch.transporter_name || "";
  const destination = dispatch.destination || buyer.city || buyer.state || "";
  const delivTerms  = dispatch.delivery_terms || dispatch.terms || data.terms || "";

  /* ── e-Invoice – always render; "—" when empty ── */
  const irn     = data.irn     || data.irn_no    || "";
  const ackNo   = data.ack_no  || data.ackNo     || "";
  const ackDate = data.ack_date || data.ackDate  || "";
  const qrValue = invoiceNo || irn || "INVOICE";

  /* ── tax ── */
  const taxable  = +(summary.taxable_value  ?? summary.taxableTotal  ?? items.reduce((s,i)=>s+ +(i.taxable_amount??i.amount??0),0));
  const qtyTotal = +(summary.qty_total      ?? items.reduce((s,i)=>s+ +(i.qty||0),0));
  const unit0    = items[0]?.unit || "NOS";
  const igstPct  = +(items[0]?.igst_pct ?? items[0]?.igstPct ?? 18);
  const cgstPct  = +(items[0]?.cgst_pct ?? items[0]?.cgstPct ?? 9);
  const sgstPct  = +(items[0]?.sgst_pct ?? items[0]?.sgstPct ?? 9);
  const igstAmt  = +(summary.igst_total ?? summary.igstTotal ?? items.reduce((s,i)=>s+ +(i.igst_amount??i.igstAmount??0),0));
  const cgstAmt  = +(summary.cgst_total ?? summary.cgstTotal ?? items.reduce((s,i)=>s+ +(i.cgst_amount??i.cgstAmount??0),0));
  const sgstAmt  = +(summary.sgst_total ?? summary.sgstTotal ?? items.reduce((s,i)=>s+ +(i.sgst_amount??i.sgstAmount??0),0));
  const totalTax = isIgst ? igstAmt : cgstAmt + sgstAmt;
  const roundOff = +(summary.round_off ?? data.roundOff ?? 0);
  const grand    = +(summary.grand_total ?? data.grandTotal ?? taxable + totalTax + roundOff);
  const f2 = n => (+n||0).toFixed(2);
  const f3 = n => (+n||0).toFixed(3);

  const fillerRows = Math.max(0, 8 - items.length);

  /* ── meta cell helpers: full borders so grid is visible like reference image ── */
  const mLabel = (extra={}) => ({ ...lc(), ...extra });
  const mVal   = (extra={}) => ({ ...dc(), ...extra });

  return (
    <div
      className="tax-invoice-copy"
      style={{
        fontFamily: FF,
        fontSize: "8px",
        color: "#000",
        background: "#fff",
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        padding: "5mm 6mm 4mm",
        boxSizing: "border-box",
        border: "none",
        lineHeight: 1.35,
      }}
    >

      {/* ════════════════════════════════════════════════════
          PRE-HEADER  (no border — exact copy of reference image)

             Tax Invoice          e-Invoice
                                  [QR – small]
          IRN      : xxxx...
          Ack No.  : 112631145034957
          Ack Date : 27-Jun-26
      ════════════════════════════════════════════════════ */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"2px" }}>

        {/* LEFT — title + IRN block */}
        <div style={{ flex:1, paddingRight:"8px" }}>

          {/* "Tax Invoice" — centered */}
          <div style={{
            textAlign:"center", fontSize:"13px", fontWeight:"bold",
            fontFamily:FF, marginBottom:"6px",
          }}>Tax Invoice</div>

          {/* IRN / Ack — table for perfect colon alignment */}
          <table style={{ borderCollapse:"collapse", width:"auto" }}>
            <tbody>
              <tr>
                <td style={{ fontFamily:FF, fontWeight:"bold", fontSize:"8px", paddingRight:"3px", verticalAlign:"top", whiteSpace:"nowrap" }}>IRN</td>
                <td style={{ fontFamily:FF, fontWeight:"bold", fontSize:"8px", paddingRight:"5px", verticalAlign:"top" }}>:</td>
                <td style={{ fontFamily:"monospace", fontSize:"7px", lineHeight:"1.35", wordBreak:"break-all", maxWidth:"370px", verticalAlign:"top" }}>{irn || "—"}</td>
              </tr>
              <tr>
                <td style={{ fontFamily:FF, fontWeight:"bold", fontSize:"8px", paddingRight:"3px", whiteSpace:"nowrap" }}>Ack No.</td>
                <td style={{ fontFamily:FF, fontWeight:"bold", fontSize:"8px", paddingRight:"5px" }}>:</td>
                <td style={{ fontFamily:FF, fontSize:"8px" }}>{ackNo || "—"}</td>
              </tr>
              <tr>
                <td style={{ fontFamily:FF, fontWeight:"bold", fontSize:"8px", paddingRight:"3px", whiteSpace:"nowrap" }}>Ack Date</td>
                <td style={{ fontFamily:FF, fontWeight:"bold", fontSize:"8px", paddingRight:"5px" }}>:</td>
                <td style={{ fontFamily:FF, fontSize:"8px" }}>{ackDate || "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RIGHT — e-Invoice label + small QR */}
        <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:"2px" }}>
          <span style={{ fontFamily:FF, fontSize:"8.5px", fontWeight:"bold" }}>e-Invoice</span>
          <QRCanvas value={qrValue} />
        </div>

      </div>

      {/* ════════════════════════════════════════════════════
          SELLER + META TABLE (main bordered section)
      ════════════════════════════════════════════════════ */}
      <table style={{ ...TBL, border: BD }}>
        <tbody>
          <tr>

            {/* ── LEFT: Seller, Consignee, Buyer ── */}
            <td style={{ ...dc(), width:"40%", border: BD, padding:"3px 4px", verticalAlign:"top" }}>

              {/* Seller row: logo + info */}
              <div style={{ display:"flex", gap:"4px", alignItems:"flex-start", marginBottom:"3px" }}>
                {seller.logo
                  ? <img src={seller.logo} alt="" style={{ width:"44px", height:"44px", objectFit:"contain", border:BD, flexShrink:0 }} />
                  : <div style={{ width:"44px", height:"44px", border:BD, background:"#1e293b", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"7px", fontWeight:"900", flexShrink:0, textAlign:"center" }}>
                      {sName.split(" ").slice(0,3).map(w=>w[0]).join("").toUpperCase()}
                    </div>
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:"bold", fontSize:"8.5px", textTransform:"uppercase", lineHeight:"1.3", marginBottom:"1px" }}>{sName}</div>
                  {sAddr  && <div style={{ fontSize:"7.5px", lineHeight:"1.3" }}>{sAddr}</div>}
                  {sGstin && <div style={{ fontSize:"7.5px" }}>GSTIN/UIN: {sGstin}</div>}
                  {sUdyam && <div style={{ fontSize:"7.5px" }}>UDYAM: {sUdyam}</div>}
                  {sState && <div style={{ fontSize:"7.5px" }}>State Name : {sState}</div>}
                  {sCin   && <div style={{ fontSize:"7.5px" }}>CIN: {sCin}</div>}
                  {sEmail && <div style={{ fontSize:"7.5px" }}>E-Mail : {sEmail}</div>}
                </div>
              </div>

              {/* Consignee */}
              <div style={{ borderTop: BD, paddingTop:"2px", marginBottom:"3px" }}>
                <div style={{ fontSize:"7.5px", marginBottom:"1px" }}>Consignee (Ship to)</div>
                <div style={{ fontWeight:"bold", fontSize:"8px" }}>{consignee.name || buyer.name || "—"}</div>
                <div style={{ fontSize:"7.5px", lineHeight:"1.3", whiteSpace:"pre-wrap" }}>{consignee.address||buyer.shipping_address||buyer.address||""}</div>
                {(consignee.phone||buyer.phone)  && <div style={{ fontSize:"7.5px" }}>Mob: {consignee.phone||buyer.phone}</div>}
                {(consignee.gstin||buyer.gstin)  && <div style={{ fontSize:"7.5px" }}>GSTIN/UIN&nbsp;&nbsp;: {consignee.gstin||buyer.gstin}</div>}
                {(consignee.state||buyer.state)  && <div style={{ fontSize:"7.5px" }}>State Name&nbsp;: {consignee.state||buyer.state}</div>}
              </div>

              {/* Buyer */}
              <div style={{ borderTop: BD, paddingTop:"2px" }}>
                <div style={{ fontSize:"7.5px", marginBottom:"1px" }}>Buyer (Bill to)</div>
                <div style={{ fontWeight:"bold", fontSize:"8px" }}>{buyer.name || "—"}</div>
                <div style={{ fontSize:"7.5px", lineHeight:"1.3", whiteSpace:"pre-wrap" }}>{buyer.billing_address||buyer.address||""}</div>
                {buyer.phone  && <div style={{ fontSize:"7.5px" }}>Mob: {buyer.phone}</div>}
                {buyer.gstin  && <div style={{ fontSize:"7.5px" }}>GSTIN/UIN&nbsp;&nbsp;: {buyer.gstin}</div>}
                {buyer.state  && <div style={{ fontSize:"7.5px" }}>State Name&nbsp;: {buyer.state}</div>}
                {(buyer.place_of_supply||data.placeOfSupply) && <div style={{ fontSize:"7.5px" }}>Place of Supply&nbsp;: {buyer.place_of_supply||data.placeOfSupply}</div>}
              </div>
            </td>

            {/* ── RIGHT: Invoice meta (nested table) ── */}
            <td style={{ width:"60%", padding:0, verticalAlign:"top", border: BD, borderLeft:"none" }}>
              <table style={{ ...TBL, borderCollapse:"collapse" }}>
                <tbody>

                  {/* Invoice No. | e-Way Bill No. | Dated — label row (first row: no top border to avoid double with outer td) */}
                  <tr>
                    <td style={{ ...mLabel(), width:"35%", borderTop:"none", borderLeft:"none" }}>Invoice No.</td>
                    <td style={{ ...mLabel(), width:"30%", borderTop:"none" }}>e-Way Bill No.</td>
                    <td style={{ ...mLabel(), width:"35%", borderTop:"none", borderRight:"none" }}>Dated</td>
                  </tr>
                  {/* Values */}
                  <tr>
                    <td style={{ ...mVal(), fontWeight:"bold", fontSize:"8.5px", borderLeft:"none" }}>{invoiceNo}</td>
                    <td style={{ ...mVal() }}>{eWayBill}</td>
                    <td style={{ ...mVal(), fontWeight:"bold", fontSize:"8.5px", borderRight:"none" }}>{date}</td>
                  </tr>

                  {/* Delivery Note | Mode/Terms of Payment */}
                  <tr>
                    <td style={{ ...mLabel(), borderLeft:"none" }}>Delivery Note</td>
                    <td colSpan={2} style={{ ...mLabel(), borderRight:"none" }}>Mode/Terms of Payment</td>
                  </tr>
                  <tr>
                    <td style={{ ...mVal(), borderLeft:"none" }}>{delivNote}</td>
                    <td colSpan={2} style={{ ...mVal(), fontWeight:"bold", borderRight:"none" }}>{payTerms}</td>
                  </tr>

                  {/* Reference No. & Date | Other References */}
                  <tr>
                    <td style={{ ...mLabel(), borderLeft:"none" }}>Reference No. &amp; Date.</td>
                    <td colSpan={2} style={{ ...mLabel(), borderRight:"none" }}>Other References</td>
                  </tr>
                  <tr>
                    <td style={{ ...mVal(), borderLeft:"none" }}>{refNo}</td>
                    <td colSpan={2} style={{ ...mVal(), borderRight:"none" }}>{otherRefs}</td>
                  </tr>

                  {/* Buyer's Order No. | Dated */}
                  <tr>
                    <td style={{ ...mLabel(), borderLeft:"none" }}>Buyer's Order No.</td>
                    <td colSpan={2} style={{ ...mLabel(), borderRight:"none" }}>Dated</td>
                  </tr>
                  <tr>
                    <td style={{ ...mVal(), borderLeft:"none" }}>{buyerOrderNo}</td>
                    <td colSpan={2} style={{ ...mVal(), borderRight:"none" }}>{buyerOrderDt}</td>
                  </tr>

                  {/* Dispatch Doc No. | Delivery Note Date */}
                  <tr>
                    <td style={{ ...mLabel(), borderLeft:"none" }}>Dispatch Doc No.</td>
                    <td colSpan={2} style={{ ...mLabel(), borderRight:"none" }}>Delivery Note Date</td>
                  </tr>
                  <tr>
                    <td style={{ ...mVal(), borderLeft:"none" }}>{dispatchDoc}</td>
                    <td colSpan={2} style={{ ...mVal(), borderRight:"none" }}>{dispatchDt}</td>
                  </tr>

                  {/* Dispatched through | Destination */}
                  <tr>
                    <td style={{ ...mLabel(), borderLeft:"none" }}>Dispatched through</td>
                    <td colSpan={2} style={{ ...mLabel(), borderRight:"none" }}>Destination</td>
                  </tr>
                  <tr>
                    <td style={{ ...mVal(), fontWeight:"bold", borderLeft:"none" }}>{dispThrough}</td>
                    <td colSpan={2} style={{ ...mVal(), fontWeight:"bold", borderRight:"none" }}>{destination}</td>
                  </tr>

                  {/* Terms of Delivery */}
                  <tr>
                    <td colSpan={3} style={{ ...mLabel(), borderLeft:"none", borderRight:"none" }}>Terms of Delivery</td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ ...mVal(), borderBottom:"none", borderLeft:"none", borderRight:"none" }}>{delivTerms}</td>
                  </tr>

                </tbody>
              </table>
            </td>

          </tr>
        </tbody>
      </table>

      {/* ════════════════════════════════════════════════════
          ITEMS TABLE
          Sl No | Description of Goods | HSN/SAC | Quantity | Rate | per | Amount
      ════════════════════════════════════════════════════ */}
      <table style={{ ...TBL, marginTop:"-1px" }}>
        <thead>
          <tr>
            <th style={{ ...hc(), width:"4%",  padding:"4px 2px" }}>Sl<br/>No.</th>
            <th style={{ ...hc(), width:"35%", textAlign:"left", padding:"4px 5px" }}>Description of Goods</th>
            <th style={{ ...hc(), width:"9%",  padding:"4px 2px" }}>HSN/<br/>SAC</th>
            <th style={{ ...hc(), width:"11%", padding:"4px 2px" }}>Quantity</th>
            <th style={{ ...hc(), width:"11%", padding:"4px 2px" }}>Rate</th>
            <th style={{ ...hc(), width:"6%",  padding:"4px 2px" }}>per</th>
            <th style={{ ...hc(), width:"14%", textAlign:"right", padding:"4px 5px" }}>Amount</th>
          </tr>
        </thead>
        <tbody>

          {/* ── items ── */}
          {items.map((item, idx) => (
            <tr key={item.si||idx}>
              <td style={{ ...dc(), textAlign:"center", fontWeight:"bold", verticalAlign:"middle", padding:"4px 2px" }}>{item.si||idx+1}</td>
              <td style={{ ...dc(), padding:"5px", lineHeight:"1.5", verticalAlign:"top" }}>
                <div style={{ fontWeight:"bold", fontSize:"8.5px" }}>{item.description||item.item_description||item.product_name||""}</div>
                {item.product_code && <div style={{ fontSize:"7px", color:"#555", marginTop:"2px", fontFamily:"monospace" }}>{item.product_code}</div>}
              </td>
              <td style={{ ...dc(), textAlign:"center", fontFamily:"monospace", verticalAlign:"middle", padding:"4px 2px" }}>{item.hsn||""}</td>
              <td style={{ ...dc(), textAlign:"right", fontWeight:"bold", fontFamily:"monospace", verticalAlign:"middle", padding:"4px 2px" }}>{f2(item.qty)}&nbsp;{item.unit||unit0}</td>
              <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace", verticalAlign:"middle", padding:"4px 2px" }}>{f3(item.rate)}</td>
              <td style={{ ...dc(), textAlign:"center", verticalAlign:"middle", padding:"4px 2px" }}>{item.unit||unit0}</td>
              <td style={{ ...dc(), textAlign:"right", fontWeight:"bold", fontFamily:"monospace", verticalAlign:"middle", padding:"4px 5px" }}>{f2(item.taxable_amount??item.amount)}</td>
            </tr>
          ))}

          {/* ── blank filler rows ── */}
          {[...Array(fillerRows)].map((_,i)=>(
            <tr key={`f${i}`} style={{ height:"16px" }}>
              {[0,1,2,3,4,5,6].map(c=>(
                <td key={c} style={{ ...dc(), borderTop:"none", borderBottom:"none", height:"16px" }}></td>
              ))}
            </tr>
          ))}

          {/* ── Less row ── */}
          <tr>
            <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
            <td style={{ ...dc(), borderTop:"none", borderBottom:"none", fontStyle:"italic", fontWeight:"bold", textAlign:"right", padding:"3px 5px" }}>Less :</td>
            {[0,1,2,3,4].map(i=><td key={i} style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>)}
          </tr>

          {/* ── Tax rows ── */}
          {isIgst ? (
            <tr>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none", fontStyle:"italic", fontWeight:"bold", textAlign:"right", padding:"3px 5px" }}>IGST</td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"right", fontFamily:"monospace" }}>{igstPct} %</td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"right", fontFamily:"monospace", fontWeight:"bold" }}>{f3(igstAmt)}</td>
            </tr>
          ) : (
            <>
              <tr>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", fontStyle:"italic", fontWeight:"bold", textAlign:"right", padding:"3px 5px" }}>CGST</td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"right", fontFamily:"monospace" }}>{cgstPct} %</td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"right", fontFamily:"monospace", fontWeight:"bold" }}>{f2(cgstAmt)}</td>
              </tr>
              <tr>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", fontStyle:"italic", fontWeight:"bold", textAlign:"right", padding:"3px 5px" }}>SGST</td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"right", fontFamily:"monospace" }}>{sgstPct} %</td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"right", fontFamily:"monospace", fontWeight:"bold" }}>{f2(sgstAmt)}</td>
              </tr>
            </>
          )}

          {/* ── Rounded off ── */}
          {roundOff !== 0 && (
            <tr>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none", fontStyle:"italic", fontWeight:"bold", textAlign:"right", padding:"3px 5px" }}>ROUNDED OFF</td>
              {[0,1,2,3].map(i=><td key={i} style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>)}
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"right", fontFamily:"monospace", fontWeight:"bold" }}>
                {roundOff>0?"":"(-)"}{f3(Math.abs(roundOff))}
              </td>
            </tr>
          )}

          {/* ── Total ── */}
          <tr>
            <td style={dc()}></td>
            <td style={{ ...dc(), fontWeight:"bold", textAlign:"right", padding:"3px 5px" }}>Total</td>
            <td style={dc()}></td>
            <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace", fontWeight:"bold" }}>{f2(qtyTotal)}&nbsp;{unit0}</td>
            <td style={dc()}></td>
            <td style={dc()}></td>
            <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace", fontWeight:"bold", fontSize:"10px" }}>₹&nbsp;{f2(grand)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Amount in words ── */}
      <table style={{ ...TBL, marginTop:"-1px" }}>
        <tbody>
          <tr>
            <td style={{ ...dc(), fontSize:"7.5px" }}>Amount Chargeable (in words)</td>
            <td style={{ ...dc(), textAlign:"right", fontStyle:"italic", fontSize:"7.5px" }}>E. &amp; O.E.</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...dc(), fontWeight:"bold", fontSize:"9px", textTransform:"uppercase" }}>
              {numberToWordsInr(grand)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ════════════════════════════════════════════════════
          HSN / TAX SUMMARY TABLE
      ════════════════════════════════════════════════════ */}
      <table style={{ ...TBL, marginTop:"-1px" }}>
        <thead>
          <tr>
            <th style={{ ...hc() }} rowSpan={2}>HSN/SAC</th>
            <th style={{ ...hc() }} rowSpan={2}>Taxable<br/>Value</th>
            {isIgst
              ? <th style={{ ...hc() }} colSpan={2}>IGST</th>
              : <><th style={{ ...hc() }} colSpan={2}>Central Tax</th><th style={{ ...hc() }} colSpan={2}>State Tax</th></>
            }
            <th style={{ ...hc() }} rowSpan={2}>Total<br/>Tax Amount</th>
          </tr>
          <tr>
            <th style={hc()}>Rate</th><th style={hc()}>Amount</th>
            {!isIgst && <><th style={hc()}>Rate</th><th style={hc()}>Amount</th></>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const lt = isIgst
              ? +(item.igst_amount??item.igstAmount??igstAmt)
              : +(item.cgst_amount??item.cgstAmount??cgstAmt) + +(item.sgst_amount??item.sgstAmount??sgstAmt);
            return (
              <tr key={i}>
                <td style={{ ...dc(), fontFamily:"monospace", fontWeight:"bold" }}>{item.hsn||"—"}</td>
                <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace" }}>{f2(item.taxable_amount??item.amount??taxable)}</td>
                {isIgst ? (<>
                  <td style={{ ...dc(), textAlign:"right" }}>{igstPct}%</td>
                  <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace" }}>{f2(item.igst_amount??item.igstAmount??igstAmt)}</td>
                </>) : (<>
                  <td style={{ ...dc(), textAlign:"right" }}>{cgstPct}%</td>
                  <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace" }}>{f2(item.cgst_amount??item.cgstAmount??cgstAmt)}</td>
                  <td style={{ ...dc(), textAlign:"right" }}>{sgstPct}%</td>
                  <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace" }}>{f2(item.sgst_amount??item.sgstAmount??sgstAmt)}</td>
                </>)}
                <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace", fontWeight:"bold" }}>{f2(lt)}</td>
              </tr>
            );
          })}
          {/* totals */}
          <tr style={{ fontWeight:"bold" }}>
            <td style={{ ...dc(), textAlign:"right" }}>Total</td>
            <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace" }}>{f2(taxable)}</td>
            {isIgst ? (<>
              <td style={dc()}></td>
              <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace" }}>{f2(igstAmt)}</td>
            </>) : (<>
              <td style={dc()}></td>
              <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace" }}>{f2(cgstAmt)}</td>
              <td style={dc()}></td>
              <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace" }}>{f2(sgstAmt)}</td>
            </>)}
            <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace" }}>{f2(totalTax)}</td>
          </tr>
        </tbody>
      </table>

      {/* Tax Amount in words */}
      <table style={{ ...TBL, marginTop:"-1px" }}>
        <tbody>
          <tr>
            <td style={{ ...dc(), fontSize:"8px" }}>
              <b>Tax Amount (in words) :&nbsp;</b>
              <b style={{ textTransform:"uppercase" }}>{numberToWordsInr(totalTax)}</b>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ════════════════════════════════════════════════════
          DECLARATION | REJECTION POLICY
          — NO vertical border between columns (matches reference image)
      ════════════════════════════════════════════════════ */}
      <table style={{ ...TBL, marginTop:"-1px" }}>
        <tbody>
          <tr>
            {/* Declaration — no right border (removes dividing line) */}
            <td style={{ ...dc(), width:"50%", verticalAlign:"top", borderRight:"none" }}>
              <div style={{ fontWeight:"bold", textDecoration:"underline", fontSize:"8px", marginBottom:"2px" }}>Declaration</div>
              <ol style={{ margin:0, paddingLeft:"13px", fontSize:"7.5px", lineHeight:"1.5" }}>
                {[
                  "Certified that the particulars given above are true and correct",
                  "The amount indicated represents the price actually charged and that there is no flow of additional consideration directly or indirectly from the buyer.",
                  "All disputes subject to Hyderabad jurisdiction.",
                  "Goods once sold cannot be taken back or exchanged.",
                  "Cheques subject to realisation.",
                  "24% Interest per annum will be charged if the bills are not paid within due days.",
                  `Goods Return "As it is" shall be taken back, only within 7 days from the Date of Delivery & the same shall have to be intimated in "Writing" along with reasons for Goods Return.`,
                ].map((d,i)=><li key={i} style={{ marginBottom:"1px" }}>{d}</li>)}
              </ol>
              {(data.remarks||meta.remarks) && (
                <div style={{ marginTop:"3px", fontSize:"7.5px" }}>
                  <b>Remarks :</b>&nbsp;{data.remarks||meta.remarks}
                </div>
              )}
            </td>
            {/* Rejection Policy — no left border, no auto-numbering */}
            <td style={{ ...dc(), width:"50%", verticalAlign:"top", borderLeft:"none" }}>
              <div style={{ fontWeight:"bold", fontSize:"8px", marginBottom:"2px" }}>Rejection Policy :</div>
              <div style={{ fontSize:"7.5px", lineHeight:"1.5" }}>
                {(data.rejection_policy
                  ? data.rejection_policy.split("\n").filter(Boolean)
                  : [
                    "Loose Winding & Tight Release",
                    "Printability on face paper",
                    "Loop Tack, Peel Adhesion and Shear Strength (15% tolerance) are less than what is mentioned in our Technical Data Sheet.",
                    "For all Rejection and Quality Claims, End user Email /Samples for evaluation is mandatory.",
                    "For application issues End user visit by company team is mandatory.",
                    "No rejection claim will be accepted if above conditions are not fulfilled.",
                    "We are not responsible for material application related issues.",
                    "Any quantity discrepancies are only accepted within 24 hours from the receipt of the material",
                    "Any quality discrepancies are only accepted within 7 working days from the receipt of the Material (Unconverted Rolls Only)",
                  ]
                ).map((r,i)=>(
                  <div key={i} style={{ marginBottom:"1px" }}>{r.replace(/^\d+\.\s*/,"")}</div>
                ))}
              </div>
              <div style={{ marginTop:"8px", textAlign:"right", fontWeight:"bold", fontSize:"8px" }}>
                for {sName}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature — NO vertical borders between cells, only outer border */}
      <table style={{ ...TBL, marginTop:"-1px" }}>
        <tbody>
          <tr>
            <td style={{ ...dc(), width:"34%", height:"40px", verticalAlign:"top", borderRight:"none" }}>Prepared by</td>
            <td style={{ ...dc(), width:"33%", verticalAlign:"top", borderLeft:"none", borderRight:"none" }}>Verified by</td>
            <td style={{ ...dc(), width:"33%", verticalAlign:"bottom", textAlign:"right", borderLeft:"none" }}>
              <div style={{ fontWeight:"bold" }}>Authorised Signatory</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ textAlign:"center", fontSize:"8px", color:"#555", fontStyle:"italic", marginTop:"3px", fontFamily:FF }}>
        This is a Computer Generated Invoice
      </div>

      <style>{`
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          html, body {
            margin: 0 !important;
            background: #fff !important;
          }

          body * { visibility: hidden; }
          .tax-invoice-copy, .tax-invoice-copy * { visibility: visible; }
          .tax-invoice-copy {
            position: absolute; left: 0; top: 0;
            width: 100%; margin: 0; padding: 5mm 6mm 4mm;
            border: none;
            box-shadow: none;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
        }

        @media screen {
          .tax-invoice-copy {
            box-shadow: none;
            margin: 16px auto;
          }
        }
      `}</style>
    </div>
  );
}
