// pos-print.js — ChainLine POS V2 Print Utilities
// Pure vanilla JS, no frameworks

const SHOP_INFO = {
  name: "ChainLine Cycle",
  address: "1139 Ellis St",
  city: "Kelowna, BC V1Y 1Z5",
  phone: "250-860-1968",
  website: "chainline.ca",
  email: "bikes@chainline.ca",
  gst: "843590266 RT0001",
};

// ─── printWorkOrder ───────────────────────────────────────────────────────────

function printWorkOrder(wo) {
  if (!wo) {
    console.error("[printWorkOrder] No work order provided");
    return;
  }

  const services = (wo.services || wo.tasks || wo.lineItems || []);
  const serviceRows = services.map(s => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${s.description || s.name || s.service || ""}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;text-align:right">${s.price != null ? fmtPrintCurrency(s.price) : ""}</td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Work Order #${wo.id || wo.number || "?"}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
          color: #111;
          background: #fff;
          padding: 24px;
          max-width: 700px;
          margin: 0 auto;
        }
        .wo-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #111;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .shop-name {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .shop-name span { color: #c8392c; }
        .shop-meta { font-size: 12px; color: #666; line-height: 1.6; margin-top: 4px; }
        .wo-number { font-size: 20px; font-weight: 700; text-align: right; }
        .wo-number-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 2px; }
        .section {
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #888;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 20px;
        }
        .info-block {}
        .info-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #999; margin-bottom: 2px; }
        .info-value { font-size: 14px; font-weight: 600; }
        .services-table {
          width: 100%;
          border-collapse: collapse;
        }
        .services-table th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #888;
          text-align: left;
          padding: 6px 8px;
          border-bottom: 1px solid #111;
          background: #f8f8f8;
        }
        .services-table th:last-child { text-align: right; }
        .notes-box {
          background: #f8f8f8;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
          font-size: 13px;
          color: #444;
          min-height: 60px;
          white-space: pre-wrap;
        }
        .status-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .status-badge.open { background: #fff3cd; color: #856404; }
        .status-badge.in-progress { background: #cce5ff; color: #004085; }
        .status-badge.done { background: #d4edda; color: #155724; }
        .footer {
          margin-top: 32px;
          border-top: 1px solid #ddd;
          padding-top: 12px;
          font-size: 11px;
          color: #999;
          text-align: center;
        }
        .signature-block {
          display: flex;
          gap: 40px;
          margin-top: 28px;
        }
        .sig-line {
          flex: 1;
          border-top: 1px solid #ccc;
          padding-top: 6px;
          font-size: 11px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        @media print {
          body { padding: 0; }
          @page { margin: 18mm; }
        }
      </style>
    </head>
    <body>
      <div class="wo-header">
        <div>
          <div class="shop-name">Chain<span>Line</span> Cycle</div>
          <div class="shop-meta">
            ${SHOP_INFO.address}, ${SHOP_INFO.city}<br/>
            ${SHOP_INFO.phone} &bull; ${SHOP_INFO.website}
          </div>
        </div>
        <div>
          <div class="wo-number-label">Work Order</div>
          <div class="wo-number">#${wo.id || wo.number || "?"}</div>
          <div style="font-size:12px;color:#888;text-align:right;margin-top:4px">${wo.createdAt || wo.date || new Date().toLocaleDateString()}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Customer</div>
        <div class="info-grid">
          <div class="info-block">
            <div class="info-label">Name</div>
            <div class="info-value">${wo.customerName || wo.customer || "—"}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Phone</div>
            <div class="info-value">${wo.customerPhone || wo.phone || "—"}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Email</div>
            <div class="info-value" style="font-size:13px">${wo.customerEmail || wo.email || "—"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Bike</div>
        <div class="info-grid">
          <div class="info-block">
            <div class="info-label">Make / Model</div>
            <div class="info-value">${wo.bikeMake || ""} ${wo.bikeModel || wo.bike || "—"}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Serial #</div>
            <div class="info-value">${wo.bikeSerial || wo.serial || "—"}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Year / Colour</div>
            <div class="info-value">${wo.bikeYear || ""} ${wo.bikeColor || wo.color || "—"}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Work Details</div>
        <div class="info-grid" style="margin-bottom:14px">
          <div class="info-block">
            <div class="info-label">Mechanic</div>
            <div class="info-value">${wo.mechanic || wo.assignedTo || "—"}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Due Date</div>
            <div class="info-value">${wo.dueDate || wo.due || "—"}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status-badge ${(wo.status || "").toLowerCase().replace(/\s+/g, "-")}">${wo.status || "Open"}</span>
            </div>
          </div>
          <div class="info-block">
            <div class="info-label">Priority</div>
            <div class="info-value">${wo.priority || "Normal"}</div>
          </div>
        </div>

        <table class="services-table">
          <thead>
            <tr>
              <th>Service / Task</th>
              <th style="text-align:right">Price</th>
            </tr>
          </thead>
          <tbody>
            ${serviceRows || `<tr><td colspan="2" style="padding:10px;color:#999;font-size:13px">No services listed.</td></tr>`}
          </tbody>
          ${wo.total != null ? `
          <tfoot>
            <tr>
              <td style="padding:8px;font-weight:700;font-size:14px;border-top:1px solid #111">Total</td>
              <td style="padding:8px;font-weight:700;font-size:14px;border-top:1px solid #111;text-align:right">${fmtPrintCurrency(wo.total)}</td>
            </tr>
          </tfoot>
          ` : ""}
        </table>
      </div>

      ${wo.notes ? `
      <div class="section">
        <div class="section-title">Notes / Diagnostics</div>
        <div class="notes-box">${escapeHtml(wo.notes)}</div>
      </div>
      ` : ""}

      <div class="signature-block">
        <div class="sig-line">Customer Signature</div>
        <div class="sig-line">Date</div>
      </div>

      <div class="footer">
        ${SHOP_INFO.name} &bull; ${SHOP_INFO.address}, ${SHOP_INFO.city} &bull; ${SHOP_INFO.phone} &bull; GST# ${SHOP_INFO.gst}<br/>
        Thank you for your business!
      </div>
    </body>
    </html>
  `;

  openPrintWindow(html, `WorkOrder-${wo.id || "draft"}`);
}

// ─── printReceipt ─────────────────────────────────────────────────────────────

function printReceipt(sale) {
  if (!sale) {
    console.error("[printReceipt] No sale data provided");
    return;
  }

  const items = sale.items || sale.lineItems || [];
  const subtotal = sale.subtotal != null ? sale.subtotal : items.reduce((s, i) => s + ((i.price || 0) * (i.qty || 1)), 0);
  const taxRate = sale.taxRate || 0.05; // GST 5%
  const gst = sale.gst != null ? sale.gst : subtotal * taxRate;
  const pst = sale.pst != null ? sale.pst : 0;
  const total = sale.total != null ? sale.total : subtotal + gst + pst;

  const itemRows = items.map(item => {
    const lineTotal = (item.price || 0) * (item.qty || 1);
    const qtyStr = item.qty && item.qty > 1 ? ` x${item.qty}` : "";
    return `<div class="rcpt-row"><span>${escapeHtml(item.name || item.description || "Item")}${qtyStr}</span><span>${fmtPrintCurrency(lineTotal)}</span></div>`;
  }).join("");

  const paymentMethod = sale.paymentMethod || sale.payment || "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Receipt — ChainLine Cycle</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          color: #111;
          background: #fff;
          width: 80mm;
          margin: 0 auto;
          padding: 6mm 4mm;
        }
        .rcpt-header {
          text-align: center;
          margin-bottom: 10px;
        }
        .rcpt-shop-name {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .rcpt-shop-meta {
          font-size: 11px;
          color: #555;
          line-height: 1.5;
        }
        .rcpt-divider {
          border: none;
          border-top: 1px dashed #ccc;
          margin: 8px 0;
        }
        .rcpt-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 2px 0;
          font-size: 12px;
          gap: 8px;
        }
        .rcpt-row span:last-child {
          white-space: nowrap;
          flex-shrink: 0;
        }
        .rcpt-row span:first-child {
          flex: 1;
        }
        .rcpt-subtotal {
          font-size: 11px;
          color: #555;
        }
        .rcpt-total {
          font-size: 16px;
          font-weight: 700;
        }
        .rcpt-thank-you {
          text-align: center;
          margin-top: 12px;
          font-size: 11px;
          color: #777;
          line-height: 1.6;
        }
        .rcpt-meta {
          font-size: 10px;
          color: #999;
          margin-top: 4px;
        }
        @media print {
          body { width: 80mm; }
          @page { margin: 0; size: 80mm auto; }
        }
      </style>
    </head>
    <body>
      <div class="rcpt-header">
        <div class="rcpt-shop-name">ChainLine Cycle</div>
        <div class="rcpt-shop-meta">
          ${SHOP_INFO.address}, ${SHOP_INFO.city}<br/>
          ${SHOP_INFO.phone} | ${SHOP_INFO.website}
        </div>
      </div>

      <hr class="rcpt-divider"/>

      <div class="rcpt-row rcpt-meta">
        <span>Date: ${sale.date || new Date().toLocaleString()}</span>
      </div>
      ${sale.receiptNumber || sale.id ? `<div class="rcpt-row rcpt-meta"><span>Receipt #${sale.receiptNumber || sale.id}</span></div>` : ""}
      ${sale.staffName || sale.cashier ? `<div class="rcpt-row rcpt-meta"><span>Staff: ${sale.staffName || sale.cashier}</span></div>` : ""}
      ${sale.customerName ? `<div class="rcpt-row rcpt-meta"><span>Customer: ${sale.customerName}</span></div>` : ""}

      <hr class="rcpt-divider"/>

      ${itemRows || `<div class="rcpt-row"><span>No items</span><span>$0.00</span></div>`}

      <hr class="rcpt-divider"/>

      <div class="rcpt-row rcpt-subtotal">
        <span>Subtotal</span>
        <span>${fmtPrintCurrency(subtotal)}</span>
      </div>
      ${gst > 0 ? `<div class="rcpt-row rcpt-subtotal"><span>GST (5%)</span><span>${fmtPrintCurrency(gst)}</span></div>` : ""}
      ${pst > 0 ? `<div class="rcpt-row rcpt-subtotal"><span>PST</span><span>${fmtPrintCurrency(pst)}</span></div>` : ""}

      <hr class="rcpt-divider"/>

      <div class="rcpt-row rcpt-total">
        <span>TOTAL</span>
        <span>${fmtPrintCurrency(total)}</span>
      </div>

      ${paymentMethod ? `
        <hr class="rcpt-divider"/>
        <div class="rcpt-row rcpt-subtotal">
          <span>Paid By</span>
          <span>${paymentMethod}</span>
        </div>
        ${sale.amountTendered != null ? `<div class="rcpt-row rcpt-subtotal"><span>Tendered</span><span>${fmtPrintCurrency(sale.amountTendered)}</span></div>` : ""}
        ${sale.change != null ? `<div class="rcpt-row rcpt-subtotal"><span>Change</span><span>${fmtPrintCurrency(sale.change)}</span></div>` : ""}
      ` : ""}

      <div class="rcpt-thank-you">
        <div>GST# ${SHOP_INFO.gst}</div>
        <br/>
        Thank you for shopping at ChainLine!<br/>
        See you on the trails.
      </div>
    </body>
    </html>
  `;

  openPrintWindow(html, `Receipt-${sale.receiptNumber || sale.id || Date.now()}`);
}

// ─── exportCSV ────────────────────────────────────────────────────────────────

function exportCSV(data, filename) {
  if (!data || !data.length) {
    console.warn("[exportCSV] No data to export");
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(","),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h] == null ? "" : row[h];
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ];

  const csv = csvRows.join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrintCurrency(n) {
  return "$" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openPrintWindow(html, title) {
  const win = window.open("", "_blank", "width=800,height=700");
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this site to print.");
    return;
  }
  win.document.title = title || "Print";
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Slight delay to allow rendering before print dialog
  setTimeout(() => {
    win.print();
    // Close window after print dialog dismissed (optional — some browsers differ)
    win.onafterprint = () => win.close();
  }, 400);
}

window.printWorkOrder = printWorkOrder;
window.printReceipt = printReceipt;
window.exportCSV = exportCSV;
