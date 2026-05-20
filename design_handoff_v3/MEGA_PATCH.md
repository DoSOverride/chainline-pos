# MEGA_PATCH.md — every in-place edit Claude Code needs to apply

This is the master integration document for Round 3. Standalone modules are already written; this file covers all the surgical edits to existing source files.

**Time estimate:** 2.5–3 hours, all CSS/JS find-and-replace.

---

## 1 · Load the new files (index.html)

After `pos-purchase-orders-v2.js` and **before** `pos-app.js`, add:

```html
<!-- Round 3: Lightspeed benchmark modules -->
<link rel="stylesheet" href="/pos-styles-v3.css?v=1">
<script defer src="/pos-workorder-presets.js?v=1"></script>
<script defer src="/pos-shopfloor.js?v=1"></script>
<script defer src="/pos-myqueue.js?v=1"></script>
<script defer src="/pos-wo-extras.js?v=1"></script>
<script defer src="/pos-customer-items.js?v=1"></script>
```

Bump `pos-app.js?v=16` → `?v=18`.

Also drop `wo-status.html` at the repo root — it's already self-contained, no script wiring needed.

---

## 2 · Sidebar — add Floor + My Queue

In `pos-app.js`, find `const NAV_MAIN = [...]` (or wherever the sidebar nav array is defined). Add **at the top**:

```js
const NAV_MAIN = [
  { id: 'my-queue', label: 'My Queue',       mobileLabel: 'Queue',  Icon: 'List',  count: null },
  { id: 'floor',    label: 'Floor',          mobileLabel: 'Floor',  Icon: 'Grid',  count: null },
  { id: 'dashboard',label: 'Dashboard',      mobileLabel: 'Home',   Icon: 'Dashboard' },
  // ... existing items below
];
```

If `Ico.List` / `Ico.Grid` don't exist, add them to your icons module (or fall back to existing `Ico.Wrench`).

---

## 3 · Wire renderScreen routes

In `pos-app.js` `renderScreen()`:

```js
case 'floor':
  return h(window.ShopFloorScreen || PlaceholderScreen, {
    setScreen, onOpenWo: (wo) => { setActiveWo(wo); setScreen('wo-detail'); }
  });
case 'my-queue':
  return h(window.MyQueueScreen || PlaceholderScreen, {
    setScreen, staff,
    onOpenWo: (wo) => { setActiveWo(wo); setScreen('wo-detail'); }
  });
```

`staff` should be whatever object holds the logged-in user's `{ initials, name, tone, role }`. If it's not already in scope, lift it from auth context.

Also update the breadcrumb map in `Topbar`:

```js
'floor':    ['Service', 'Shop Floor'],
'my-queue': ['Service', 'My Queue'],
```

---

## 4 · WorkOrderDetail — add Hook In / Hook Out fields

Find `function WorkOrderDetail({ wo, onClose, fullPage, setScreen })` (~line 916 in `pos-app.js`).

Add state at the top:

```js
const [hookIn,   setHookIn]   = useState(wo.hookIn   || '');
const [hookOut,  setHookOut]  = useState(wo.hookOut  || '');
const [warranty, setWarranty] = useState(!!wo.warranty);
const [saveParts,setSaveParts]= useState(!!wo.saveParts);
const [receiptNote, setReceiptNote]  = useState(wo.receiptNote || wo.notes || '');
const [internalNote, setInternalNote]= useState(wo.internalNote || '');
const [lines, setLines] = useState(wo.lines || []);
```

Find the Date In / Due row in the JSX. **Below** it, **add**:

```js
h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 } },
  h(Field, { label: 'Hook In', hint: 'Rack / pile / location' },
    h('input', {
      className: 'input hook-input',
      value: hookIn,
      placeholder: 'e.g. FLOR 27',
      onChange: e => setHookIn(e.target.value.toUpperCase().slice(0, 12))
    })
  ),
  h(Field, { label: 'Hook Out', hint: 'Where the bike is now if moved' },
    h('input', {
      className: 'input hook-input',
      value: hookOut,
      placeholder: 'e.g. WH (wheel pile)',
      onChange: e => setHookOut(e.target.value.toUpperCase().slice(0, 12))
    })
  )
),
```

---

## 5 · WorkOrderDetail — split Receipt / Internal Note

Find the existing single `notes` textarea. Replace with:

```js
h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 } },
  h(Field, { label: 'Receipt Note', hint: 'Prints on customer receipt' },
    h('textarea', {
      className: 'textarea', rows: 4, value: receiptNote,
      onChange: e => setReceiptNote(e.target.value),
      placeholder: 'e.g. RA submitted to SRAM. Loaner wheelset available.'
    })
  ),
  h('div', { className: 'note-internal' },
    h(Field, { label: 'Internal Note', hint: 'Never prints — mechanic-only' },
      h('textarea', {
        className: 'textarea', rows: 4, value: internalNote,
        onChange: e => setInternalNote(e.target.value),
        placeholder: 'BB is seized; needs extractor.'
      })
    )
  )
),
```

In `pos-print.js`, find any place that emits `wo.notes` and change to `wo.receiptNote`. Never print `wo.internalNote`.

---

## 6 · WorkOrderDetail — Save Parts / Warranty toggles

Above the line items area, add:

```js
h('div', { className: 'wo-flags' + (warranty ? ' wo-flag-warranty is-on' : '') },
  h(Toggle, {
    on: warranty, onChange: setWarranty,
    label: 'Warranty', sub: 'Bills vendor, not customer'
  }),
  h(Toggle, {
    on: saveParts, onChange: setSaveParts,
    label: 'Save parts', sub: 'Bag removed parts for customer'
  })
),
```

When `warranty` is true, the checkout flow should zero the labor lines. In the totals calculation:

```js
const labourSubtotal = warranty ? 0 : lines.filter(l => l.isLabor).reduce(...);
```

---

## 7 · WorkOrderDetail — mount the preset bar

**Below** the line items table, **above** the totals card:

```js
h(window.WorkOrderPresetBar || (() => null), {
  mechanic: { initials: wo.mech, tone: wo.tone },
  onAddLine: line => setLines(prev => prev.concat([line])),
  onAddPart: part => setLines(prev => prev.concat([part])),
}),
```

---

## 8 · WorkOrderDetail — timer + photos

In the WO header (next to the customer block), add:

```js
window.WoTimer && h(window.WoTimer, {
  woId: wo.id,
  onLogTime: ms => {
    const hours = ms / 3600000;
    if (window.apiPost) window.apiPost('/api/wo/' + wo.id + '/time', { hours });
  }
}),
```

In the right rail of WorkOrderDetail (under the totals card), add a Photos section:

```js
window.WoPhotos && h('div', { className: 'aside-card', style: { padding: 14 } },
  h(window.WoPhotos, { woId: wo.id })
),
```

---

## 9 · WorkOrderDetail — RA workflow callout

Show the RA callout when the WO's status is "RA":

```js
const isRA = (status || '').toLowerCase().includes('ra');

isRA && window.WoRaCallout && h(window.WoRaCallout, {
  wo: Object.assign({}, wo, { internalNote }),
  onUpdate: data => {
    // Persist on the WO record
    Object.assign(wo, data);
  }
}),
```

---

## 10 · WorkOrderDetail — Print Tag + Request Payment

In the action bar at the top, add two buttons:

```js
h('button', {
  className: 'btn',
  onClick: () => window.printBikeTag ? window.printBikeTag(wo) : printBikeTagInline(wo)
}, '🏷 Print tag'),

h('button', {
  className: 'btn',
  onClick: () => requestPaymentLink(wo)
}, '$ Request payment'),

h('button', {
  className: 'btn',
  onClick: () => sendCustomerStatusLink(wo)
}, '↗ Send status link'),
```

`printBikeTagInline` — drop this helper in `pos-print.js`:

```js
window.printBikeTag = function printBikeTag(wo) {
  const w = window.open('', '_blank', 'width=400,height=200');
  if (!w) return;
  w.document.write(`<html><head><title>Tag · ${wo.id}</title>
    <style>
      @page { size: 80mm 40mm; margin: 0; }
      body { font-family: 'JetBrains Mono', monospace; margin: 0; padding: 4mm; }
      .id { font-size: 28pt; font-weight: 700; line-height: 1; letter-spacing: 0.04em; }
      .cust { font-size: 11pt; margin-top: 2mm; font-weight: 600; }
      .bike { font-size: 8pt; color: #555; }
      .due { font-size: 9pt; margin-top: 2mm; }
      .mech { float: right; border: 1px solid #000; padding: 0 4px; font-size: 11pt; }
    </style></head><body>
      <span class="mech">${wo.mech || '—'}</span>
      <div class="id">${wo.id}</div>
      <div class="cust">${wo.cust || ''}</div>
      <div class="bike">${(wo.bike || '').slice(0, 40)}</div>
      <div class="due">Due: ${wo.due || 'TBD'}</div>
      <script>window.onload=()=>window.print()</` + `script>
    </body></html>`);
  w.document.close();
};
```

`requestPaymentLink`:

```js
async function requestPaymentLink(wo) {
  if (!wo.customer || !wo.customer.phone) {
    return window.toast && window.toast('No phone on file', 'error');
  }
  window.toast && window.toast('Sending payment link...', 'info');
  try {
    const r = await fetch(WORKER + '/api/request-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ woId: wo.id, amount: wo.total, phone: wo.customer.phone })
    });
    if (!r.ok) throw new Error(await r.text());
    window.toast && window.toast('Payment link sent', 'success');
  } catch (e) {
    window.toast && window.toast('Failed: ' + e.message, 'error');
  }
}
```

`sendCustomerStatusLink`:

```js
async function sendCustomerStatusLink(wo) {
  if (!wo.customer || !wo.customer.phone) {
    return window.toast && window.toast('No phone on file', 'error');
  }
  try {
    // Get/create a public token from the worker
    const r = await fetch(WORKER + '/api/wo-public-token/' + wo.id, { method: 'POST' });
    const { token } = await r.json();
    const url = location.origin + '/wo-status.html?t=' + token;

    // Twilio send via worker
    await fetch(WORKER + '/api/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: wo.customer.phone,
        body: `Hi ${wo.cust.split(' ')[0]} — check your bike status here: ${url}`
      })
    });
    window.toast && window.toast('Status link sent', 'success');
  } catch (e) {
    window.toast && window.toast('Send failed: ' + e.message, 'error');
  }
}
```

---

## 11 · WorkOrdersScreen — add Hook column

In the WO list table header:

```js
h('th', { style: { width: 80 } }, 'Hook'),
```

In each row, between Status and Due cells:

```js
h('td', null,
  (r.hookIn || r.hookOut)
    ? h('span', { className: 'cell-hook' }, r.hookOut || r.hookIn)
    : h('span', { className: 'cell-hook empty' }, '—')
),
```

In the search filter:

```js
const matchSearch = !q
  || r.id.toLowerCase().includes(q)
  || r.cust.toLowerCase().includes(q)
  || r.bike.toLowerCase().includes(q)
  || r.phone.includes(q)
  || (r.hookIn || '').toLowerCase().includes(q)
  || (r.hookOut || '').toLowerCase().includes(q);
```

In MOCK_WO, sprinkle some hook values for demo:

```js
{ id: 'WO-2391', ...prev, hookIn: 'FLOR 27' },
{ id: 'WO-2388', ...prev, hookIn: '', hookOut: 'WH' },
{ id: 'WO-2382', ...prev, hookIn: 'DHS' },
```

---

## 12 · CashModal — denomination buttons

In `pos-payments.js`, find `function CashModal(...)`. Inside the modal body, above the existing tendered input, add:

```js
const DENOMS = [100, 50, 20, 10, 5, 2, 1, 0.25, 0.10, 0.05];

h('div', { className: 'cash-denom-grid' },
  DENOMS.map(d =>
    h('button', {
      key: d, className: 'cash-denom-btn',
      onClick: () => setTendered(t => +((parseFloat(t) || 0) + d).toFixed(2))
    }, d >= 1 ? `$${d}` : `${Math.round(d * 100)}¢`)
  )
),

h('div', { style: { display: 'flex', gap: 6, marginBottom: 10 } },
  h('button', {
    className: 'btn', style: { flex: 1 },
    onClick: () => setTendered(total.toFixed(2))
  }, 'Exact'),
  h('button', {
    className: 'btn', style: { flex: 1 },
    onClick: () => setTendered((Math.ceil(total / 5) * 5).toFixed(2))
  }, 'Round up $5'),
  h('button', {
    className: 'btn', style: { flex: 1 },
    onClick: () => setTendered((Math.ceil(total / 10) * 10).toFixed(2))
  }, 'Round up $10'),
),
```

---

## 13 · Settings → expand custom statuses

In `pos-app.js`, find `const DEFAULT_SETTINGS = { ... customStatuses: [ ... ] }`. Replace `customStatuses` array with:

```js
customStatuses: [
  { id: 1,  label: 'Booked',           color: '#d29a3a' },
  { id: 2,  label: 'Estimate',         color: '#a78bfa' },
  { id: 3,  label: 'Waiting',          color: '#a78bfa' },
  { id: 4,  label: 'Open',             color: '#4d8fd6' },
  { id: 5,  label: 'In Progress',      color: '#ededed' },
  { id: 6,  label: 'Parts Ordered',    color: '#d29a3a' },
  { id: 7,  label: 'SO Parts Arrived', color: '#2f9e5b' },
  { id: 8,  label: 'RA!',              color: '#c8392c' },
  { id: 9,  label: 'Ready',            color: '#2f9e5b' },
  { id: 10, label: 'Done & Paid',      color: '#7a7a7a' },
  { id: 11, label: 'Consignment',      color: '#a78bfa' },
],
```

Old saved settings will still merge — only new fields fill in.

---

## 14 · Settings → add customer types

Add to `DEFAULT_SETTINGS`:

```js
customerTypes: [
  { id: 'retail',    label: 'Retail',           discountPct: 0,  chipClass: '' },
  { id: 'staff',     label: 'Staff',            discountPct: 40, chipClass: 'staff' },
  { id: 'wholesale', label: 'Wholesale',        discountPct: 30, chipClass: 'wholesale' },
  { id: 'friends',   label: 'Friends & Family', discountPct: 15, chipClass: 'friends' },
  { id: 'vip',       label: 'VIP',              discountPct: 10, chipClass: 'vip' },
],
```

Add a Settings → Customers tab UI to manage them (similar pattern to the statuses editor).

---

## 15 · Render STAFF chip next to customer name

Anywhere a customer name is shown — WO detail header, sales register customer card, customer combobox suggestions, dashboard service queue, work order list — wrap with:

```js
customer.name,
window.CustomerTypeChip && h(window.CustomerTypeChip, { type: customer.type })
```

---

## 16 · PO Detail — vendor sheet sidebar

In `pos-purchase-orders-v2.js`, inside the PO detail panel/page, restructure to two columns. Add this as the right column:

```js
h('div', { className: 'aside-card po-vendor-sheet' },
  h('div', { className: 'card-head' },
    h('h3', null, po.vendor.name),
    h('span', { className: 'sub' }, 'VENDOR')
  ),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Account #'), h('span', { className: 'v mono' }, po.vendor.accountId || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Phone'),     h('span', { className: 'v mono' }, po.vendor.phone || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Rep'),       h('span', { className: 'v' },      po.vendor.repName || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Email'),     h('span', { className: 'v mono', style: { fontSize: 11 } }, po.vendor.email || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Address'),   h('span', { className: 'v' },      po.vendor.address || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'City'),      h('span', { className: 'v' },      po.vendor.city || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Province'),  h('span', { className: 'v' },      po.vendor.province || 'BC')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Postal'),    h('span', { className: 'v mono' }, po.vendor.postal || '—')),
  po.vendor.notes && h('div', { style: { padding: '12px 16px', borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap' } },
    po.vendor.notes
  )
)
```

---

## 17 · Customer detail — top tabs + count badges + Items tab

In `pos-customers.js`, swap the left-rail tabs for top tabs:

```js
const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'items',   label: 'Items',     count: window.CustomerItems?.get(customer.id).length },
  { id: 'sales',   label: 'Sales',     count: customer.salesCount },
  { id: 'wo',      label: 'Workorders',count: customer.woCount },
  { id: 'payments',label: 'Payments' },
  { id: 'account', label: 'Account' },
];

h('div', { className: 'detail-top-tabs' },
  TABS.map(t =>
    h('button', {
      key: t.id,
      className: 'detail-top-tab' + (tab === t.id ? ' active' : ''),
      onClick: () => setTab(t.id)
    },
      t.label,
      t.count != null && h('span', { className: 'detail-top-tab-count' }, t.count)
    )
  )
),

tab === 'items' && window.CustomerItemsTab && h(window.CustomerItemsTab, { customerId: customer.id }),
```

---

## 18 · New WO form — bike dropdown from customer items

In `NewWorkOrderScreen`, when a customer is selected, fetch their items and offer a dropdown:

```js
const [custItems, setCustItems] = useState([]);
useEffect(() => {
  if (selectedCustomerId && window.CustomerItems) {
    setCustItems(window.CustomerItems.get(selectedCustomerId));
  }
}, [selectedCustomerId]);

custItems.length > 0 && h(Field, { label: 'Bike on file', hint: 'Pick a bike from this customer\'s items' },
  h('select', {
    className: 'select',
    onChange: e => {
      const item = custItems.find(it => String(it.id) === e.target.value);
      if (item) {
        setBike(item.description);
        setColor(item.color || '');
        setSize(item.size || '');
        setSerial(item.serial || '');
      }
    }
  },
    h('option', { value: '' }, '— Select customer\'s bike —'),
    custItems.map(it =>
      h('option', { key: it.id, value: it.id },
        it.description + (it.color ? ' · ' + it.color : '') + (it.serial ? ' · ' + it.serial : '')
      )
    )
  )
),
```

When a sale closes with a serialized SKU, push the item into customer items automatically:

```js
// After successful sale checkout, for each serialized line:
if (window.CustomerItems && customer && line.serial) {
  window.CustomerItems.add(customer.id, {
    description: line.name,
    serial: line.serial,
    size: line.size, color: line.color,
    source: 'sale',
    saleId: sale.id,
  });
}
```

---

## 19 · Sales register — parked sales tray with WO link

At the top of `SalesScreen`, add a parked-sales tray:

```js
const [parkedSales, setParkedSales] = useState(() => {
  try { return JSON.parse(localStorage.getItem('pos-parked-sales') || '[]'); }
  catch { return []; }
});

function parkCurrent(woId) {
  const parked = {
    id: 'PRK-' + Date.now(),
    items: items,
    customer: customer,
    woId: woId || null,
    parkedAt: new Date().toISOString(),
  };
  const next = parkedSales.concat([parked]);
  setParkedSales(next);
  localStorage.setItem('pos-parked-sales', JSON.stringify(next));
  setItems([]);
  window.toast('Sale parked' + (woId ? ' for ' + woId : ''), 'success');
}

function resumeParked(p) {
  setItems(p.items);
  setCustomer(p.customer);
  const next = parkedSales.filter(x => x.id !== p.id);
  setParkedSales(next);
  localStorage.setItem('pos-parked-sales', JSON.stringify(next));
}
```

Render the tray (only when there are parked sales):

```js
parkedSales.length > 0 && h('div', { className: 'parked-tray' },
  h('span', { className: 'label' }, 'Parked'),
  parkedSales.map(p =>
    h('button', {
      key: p.id,
      className: 'parked-chip' + (p.woId ? ' parked-chip-wo' : ''),
      onClick: () => resumeParked(p)
    },
      p.woId ? p.woId : p.id,
      p.customer && h('span', { style: { color: 'var(--text2)' } }, ' · ' + (p.customer.name || p.customer)),
      h('span', { style: { color: 'var(--text3)' } },
        ' · $' + p.items.reduce((a, i) => a + i.qty * i.price, 0).toFixed(2)
      )
    )
  )
),
```

---

## 20 · Worker endpoints to stub (Cloudflare Worker)

Add these to the Worker (server side, not in the POS app):

```js
// POST /api/request-payment — creates Stripe payment link, SMSes it
// POST /api/wo-public-token/:woId — generates a public token for wo-status.html
// GET  /api/wo-public/:token — returns sanitized WO data for the public page
// POST /api/sms — sends Twilio SMS
// POST /api/wo/:woId/photo — uploads photo to R2, returns URL
// POST /api/wo/:woId/time — logs mechanic hours
```

Stub bodies are straightforward. The public token should be a random nanoid stored in KV, ttl 30 days.

---

## 21 · Acceptance checklist

After applying all patches and pushing:

- [ ] Sidebar shows **My Queue** and **Floor** at top
- [ ] Click Floor → kanban with 7 columns, your WOs grouped by status
- [ ] Click My Queue → only your assigned WOs
- [ ] Open any WO detail → preset bar at bottom, click "Tune Up" adds a line
- [ ] Hook In/Out fields visible, type "FLOR 27" → appears in WO list table + floor card
- [ ] Receipt Note + Internal Note are two boxes; internal one tinted red
- [ ] Warranty toggle on → labor zeroed in totals
- [ ] Timer in WO header → click Start, tick tick tick, click Stop, logs hours
- [ ] Photos section → drop a photo, appears as thumbnail
- [ ] Set WO status to "RA!" → callout appears with vendor/RMA fields + Print RMA button
- [ ] Click "Send status link" on WO → SMS sent (or stub OK if worker not deployed)
- [ ] Open `/wo-status.html?t=demo` → see Devon Tran's bike status page
- [ ] Cash payment modal → denomination buttons add to tendered
- [ ] STAFF chip appears next to Steve Gaucher's name in WO header
- [ ] Customer detail → top tabs with counts, Items tab works
- [ ] PO detail → vendor sheet on right side
- [ ] Sales register → parked tray appears after parking a sale

Push, deploy, write outcome into `STATUS.md`.
