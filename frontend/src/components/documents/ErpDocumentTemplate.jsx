import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { numberToWordsInr } from "../../utils/invoiceCopyData";
import { getDocConfig } from "./documentTemplateConfig";
import "./ErpDocumentTemplate.css";

const COLS = 8;

function QRCanvas({ value, size = 88 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    QRCode.toCanvas(ref.current, value, { width: size, margin: 0, errorCorrectionLevel: "M" }, () => {});
  }, [value, size]);
  return <canvas ref={ref} aria-label="E-Invoice QR code" />;
}

function MetaPair({ label, value, valueColSpan = 1 }) {
  return (
    <>
      <td className="erp-doc__meta-label">{label}</td>
      <td className="erp-doc__meta-value" colSpan={valueColSpan}>{value || ""}</td>
    </>
  );
}

function fmt(n, d = 3) {
  return Number(n || 0).toFixed(d);
}

function fmtQty(n) {
  return Number(n || 0).toFixed(2);
}

const DEFAULT_DECLARATION = [
  "Certified that the particulars given above are true and correct.",
  "The amount indicated represents the price actually charged and that there is no flow of additional consideration directly or indirectly from the Buyer.",
  "All disputes are subject to Hyderabad jurisdiction.",
  "Goods once sold will not be taken back or exchanged.",
  "Cheques subject to realization.",
  "24% interest per annum will be charged if the bills are not paid within due days.",
  "Goods Return Policy: Goods shall be taken back only within 7 days from the date of Invoice with proper packing in saleable condition.",
];

const DEFAULT_REJECTION = [
  "Any rejection must be reported within 24 hours of receipt of material.",
  "Material must be in original packing for acceptance of returns.",
  "Quality complaints must include batch/lot reference and photographs.",
  "Rejection due to storage/handling at buyer premises is not accepted.",
  "Partial rejection must be clearly marked on delivery documents.",
  "Rejected material must be made available for inspection by seller.",
  "Credit note will be issued only after verification of rejected goods.",
  "Transit damage must be noted on transporter documents at delivery.",
  "Claims beyond the stipulated period will not be entertained.",
];

/**
 * Unified A4 ERP document — matches reference Tax Invoice grid (STIC-ON style).
 */
export default function ErpDocumentTemplate({ data, docType = "invoice" }) {
  if (!data) return null;

  const cfg = getDocConfig(docType);
  const seller = data.seller || {};
  const meta = data.meta || {};
  const buyer = data.buyer || data.party || {};
  const consignee = data.consignee || buyer;
  const dispatch = data.dispatch || {};
  const items = data.items || [];
  const summary = data.summary || {};
  const payment = data.payment || {};
  const taxMode = data.tax_mode || data.taxMode || (data.isIgst ? "igst" : "cgst_sgst");
  const isIgst = taxMode === "igst";

  const taxable = summary.taxable_value ?? summary.taxableTotal ?? items.reduce((s, it) => s + Number(it.taxable_amount ?? it.amount ?? 0), 0);
  const cgstTotal = summary.cgst_total ?? summary.cgstTotal ?? Number(data.cgst_amount ?? 0);
  const sgstTotal = summary.sgst_total ?? summary.sgstTotal ?? Number(data.sgst_amount ?? 0);
  const igstTotal = summary.igst_total ?? summary.igstTotal ?? Number(data.igst_amount ?? data.igstAmount ?? 0);
  const roundOff = summary.round_off ?? data.roundOff ?? 0;
  const grand = summary.grand_total ?? data.grandTotal ?? taxable + cgstTotal + sgstTotal + igstTotal + roundOff;
  const qtyTotal = summary.qty_total ?? items.reduce((s, it) => s + parseFloat(it.qty || 0), 0);
  const taxTotal = isIgst ? igstTotal : cgstTotal + sgstTotal;
  const igstPct = items[0]?.igst_pct ?? items[0]?.igstPct ?? (isIgst ? 18 : 0);

  const showEInvoice = cfg.showEInvoice;
  const docNo = meta.document_no || meta.invoice_no || meta.invoiceNo || meta.quote_number || meta.purchase_no || "";
  const docDate = meta.date || meta.document_date || "";
  const ackNo = data.ack_no || data.ackNo || "";
  const ackDate = data.ack_date || data.ackDate || docDate;
  const displayTitle = docType === "invoice" ? "Tax Invoice" : (data.title || cfg.title);

  const qrValue = showEInvoice
    ? [
        `Seller:${seller.name}`,
        seller.gstin ? `GSTIN:${seller.gstin}` : "",
        `Doc:${docNo}`,
        docDate ? `Date:${docDate}` : "",
        buyer.name ? `Party:${buyer.name}` : "",
        `Total:${grand}`,
        data.irn && data.irn !== "—" ? `IRN:${data.irn}` : "",
      ].filter(Boolean).join("|")
    : "e-invoice";

  const declaration = (data.terms || data.termsAndConditions || "").split("\n").filter(Boolean);
  const declItems = declaration.length ? declaration : DEFAULT_DECLARATION;
  const rejectionPolicy = DEFAULT_REJECTION;

  const metaRowCount = cfg.showEwayBill ? 7 : 4;
  const minItemRows = 7;
  const blankRows = Math.max(0, minItemRows - items.length);

  return (
    <article className="erp-doc" aria-label={displayTitle}>
      <table className="erp-doc__outer">
        <colgroup>
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "16%" }} />
        </colgroup>
        <tbody>
          {/* Title band */}
          <tr className="erp-doc__title-band">
            <td colSpan={COLS} className="erp-doc__title-cell">
              <div className="erp-doc__title-wrap">
                <div className="erp-doc__title-left">
                  {showEInvoice && data.irn && data.irn !== "—" ? (
                    <div className="erp-doc__irn-block">
                      <span className="erp-doc__lbl">IRN No.</span> : <span className="erp-doc__irn">{data.irn}</span>
                    </div>
                  ) : null}
                  {showEInvoice && (ackNo || ackDate) ? (
                    <div className="erp-doc__ack">
                      {ackNo ? <div><span className="erp-doc__lbl">Ack No.</span> : {ackNo}</div> : null}
                      {ackDate ? <div><span className="erp-doc__lbl">Ack Date</span> : {ackDate}</div> : null}
                    </div>
                  ) : null}
                </div>
                <div className="erp-doc__title-center">{displayTitle}</div>
                <div className="erp-doc__title-right">
                  {showEInvoice ? (
                    <>
                      <div className="erp-doc__einvoice-label">e-Invoice</div>
                      <div className="erp-doc__qr-box">
                        <QRCanvas value={qrValue} />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </td>
          </tr>

          {/* Company + metadata */}
          <tr>
            <td rowSpan={metaRowCount} colSpan={2} className="erp-doc__company-block">
              <div className="erp-doc__company-row">
                {seller.logo ? (
                  <img src={seller.logo} alt="" className="erp-doc__logo" />
                ) : (
                  <div className="erp-doc__logo-ph" aria-hidden="true" />
                )}
                <div className="erp-doc__company-text">
                  <strong className="erp-doc__company-name">{seller.name}</strong>
                  <div>{seller.address}</div>
                  {seller.udyam ? <div>UDYAM Reg No.: {seller.udyam}</div> : null}
                  {seller.gstin ? <div><span className="erp-doc__lbl">GSTIN/UIN</span> : {seller.gstin}</div> : null}
                  {seller.state ? <div><span className="erp-doc__lbl">State Name</span> : {seller.state}, Code : {seller.state_code || ""}</div> : null}
                  {seller.cin ? <div><span className="erp-doc__lbl">CIN</span> : {seller.cin}</div> : null}
                  {seller.email ? <div><span className="erp-doc__lbl">E-Mail</span> : {seller.email}</div> : null}
                </div>
              </div>
            </td>
            <MetaPair label={cfg.docNoLabel} value={docNo} />
            {cfg.showEwayBill ? (
              <MetaPair label="e-Way Bill No." value={meta.eway_bill_no || meta.eWayBillNo || ""} />
            ) : (
              <MetaPair label="Reference No." value={meta.reference_no || meta.referenceNo || ""} />
            )}
            <MetaPair label="Dated" value={docDate} />
          </tr>
          <tr>
            <MetaPair label="Delivery Note" value={meta.delivery_note || meta.deliveryNote || ""} />
            <MetaPair label="Mode/Terms of Payment" value={payment.terms || meta.payment_terms || ""} />
            {!cfg.showEwayBill ? (
              <MetaPair label="Valid Until" value={meta.valid_until || meta.validUntil || meta.due_date || meta.dueDate || ""} />
            ) : (
              <>
                <td className="erp-doc__meta-label">Terms of Delivery</td>
                <td className="erp-doc__meta-value">{dispatch.delivery_terms || ""}</td>
              </>
            )}
          </tr>
          <tr>
            <MetaPair label="Reference No. & Date." value={`${meta.reference_no || ""}${meta.reference_date ? ` dt. ${meta.reference_date}` : ""}`} />
            <MetaPair label="Other References" value={meta.other_references || ""} />
            {!cfg.showEwayBill ? (
              <>
                <td className="erp-doc__meta-label" />
                <td className="erp-doc__meta-value" />
              </>
            ) : (
              <>
                <td className="erp-doc__meta-label" />
                <td className="erp-doc__meta-value" />
              </>
            )}
          </tr>
          {cfg.showEwayBill ? (
            <>
              <tr>
                <MetaPair label="Buyer's Order No." value={meta.buyers_order_no || meta.po_number || ""} />
                <MetaPair label="Dated" value={meta.buyer_order_date || meta.po_date || ""} />
                <td className="erp-doc__meta-label" />
                <td className="erp-doc__meta-value" />
              </tr>
              <tr>
                <MetaPair label="Dispatch Doc No." value={dispatch.dispatch_doc_no || ""} />
                <MetaPair label="Delivery Note Date" value={dispatch.delivery_note_date || ""} />
                <td className="erp-doc__meta-label" />
                <td className="erp-doc__meta-value" />
              </tr>
              <tr>
                <MetaPair label="Dispatched through" value={dispatch.dispatch_through || dispatch.transport_name || ""} />
                <MetaPair label="Destination" value={dispatch.destination || ""} />
                <td className="erp-doc__meta-label" />
                <td className="erp-doc__meta-value" />
              </tr>
              <tr>
                <td className="erp-doc__meta-label" colSpan={2}>Terms of Delivery</td>
                <td className="erp-doc__meta-value" colSpan={4}>{dispatch.delivery_terms || ""}</td>
              </tr>
            </>
          ) : null}

          {/* Consignee / Buyer — stacked on left half (reference Tax Invoice layout) */}
          <tr>
            <td colSpan={4} className="erp-doc__party-block">
              <div className="erp-doc__party-label">{cfg.partyShipLabel}</div>
              <div className="erp-doc__party-text">
                <strong>{consignee.name || buyer.name}</strong><br />
                {consignee.address || buyer.shipping_address || buyer.billing_address || buyer.address}<br />
                {(consignee.phone || buyer.phone) ? <>Mobile No. : {consignee.phone || buyer.phone}<br /></> : null}
                {(consignee.gstin || buyer.gstin) ? <>GSTIN/UIN : {consignee.gstin || buyer.gstin}<br /></> : null}
                {(consignee.state || buyer.state) ? <>State Name : {consignee.state || buyer.state}, Code : {consignee.state_code || buyer.state_code || ""}</> : null}
              </div>
            </td>
            <td colSpan={4} rowSpan={2} className="erp-doc__party-blank">&nbsp;</td>
          </tr>
          <tr>
            <td colSpan={4} className="erp-doc__party-block">
              <div className="erp-doc__party-label">{cfg.partyBillLabel}</div>
              <div className="erp-doc__party-text">
                <strong>{buyer.name}</strong><br />
                {buyer.billing_address || buyer.address}<br />
                {buyer.phone ? <>Mobile No. : {buyer.phone}<br /></> : null}
                {buyer.gstin ? <>GSTIN/UIN : {buyer.gstin}<br /></> : null}
                {buyer.state ? <>State Name : {buyer.state}, Code : {buyer.state_code || ""}<br /></> : null}
                {(buyer.place_of_supply || buyer.placeOfSupply || buyer.state) ? (
                  <>Place of Supply : {buyer.place_of_supply || buyer.placeOfSupply || buyer.state}</>
                ) : null}
              </div>
            </td>
          </tr>

          {/* Line items — 8 cols: Sl | Desc(2) | HSN | Qty | Rate | per | Amount */}
          <tr className="erp-doc__items-head">
            <th>Sl<br />No.</th>
            <th colSpan={2}>Description of Goods</th>
            <th>HSN/SAC</th>
            <th>Quantity</th>
            <th>Rate</th>
            <th>per</th>
            <th>Amount</th>
          </tr>

          {items.length ? items.map((item, idx) => (
            <tr key={item.si || idx}>
              <td className="erp-doc__num">{item.si || idx + 1}</td>
              <td colSpan={2} className="erp-doc__desc">{item.description || item.item_description}</td>
              <td className="erp-doc__center">{item.hsn || ""}</td>
              <td className="erp-doc__num">{fmtQty(item.qty)} {(item.unit || "").toUpperCase()}</td>
              <td className="erp-doc__num">{fmt(item.rate, 3)}</td>
              <td className="erp-doc__center">{(item.unit || "pcs").toUpperCase()}</td>
              <td className="erp-doc__num"><strong>{fmt(item.total_amount ?? item.amount ?? item.taxable_amount, 3)}</strong></td>
            </tr>
          )) : (
            <tr><td colSpan={COLS} className="erp-doc__empty-row">&nbsp;</td></tr>
          )}
          {Array.from({ length: blankRows }).map((_, idx) => (
            <tr key={`blank-row-${idx}`}>
              <td className="erp-doc__blank-cell">&nbsp;</td>
              <td colSpan={2} className="erp-doc__blank-cell">&nbsp;</td>
              <td className="erp-doc__blank-cell">&nbsp;</td>
              <td className="erp-doc__blank-cell">&nbsp;</td>
              <td className="erp-doc__blank-cell">&nbsp;</td>
              <td className="erp-doc__blank-cell">&nbsp;</td>
              <td className="erp-doc__blank-cell">&nbsp;</td>
            </tr>
          ))}

          {isIgst && igstTotal > 0 ? (
            <tr className="erp-doc__tax-row">
              <td colSpan={5} />
              <td className="erp-doc__tax-label">IGST</td>
              <td className="erp-doc__center">{fmt(igstPct, 0)}%</td>
              <td className="erp-doc__num">{fmt(igstTotal, 2)}</td>
            </tr>
          ) : null}
          {!isIgst && cgstTotal > 0 ? (
            <tr className="erp-doc__tax-row">
              <td colSpan={6} />
              <td className="erp-doc__tax-label">CGST</td>
              <td className="erp-doc__num">{fmt(cgstTotal, 2)}</td>
            </tr>
          ) : null}
          {!isIgst && sgstTotal > 0 ? (
            <tr className="erp-doc__tax-row">
              <td colSpan={6} />
              <td className="erp-doc__tax-label">SGST</td>
              <td className="erp-doc__num">{fmt(sgstTotal, 2)}</td>
            </tr>
          ) : null}
          {roundOff !== 0 ? (
            <tr className="erp-doc__tax-row">
              <td colSpan={5} />
              <td colSpan={2} className="erp-doc__tax-label">Less&nbsp;&nbsp;ROUNDED OFF</td>
              <td className="erp-doc__num">
                {roundOff < 0 ? `(-)${fmt(Math.abs(roundOff), 3)}` : fmt(roundOff, 3)}
              </td>
            </tr>
          ) : null}
          <tr className="erp-doc__total-row">
            <td colSpan={2} className="erp-doc__total-label">Total</td>
            <td colSpan={2} />
            <td className="erp-doc__num"><strong>{fmtQty(qtyTotal)}</strong></td>
            <td colSpan={2} />
            <td className="erp-doc__num"><strong>₹ {fmt(grand, 3)}</strong></td>
          </tr>

          <tr>
            <td colSpan={7} className="erp-doc__words-cell">
              <span className="erp-doc__lbl">Amount Chargeable (in words)</span><br />
              <span className="erp-doc__words-text">{numberToWordsInr(grand)}</span>
            </td>
            <td className="erp-doc__eoe">E. &amp; O.E</td>
          </tr>

          {/* HSN tax summary */}
          <tr className="erp-doc__hsn-head">
            <th rowSpan={2}>HSN/SAC</th>
            <th rowSpan={2} colSpan={2}>Taxable<br />Value</th>
            {isIgst ? (
              <th colSpan={2}>IGST</th>
            ) : (
              <>
                <th colSpan={2}>CGST</th>
                <th colSpan={2}>SGST</th>
              </>
            )}
            <th rowSpan={2} colSpan={isIgst ? 3 : 1}>Total Tax<br />Amount</th>
          </tr>
          <tr className="erp-doc__hsn-subhead">
            {isIgst ? (
              <>
                <th>Rate</th>
                <th>Amount</th>
              </>
            ) : (
              <>
                <th>Rate</th>
                <th>Amount</th>
                <th>Rate</th>
                <th>Amount</th>
              </>
            )}
          </tr>
          {(items.length ? items : [{ hsn: "", taxable_amount: taxable }]).map((item, i) => (
            <tr key={`hsn-${i}`}>
              <td className="erp-doc__center">{item.hsn || ""}</td>
              <td colSpan={2} className="erp-doc__num">{fmt(item.taxable_amount ?? item.amount ?? taxable, 2)}</td>
              {isIgst ? (
                <>
                  <td className="erp-doc__center">{fmt(item.igst_pct ?? igstPct, 0)}%</td>
                  <td className="erp-doc__num">{fmt(item.igst_amount ?? igstTotal, 2)}</td>
                </>
              ) : (
                <>
                  <td className="erp-doc__center">{fmt(item.cgst_pct ?? 9, 0)}%</td>
                  <td className="erp-doc__num">{fmt(item.cgst_amount ?? cgstTotal / Math.max(items.length, 1), 2)}</td>
                  <td className="erp-doc__center">{fmt(item.sgst_pct ?? 9, 0)}%</td>
                  <td className="erp-doc__num">{fmt(item.sgst_amount ?? sgstTotal / Math.max(items.length, 1), 2)}</td>
                </>
              )}
              <td className="erp-doc__num" colSpan={isIgst ? 3 : 1}>
                {fmt(
                  isIgst
                    ? (item.igst_amount ?? igstTotal)
                    : ((Number(item.cgst_amount ?? 0) + Number(item.sgst_amount ?? 0)) || taxTotal),
                  2,
                )}
              </td>
            </tr>
          ))}
          <tr className="erp-doc__total-row">
            <td><strong>Total</strong></td>
            <td colSpan={2} className="erp-doc__num"><strong>{fmt(taxable, 2)}</strong></td>
            {isIgst ? (
              <>
                <td />
                <td className="erp-doc__num"><strong>{fmt(igstTotal, 2)}</strong></td>
              </>
            ) : (
              <>
                <td />
                <td className="erp-doc__num"><strong>{fmt(cgstTotal, 2)}</strong></td>
                <td />
                <td className="erp-doc__num"><strong>{fmt(sgstTotal, 2)}</strong></td>
              </>
            )}
            <td className="erp-doc__num" colSpan={isIgst ? 3 : 1}><strong>{fmt(taxTotal, 2)}</strong></td>
          </tr>
          <tr>
            <td colSpan={COLS} className="erp-doc__tax-words-cell">
              <span className="erp-doc__lbl">Tax Amount (in words)</span> : {numberToWordsInr(taxTotal)}
            </td>
          </tr>

          {data.remarks || docNo ? (
            <tr>
              <td colSpan={COLS} className="erp-doc__remarks-cell">
                <span className="erp-doc__lbl">Remarks</span> :{" "}
                {data.remarks || `Being material sold vide Invoice No : ${docNo}`}
              </td>
            </tr>
          ) : null}

          <tr>
            <td colSpan={COLS} className="erp-doc__decl-cell">
              <strong>Declaration</strong>
              <ol className="erp-doc__terms-list">
                {declItems.map((t, i) => <li key={i}>{t.replace(/^\d+\.\s*/, "")}</li>)}
              </ol>
            </td>
            {cfg.showRejectionPolicy ? (
              <td colSpan={4} className="erp-doc__decl-cell">
                <strong>Rejection Policy</strong>
                <ol className="erp-doc__terms-list">
                  {rejectionPolicy.map((t, i) => <li key={i}>{t}</li>)}
                </ol>
              </td>
            ) : null}
          </tr>

          <tr className="erp-doc__sign-row">
            <td colSpan={2} className="erp-doc__sign-cell">
              <span className="erp-doc__lbl">Prepared by</span>
              <div className="erp-doc__sign-space">{data.prepared_by || data.preparedBy || ""}</div>
            </td>
            <td colSpan={2} className="erp-doc__sign-cell">
              <span className="erp-doc__lbl">Verified by</span>
              <div className="erp-doc__sign-space">{data.checked_by || data.checkedBy || ""}</div>
            </td>
            <td colSpan={4} className="erp-doc__sign-cell erp-doc__sign-right">
              <div className="erp-doc__for-company">for {seller.name}</div>
              <div className="erp-doc__sign-space" />
              <div className="erp-doc__auth-sign">Authorised Signatory</div>
            </td>
          </tr>

          <tr>
            <td colSpan={COLS} className="erp-doc__footer-cell">{cfg.footerText}</td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}
