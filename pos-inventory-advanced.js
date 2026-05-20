// pos-inventory-advanced.js — ChainLine POS V2 Advanced Inventory
// Pure vanilla JS, no frameworks

const MOCK_INVENTORY = [
  { id: 1, sku: "SH-BR-MT200", name: "Shimano MT200 Brake Pad", dept: "Components", category: "Brakes", qty: 18, reorderPoint: 5, cost: 6.50, price: 14.99, notes: "" },
  { id: 2, sku: "SH-SMRT66-180", name: "Shimano RT66 Rotor 180mm", dept: "Components", category: "Brakes", qty: 8, reorderPoint: 3, cost: 14.20, price: 26.99, notes: "" },
  { id: 3, sku: "MAX-DHFWT-29-2.5", name: "Maxxis Minion DHF WT 29x2.5", dept: "Wheels", category: "Tires", qty: 4, reorderPoint: 2, cost: 42.00, price: 79.99, notes: "3C MaxxGrip" },
  { id: 4, sku: "MAX-DHRWT-27-2.4", name: "Maxxis Minion DHR II 27.5x2.4", dept: "Wheels", category: "Tires", qty: 1, reorderPoint: 2, cost: 38.00, price: 72.99, notes: "" },
  { id: 5, sku: "FOX-38-FACT-170", name: "Fox 38 Factory 170mm 29\"", dept: "Suspension", category: "Forks", qty: 2, reorderPoint: 1, cost: 710.00, price: 1069.99, notes: "" },
  { id: 6, sku: "SRAM-X01-12SPD", name: "SRAM X01 Eagle Derailleur", dept: "Components", category: "Drivetrain", qty: 0, reorderPoint: 2, cost: 195.00, price: 329.99, notes: "Out of stock" },
  { id: 7, sku: "WTB-TRAIL-BOSS-27", name: "WTB Trail Boss 27.5x2.4", dept: "Wheels", category: "Tires", qty: 6, reorderPoint: 3, cost: 28.00, price: 54.99, notes: "" },
  { id: 8, sku: "SH-CN-HG71-11", name: "Shimano HG71 Chain 11-Speed", dept: "Components", category: "Drivetrain", qty: 22, reorderPoint: 8, cost: 9.00, price: 19.99, notes: "" },
  { id: 9, sku: "PARK-IB-3", name: "Park Tool IB-3 Multi-Tool", dept: "Accessories", category: "Tools", qty: 3, reorderPoint: 5, cost: 11.00, price: 24.99, notes: "" },
  { id: 10, sku: "ONEUP-EDC-PRO", name: "OneUp EDC Pro Tool Kit", dept: "Accessories", category: "Tools", qty: 7, reorderPoint: 3, cost: 35.00, price: 59.99, notes: "" },
  { id: 11, sku: "KNOG-OI-LG-BLK", name: "Knog Oi Bell Large Black", dept: "Accessories", category: "Bells", qty: 0, reorderPoint: 2, cost: 15.00, price: 31.99, notes: "" },
  { id: 12, sku: "MARIN-DSX1-SM", name: "Marin DSX 1 Small", dept: "Bikes", category: "MTB", qty: 2, reorderPoint: 1, cost: 549.00, price: 899.99, notes: "" },
  { id: 13, sku: "CHROMAG-ROOTDOWN", name: "Chromag Rootdown Frame Large", dept: "Bikes", category: "MTB Frames", qty: 1, reorderPoint: 1, cost: 620.00, price: 1099.99, notes: "Titanium Grey" },
  { id: 14, sku: "SURLY-KRAMPUS-XL", name: "Surly Krampus XL Olive", dept: "Bikes", category: "Gravel/Touring", qty: 0, reorderPoint: 1, cost: 1100.00, price: 1799.99, notes: "" },
  { id: 15, sku: "CK-CLAMP-34.9", name: "Chris King Seat Clamp 34.9", dept: "Components", category: "Seatpost", qty: 1, reorderPoint: 2, cost: 28.00, price: 52.99, notes: "" },
];

const DEPTS = ["All Depts", ...new Set(MOCK_INVENTORY.map(i => i.dept))].sort((a, b) => a === "All Depts" ? -1 : a.localeCompare(b));
const CATEGORIES = ["All Categories", ...new Set(MOCK_INVENTORY.map(i => i.category))].sort((a, b) => a === "All Categories" ? -1 : a.localeCompare(b));

let _invState = {
  list: null,
  isMock: false,
  search: "",
  dept: "All Depts",
  category: "All Categories",
  sortBy: "name",
  sortDir: "asc",
  editingItem: null,
  highlightId: null,
};

// ─── Barcode Scanner Integration ──────────────────────────────────────────────

function initBarcodeScanner(onScan) {
  let buffer = "";
  let lastKeyTime = 0;
  const SCAN_THRESHOLD_MS = 50;
  const MIN_BARCODE_LEN = 4;

  function onKeyDown(e) {
    const now = Date.now();
    const delta = now - lastKeyTime;
    lastKeyTime = now;

    if (e.key === "Enter") {
      if (buffer.length >= MIN_BARCODE_LEN) {
        const scanned = buffer;
        buffer = "";
        onScan(scanned);
      } else {
        buffer = "";
      }
      return;
    }

    // If gap too large, not a scanner — reset
    if (delta > 200 && buffer.length > 0) {
      buffer = "";
    }

    // Accumulate scanner input (fast sequential chars)
    if (e.key.length === 1 && delta < SCAN_THRESHOLD_MS) {
      buffer += e.key;
    } else if (e.key.length === 1 && buffer.length === 0) {
      // First char — start tentative buffer
      buffer = e.key;
    }
  }

  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrencyInv(n) {
  return "$" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function sortedFiltered(list) {
  let items = list.filter(item => {
    const term = _invState.search.toLowerCase();
    const matchSearch =
      !term ||
      item.name.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      (item.notes || "").toLowerCase().includes(term);
    const matchDept = _invState.dept === "All Depts" || item.dept === _invState.dept;
    const matchCat = _invState.category === "All Categories" || item.category === _invState.category;
    return matchSearch && matchDept && matchCat;
  });

  const dir = _invState.sortDir === "asc" ? 1 : -1;
  items.sort((a, b) => {
    const av = a[_invState.sortBy];
    const bv = b[_invState.sortBy];
    if (typeof av === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

  return items;
}

function qtyBadge(qty, reorderPoint) {
  if (qty === 0) return `<span style="background:#2a0a0a;color:#e05555;border:1px solid #5a1a1a;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">Out of Stock</span>`;
  if (qty <= reorderPoint) return `<span style="background:#2a1a00;color:#e0a060;border:1px solid #4a3000;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600">Low: ${qty}</span>`;
  return `<span style="color:#ccc;font-size:13px">${qty}</span>`;
}

// ─── QuickEditModal ───────────────────────────────────────────────────────────

function QuickEditModal(item, onSave, onClose) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(3px);
  `;

  overlay.innerHTML = `
    <div style="background:#1c1c1c;border:1px solid #2a2a2a;border-radius:14px;padding:24px;width:420px;max-width:95vw">
      <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:4px">Edit Item</div>
      <div style="font-size:12px;color:#666;margin-bottom:20px">${item.sku}</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div style="grid-column:1/-1">
          <label class="inv-form-label">Name</label>
          <input id="qe-name" type="text" class="inv-form-input" value="${item.name}"/>
        </div>
        <div>
          <label class="inv-form-label">Qty on Hand</label>
          <input id="qe-qty" type="number" class="inv-form-input" value="${item.qty}" min="0"/>
        </div>
        <div>
          <label class="inv-form-label">Reorder Point</label>
          <input id="qe-reorder" type="number" class="inv-form-input" value="${item.reorderPoint}" min="0"/>
        </div>
        <div>
          <label class="inv-form-label">Cost Price</label>
          <input id="qe-cost" type="number" class="inv-form-input" value="${item.cost}" min="0" step="0.01"/>
        </div>
        <div>
          <label class="inv-form-label">Sell Price</label>
          <input id="qe-price" type="number" class="inv-form-input" value="${item.price}" min="0" step="0.01"/>
        </div>
        <div>
          <label class="inv-form-label">Dept</label>
          <input id="qe-dept" type="text" class="inv-form-input" value="${item.dept}"/>
        </div>
        <div>
          <label class="inv-form-label">Category</label>
          <input id="qe-category" type="text" class="inv-form-input" value="${item.category}"/>
        </div>
        <div style="grid-column:1/-1">
          <label class="inv-form-label">Notes</label>
          <input id="qe-notes" type="text" class="inv-form-input" value="${item.notes || ''}"/>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px">
        <button id="qe-cancel" style="background:#141414;border:1px solid #2a2a2a;color:#888;padding:8px 20px;border-radius:7px;cursor:pointer;font-size:14px">Cancel</button>
        <button id="qe-save" style="background:#c8392c;border:none;color:#fff;padding:8px 24px;border-radius:7px;cursor:pointer;font-size:14px;font-weight:600">Save Changes</button>
      </div>
    </div>

    <style>
      .inv-form-label { display:block; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px; }
      .inv-form-input { width:100%; background:#0a0a0a; border:1px solid #2a2a2a; color:#ccc; padding:8px 10px; border-radius:6px; font-size:13px; box-sizing:border-box; }
      .inv-form-input:focus { outline:none; border-color:#c8392c; }
    </style>
  `;

  overlay.querySelector("#qe-cancel").addEventListener("click", () => {
    overlay.remove();
    onClose && onClose();
  });

  overlay.querySelector("#qe-save").addEventListener("click", () => {
    const updated = {
      ...item,
      name: overlay.querySelector("#qe-name").value.trim(),
      qty: Number(overlay.querySelector("#qe-qty").value),
      reorderPoint: Number(overlay.querySelector("#qe-reorder").value),
      cost: Number(overlay.querySelector("#qe-cost").value),
      price: Number(overlay.querySelector("#qe-price").value),
      dept: overlay.querySelector("#qe-dept").value.trim(),
      category: overlay.querySelector("#qe-category").value.trim(),
      notes: overlay.querySelector("#qe-notes").value.trim(),
    };

    onSave(updated);
    overlay.remove();
  });

  // Close on overlay click
  overlay.addEventListener("click", e => {
    if (e.target === overlay) {
      overlay.remove();
      onClose && onClose();
    }
  });

  return overlay;
}

// ─── LowStockAlert ────────────────────────────────────────────────────────────

function LowStockAlert(list, onItemClick) {
  const lowStock = list.filter(item => item.qty <= item.reorderPoint);

  if (!lowStock.length) return null;

  const el = document.createElement("div");
  el.style.cssText = "margin-bottom:16px";
  el.innerHTML = `
    <div style="background:#2a1400;border:1px solid #6a3000;border-radius:10px;padding:14px 16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:16px">⚠️</span>
        <span style="font-size:13px;font-weight:700;color:#e0a060">${lowStock.length} item${lowStock.length !== 1 ? "s" : ""} at or below reorder point</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${lowStock.map(item => `
          <button class="low-stock-chip" data-id="${item.id}" style="
            background:#1c1000;border:1px solid ${item.qty === 0 ? "#6a1a00" : "#4a3000"};
            color:${item.qty === 0 ? "#e05555" : "#e0a060"};
            padding:4px 12px;border-radius:20px;font-size:12px;cursor:pointer;
            transition:all 0.1s
          ">
            ${item.name} <strong>(${item.qty === 0 ? "OOS" : item.qty})</strong>
          </button>
        `).join("")}
      </div>
    </div>
  `;

  el.querySelectorAll(".low-stock-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const item = list.find(i => i.id === id);
      if (item && onItemClick) onItemClick(item);
    });
  });

  return el;
}

// ─── InventoryPage ────────────────────────────────────────────────────────────

async function InventoryPage() {
  const container = document.createElement("div");
  container.className = "inventory-page";
  container.style.cssText = "padding: 24px; max-width: 1400px; margin: 0 auto;";
  container.innerHTML = `<div style="color:#666;padding:40px;text-align:center">Loading inventory...</div>`;

  // Fetch or fall back to mock
  let list;
  let isMock = false;
  try {
    const res = await fetch("/api/inventory");
    if (!res.ok) throw new Error("API error");
    list = await res.json();
  } catch (_) {
    list = JSON.parse(JSON.stringify(MOCK_INVENTORY));
    isMock = true;
  }

  _invState.list = list;
  _invState.isMock = isMock;

  // Init barcode scanner
  const stopScanner = initBarcodeScanner(code => {
    // Look up by SKU
    const found = list.find(i => i.sku.toLowerCase() === code.toLowerCase());
    if (found) {
      _invState.search = found.sku;
      _invState.highlightId = found.id;
      renderInventory(container, list, isMock);
      // Show edit modal directly for scanned item
      const modal = QuickEditModal(found, updated => {
        const idx = list.findIndex(i => i.id === found.id);
        if (idx >= 0) list[idx] = updated;
        _invState.highlightId = updated.id;
        renderInventory(container, list, isMock);
        // Attempt API save
        fetch("/api/inventory/" + updated.id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        }).catch(() => {});
      });
      document.body.appendChild(modal);
    } else {
      // Flash search box with scanned code
      _invState.search = code;
      renderInventory(container, list, isMock);
    }
  });

  // Cleanup when container removed
  const obs = new MutationObserver(() => {
    if (!document.contains(container)) {
      stopScanner();
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  renderInventory(container, list, isMock);
  return container;
}

function renderInventory(container, list, isMock) {
  const items = sortedFiltered(list);

  const deptOptions = DEPTS.map(d => `<option value="${d}" ${_invState.dept === d ? "selected" : ""}>${d}</option>`).join("");
  const catOptions = CATEGORIES.map(c => `<option value="${c}" ${_invState.category === c ? "selected" : ""}>${c}</option>`).join("");

  function sortHeader(label, key) {
    const isActive = _invState.sortBy === key;
    const arrow = isActive ? (_invState.sortDir === "asc" ? " ↑" : " ↓") : "";
    return `<th class="inv-sort-th" data-key="${key}" style="cursor:pointer;color:${isActive ? "#c8392c" : "#555"};text-align:${["price","cost","qty"].includes(key) ? "right" : "left"};padding:8px 10px;border-bottom:1px solid #2a2a2a;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;background:#141414;white-space:nowrap">${label}${arrow}</th>`;
  }

  const rows = items.map(item => {
    const isHighlight = item.id === _invState.highlightId;
    const isLow = item.qty <= item.reorderPoint;
    return `
      <tr class="inv-row ${isLow ? "low-stock-row" : ""}" data-id="${item.id}" style="cursor:pointer;background:${isHighlight ? "#1a0a00" : "transparent"}">
        <td style="padding:10px;color:#888;font-size:12px;font-family:monospace">${item.sku}</td>
        <td style="padding:10px;color:#fff;font-weight:500">${item.name}</td>
        <td style="padding:10px;color:#888">${item.dept}</td>
        <td style="padding:10px;color:#888">${item.category}</td>
        <td style="padding:10px;text-align:right">${qtyBadge(item.qty, item.reorderPoint)}</td>
        <td style="padding:10px;text-align:right;color:#888;font-size:13px">${item.reorderPoint}</td>
        <td style="padding:10px;text-align:right;color:#888;font-size:13px">${fmtCurrencyInv(item.cost)}</td>
        <td style="padding:10px;text-align:right;font-weight:600;color:#ccc">${fmtCurrencyInv(item.price)}</td>
        <td style="padding:10px;color:#555;font-size:12px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.notes || ""}</td>
        <td style="padding:10px;text-align:center">
          <button class="inv-edit-btn" data-id="${item.id}" style="background:#1c1c1c;border:1px solid #2a2a2a;color:#aaa;padding:4px 10px;border-radius:5px;cursor:pointer;font-size:12px">Edit</button>
        </td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <style>
      .inv-row:hover td { background: #1a1a1a !important; }
      .low-stock-row td { border-left: 2px solid transparent; }
      .low-stock-row:not(:hover) td:first-child { border-left-color: #c85000; }
    </style>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div style="font-size:22px;font-weight:700;color:#fff">Inventory</div>
      <div style="display:flex;gap:8px;align-items:center">
        ${isMock ? '<span style="background:#2a1a0a;border:1px solid #8b5e2a;color:#e0a060;font-size:11px;padding:4px 10px;border-radius:4px">Using mock data</span>' : ""}
        <span style="color:#555;font-size:13px">${items.length} of ${list.length} items</span>
      </div>
    </div>

    <div id="lowStockZone"></div>

    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      <input type="text" id="invSearch" value="${_invState.search}" placeholder="Search name, SKU..."
        style="background:#1c1c1c;border:1px solid #2a2a2a;color:#ccc;padding:8px 14px;border-radius:7px;font-size:13px;width:220px"/>
      <select id="invDept" style="background:#1c1c1c;border:1px solid #2a2a2a;color:#ccc;padding:8px 12px;border-radius:7px;font-size:13px">${deptOptions}</select>
      <select id="invCat" style="background:#1c1c1c;border:1px solid #2a2a2a;color:#ccc;padding:8px 12px;border-radius:7px;font-size:13px">${catOptions}</select>
      <span style="color:#555;font-size:12px">Barcode scanner ready</span>
    </div>

    <div style="background:#1c1c1c;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr>
            ${sortHeader("SKU", "sku")}
            ${sortHeader("Name", "name")}
            ${sortHeader("Dept", "dept")}
            ${sortHeader("Category", "category")}
            ${sortHeader("Qty", "qty")}
            ${sortHeader("Reorder", "reorderPoint")}
            ${sortHeader("Cost", "cost")}
            ${sortHeader("Price", "price")}
            <th style="padding:8px 10px;border-bottom:1px solid #2a2a2a;background:#141414;font-size:11px;color:#555;text-transform:uppercase">Notes</th>
            <th style="padding:8px 10px;border-bottom:1px solid #2a2a2a;background:#141414"></th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="10" style="text-align:center;color:#555;padding:32px">No items found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  // Low stock alert
  const lowZone = container.querySelector("#lowStockZone");
  const lowAlert = LowStockAlert(list, (item) => {
    _invState.search = item.sku;
    _invState.highlightId = item.id;
    renderInventory(container, list, isMock);
  });
  if (lowAlert) lowZone.appendChild(lowAlert);

  // Search
  container.querySelector("#invSearch").addEventListener("input", e => {
    _invState.search = e.target.value;
    _invState.highlightId = null;
    renderInventory(container, list, isMock);
  });

  // Dept filter
  container.querySelector("#invDept").addEventListener("change", e => {
    _invState.dept = e.target.value;
    renderInventory(container, list, isMock);
  });

  // Category filter
  container.querySelector("#invCat").addEventListener("change", e => {
    _invState.category = e.target.value;
    renderInventory(container, list, isMock);
  });

  // Sort headers
  container.querySelectorAll(".inv-sort-th").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      if (_invState.sortBy === key) {
        _invState.sortDir = _invState.sortDir === "asc" ? "desc" : "asc";
      } else {
        _invState.sortBy = key;
        _invState.sortDir = "asc";
      }
      renderInventory(container, list, isMock);
    });
  });

  // Edit buttons
  container.querySelectorAll(".inv-edit-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      openEditModal(id, list, container, isMock);
    });
  });

  // Row click also opens edit
  container.querySelectorAll(".inv-row").forEach(row => {
    row.addEventListener("click", () => {
      const id = Number(row.dataset.id);
      openEditModal(id, list, container, isMock);
    });
  });
}

function openEditModal(id, list, container, isMock) {
  const item = list.find(i => i.id === id);
  if (!item) return;
  const modal = QuickEditModal(item, updated => {
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) list[idx] = updated;
    _invState.highlightId = updated.id;
    renderInventory(container, list, isMock);
    // Attempt API save
    fetch("/api/inventory/" + updated.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch(() => {});
  });
  document.body.appendChild(modal);
}

window.InventoryPage = InventoryPage;
window.QuickEditModal = QuickEditModal;
window.LowStockAlert = LowStockAlert;
window.initBarcodeScanner = initBarcodeScanner;
