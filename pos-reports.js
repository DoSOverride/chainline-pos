// pos-reports.js — ChainLine POS V2 Reports Module
// Pure vanilla JS, no frameworks

const MOCK_REPORT = {
  revenue: 4832.50,
  transactions: 47,
  workorders: 23,
  topItems: [
    { name: "Shimano XT Brake Pad", qty: 12, revenue: 143.88 },
    { name: "Brake Bleed Service", qty: 8, revenue: 320.00 },
    { name: "Maxxis Minion DHF 29", qty: 6, revenue: 359.94 },
  ],
  byMechanic: [
    { name: "Jason", completed: 11, hours: 22 },
    { name: "Florian", completed: 9, hours: 18 },
    { name: "Darrin", completed: 3, hours: 6 },
  ],
  dailyRevenue: [420, 380, 510, 290, 640, 180, 0, 520, 490, 380, 420, 610],
};

let _reportsState = {
  range: "week",
  from: null,
  to: null,
  data: null,
  loading: false,
  error: null,
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function weeksAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().slice(0, 10);
}

function monthsAgoISO(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

function rangeFromPreset(preset) {
  const to = todayISO();
  switch (preset) {
    case "today":
      return { from: to, to };
    case "week":
      return { from: weeksAgoISO(1), to };
    case "month":
      return { from: monthsAgoISO(1), to };
    default:
      return { from: _reportsState.from || weeksAgoISO(1), to: _reportsState.to || to };
  }
}

async function fetchReportData(from, to) {
  try {
    const res = await fetch(`/api/reports?from=${from}&to=${to}`);
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (_) {
    return null;
  }
}

function fmtCurrency(n) {
  return "$" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function buildBarChart(dailyRevenue) {
  if (!dailyRevenue || !dailyRevenue.length) return "";
  const max = Math.max(...dailyRevenue, 1);
  const barW = 28;
  const barGap = 6;
  const chartH = 100;
  const totalW = dailyRevenue.length * (barW + barGap);

  const bars = dailyRevenue.map((v, i) => {
    const h = Math.round((v / max) * chartH);
    const x = i * (barW + barGap);
    const y = chartH - h;
    const color = v === 0 ? "#333" : "#c8392c";
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${color}" rx="3"/>
      <text x="${x + barW / 2}" y="${chartH + 14}" text-anchor="middle" fill="#888" font-size="9">D${i + 1}</text>
    `;
  }).join("");

  return `
    <svg width="${totalW}" height="${chartH + 24}" style="display:block;overflow:visible">
      ${bars}
    </svg>
  `;
}

function buildStatsCards(data) {
  const avgSale = data.transactions > 0 ? (data.revenue / data.transactions) : 0;
  const cards = [
    { label: "Total Revenue", value: fmtCurrency(data.revenue), icon: "💰" },
    { label: "Transactions", value: data.transactions, icon: "🧾" },
    { label: "Work Orders Done", value: data.workorders, icon: "🔧" },
    { label: "Avg Sale Value", value: fmtCurrency(avgSale), icon: "📊" },
  ];
  return cards.map(c => `
    <div class="report-stat-card">
      <div class="report-stat-icon">${c.icon}</div>
      <div class="report-stat-value">${c.value}</div>
      <div class="report-stat-label">${c.label}</div>
    </div>
  `).join("");
}

function buildTopItemsTable(items) {
  if (!items || !items.length) return "<p style='color:#666'>No data.</p>";
  const rows = items.map(it => `
    <tr>
      <td>${it.name}</td>
      <td style="text-align:center">${it.qty}</td>
      <td style="text-align:right">${fmtCurrency(it.revenue)}</td>
    </tr>
  `).join("");
  return `
    <table class="report-table">
      <thead><tr><th>Item</th><th style="text-align:center">Qty Sold</th><th style="text-align:right">Revenue</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildMechanicTable(mechanics) {
  if (!mechanics || !mechanics.length) return "<p style='color:#666'>No data.</p>";
  const rows = mechanics.map(m => {
    const avgH = m.completed > 0 ? (m.hours / m.completed).toFixed(1) : "–";
    return `
      <tr>
        <td>${m.name}</td>
        <td style="text-align:center">${m.completed}</td>
        <td style="text-align:center">${avgH}h</td>
      </tr>
    `;
  }).join("");
  return `
    <table class="report-table">
      <thead><tr><th>Mechanic</th><th style="text-align:center">Completed</th><th style="text-align:center">Avg Hours</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function generateCSV(data) {
  const rows = [];
  rows.push(["Report Type", "Top Items Sold"]);
  rows.push(["Item Name", "Qty", "Revenue"]);
  (data.topItems || []).forEach(it => rows.push([it.name, it.qty, it.revenue.toFixed(2)]));
  rows.push([]);
  rows.push(["Report Type", "Work Orders by Mechanic"]);
  rows.push(["Mechanic", "Completed", "Total Hours"]);
  (data.byMechanic || []).forEach(m => rows.push([m.name, m.completed, m.hours]));
  rows.push([]);
  rows.push(["Revenue", "Transactions", "Work Orders", "Avg Sale"]);
  rows.push([
    data.revenue.toFixed(2),
    data.transactions,
    data.workorders,
    data.transactions > 0 ? (data.revenue / data.transactions).toFixed(2) : "0.00",
  ]);
  return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function triggerCSVDownload(data, filename) {
  const csv = generateCSV(data);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "chainline-report.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderReportsPage(container, data) {
  const d = data || MOCK_REPORT;
  const isMock = !data;

  container.innerHTML = `
    <style>
      .reports-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .reports-title {
        font-size: 22px;
        font-weight: 700;
        color: #fff;
      }
      .reports-range-group {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        align-items: center;
      }
      .range-btn {
        background: #1c1c1c;
        border: 1px solid #2a2a2a;
        color: #ccc;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.15s;
      }
      .range-btn.active, .range-btn:hover {
        background: #c8392c;
        border-color: #c8392c;
        color: #fff;
      }
      .custom-range {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .custom-range input[type=date] {
        background: #1c1c1c;
        border: 1px solid #2a2a2a;
        color: #ccc;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 13px;
      }
      .mock-badge {
        background: #2a1a0a;
        border: 1px solid #8b5e2a;
        color: #e0a060;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 4px;
      }
      .report-stat-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        margin-bottom: 24px;
      }
      .report-stat-card {
        background: #1c1c1c;
        border: 1px solid #2a2a2a;
        border-radius: 10px;
        padding: 18px;
        text-align: center;
      }
      .report-stat-icon {
        font-size: 24px;
        margin-bottom: 8px;
      }
      .report-stat-value {
        font-size: 26px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 4px;
      }
      .report-stat-label {
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .report-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 24px;
      }
      @media (max-width: 900px) {
        .report-grid { grid-template-columns: 1fr; }
      }
      .report-card {
        background: #1c1c1c;
        border: 1px solid #2a2a2a;
        border-radius: 10px;
        padding: 18px;
      }
      .report-card-title {
        font-size: 14px;
        font-weight: 600;
        color: #aaa;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 14px;
      }
      .report-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .report-table th {
        color: #666;
        font-weight: 600;
        text-align: left;
        padding: 6px 8px;
        border-bottom: 1px solid #2a2a2a;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .report-table td {
        padding: 8px;
        border-bottom: 1px solid #1a1a1a;
        color: #ccc;
      }
      .report-table tr:last-child td {
        border-bottom: none;
      }
      .report-table tr:hover td {
        background: #222;
      }
      .chart-scroll {
        overflow-x: auto;
        padding-bottom: 4px;
      }
      .export-btn {
        background: #1c1c1c;
        border: 1px solid #c8392c;
        color: #c8392c;
        padding: 8px 20px;
        border-radius: 7px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.15s;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .export-btn:hover {
        background: #c8392c;
        color: #fff;
      }
    </style>

    <div class="reports-header">
      <div class="reports-title">Reports</div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        ${isMock ? '<span class="mock-badge">Using mock data — API unavailable</span>' : ""}
        <button class="export-btn" id="exportCsvBtn">
          <span>&#8595;</span> Export CSV
        </button>
      </div>
    </div>

    <div class="reports-range-group" style="margin-bottom:20px">
      <button class="range-btn ${_reportsState.range === "today" ? "active" : ""}" data-range="today">Today</button>
      <button class="range-btn ${_reportsState.range === "week" ? "active" : ""}" data-range="week">This Week</button>
      <button class="range-btn ${_reportsState.range === "month" ? "active" : ""}" data-range="month">This Month</button>
      <button class="range-btn ${_reportsState.range === "custom" ? "active" : ""}" data-range="custom">Custom</button>
      <div class="custom-range" id="customRangeRow" style="display:${_reportsState.range === "custom" ? "flex" : "none"}">
        <input type="date" id="fromDate" value="${_reportsState.from || weeksAgoISO(1)}"/>
        <span style="color:#666">to</span>
        <input type="date" id="toDate" value="${_reportsState.to || todayISO()}"/>
        <button class="range-btn active" id="applyCustomRange">Apply</button>
      </div>
    </div>

    <div class="report-stat-cards">
      ${buildStatsCards(d)}
    </div>

    <div class="report-grid">
      <div class="report-card">
        <div class="report-card-title">Top Items Sold</div>
        ${buildTopItemsTable(d.topItems)}
      </div>
      <div class="report-card">
        <div class="report-card-title">Work Orders by Mechanic</div>
        ${buildMechanicTable(d.byMechanic)}
      </div>
    </div>

    <div class="report-card" style="margin-bottom:24px">
      <div class="report-card-title">Daily Revenue</div>
      <div class="chart-scroll">
        ${buildBarChart(d.dailyRevenue)}
      </div>
    </div>
  `;

  // Range button handlers
  container.querySelectorAll(".range-btn[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
      const range = btn.dataset.range;
      _reportsState.range = range;
      const customRow = container.querySelector("#customRangeRow");
      if (customRow) customRow.style.display = range === "custom" ? "flex" : "none";
      if (range !== "custom") {
        const { from, to } = rangeFromPreset(range);
        _reportsState.from = from;
        _reportsState.to = to;
        loadAndRender(container);
      }
    });
  });

  const applyBtn = container.querySelector("#applyCustomRange");
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      _reportsState.from = container.querySelector("#fromDate").value;
      _reportsState.to = container.querySelector("#toDate").value;
      loadAndRender(container);
    });
  }

  const exportBtn = container.querySelector("#exportCsvBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      triggerCSVDownload(d, `chainline-report-${_reportsState.from || "data"}.csv`);
    });
  }
}

async function loadAndRender(container) {
  const { from, to } = rangeFromPreset(_reportsState.range);
  _reportsState.loading = true;

  const apiData = await fetchReportData(from, to);
  _reportsState.loading = false;
  renderReportsPage(container, apiData);
}

function ReportsPage() {
  const container = document.createElement("div");
  container.className = "reports-page";
  container.style.cssText = "padding: 24px; max-width: 1200px; margin: 0 auto;";

  const { from, to } = rangeFromPreset(_reportsState.range);
  _reportsState.from = from;
  _reportsState.to = to;

  loadAndRender(container);
  return container;
}

window.ReportsPage = ReportsPage;
window.exportCSV = triggerCSVDownload;
