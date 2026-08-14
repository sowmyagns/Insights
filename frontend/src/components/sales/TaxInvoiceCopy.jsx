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
const FF  = '"Arial", "Helvetica Neue", Helvetica, sans-serif';
const TBL = { width:"100%", borderCollapse:"collapse", boxSizing:"border-box" };

/* Standard data cell */
function dc(extra = {}) {
  return { border:BD, padding:"3px 6px", fontSize:"10px", fontFamily:FF, verticalAlign:"top", lineHeight:"1.25", color:"#000", boxSizing:"border-box", ...extra };
}
/* Bold label cell */
function lc(extra = {}) {
  return { border:BD, padding:"3px 6px", fontSize:"10px", fontWeight:"bold", fontFamily:FF, verticalAlign:"top", lineHeight:"1.25", color:"#000", boxSizing:"border-box", ...extra };
}
/* Column header cell */
function hc(extra = {}) {
  return { border:BD, padding:"4px 4px", fontSize:"10px", fontWeight:"bold", fontFamily:FF, background:"#fff", textAlign:"center", verticalAlign:"middle", color:"#000", boxSizing:"border-box", ...extra };
}

export default function TaxInvoiceCopy({ data, innerRef, title: titleProp }) {
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
  const isQuotation = titleProp === "Quotation";
  const docNo       = meta.invoice_no || meta.invoiceNo || meta.document_no || meta.quote_number || "";
  const invoiceNo   = docNo;
  const docNoLabel  = isQuotation ? "Quotation No." : "Invoice No.";
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
  const delivTerms  = (dispatch.delivery_terms || dispatch.terms || data.terms || "")
    .split("\n")
    .filter(l => !/electronically generated/i.test(l) && !/disputes are subject to seller/i.test(l))
    .join("\n")
    .trim();

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

  const fillerRows = Math.max(0, 2 - items.length);

  return (
    <div
      ref={innerRef}
      className="tax-invoice-copy"
      style={{
        fontFamily: FF,
        fontSize: "10px",
        color: "#000",
        background: "#fff",
        width: "210mm",
        minHeight: "auto",
        margin: "0 auto",
        padding: "5mm 6mm 4mm",
        boxSizing: "border-box",
        border: BD,
        lineHeight: 1.25,
      }}
    >

      {/* ── TOP HEADER: Title (center) | IRN block (left) | e-Invoice QR (right) ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"4px", paddingBottom:"4px" }}>

        {/* LEFT — IRN / Ack block */}
        <div style={{ flex:1, paddingRight:"8px", paddingTop:"55px" }}>
          <table style={{ borderCollapse:"collapse", width:"auto" }}>
            <tbody>
              {[
                ["IRN", irn || "—"],
                ["Ack No.", ackNo || "—"],
                ["Ack Date", ackDate || "—"],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ fontFamily:FF, fontWeight:"bold", fontSize:"10px", paddingRight:"4px", verticalAlign:"top", whiteSpace:"nowrap", lineHeight:"1.4" }}>{label}</td>
                  <td style={{ fontFamily:FF, fontWeight:"bold", fontSize:"10px", paddingRight:"6px", verticalAlign:"top", lineHeight:"1.4" }}>:</td>
                  <td style={{ fontFamily:"monospace", fontSize:"9px", lineHeight:"1.4", wordBreak:"break-all", maxWidth:"340px", verticalAlign:"top" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CENTER — Tax Invoice title */}
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:"bold", fontFamily:FF, letterSpacing:"0.5px" }}>{titleProp || "Tax Invoice"}</div>
        </div>

        {/* RIGHT — e-Invoice label + QR */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"2px" }}>
          <span style={{ fontFamily:FF, fontSize:"10px", fontWeight:"bold" }}>e-Invoice</span>
          <QRCanvas value={qrValue} />
        </div>

      </div>

      {/* ── SELLER + META TABLE ── */}
      <table style={{ ...TBL, border:BD }}>
        <tbody>
          <tr>

            {/* LEFT: Seller info + Consignee + Buyer */}
            <td style={{ width:"42%", border:BD, padding:0, verticalAlign:"top", boxSizing:"border-box" }}>

              {/* Seller */}
              <div style={{ display:"flex", gap:"6px", alignItems:"flex-start", padding:"4px 6px", borderBottom:BD }}>
                {seller.logo
                  ? <img src={seller.logo} alt="" style={{ width:"48px", height:"48px", objectFit:"contain", border:BD, flexShrink:0 }} />
                  : <div style={{ width:"48px", height:"48px", border:BD, background:"#1e293b", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:"900", flexShrink:0, textAlign:"center" }}>
                      {sName.split(" ").slice(0,3).map(w=>w[0]).join("").toUpperCase()}
                    </div>
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:"bold", fontSize:"11px", textTransform:"uppercase", lineHeight:"1.3", marginBottom:"2px" }}>{sName}</div>
                  {sAddr  && <div style={{ fontSize:"10px", lineHeight:"1.3" }}>{sAddr}</div>}
                  {sGstin && <div style={{ fontSize:"10px" }}><b>GSTIN/UIN:</b> {sGstin}</div>}
                  {sUdyam && <div style={{ fontSize:"10px" }}><b>UDYAM:</b> {sUdyam}</div>}
                  {sState && <div style={{ fontSize:"10px" }}><b>State Name :</b> {sState}</div>}
                  {sCin   && <div style={{ fontSize:"10px" }}><b>CIN:</b> {sCin}</div>}
                  {sEmail && <div style={{ fontSize:"10px" }}><b>E-Mail :</b> {sEmail}</div>}
                </div>
              </div>

              {/* Consignee */}
              <div style={{ padding:"4px 6px", borderBottom:BD }}>
                <div style={{ fontSize:"9px", fontWeight:"bold", color:"#444", marginBottom:"2px" }}>Consignee (Ship to)</div>
                <div style={{ fontWeight:"bold", fontSize:"10px" }}>{consignee.name || buyer.name || "—"}</div>
                <div style={{ fontSize:"10px", lineHeight:"1.3", whiteSpace:"pre-wrap" }}>{consignee.address||buyer.shipping_address||buyer.address||""}</div>
                {(consignee.phone||buyer.phone) && <div style={{ fontSize:"10px" }}>Mob: {consignee.phone||buyer.phone}</div>}
                {(consignee.gstin||buyer.gstin) && <div style={{ fontSize:"10px" }}><b>GSTIN/UIN :</b> {consignee.gstin||buyer.gstin}</div>}
                {(consignee.state||buyer.state) && <div style={{ fontSize:"10px" }}><b>State Name :</b> {consignee.state||buyer.state}</div>}
              </div>

              {/* Buyer */}
              <div style={{ padding:"4px 6px" }}>
                <div style={{ fontSize:"9px", fontWeight:"bold", color:"#444", marginBottom:"2px" }}>Buyer (Bill to)</div>
                <div style={{ fontWeight:"bold", fontSize:"10px" }}>{buyer.name || "—"}</div>
                <div style={{ fontSize:"10px", lineHeight:"1.3", whiteSpace:"pre-wrap" }}>{buyer.billing_address||buyer.address||""}</div>
                {buyer.phone  && <div style={{ fontSize:"10px" }}>Mob: {buyer.phone}</div>}
                {buyer.gstin  && <div style={{ fontSize:"10px" }}><b>GSTIN/UIN :</b> {buyer.gstin}</div>}
                {buyer.state  && <div style={{ fontSize:"10px" }}><b>State Name :</b> {buyer.state}</div>}
                {(buyer.place_of_supply||data.placeOfSupply) && <div style={{ fontSize:"10px" }}><b>Place of Supply :</b> {buyer.place_of_supply||data.placeOfSupply}</div>}
              </div>
            </td>

            {/* RIGHT: Invoice meta grid */}
            <td style={{ width:"58%", padding:0, verticalAlign:"top", borderLeft:BD, boxSizing:"border-box" }}>
              <table style={{ ...TBL }}>
                <tbody>
                  {[
                    [[docNoLabel, invoiceNo, true], ["e-Way Bill No.", eWayBill, false], ["Dated", date, true]],
                    [["Delivery Note", delivNote, false, 1], ["Mode/Terms of Payment", payTerms, true, 2]],
                    [["Reference No. & Date.", refNo, false, 1], ["Other References", otherRefs, false, 2]],
                    [["Buyer's Order No.", buyerOrderNo, false, 1], ["Dated", buyerOrderDt, false, 2]],
                    [["Dispatch Doc No.", dispatchDoc, false, 1], ["Delivery Note Date", dispatchDt, false, 2]],
                    [["Dispatched through", dispThrough, true, 1], ["Destination", destination, true, 2]],
                  ].map((row, ri) => (
                    <tr key={ri}>
                      {row.map(([label, val, bold], ci) => (
                        <td key={ci} colSpan={ci === 1 && row.length === 2 ? 2 : 1}
                          style={{ ...lc(), borderTop: ri===0 ? "none":BD, borderLeft: ci===0 ? "none":BD, borderRight:"none", borderBottom:BD, fontSize:"10px" }}>
                          <div style={{ fontSize:"9px", color:"#555" }}>{label}</div>
                          <div style={{ fontWeight: bold ? "bold":"normal", fontSize:"10px" }}>{val}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ ...lc(), borderLeft:"none", borderRight:"none", borderBottom:"none", fontSize:"10px" }}>
                      <div style={{ fontSize:"9px", color:"#555" }}>Terms of Delivery</div>
                      <div>{delivTerms}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>

          </tr>
        </tbody>
      </table>

      {/* ── ITEMS TABLE ── */}
      <table style={{ ...TBL, marginTop:"-1px" }}>
        <thead>
          <tr>
            <th style={{ ...hc(), width:"5%"  }}>Sl<br/>No.</th>
            <th style={{ ...hc(), width:"40%", textAlign:"left", padding:"4px 6px" }}>Description of Goods</th>
            <th style={{ ...hc(), width:"10%" }}>HSN/<br/>SAC</th>
            <th style={{ ...hc(), width:"12%", textAlign:"right", padding:"4px 6px" }}>Quantity</th>
            <th style={{ ...hc(), width:"12%", textAlign:"right", padding:"4px 6px" }}>Rate</th>
            <th style={{ ...hc(), width:"6%"  }}>per</th>
            <th style={{ ...hc(), width:"15%", textAlign:"right", padding:"4px 6px" }}>Amount</th>
          </tr>
        </thead>
        <tbody>

          {/* ── items ── */}
          {items.map((item, idx) => (
            <tr key={item.si||idx}>
              <td style={{ ...dc(), textAlign:"center", verticalAlign:"top", padding:"4px 2px", borderTop:"none", borderBottom:"none" }}>{item.si||idx+1}</td>
              <td style={{ ...dc(), padding:"4px 6px", verticalAlign:"top", borderTop:"none", borderBottom:"none" }}>
                <div style={{ fontWeight:"bold", fontSize:"10.5px", textTransform:"uppercase", lineHeight:"1.3" }}>{item.description||item.item_description||item.product_name||""}</div>
                {(item.product_code||item.sub_description||item.specs) && (
                  <div style={{ fontSize:"9.5px", fontStyle:"italic", lineHeight:"1.3", marginTop:"1px", paddingLeft:"2px" }}>{item.sub_description||item.specs||item.product_code}</div>
                )}
              </td>
              <td style={{ ...dc(), textAlign:"center", verticalAlign:"top", padding:"4px 2px", borderTop:"none", borderBottom:"none" }}>{item.hsn||""}</td>
              <td style={{ ...dc(), textAlign:"right", fontWeight:"bold", fontFamily:"monospace", verticalAlign:"top", padding:"4px 6px", borderTop:"none", borderBottom:"none" }}>{f2(item.qty)}&nbsp;{item.unit||unit0}</td>
              <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace", verticalAlign:"top", padding:"4px 6px", borderTop:"none", borderBottom:"none" }}>{f3(item.rate)}</td>
              <td style={{ ...dc(), textAlign:"center", verticalAlign:"top", padding:"4px 2px", borderTop:"none", borderBottom:"none" }}>{item.unit||unit0}</td>
              <td style={{ ...dc(), textAlign:"right", fontWeight:"bold", fontFamily:"monospace", verticalAlign:"top", padding:"4px 6px", borderTop:"none", borderBottom:"none" }}>{f2(item.taxable_amount??item.amount)}</td>
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

          {/* ── Tax rows (col layout: 1=sl, 2=desc/label, 3=hsn, 4=qty, 5=rate%, 6=per, 7=amount) ── */}
          {isIgst ? (
            <tr>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none", fontWeight:"bold", fontSize:"10px", padding:"3px 6px" }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontStyle:"italic", fontWeight:"normal" }}>Less :</span>
                  <span style={{ textTransform:"uppercase" }}>IGST</span>
                </div>
              </td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"center", fontFamily:"monospace", fontSize:"10px" }}>{igstPct}%</td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"right", fontFamily:"monospace", fontWeight:"bold", fontSize:"10px" }}>{f3(igstAmt)}</td>
            </tr>
          ) : (
            <>
              <tr>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", fontWeight:"bold", fontSize:"10px", padding:"3px 6px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontStyle:"italic", fontWeight:"normal" }}>Less :</span>
                    <span style={{ textTransform:"uppercase" }}>CGST</span>
                  </div>
                </td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"center", fontFamily:"monospace", fontSize:"10px" }}>{cgstPct}%</td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"right", fontFamily:"monospace", fontWeight:"bold", fontSize:"10px" }}>{f2(cgstAmt)}</td>
              </tr>
              <tr>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", fontWeight:"bold", fontSize:"10px", textTransform:"uppercase", textAlign:"right", padding:"3px 6px" }}>SGST</td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"center", fontFamily:"monospace", fontSize:"10px" }}>{sgstPct}%</td>
                <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"right", fontFamily:"monospace", fontWeight:"bold", fontSize:"10px" }}>{f2(sgstAmt)}</td>
              </tr>
            </>
          )}

          {/* ── Rounded off ── */}
          {roundOff !== 0 && (
            <tr>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none", fontWeight:"bold", fontSize:"10px", textTransform:"uppercase", textAlign:"right", padding:"3px 6px" }}>ROUNDED OFF</td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none" }}></td>
              <td style={{ ...dc(), borderTop:"none", borderBottom:"none", textAlign:"right", fontFamily:"monospace", fontWeight:"bold", fontSize:"10px" }}>
                {roundOff > 0 ? "+" : "(-)"}{f3(Math.abs(roundOff))}
              </td>
            </tr>
          )}

          {/* ── Total ── */}
          <tr style={{ borderTop:BD, borderBottom:BD }}>
            <td style={{ ...dc(), borderTop:BD }}></td>
            <td style={{ ...dc(), fontWeight:"bold", fontSize:"10px", textAlign:"right", padding:"4px 6px", borderTop:BD }}>Total</td>
            <td style={{ ...dc(), borderTop:BD }}></td>
            <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace", fontWeight:"bold", fontSize:"10px", borderTop:BD }}>{f2(qtyTotal)}&nbsp;{unit0}</td>
            <td style={{ ...dc(), borderTop:BD }}></td>
            <td style={{ ...dc(), borderTop:BD }}></td>
            <td style={{ ...dc(), textAlign:"right", fontFamily:"monospace", fontWeight:"bold", fontSize:"11px", borderTop:BD }}>₹&nbsp;{f2(grand)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Amount in words ── */}
      <table style={{ ...TBL, marginTop:"-1px" }}>
        <tbody>
          <tr>
            <td style={{ ...dc(), fontSize:"7.5px", borderRight:"none", borderBottom:"none" }}>Amount Chargeable (in words)</td>
            <td style={{ ...dc(), textAlign:"right", fontStyle:"italic", fontSize:"7.5px", borderLeft:"none", borderBottom:"none" }}>E. &amp; O.E.</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...dc(), borderTop:"none", borderBottom:"none", fontWeight:"bold", fontSize:"9px", textTransform:"uppercase" }}>
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
              : <><th style={{ ...hc() }} colSpan={2}>CGST</th><th style={{ ...hc() }} colSpan={2}>SGST</th></>
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
            {/* Declaration — no right border */}
            <td style={{ ...dc(), width:"50%", verticalAlign:"top", borderRight:"none" }}>
              <div style={{ fontWeight:"bold", textDecoration:"underline", fontSize:"8px", marginBottom:"2px" }}>Declaration</div>
              <ol style={{ margin:0, paddingLeft:"13px", fontSize:"7.5px", lineHeight:"1.5", listStyleType:"decimal" }}>
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
              <div style={{ marginTop:"3px", fontSize:"7.5px" }}>
                <div><b>Remarks :</b></div>
                <div>{data.remarks || meta.remarks || (isQuotation ? `Quotation No : ${invoiceNo}` : `Being material sold vide Invoice No : ${invoiceNo}`)}</div>
              </div>
            </td>
            {/* Rejection — no left border, numbered lines only */}
            <td style={{ ...dc(), width:"50%", verticalAlign:"top", borderLeft:"none" }}>
              <div style={{ fontWeight:"bold", textDecoration:"underline", fontSize:"8px", marginBottom:"2px" }}>Rejection</div>
              <ol style={{ margin:0, paddingLeft:"13px", fontSize:"7.5px", lineHeight:"1.5", listStyleType:"decimal" }}>
                {[1,2,3,4,5].map(num => (
                  <li key={num} style={{ marginBottom:"4px" }}>&nbsp;</li>
                ))}
              </ol>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signature — all three in one row */}
      <table style={{ ...TBL, marginTop:"-1px" }}>
        <tbody>
          <tr>
            <td style={{ ...dc(), width:"34%", height:"60px", verticalAlign:"bottom", borderRight:"none", padding:"4px 6px 2px" }}>
              <div style={{ fontWeight:"bold", fontSize:"8px", marginBottom:"2px" }}>Prepared by</div>
            </td>
            <td style={{ ...dc(), width:"33%", height:"60px", verticalAlign:"bottom", borderLeft:"none", borderRight:"none", padding:"4px 6px 2px" }}>
              <div style={{ fontWeight:"bold", fontSize:"8px", marginBottom:"2px" }}>Verified by</div>
            </td>
            <td style={{ ...dc(), width:"33%", height:"60px", verticalAlign:"top", borderLeft:"none", padding:"4px 6px 2px", textAlign:"right" }}>
              <div style={{ fontSize:"7.5px", fontWeight:"bold", marginBottom:"auto" }}>{sName}</div>
              <div style={{ fontWeight:"bold", fontSize:"8px", marginTop:"32px" }}>Authorised Signatory</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ textAlign:"center", fontSize:"8px", color:"#555", fontStyle:"italic", marginTop:"3px", fontFamily:FF }}>
        This is a Computer Generated Invoice
      </div>

      <style>{`
        @media screen {
          .tax-invoice-copy {
            box-shadow: 0 2px 12px rgba(0,0,0,0.18);
            margin: 16px auto;
          }
        }
      `}</style>
    </div>
  );
}
