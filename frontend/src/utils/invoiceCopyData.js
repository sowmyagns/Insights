/** Indian Rupee amount to words for GST invoices. */
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n) {
  if (n < 20) return ones[n];
  return `${tens[Math.floor(n / 10)]}${ones[n % 10] ? ` ${ones[n % 10]}` : ""}`.trim();
}

function threeDigits(n) {
  if (n === 0) return "";
  if (n < 100) return twoDigits(n);
  return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${twoDigits(n % 100)}` : ""}`.trim();
}

export function numberToWordsInr(amount) {
  const n = Math.round(Number(amount) * 100) / 100;
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);

  if (rupees === 0 && paise === 0) return "INR Zero Only";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;

  const parts = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));

  let words = `INR ${parts.join(" ")}`.trim();
  if (paise) words += ` and ${twoDigits(paise)} Paise`;
  return `${words} Only`;
}

/** Demo invoice for preview when no API data. */
export const SAMPLE_INVOICE_COPY = {
  title: "TAX INVOICE",
  tax_mode: "igst",
  eInvoice: true,
  e_invoice_enabled: true,
  irn: "",
  seller: {
    name: "Insights Iva Pvt Ltd",
    tagline: "Enterprise Manufacturing ERP",
    address: "Hyderabad, Telangana - 500032",
    gstin: "36AABCG1234A1Z5",
    pan: "AABCG1234A",
    cin: "U12345TG2020PTC000001",
    state: "Telangana",
    state_code: "36",
    phone: "+91 98765 43210",
    email: "billing@gnsinsights.com",
    website: "www.gnsinsights.com",
  },
  meta: {
    invoice_no: "INV-1001",
    date: "01-Aug-26",
    due_date: "15-Aug-26",
    reference_no: "SO-2026-0042",
    delivery_note: "DC-0042",
    eway_bill_no: "",
    payment_terms: "Net 15 days",
  },
  dispatch: {
    vehicle_no: "TS09 AB 1234",
    transport_name: "BlueDart Logistics",
    lr_number: "LR-908877",
    dispatch_through: "Road",
    destination: "Pune",
    delivery_terms: "Door delivery",
  },
  buyer: {
    name: "Acme Manufacturing Ltd",
    company: "Acme Manufacturing Ltd",
    billing_address: "Plot 12, MIDC, Pune, Maharashtra - 411019",
    shipping_address: "Plot 12, MIDC, Pune, Maharashtra - 411019",
    gstin: "27AABCA1234B1Z8",
    state: "Maharashtra",
    state_code: "27",
    place_of_supply: "Maharashtra",
    phone: "+91 91234 56789",
  },
  consignee: {
    name: "Acme Manufacturing Ltd",
    address: "Plot 12, MIDC, Pune, Maharashtra - 411019",
    gstin: "27AABCA1234B1Z8",
    state: "Maharashtra",
    state_code: "27",
    phone: "+91 91234 56789",
  },
  items: [
    {
      si: 1,
      product_code: "PRD-001",
      description: "Industrial Release Paper 60Y",
      hsn: "48114100",
      batch: "BATCH-2026-07",
      qty: 17,
      unit: "SQM",
      rate: 2.0,
      discount: 0,
      taxable_amount: 34.0,
      igst_pct: 18,
      gst_amount: 6.12,
      total_amount: 40.12,
    },
  ],
  summary: {
    qty_total: 17,
    taxable_value: 34.0,
    igst_total: 6.12,
    cgst_total: 0,
    sgst_total: 0,
    round_off: -0.12,
    grand_total: 40.0,
    amount_paid: 0,
    balance_due: 40.0,
  },
  payment: {
    terms: "Net 15 days",
    advance_received: 0,
    balance_due: 40.0,
    bank_name: "HDFC Bank",
    account_number: "50200012345678",
    ifsc: "HDFC0001234",
  },
  terms: "Payment due within 15 days.\nGoods once sold will not be taken back except per return policy.",
  remarks: "Thank you for your business.",
  prepared_by: "Sales Team",
};

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, "-");
}

function taxValue(obj, camelKey, snakeKey) {
  return Number(obj?.[camelKey] ?? obj?.[snakeKey]) || 0;
}

function buildAddress(cust) {
  if (!cust) return "";
  return [cust.address_line1, cust.address_line2, cust.city, cust.state, cust.pincode].filter(Boolean).join(", ");
}

export function mapDetailToInvoiceCopy(detail, companySettings = {}) {
  if (!detail?.invoice) return null;

  const inv = detail.invoice;
  const cust = detail.customer || {};

  const invoiceIgstPct = taxValue(inv, "igstPct", "igst_pct");
  const invoiceCgstPct = taxValue(inv, "cgstPct", "cgst_pct");
  const invoiceSgstPct = taxValue(inv, "sgstPct", "sgst_pct");
  const invoiceIgstAmt = Number(inv.igstAmount ?? inv.igst_amount) || 0;
  const invoiceCgstAmt = Number(inv.cgstAmount ?? inv.cgst_amount) || 0;
  const invoiceSgstAmt = Number(inv.sgstAmount ?? inv.sgst_amount) || 0;

  const sellerCode = companySettings.state_code || "36";
  const buyerCode = cust.state_code || "";
  const isInterState = sellerCode && buyerCode && String(sellerCode).padStart(2, "0") !== String(buyerCode).padStart(2, "0");
  const taxMode = isInterState || invoiceIgstAmt > 0 ? "igst" : "cgst_sgst";

  const items = (detail.items || []).map((item, i) => {
    const taxable = Number(item.taxable_value ?? item.amount) || 0;
    const gstPct = taxValue(item, "gstPct", "gst_pct") || invoiceIgstPct || invoiceCgstPct * 2 || 18;
    const gstAmt = Number(item.gst_amount ?? item.gstAmount) || Math.round(taxable * gstPct) / 100;
    const igstPct = taxMode === "igst" ? gstPct : 0;
    const cgstPct = taxMode === "cgst_sgst" ? gstPct / 2 : 0;
    const sgstPct = taxMode === "cgst_sgst" ? gstPct / 2 : 0;
    return {
      si: i + 1,
      product_code: item.product_code || "",
      description: item.item_description,
      hsn: item.hsn || "",
      batch: item.batch || "",
      qty: Number(item.qty),
      unit: (item.unit || "pcs").toUpperCase(),
      rate: Number(item.rate),
      discount: Number(item.discount) || 0,
      taxable_amount: taxable,
      cgst_pct: cgstPct,
      sgst_pct: sgstPct,
      igst_pct: igstPct,
      gst_amount: gstAmt,
      cgst_amount: taxMode === "cgst_sgst" ? gstAmt / 2 : 0,
      sgst_amount: taxMode === "cgst_sgst" ? gstAmt / 2 : 0,
      igst_amount: taxMode === "igst" ? gstAmt : 0,
      total_amount: Number(item.amount) || taxable + gstAmt,
    };
  });

  const taxableTotal = Number(inv.subtotal) || items.reduce((s, it) => s + it.taxable_amount, 0);
  const roundOff = Number(inv.round_off) || 0;
  const grandTotal = Number(inv.grand_total) || taxableTotal + invoiceIgstAmt + invoiceCgstAmt + invoiceSgstAmt + roundOff;
  const amountPaid = Number(inv.amount_paid) || 0;

  let bank = {};
  try {
    bank = inv.bank_details ? (typeof inv.bank_details === "string" ? JSON.parse(inv.bank_details) : inv.bank_details) : {};
  } catch {
    bank = {};
  }

  const billing = buildAddress(cust);

  return {
    title: "TAX INVOICE",
    tax_mode: taxMode,
    eInvoice: Boolean(companySettings.e_invoice_enabled),
    e_invoice_enabled: Boolean(companySettings.e_invoice_enabled),
    irn: inv.irn || companySettings.irn || "36XXXXX0000X1Z0",
    ackNo: inv.ack_no || inv.ackNo || "ACK-001",
    ackDate: formatDate(inv.ack_date || inv.ackDate) || formatDate(inv.issue_date) || "12-Aug-26",
    seller: {
      name: companySettings.company_name || companySettings.name || "Insights Iva",
      logo: companySettings.logo_url || "",
      tagline: companySettings.tagline || "",
      address: [companySettings.address_line1, companySettings.address_line2, companySettings.city, companySettings.state, companySettings.pincode].filter(Boolean).join(", ") || "India",
      gstin: companySettings.gstin || companySettings.gst_number || "",
      pan: companySettings.pan || "",
      cin: companySettings.cin || "",
      state: companySettings.state || "",
      state_code: companySettings.state_code || "",
      phone: companySettings.phone || "",
      email: companySettings.email || companySettings.contact_email || "",
      website: companySettings.website || "",
    },
    meta: {
      invoice_no: inv.invoice_number,
      date: formatDate(inv.issue_date),
      due_date: formatDate(inv.due_date),
      reference_no: inv.po_number || inv.reference_number || "",
      delivery_note: inv.challan_number || "",
      eway_bill_no: inv.ewaybill_number || inv.eway_bill_number || "",
      payment_terms: inv.notes || companySettings.payment_terms_note || "",
    },
    dispatch: {
      vehicle_no: inv.vehicle_no || "",
      transport_name: inv.transporter_name || "",
      lr_number: inv.lr_number || "",
      dispatch_through: inv.transport_mode || "",
      destination: cust.city || cust.state || "",
      delivery_terms: inv.terms_and_conditions || "",
    },
    buyer: {
      name: cust.name || inv.buyer_name || "",
      company: cust.contact_name || "",
      billing_address: billing,
      shipping_address: billing,
      gstin: cust.gstin || "",
      state: cust.state || "",
      state_code: cust.state_code || "",
      place_of_supply: inv.place_of_supply || cust.state || "",
      phone: cust.phone || "",
    },
    consignee: {
      name: cust.name || "",
      address: billing,
      gstin: cust.gstin || "",
      state: cust.state || "",
      state_code: cust.state_code || "",
      phone: cust.phone || "",
    },
    items,
    summary: {
      qty_total: items.reduce((s, it) => s + it.qty, 0),
      taxable_value: taxableTotal,
      cgst_total: invoiceCgstAmt || items.reduce((s, it) => s + it.cgst_amount, 0),
      sgst_total: invoiceSgstAmt || items.reduce((s, it) => s + it.sgst_amount, 0),
      igst_total: invoiceIgstAmt || items.reduce((s, it) => s + it.igst_amount, 0),
      round_off: roundOff,
      grand_total: grandTotal,
      amount_paid: amountPaid,
      balance_due: grandTotal - amountPaid,
    },
    payment: {
      terms: companySettings.payment_terms_note || "",
      advance_received: amountPaid,
      balance_due: grandTotal - amountPaid,
      bank_name: bank.bank_name || companySettings.bank_name || "",
      account_number: bank.account_number || companySettings.bank_account_number || "",
      ifsc: bank.ifsc || companySettings.bank_ifsc || "",
      branch: bank.branch || companySettings.bank_branch || "",
    },
    terms: inv.terms_and_conditions || "",
    remarks: inv.notes || "",
    prepared_by: inv.sales_person || "",
  };
}

export function mergeWithSampleIfEmpty(copy) {
  if (!copy || !copy.items?.length) return SAMPLE_INVOICE_COPY;
  return copy;
}
