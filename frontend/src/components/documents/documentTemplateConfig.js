/** Field visibility and labels per document type — shared ERP document template. */

export const DOC_TYPES = {
  invoice: {
    title: "TAX INVOICE",
    footerText: "This is a Computer Generated Invoice",
    partyBillLabel: "Buyer (Bill to)",
    partyShipLabel: "Consignee (Ship to)",
    docNoLabel: "Invoice No.",
    docDateLabel: "Invoice Date",
    showEInvoice: true,
    showEwayBill: true,
    showDueDate: true,
    showPaymentDetails: true,
    showValidUntil: false,
    showSalesPerson: false,
    showDeliveryTerms: true,
    showRejectionPolicy: true,
  },
  quotation: {
    title: "QUOTATION",
    footerText: "This is a Computer Generated Quotation",
    partyBillLabel: "Buyer (Bill to)",
    partyShipLabel: "Consignee (Ship to)",
    docNoLabel: "Quotation No.",
    docDateLabel: "Quotation Date",
    showEInvoice: false,
    showEwayBill: false,
    showDueDate: false,
    showPaymentDetails: true,
    showValidUntil: true,
    showSalesPerson: true,
    showDeliveryTerms: true,
    showRejectionPolicy: false,
  },
  purchase: {
    title: "PURCHASE",
    footerText: "This is a Computer Generated Purchase Document",
    partyBillLabel: "Supplier (Bill from)",
    partyShipLabel: "Delivery Address",
    docNoLabel: "Purchase No.",
    docDateLabel: "Purchase Date",
    showEInvoice: false,
    showEwayBill: false,
    showDueDate: true,
    showPaymentDetails: true,
    showValidUntil: false,
    showSalesPerson: false,
    showDeliveryTerms: false,
    showRejectionPolicy: false,
  },
};

export function getDocConfig(docType) {
  return DOC_TYPES[docType] || DOC_TYPES.invoice;
}
