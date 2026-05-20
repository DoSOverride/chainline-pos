(function() {
'use strict';
// pos-purchase-orders.js — ChainLine POS V2 Purchase Orders Module
// Pure vanilla JS, no frameworks

const MOCK_POS = [
  {
    id: 1979,
    vendor: "Shimano (Canada)",
    ref: "12697255",
    status: "Finished",
    ordered: "2026-05-19",
    expected: "2026-05-19",
    received: "2026-05-19",
    numOrdered: 251,
    numReceived: 251,
    total: 2432.32,
    notes: "",
    lineItems: [
      { sku: "SH-BR-MT200", name: "Shimano MT200 Brake Pad", qty: 48, unitCost: 8.99, total: 431.52 },
      { sku: "SH-SM-BH59-JK-L", name: "Shimano Hose Kit 1000mm", qty: 24, unitCost: 12.40, total: 297.60 },
      { sku: "SH-SMRT66", name: "Shimano RT66 Rotor 180mm", qty: 36, unitCost: 18.95, total: 682.20 },
      { sku: "SH-CN-HG71", name: "Shimano HG71 Chain", qty: 143, unitCost: 7.14, total: 1021.00 },
    ],
  },
  {
    id: 1978,
    vendor: "Podium Imports",
    ref: "26/37421",
    status: "Finished",
    ordered: "2026-05-19",
    expected: "2026-05-19",
    received: "2026-05-19",
    numOrdered: 2,
    numReceived: 2,
    total: 142.00,
    notes: "Expedited shipping requested",
    lineItems: [
      { sku: "POD-TL-001", name: "GravityDropper Seatpost 125mm", qty: 1, unitCost: 89.00, total: 89.00 },
      { sku: "POD-TL-002", name: "OneUp EDC Pro Tool Kit", qty: 1, unitCost: 53.00, total: 53.00 },
    ],
  },
  {
    id: 1977,
    vendor: "Marin Bikes",
    ref: "2612600802",
    status: "Finished",
    ordered: "2026-05-19",
    expected: "2026-05-19",
    received: "2026-05-19",
    numOrdered: 1,
    numReceived: 1,
    total: 119.70,
    notes: "",
    lineItems: [
      { sku: "MAR-DINO-SM", name: "Marin Pine Mountain Frame Small", qty: 1, unitCost: 119.70, total: 119.70 },
    ],
  },
  {
    id: 1976,
    vendor: "Shimano",
    ref: "13961911 RI",
    status: "Finished",
    ordered: "2026-05-15",
    expected: "2026-05-19",
    received: "2026-05-19",
    numOrdered: 11,
    numReceived: 11,
    total: 755.59,
    notes: "Warranty replacement order",
    lineItems: [
      { sku: "SH-SL-MT401", name: "Shimano MT401 Brake Lever Set", qty: 6, unitCost: 38.99, total: 233.94 },
      { sku: "SH-BR-MT400", name: "Shimano MT400 Caliper", qty: 5, unitCost: 104.33, total: 521.65 },
    ],
  },
];

const VENDOR_LIST = [
  "Shimano (Canada)",
  "Shimano",
  "Podium Imports",
  "Marin Bikes",
  "Trek Bikes",
  "Specialized Canada",
  "Maxxis",
  "RockShox / SRAM",
  "Fox Racing Shox",
  "OneUp Components",
  "Chromag Bikes",
  "Surly Bikes",
];

let _posState = {
  list: null,
  filtered: null,
  searchTerm: "",
  statusFilter: "all",
  vendorFilter: "all",
  selectedPO: null,
  showNewForm: false,
  loading: false,
};

async function fetchPOs() {
  try {
    const res = await fetch("/api/purchase-orders");
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (_) {
    return null;
  }
}

function fmtCurrencyPO(n) {
  return "$" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function applyFilters(list) {
  return list.filter(po => {
    const term = _posState.searchTerm.toLowerCase();
    const matchSearch =
      !term ||
      po.vendor.toLowerCase().includes(term) ||
      String(po.id).includes(term) ||
      po.ref.toLowerCase().includes(term);
    const matchStatus =
      _posState.statusFilter === "all" || po.status === _posState.statusFilter;
    const matchVendor =
      _posState.vendorFilter === "all" || po.vendor === _posState.vendorFilter;
    return matchSearch && matchStatus && matchVendor;
  });
}

function statusBadge(status) {
  const map = {
    Finished: { bg: "#0d2a0d", color: "#4caf50", border: "#1e4d1e" },
    Open: { bg: "#1a2a00", color: "#a0c832", border: "#2a4a00" },
    "Partially Received": { bg: "#2a1a00", color: "#e0a060", border: "#4a3000" },
    Cancelled: { bg: "#1a0a0a", color: "#888", border: "#2a1a1a" },
  };
  const s = map[status] || map["Open"];
  return `<span style="background:${s.bg};color:${s.color};border:1px solid ${s.border};padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">${status}</span>`;
}

function buildPOListHTML(list, isMock) {
  const rows = list.map(po => `
    <tr class="po-row" data-id="${po.id}" style="cursor:pointer">
      <td style="color:#c8392c;font-weight:700">#${po.id}</td>
      <td>${po.vendor}</td>
      <td style="color:#888">${po.ref}</td>
      <td>${po.ordered}</td>
      <td>${po.expected || po.received || "—"}</td>
      <td style="text-align:center">${po.numOrdered}</td>
      <td style="text-align:center">${po.numReceived}</td>
      <td style="text-align:right;font-weight:600">${fmtCurrencyPO(po.total)}</td>
      <td>${statusBadge(po.status)}</td>
    </tr>
  `).join("");

  return `
    <table class="po-table" style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr>
          <th>PO #</th>
          <th>Vendor</th>
          <th>Ref #</th>
          <th>Ordered</th>
          <th>Expected</th>
          <th style="text-align:center">Ordered</th>
          <th style="text-align:center">Received</th>
          <th style="text-align:right">Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.length ? rows : `<tr><td colspan="9" style="text-align:center;color:#666;padding:32px">No purchase orders found.</td></tr>`}
      </tbody>
    </table>
  `;
}

function buildPODetailHTML(po) {
  const lineRows = (po.lineItems || []).map(li => `
    <tr>
      <td style="color:#888;font-size:12px">${li.sku}</td>
      <td>${li.name}</td>
      <td style="text-align:center">${li.qty}</td>
      <td style="text-align:right">${fmtCurrencyPO(li.unitCost)}</td>
      <td style="text-align:right;font-weight:600">${fmtCurrencyPO(li.total)}</td>
    </tr>
  `).join("");

  return `
    <div class="po-detail">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <button id="backToPOList" style="background:#1c1c1c;border:1px solid #2a2a2a;color:#aaa;padding:7px 16px;border-radius:6px;cursor:pointer;font-size:13px">&#8592; Back</button>
        <div style="font-size:20px;font-weight:700;color:#fff">Purchase Order #${po.id}</div>
        ${statusBadge(po.status)}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px">
        <div class="po-info-card"><div class="po-info-label">Vendor</div><div class="po-info-val">${po.vendor}</div></div>
        <div class="po-info-card"><div class="po-info-label">Reference #</div><div class="po-info-val">${po.ref}</div></div>
        <div class="po-info-card"><div class="po-info-label">Date Ordered</div><div class="po-info-val">${po.ordered}</div></div>
        <div class="po-info-card"><div class="po-info-label">Expected / Received</div><div class="po-info-val">${po.expected || po.received || "—"}</div></div>
        <div class="po-info-card"><div class="po-info-label">Total</div><div class="po-info-val" style="color:#c8392c;font-size:18px">${fmtCurrencyPO(po.total)}</div></div>
        ${po.notes ? `<div class="po-info-card" style="grid-column:1/-1"><div class="po-info-label">Notes</div><div class="po-info-val" style="color:#aaa">${po.notes}</div></div>` : ""}
      </div>

      <div style="background:#1c1c1c;border:1px solid #2a2a2a;border-radius:10px;padding:18px">
        <div style="font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px">Line Items</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr>
              <th style="color:#555;text-align:left;padding:6px 8px;border-bottom:1px solid #2a2a2a;font-size:11px;text-transform:uppercase">SKU</th>
              <th style="color:#555;text-align:left;padding:6px 8px;border-bottom:1px solid #2a2a2a;font-size:11px;text-transform:uppercase">Item</th>
              <th style="color:#555;text-align:center;padding:6px 8px;border-bottom:1px solid #2a2a2a;font-size:11px;text-transform:uppercase">Qty</th>
              <th style="color:#555;text-align:right;padding:6px 8px;border-bottom:1px solid #2a2a2a;font-size:11px;text-transform:uppercase">Unit Cost</th>
              <th style="color:#555;text-align:right;padding:6px 8px;border-bottom:1px solid #2a2a2a;font-size:11px;text-transform:uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineRows || `<tr><td colspan="5" style="text-align:center;color:#666;padding:20px">No line items.</td></tr>`}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right;padding:10px 8px;font-weight:600;color:#aaa;border-top:1px solid #2a2a2a">Order Total</td>
              <td style="text-align:right;padding:10px 8px;font-weight:700;color:#c8392c;font-size:15px;border-top:1px solid #2a2a2a">${fmtCurrencyPO(po.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}

function buildNewPOFormHTML() {
  const vendorOptions = VENDOR_LIST.map(v =>
    `<option value="${v}">${v}</option>`
  ).join("");

  return `
    <div class="new-po-form">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <button id="cancelNewPO" style="background:#1c1c1c;border:1px solid #2a2a2a;color:#aaa;padding:7px 16px;border-radius:6px;cursor:pointer;font-size:13px">&#8592; Cancel</button>
        <div style="font-size:20px;font-weight:700;color:#fff">New Purchase Order</div>
      </div>

      <div style="background:#1c1c1c;border:1px solid #2a2a2a;border-radius:10px;padding:20px;max-width:700px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div>
            <label class="po-form-label">Vendor</label>
            <select id="newPOVendor" class="po-form-input">
              <option value="">Select vendor...</option>
              ${vendorOptions}
            </select>
          </div>
          <div>
            <label class="po-form-label">Reference #</label>
            <input type="text" id="newPORef" class="po-form-input" placeholder="Vendor invoice / order #"/>
          </div>
          <div>
            <label class="po-form-label">Date Ordered</label>
            <input type="date" id="newPOOrdered" class="po-form-input" value="${new Date().toISOString().slice(0, 10)}"/>
          </div>
          <div>
            <label class="po-form-label">Expected Delivery</label>
            <input type="date" id="newPOExpected" class="po-form-input"/>
          </div>
        </div>

        <div style="margin-bottom:16px">
          <label class="po-form-label">Notes</label>
          <textarea id="newPONotes" class="po-form-input" rows="3" placeholder="Special instructions, shipping notes..."></textarea>
        </div>

        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <label class="po-form-label" style="margin:0">Items to Order</label>
            <button id="addLineItem" style="background:#c8392c;border:none;color:#fff;padding:5px 14px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600">+ Add Item</button>
          </div>
          <div id="lineItemsContainer">
            <div class="line-item-row" style="display:grid;grid-template-columns:2fr 3fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center">
              <input type="text" class="po-form-input li-sku" placeholder="SKU"/>
              <input type="text" class="po-form-input li-name" placeholder="Item name"/>
              <input type="number" class="po-form-input li-qty" placeholder="Qty" min="1" value="1"/>
              <input type="number" class="po-form-input li-cost" placeholder="Unit cost" min="0" step="0.01"/>
              <button class="remove-li-btn" style="background:#2a1010;border:1px solid #5a2020;color:#c87070;width:28px;height:28px;border-radius:5px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">&#215;</button>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button id="cancelNewPO2" style="background:#1c1c1c;border:1px solid #2a2a2a;color:#aaa;padding:8px 20px;border-radius:7px;cursor:pointer;font-size:14px">Cancel</button>
          <button id="submitNewPO" style="background:#c8392c;border:none;color:#fff;padding:8px 24px;border-radius:7px;cursor:pointer;font-size:14px;font-weight:600">Create Purchase Order</button>
        </div>
      </div>
    </div>
  `;
}

function addLineItemRow(container) {
  const row = document.createElement("div");
  row.className = "line-item-row";
  row.style.cssText = "display:grid;grid-template-columns:2fr 3fr 1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:center";
  row.innerHTML = `
    <input type="text" class="po-form-input li-sku" placeholder="SKU"/>
    <input type="text" class="po-form-input li-name" placeholder="Item name"/>
    <input type="number" class="po-form-input li-qty" placeholder="Qty" min="1" value="1"/>
    <input type="number" class="po-form-input li-cost" placeholder="Unit cost" min="0" step="0.01"/>
    <button class="remove-li-btn" style="background:#2a1010;border:1px solid #5a2020;color:#c87070;width:28px;height:28px;border-radius:5px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">&#215;</button>
  `;
  row.querySelector(".remove-li-btn").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

function renderPOPage(outerContainer, list, isMock) {
  _posState.filtered = applyFilters(list);

  const vendorsInList = [...new Set(list.map(p => p.vendor))].sort();
  const vendorFilterOptions = vendorsInList.map(v =>
    `<option value="${v}" ${_posState.vendorFilter === v ? "selected" : ""}>${v}</option>`
  ).join("");

  outerContainer.innerHTML = `
    <style>
      .po-table th {
        color: #555;
        font-weight: 600;
        text-align: left;
        padding: 8px 10px;
        border-bottom: 1px solid #2a2a2a;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        background: #141414;
        position: sticky;
        top: 0;
      }
      .po-table td {
        padding: 10px;
        border-bottom: 1px solid #1a1a1a;
        color: #ccc;
      }
      .po-row:hover td {
        background: #222;
      }
      .po-info-card {
        background: #141414;
        border: 1px solid #2a2a2a;
        border-radius: 8px;
        padding: 12px 16px;
      }
      .po-info-label {
        font-size: 11px;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
      }
      .po-info-val {
        font-size: 14px;
        color: #fff;
        font-weight: 600;
      }
      .po-form-label {
        display: block;
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 5px;
      }
      .po-form-input {
        width: 100%;
        background: #0a0a0a;
        border: 1px solid #2a2a2a;
        color: #ccc;
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 13px;
        box-sizing: border-box;
        transition: border-color 0.15s;
      }
      .po-form-input:focus {
        outline: none;
        border-color: #c8392c;
      }
      textarea.po-form-input {
        resize: vertical;
        min-height: 70px;
      }
    </style>

    <div id="poContentArea">
      <div class="reports-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <div style="font-size:22px;font-weight:700;color:#fff">Purchase Orders</div>
        <div style="display:flex;gap:8px;align-items:center">
          ${isMock ? '<span style="background:#2a1a0a;border:1px solid #8b5e2a;color:#e0a060;font-size:11px;padding:4px 10px;border-radius:4px">Using mock data</span>' : ""}
          <button id="newPOBtn" style="background:#c8392c;border:none;color:#fff;padding:8px 18px;border-radius:7px;cursor:pointer;font-size:14px;font-weight:600">+ New Purchase Order</button>
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
        <input type="text" id="poSearch" value="${_posState.searchTerm}" placeholder="Search vendor, PO#, ref..."
          style="background:#1c1c1c;border:1px solid #2a2a2a;color:#ccc;padding:8px 14px;border-radius:7px;font-size:13px;width:220px"/>
        <select id="poStatusFilter" style="background:#1c1c1c;border:1px solid #2a2a2a;color:#ccc;padding:8px 12px;border-radius:7px;font-size:13px">
          <option value="all" ${_posState.statusFilter === "all" ? "selected" : ""}>All Statuses</option>
          <option value="Open" ${_posState.statusFilter === "Open" ? "selected" : ""}>Open</option>
          <option value="Finished" ${_posState.statusFilter === "Finished" ? "selected" : ""}>Finished</option>
          <option value="Partially Received" ${_posState.statusFilter === "Partially Received" ? "selected" : ""}>Partially Received</option>
          <option value="Cancelled" ${_posState.statusFilter === "Cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
        <select id="poVendorFilter" style="background:#1c1c1c;border:1px solid #2a2a2a;color:#ccc;padding:8px 12px;border-radius:7px;font-size:13px">
          <option value="all">All Vendors</option>
          ${vendorFilterOptions}
        </select>
        <span style="color:#666;font-size:13px">${_posState.filtered.length} result${_posState.filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div style="background:#1c1c1c;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;overflow-x:auto">
        ${buildPOListHTML(_posState.filtered, isMock)}
      </div>
    </div>
  `;

  // Search
  outerContainer.querySelector("#poSearch").addEventListener("input", e => {
    _posState.searchTerm = e.target.value;
    renderPOPage(outerContainer, list, isMock);
  });

  // Status filter
  outerContainer.querySelector("#poStatusFilter").addEventListener("change", e => {
    _posState.statusFilter = e.target.value;
    renderPOPage(outerContainer, list, isMock);
  });

  // Vendor filter
  outerContainer.querySelector("#poVendorFilter").addEventListener("change", e => {
    _posState.vendorFilter = e.target.value;
    renderPOPage(outerContainer, list, isMock);
  });

  // Row click -> detail
  outerContainer.querySelectorAll(".po-row").forEach(row => {
    row.addEventListener("click", () => {
      const id = Number(row.dataset.id);
      const po = list.find(p => p.id === id);
      if (!po) return;
      const contentArea = outerContainer.querySelector("#poContentArea");
      contentArea.innerHTML = buildPODetailHTML(po);
      contentArea.querySelector("#backToPOList").addEventListener("click", () => {
        renderPOPage(outerContainer, list, isMock);
      });
    });
  });

  // New PO button
  outerContainer.querySelector("#newPOBtn").addEventListener("click", () => {
    const contentArea = outerContainer.querySelector("#poContentArea");
    contentArea.innerHTML = buildNewPOFormHTML();

    const liContainer = contentArea.querySelector("#lineItemsContainer");

    // Initial remove btn
    contentArea.querySelector(".remove-li-btn").addEventListener("click", e => {
      e.target.closest(".line-item-row").remove();
    });

    // Add more items
    contentArea.querySelector("#addLineItem").addEventListener("click", () => {
      addLineItemRow(liContainer);
    });

    // Cancel
    ["#cancelNewPO", "#cancelNewPO2"].forEach(sel => {
      const btn = contentArea.querySelector(sel);
      if (btn) btn.addEventListener("click", () => renderPOPage(outerContainer, list, isMock));
    });

    // Submit
    contentArea.querySelector("#submitNewPO").addEventListener("click", () => {
      const vendor = contentArea.querySelector("#newPOVendor").value;
      const ref = contentArea.querySelector("#newPORef").value;
      const ordered = contentArea.querySelector("#newPOOrdered").value;
      const expected = contentArea.querySelector("#newPOExpected").value;
      const notes = contentArea.querySelector("#newPONotes").value;

      if (!vendor) {
        alert("Please select a vendor.");
        return;
      }

      const lineItems = [...contentArea.querySelectorAll(".line-item-row")].map(row => ({
        sku: row.querySelector(".li-sku").value,
        name: row.querySelector(".li-name").value,
        qty: Number(row.querySelector(".li-qty").value) || 0,
        unitCost: Number(row.querySelector(".li-cost").value) || 0,
        total: (Number(row.querySelector(".li-qty").value) || 0) * (Number(row.querySelector(".li-cost").value) || 0),
      })).filter(li => li.name || li.sku);

      const total = lineItems.reduce((s, li) => s + li.total, 0);
      const numOrdered = lineItems.reduce((s, li) => s + li.qty, 0);

      const newPO = {
        id: Date.now(),
        vendor,
        ref,
        status: "Open",
        ordered,
        expected,
        received: null,
        numOrdered,
        numReceived: 0,
        total,
        notes,
        lineItems,
      };

      list.unshift(newPO);
      _posState.searchTerm = "";
      _posState.statusFilter = "all";
      _posState.vendorFilter = "all";
      renderPOPage(outerContainer, list, isMock);

      // Attempt API save (fire and forget)
      fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPO),
      }).catch(() => {});
    });
  });
}

async function PurchaseOrdersPage() {
  const container = document.createElement("div");
  container.className = "purchase-orders-page";
  container.style.cssText = "padding: 24px; max-width: 1400px; margin: 0 auto;";

  container.innerHTML = `<div style="color:#666;padding:40px;text-align:center">Loading purchase orders...</div>`;

  const apiData = await fetchPOs();
  const list = apiData || JSON.parse(JSON.stringify(MOCK_POS));
  const isMock = !apiData;

  renderPOPage(container, list, isMock);
  return container;
}

window.PurchaseOrdersPage = PurchaseOrdersPage;

})();
