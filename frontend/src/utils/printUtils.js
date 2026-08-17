/**
 * Shared Print Templates for Production Planning & Work Orders
 * Standardized header: "Production | Welcome, [User] | Insights Iva"
 */

import { escapeHtml } from "./htmlEscape";

export function printProductionOrder(order, user) {
  if (!order) return;
  const printedBy = escapeHtml(user?.full_name || user?.name || "");
  const planned  = Number(order.planned_quantity || 0);
  const produced = Number(order.produced_quantity || 0);
  const balance  = Math.max(planned - produced, 0);
  const startDate = order.start_date ? new Date(order.start_date).toLocaleDateString() : "—";
  const dueDate   = order.due_date   ? new Date(order.due_date).toLocaleDateString()   : "—";
  const priority  = order.priority ? order.priority.charAt(0).toUpperCase() + order.priority.slice(1) : "—";
  const status    = order.status   ? order.status.charAt(0).toUpperCase()   + order.status.slice(1).replace(/_/g," ") : "—";

  const html = `<!DOCTYPE html><html><head><title>Production Order ${escapeHtml(order.order_number || "")}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;font-size:12px;line-height:1.5}
  .page{padding:24px 30px}
  .top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;font-size:12px;color:#000}
  .brand{color:#000;font-weight:bold;font-size:12px}
  .title{font-size:24px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;color:#000}
  .subtitle{font-size:12px;color:#000;padding-bottom:10px;border-bottom:1px solid #000;margin-bottom:16px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:0}
  .section{padding:10px 0;border-bottom:1px solid #ddd}
  .section:last-child{border-bottom:none}
  .section-label{font-size:12px;font-weight:bold;color:#000;text-transform:uppercase;margin-bottom:4px}
  .section-value{font-size:12px;font-weight:normal;color:#000}
  .section-sub{font-size:12px;color:#000;margin-top:2px}
  .badge{display:inline-block;padding:0;border-radius:0;font-size:12px;font-weight:normal;margin-right:8px;background:none !important;color:#000 !important;border:none !important}
  .qty-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px}
  .qty-box .num{font-size:12px;font-weight:normal;color:#000}
  .qty-box .lbl{font-size:12px;color:#000;text-transform:uppercase;margin-top:2px}
  @media print{@page{margin:10mm;size:auto;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0;}}
</style>
</head><body><div class="page">

<div class="top-bar">
  <div>
    <span>Production</span>
    ${printedBy ? `<span style="margin-left:10px">Welcome, ${printedBy}</span>` : ""}
  </div>
  <span class="brand">Insights Iva</span>
</div>

<div class="title">Production Order Details</div>
<div class="subtitle">Order # ${escapeHtml(order.order_number || "—")} &nbsp;|&nbsp; Printed on ${new Date().toLocaleDateString()} ${printedBy ? `&nbsp;|&nbsp; By: ${printedBy}` : ""}</div>

<div class="grid">
  <div class="section">
    <div class="section-label">Product Information</div>
    <div class="section-value">${escapeHtml(order.product_name || "—")}</div>
    <div class="section-sub">BOM Version: ${escapeHtml(order.bom_version || "BOM v1.0")}</div>
  </div>
  <div class="section">
    <div class="section-label">Customer</div>
    <div class="section-value">${escapeHtml(order.customer_name || "Internal")}</div>
  </div>
</div>

<div class="grid">
  <div class="section">
    <div class="section-label">Priority &amp; Status</div>
    <div style="margin-top:4px">
      <span class="badge">${escapeHtml(priority)}</span>
      <span class="badge">${escapeHtml(status)}</span>
    </div>
  </div>
  <div class="section">
    <div class="section-label">Production Quantities</div>
    <div class="qty-grid">
      <div class="qty-box"><div class="lbl">Planned: ${planned}</div></div>
      <div class="qty-box"><div class="lbl">Produced: ${produced}</div></div>
      <div class="qty-box"><div class="lbl">Balance: ${balance}</div></div>
    </div>
  </div>
</div>

<div class="grid">
  <div class="section">
    <div class="section-label">Schedule</div>
    <div style="margin-top:4px">
      <div>Start: ${startDate}</div>
      <div>Due: ${dueDate}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-label">Assignment</div>
    <div style="margin-top:4px">
      <div>Machine: ${escapeHtml(order.machine_name || "—")}</div>
      <div>Shift: ${escapeHtml(order.shift || "—")}</div>
    </div>
  </div>
</div>

</div></body></html>`;

  const win = window.open("", "_blank", "width=750,height=680");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

export function printWorkOrder(workOrder, user) {
  if (!workOrder) return;
  const printedBy = escapeHtml(user?.full_name || user?.name || "");
  const planned  = Number(workOrder.planned_quantity || 0);
  const produced = Number(workOrder.produced_quantity ?? workOrder.actual_quantity ?? 0);
  const balance  = Math.max(planned - produced, 0);
  const startDate = workOrder.planned_start ? new Date(workOrder.planned_start).toLocaleDateString() : "—";
  const dueDate   = workOrder.planned_end   ? new Date(workOrder.planned_end).toLocaleDateString()   : "—";
  const priority  = workOrder.priority ? workOrder.priority.charAt(0).toUpperCase() + workOrder.priority.slice(1) : "—";
  const status    = workOrder.status   ? workOrder.status.charAt(0).toUpperCase()   + workOrder.status.slice(1).replace(/_/g," ") : "—";

  const html = `<!DOCTYPE html><html><head><title>Work Order ${escapeHtml(workOrder.work_order_number || "")}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;font-size:12px;line-height:1.5}
  .page{padding:24px 30px}
  .top-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;font-size:12px;color:#000}
  .brand{color:#000;font-weight:bold;font-size:12px}
  .title{font-size:24px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;color:#000}
  .subtitle{font-size:12px;color:#000;padding-bottom:10px;border-bottom:1px solid #000;margin-bottom:16px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:0}
  .section{padding:10px 0;border-bottom:1px solid #ddd}
  .section:last-child{border-bottom:none}
  .section-label{font-size:12px;font-weight:bold;color:#000;text-transform:uppercase;margin-bottom:4px}
  .section-value{font-size:12px;font-weight:normal;color:#000}
  .section-sub{font-size:12px;color:#000;margin-top:2px}
  .badge{display:inline-block;padding:0;border-radius:0;font-size:12px;font-weight:normal;margin-right:8px;background:none !important;color:#000 !important;border:none !important}
  .qty-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px}
  .qty-box .num{font-size:12px;font-weight:normal;color:#000}
  .qty-box .lbl{font-size:12px;color:#000;text-transform:uppercase;margin-top:2px}
  @media print{@page{margin:10mm;size:auto;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0;}}
</style>
</head><body><div class="page">

<div class="top-bar">
  <div>
    <span>Production</span>
    ${printedBy ? `<span style="margin-left:10px">Welcome, ${printedBy}</span>` : ""}
  </div>
  <span class="brand">Insights Iva</span>
</div>

<div class="title">Work Order Details</div>
<div class="subtitle">Order # ${escapeHtml(workOrder.work_order_number || "—")} &nbsp;|&nbsp; Printed on ${new Date().toLocaleDateString()} ${printedBy ? `&nbsp;|&nbsp; By: ${printedBy}` : ""}</div>

<div class="grid">
  <div class="section">
    <div class="section-label">Product Information</div>
    <div class="section-value">${escapeHtml(workOrder.product_name || "—")}</div>
    ${workOrder.production_order_number ? `<div class="section-sub">Production Order: ${escapeHtml(workOrder.production_order_number)}</div>` : ""}
    ${workOrder.department ? `<div class="section-sub">Department: ${escapeHtml(workOrder.department)}</div>` : ""}
  </div>
  <div class="section">
    <div class="section-label">Customer</div>
    <div class="section-value">${escapeHtml(workOrder.customer_name || "—")}</div>
  </div>
</div>

<div class="grid">
  <div class="section">
    <div class="section-label">Priority &amp; Status</div>
    <div style="margin-top:4px">
      <span class="badge">${escapeHtml(priority)}</span>
      <span class="badge">${escapeHtml(status)}</span>
      ${workOrder.materials_issued ? '<span class="badge">Materials ✔</span>' : ""}
    </div>
  </div>
  <div class="section">
    <div class="section-label">Production Quantities</div>
    <div class="qty-grid">
      <div class="qty-box"><div class="lbl">Planned: ${planned}</div></div>
      <div class="qty-box"><div class="lbl">Produced: ${produced}</div></div>
      <div class="qty-box"><div class="lbl">Balance: ${balance}</div></div>
    </div>
  </div>
</div>

<div class="grid">
  <div class="section">
    <div class="section-label">Schedule</div>
    <div style="margin-top:4px">
      <div>Start: ${startDate}</div>
      <div>Due: ${dueDate}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-label">Assignment</div>
    <div style="margin-top:4px">
      <div>Machine: ${escapeHtml(workOrder.machine_name || "—")}</div>
      <div>Operator: ${escapeHtml(workOrder.operator_name || "—")}</div>
      <div>Shift: ${escapeHtml(workOrder.shift || "—")}</div>
    </div>
  </div>
</div>

</div></body></html>`;

  const win = window.open("", "_blank", "width=750,height=680");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}
