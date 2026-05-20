# Lightspeed Benchmark — what to copy, what to skip, what to BEAT

**Subject:** Lightspeed Retail R-Series — same shop (ChainLine Cycle on Register 1)
**Reviewed:** 50 screenshots, 2026-05-20

> This is a side-by-side. For every Lightspeed pattern below I've taken a position: **COPY** (worth lifting verbatim), **ADAPT** (good idea, do it better), **SKIP** (don't copy), or **BEAT** (something ChainLine should add that Lightspeed lacks). Implement in order.

---

## TL;DR — the single most important takeaway

Their bike-shop workorder has a **categorized one-tap service preset bar** at the bottom of the screen. Click "Services" → see a grid of ~18 pre-built labor packages (Tune Up, Brake Bleed, Cable Half Package, Wheel True, etc.) color-coded by category. Click "Mountain Bike" → ~22 MTB-specific presets. Click "Road Bike" → ~10 road presets. Each button is a one-tap "add labor line + parts at fixed price" macro.

**This is THE feature.** It's why mechanics tolerate Lightspeed. A typical bike-in / bike-out at the counter is "Hi, I need a tune-up" → click → done. In ChainLine today they'd need to type/search "Full Tune" and find it in the SKU list. The preset bar collapses three keystrokes-plus-mouse-clicks into one tap.

**Build this first** (see §1 below — full code module included). Everything else in this audit is secondary.

---

## §1 · COPY (with upgrades): Service preset button bar

**Lightspeed pattern:**
- Bottom of workorder detail, beneath the customer block.
- Item search + 6 category pill-buttons in colored backgrounds: New (neutral) · Misc (neutral) · Labor (neutral) · **Services** (mulberry red) · **Mountain Bike** (mulberry red) · **Road Bike** (mulberry red).
- Click a category → expands into an inline grid (~10 columns) of preset buttons.
- Buttons themselves are color-coded by **sub-category** within: yellow = tunes, red = fix-it (brakes/flats), blue = cable services, green = internal cable / wheel, gray = misc, purple = supplies/dropper, etc.
- Each button is the literal labor SKU. One click appends a line to the workorder with name, price, qty 1.

**Beat them by:**
1. **Make presets editable per shop.** Lightspeed's are hardcoded in the system. ChainLine should let Darrin/Tao reorder, recolor, retitle, and bundle parts with labor (e.g. "Brake Bleed" auto-adds the labor line PLUS a "DOT 5.1 Fluid · 50ml" part SKU). Edit via Settings → Services tab.
2. **Show stock + ETA on parts in the preset.** If "Cable Full Package" includes a SKU that's out of stock, the button shows a small amber dot. Hover/long-press → which part is short.
3. **Keyboard shortcuts.** ChainLine already has ⌘K. Add **`T T`** → focus the Tune Up preset, **`B`** → Brake Bleed, **`F`** → Flat Fix. Mechanics on a keyboard go faster than on tap.
4. **Stack preset buttons by mechanic personalization.** Phil and Steve do different work — surface each mechanic's top 6 presets first when they're the assigned WO mechanic.

**Implementation:** see `pos-workorder-presets.js` in this handoff bundle. Drop into the repo, add a `<script defer src>` tag, and edit the `WorkOrderDetail` component to import the bar.

---

## §2 · COPY: Hook In / Hook Out (physical location field)

**Lightspeed pattern:**
Two small text fields on the workorder labelled `Hook In` and `Hook Out`. Mechanic types `FLOR 27` (= floor rack #27) or `WH` (= wheel pile) or `DHS` (= display hanger south). Shows in the WO list as its own column. When bike comes off the rack for work, mechanic clears `Hook In` and types into `Hook Out`. Searchable.

**Why it matters:** At a busy shop with 60 bikes in queue, locating the physical bike is the #1 friction. "Where's Steve's Pivot?" → ⌘K → "Steve" → see `Hook In: FLOR 27` → done. ChainLine doesn't have this today.

**Build it:**

```js
// In WorkOrderDetail component, after Date In / Due fields:
h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
  h(Field, { label: 'Hook In', hint: 'Rack / pile / location' },
    h('input', {
      className: 'input mono',
      value: hookIn,
      placeholder: 'e.g. FLOR 27',
      onChange: e => setHookIn(e.target.value.toUpperCase().slice(0, 12))
    })
  ),
  h(Field, { label: 'Hook Out', hint: 'Where the bike is now if moved' },
    h('input', {
      className: 'input mono',
      value: hookOut,
      placeholder: 'e.g. WH (wheel)',
      onChange: e => setHookOut(e.target.value.toUpperCase().slice(0, 12))
    })
  )
),
```

**Add to Work Orders list table** as a column between Status and Due:

```js
h('th', { style: { width: 70 } }, 'Hook'),
// in body:
h('td', { className: 'mono', style: { color: 'var(--text2)' } }, r.hookIn || r.hookOut || '—'),
```

**Add to global search:** in the existing `MockGlobalSearch`, include `hookIn` / `hookOut` in the workorder match check.

**Beat them by:** Make Hook a `<select>` with the rack codes the shop actually uses, defined in Settings → Hardware → Shop Layout. Free-text + dropdown union (datalist). And surface "bikes at this hook" as a quick filter on the WO list.

---

## §3 · COPY: Receipt Note vs Internal Note (split)

**Lightspeed pattern:**
Two separate textareas:
- **Receipt Note** — prints on the customer's WO receipt. Visible to them.
- **Internal Note** — never prints. For mechanic-to-mechanic notes ("BB is seized, will need extractor").

ChainLine's `notes` field today is one box. Mechanics will absolutely write things they shouldn't print if they have one box. **Split it.**

```js
// Replace the single notes field in WorkOrderDetail with:
h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } },
  h(Field, { label: 'Receipt Note', hint: 'Prints on customer receipt' },
    h('textarea', {
      className: 'textarea',
      rows: 4,
      value: receiptNote,
      onChange: e => setReceiptNote(e.target.value),
      placeholder: 'e.g. RA submitted to SRAM'
    })
  ),
  h(Field, { label: 'Internal Note', hint: 'Never prints. Mechanic-only.' },
    h('textarea', {
      className: 'textarea',
      rows: 4,
      value: internalNote,
      onChange: e => setInternalNote(e.target.value),
      placeholder: "Don't enter sensitive information like login or credit card details"
    })
  )
),
```

In `pos-print.js`, only emit `receiptNote` when building the print template. Drop `internalNote` entirely from any print path.

---

## §4 · COPY: Customer "Items" tab with serial tracking

**Lightspeed pattern:**
Customer detail has an `Items` tab (different from Sales). Shows every bike-or-other-serialized item that customer owns, with **Serial #**, Size, Color, Notes, and link to the Sale that delivered it. Lets you start a workorder pre-filled with that bike.

ChainLine's customer page probably needs this. For a bike shop it's mandatory — warranty claims and theft recovery both require serial-on-customer.

**Schema:**
```ts
type CustomerItem = {
  id: string;
  customerId: string;
  itemSku?: string;        // links to inventory if sold here
  description: string;     // "2022 Transition Sentinel Carbon GX Ti Grey"
  size?: string;           // "Large"
  color?: string;          // "Ti Grey"
  serial?: string;         // TBC4326482
  notes?: string;
  saleId?: string;         // backlink to the sale that delivered it
  addedAt: string;
};
```

UI lives in the Customers screen, a new sub-tab `Items` between `Sales` and the rest. Same table style as elsewhere — `data-table`, columns: Item / Size / Color / Serial / Notes / Sale ID. Single-row inline editing. "+ Add Serial / Item" button at top.

**Wire to New Work Order form:** when a customer is selected, the existing "Bike / Item" field gets a dropdown of that customer's items on file. Click one → autofill description + serial. Below the dropdown, a "+ New item not on file" option. This shaves 15 seconds per workorder intake.

**Beat them by:** Auto-link the item if customer bought it here. Today their flow is: sell a bike → manually re-add it to the customer's items. Don't do that — when a sale closes with a serialized SKU, push the line into `customer.items` automatically.

---

## §5 · COPY: Custom WO statuses, more granular

**Lightspeed has:**
READY · Open · Finished · BOOKED · RA! · JASON · Estimate · Waiting · Scheduled – Parts Ar… · READY – S.O. Parts A… · PARTS ORDERED – BIKE… · Done & Paid · Consignment

ChainLine has just 5 (Open / In Progress / Ready / Booked / Done). The shop's actual workflow has at least 8 more states. **Add these** to `DEFAULT_SETTINGS.customStatuses`:

```js
customStatuses: [
  { id: 1,  label: 'Booked',           color: '#d29a3a', kind: 'amber' },
  { id: 2,  label: 'Estimate',         color: '#a78bfa', kind: 'violet' },
  { id: 3,  label: 'Waiting',          color: '#a78bfa', kind: 'violet' },
  { id: 4,  label: 'Open',             color: '#4d8fd6', kind: 'blue' },
  { id: 5,  label: 'In Progress',      color: '#ededed', kind: 'neutral' },
  { id: 6,  label: 'Parts Ordered',    color: '#d29a3a', kind: 'amber' },
  { id: 7,  label: 'SO Parts Arrived', color: '#2f9e5b', kind: 'green' },
  { id: 8,  label: 'RA!',              color: '#c8392c', kind: 'red' }, // returned for vendor warranty
  { id: 9,  label: 'Ready',            color: '#2f9e5b', kind: 'green' },
  { id: 10, label: 'Done & Paid',      color: '#7a7a7a', kind: 'gray' },
  { id: 11, label: 'Consignment',      color: '#a78bfa', kind: 'violet' },
],
```

Add a `violet` badge variant to your design system to support the Estimate/Waiting/Consignment statuses:

```css
/* in pos-styles.css, alongside .badge.ready/.open/etc */
:root {
  --violet-fg: #a78bfa;
  --violet-bg: rgba(167, 139, 250, 0.12);
  --violet-line: rgba(167, 139, 250, 0.32);
}
.badge.violet, .badge-violet, .badge-estimate, .badge-waiting, .badge-consignment {
  color: var(--violet-fg);
  background: var(--violet-bg);
  border-color: var(--violet-line);
}
```

**Beat them by:** Group statuses into a 3-state lifecycle for filtering — Inbound (Booked, Estimate, Waiting) → Active (Open, In Progress, Parts Ordered, SO Parts Arrived, RA!) → Done (Ready, Done & Paid, Consignment). The WO list's sub-tabs collapse to these 3 plus All by default; click a group to expand into the underlying statuses. Saves screen space, matches mental model.

---

## §6 · COPY: Vendor sheet sidebar on Purchase Order detail

**Lightspeed pattern:**
PO detail has a right-side panel showing the full vendor record: Shimano | Account # | Phone | Rep First Name | Fax | Last Name | Email | Vendor Notes | Address | City | Province | Postal Code. No clicking out to a vendor screen.

ChainLine's `pos-purchase-orders-v2.js` PO detail probably doesn't have this. Add it:

```js
// Right rail on PO detail
h('div', { className: 'aside-card', style: { width: 340, flexShrink: 0 } },
  h('div', { className: 'card-head' },
    h('h3', null, po.vendor.name),
    h('span', { className: 'sub' }, 'VENDOR')
  ),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Account #'),   h('span', { className: 'v mono' }, po.vendor.accountId || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Phone'),       h('span', { className: 'v mono' }, po.vendor.phone || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Rep'),         h('span', { className: 'v' },      po.vendor.repName || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Email'),       h('span', { className: 'v mono', style: { fontSize: 11 } }, po.vendor.email || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Address'),     h('span', { className: 'v' },      po.vendor.address || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'City'),        h('span', { className: 'v' },      po.vendor.city || '—')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Province'),    h('span', { className: 'v' },      po.vendor.province || 'BC')),
  h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Postal'),      h('span', { className: 'v mono' }, po.vendor.postal || '—')),
  po.vendor.notes && h('div', { style: { padding: '12px 16px', borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap' } },
    po.vendor.notes
  )
)
```

Pulls from the vendor directory you already have.

---

## §7 · ADAPT: Cash denomination quick buttons

**Lightspeed pattern:**
Cash payment row has 7 quick buttons: `$100  $50  $20  $10  $5  $2  $1`. Tap to add that amount to the cash tendered field.

ChainLine has this in the EOD modal. **Port it to the Cash payment modal** (`pos-payments.js` — `CashModal`). Same denomination buttons. Big tap targets for the counter terminal. The modal also already does change calc — keep that.

```js
const DENOMS = [100, 50, 20, 10, 5, 2, 1, 0.25, 0.10, 0.05];
// In CashModal body:
h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, margin: '12px 0' } },
  DENOMS.map(d =>
    h('button', {
      key: d, className: 'btn',
      style: { padding: '12px 0', fontFamily: 'var(--mono)', fontSize: 13 },
      onClick: () => setTendered(t => +(t + d).toFixed(2))
    }, d >= 1 ? `$${d}` : `${d * 100}¢`)
  )
)
```

**Beat them by:** Track which denominations are in the till (already counted at open/close) and grey out denoms the till is short on. Removes "I gave you a fifty, you said you couldn't break it" friction.

---

## §8 · ADAPT: Customer detail sub-tabs

**Lightspeed pattern:**
Customer detail has 10 tabs in a left rail: Details · Items · Sales · Layaways · Special Orders · Quotes · Payments · Workorders · Account · Merge.

ChainLine's `pos-customers.js` covers some of these. Make sure the full set exists, and use **top tabs** (`.sub-tabs` pattern) not a left rail — left rail is wasted screen space on a 13" laptop in a service bay. Tabs go horizontally above the customer body.

Order them by frequency-of-use, not alphabetically:
**Details · Items · Sales · Workorders · Quotes · Payments · Account · Special Orders · Layaways · Merge**

**Beat them by:**
- Show a count badge on each tab: `Workorders (3)`, `Sales (57)`, `Items (7)` — Lightspeed doesn't.
- Hide `Layaways` and `Merge` behind an overflow menu (you almost never need them).
- Add a `Notes` tab (timeline of staff-added notes about the customer — last bike fit, allergies, attitude flags).

---

## §9 · ADAPT: Workorder action bar

**Lightspeed pattern:**
Across the top of WO detail: Print Tag · Print Quote · Send As Email · Request Payment · Checkout · Duplicate · Delete.

ChainLine probably has Checkout, Print, maybe a few others. The two that matter for a bike shop:

- **Print Tag** — small 80×40mm tag that ties to the bike. WO number in giant numerals, customer name, due date, mechanic initials. Mechanics zip-tie it to the handlebar. ChainLine should print this from `pos-print.js`.
- **Request Payment** — sends the customer an SMS/email with a Stripe link to pre-pay before pickup. Frees up the counter at pickup time. ChainLine has the integration (Stripe + Twilio in Settings now); just expose the button.

```js
// In WorkOrderDetail action bar:
h('button', { className: 'btn', onClick: () => window.printBikeTag?.(wo) || toast('Print bike tag: wire up in pos-print.js') },
  h(Ico.Printer, { size: 12 }), ' Print tag'
),
h('button', { className: 'btn', onClick: requestPayment },
  h(Ico.Dollar, { size: 12 }), ' Request payment'
),
```

`requestPayment` POSTs to the worker → Stripe creates a `payment_link` → Twilio SMSes it to the customer phone. Wire stub:

```js
async function requestPayment() {
  if (!wo.customer.phone) return toast('No phone on file', 'error');
  toast('Sending payment link...', 'info');
  try {
    const r = await fetch(WORKER + '/api/request-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ woId: wo.id, amount: wo.total, phone: wo.customer.phone })
    });
    if (!r.ok) throw new Error(await r.text());
    toast('Payment link sent', 'success');
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
}
```

---

## §10 · COPY: STAFF chip on customer

**Lightspeed pattern:**
Customers can have a "type" — Staff, Wholesale, Friends & Family, etc. — that affects discount and shows as a chip next to their name throughout the app.

ChainLine should have this. Customer types live in Settings → Customers section. Each type has a default discount %. The chip renders next to the customer's name in:
- WO detail header
- Customer combobox suggestions
- Sales register customer card
- Receipt printout (so the discount is explained)

```css
.customer-chip {
  display: inline-flex; align-items: center;
  height: 18px; padding: 0 6px;
  margin-left: 8px;
  font-family: var(--mono); font-size: 9px;
  letter-spacing: 0.12em; text-transform: uppercase;
  background: var(--bg3); color: var(--text2);
  border: 1px solid var(--line3);
}
.customer-chip-staff       { color: var(--amber-fg);  border-color: var(--amber-line); }
.customer-chip-wholesale   { color: var(--blue-fg);   border-color: var(--blue-line); }
.customer-chip-friends     { color: var(--violet-fg); border-color: var(--violet-line); }
```

---

## §11 · COPY: "Save Parts" + "Warranty" toggles on workorder

**Lightspeed pattern:**
Two checkboxes near the top of the WO: `Save Parts` (mechanic keeps removed parts for the customer to take home — usually they don't) and `Warranty` (flags the WO as a warranty job, no labor charge, parts billed to vendor).

Build both:

```js
// In WorkOrderDetail, beneath the customer item field:
h('div', { style: { display: 'flex', gap: 16, marginTop: 8 } },
  h(Toggle, { on: warranty, onChange: setWarranty, label: 'Warranty', sub: 'Bills vendor, not customer' }),
  h(Toggle, { on: saveParts, onChange: setSaveParts, label: 'Save parts', sub: 'Bag removed parts for customer' })
),
```

The Warranty toggle, when on, should:
1. Zero the labor lines (show original price struck through).
2. Add a tag "WARRANTY-{VENDOR}" so it can be batched for vendor warranty submission later.
3. Skip the customer charge step at checkout; instead, mark "pending vendor reimbursement".

---

## §12 · SKIP: Tile-hub landing pages

**Lightspeed pattern:**
Click "Sales" → see 6 big icon-tile buttons (Continue Sale / Special Order / Layaway / Refund / Workorder / New Sale). Click "Inventory" → 15 tiles in 3 sections. Click "Customers" → 7 tiles. Click "Service" → 4 tiles. Click "Settings" → 25+ tiles in 5 sections.

**Don't copy this.** Two-click navigation to do anything is slow. ChainLine's direct sidebar (Sales → instant register, Inventory → instant list) is already faster. **Keep it that way.**

The one exception worth borrowing: **show ALT+ keyboard shortcuts visibly in the UI**. Lightspeed prints `ALT+S`, `ALT+O` etc. on top of the tiles. ChainLine has ⌘K shortcuts but doesn't show them next to actions. Surface them.

---

## §13 · SKIP: Decorative imagery

**Lightspeed dashboard** has a stock photo of houseplants in the corner, a watercolor tote bag illustration, and a watercolor heart illustration on the stat tiles.

**Don't.** ChainLine's spec is "precision instrument meets darkroom." No mascots, no plants, no whimsy. The dashboard is a workshop instrument panel. Keep it that way. The data IS the decoration.

---

## §14 · SKIP: Listbox multi-selects for status filtering

**Lightspeed's WO list** has two side-by-side scrollable `<select multiple>` listboxes labelled "Show Status" and "Hide Status". Hold ⌘ to multi-select. This is a 2003 UI pattern.

ChainLine's existing **sub-tabs with status counts** (`All / Open / In progress / Ready / Booked / Overdue`) are much better. Don't regress.

---

## §15 · SKIP: "Custom SKU" + "Custom field" everywhere

**Lightspeed item detail** has Custom SKU, Manufacturer SKU, EAN, UPC, System ID — 5 different ID fields. Power-user mess. Plus a Custom Fields section that's empty for 99% of shops.

**ChainLine should expose**: System ID (auto) · UPC (barcode) · Vendor SKU (per vendor). Hide EAN behind an "Advanced" disclosure. Don't add Custom Fields unless a customer asks.

---

## §16 · BEAT: Things ChainLine should have that Lightspeed DOESN'T

These are gaps in Lightspeed where ChainLine can leap ahead.

### 16a. Live shop floor view
A separate route `/floor` that's a read-only Kanban of all WOs by status, with mechanic columns. Big text, designed to be open on a tablet on the back wall. Lightspeed has no equivalent — they just have a WO list.

### 16b. Customer self-status link
When a WO is created, the customer gets an SMS with a link to a public page `chainline.ca/wo/{token}` that just says "Your Pivot Trail 429 is **In Progress**. Estimated ready: Friday." Updated live as status changes. Cuts down on "is it ready yet?" phone calls by ~80%.

### 16c. Photo attachment on WO
Mechanic takes a photo of the rusted BB or the worn cassette, uploads to the WO. Customer sees it on their status link. Justifies the labor cost without an argument. Lightspeed has "Add Images" on items but not on WOs.

### 16d. Auto-tag overdue WOs into a daily digest SMS to manager
Already in your notification settings. Build the actual cron in the worker.

### 16e. "Park sale" with bike attached
Park sale already in your spec. Lightspeed doesn't link parked sales to workorders. ChainLine should: when checking out a WO at the register, if the customer also wants to buy a tube, the tube goes into a "parked sale" linked to that WO. At final checkout both ring together.

### 16f. Mechanic time-tracking on the WO
Lightspeed has an "Add time" button and an Hours column but the UX is "type a number". ChainLine: tap a Start/Stop timer per WO when work begins. Time logged automatically. Shows on the floor view as live ticking timer. Helps Darrin see who's productive.

### 16g. Per-mechanic queue view
Sidebar item: "My queue" → just WOs assigned to me, sorted by priority + due date. Lightspeed has a global WO list and "filter by mechanic". Make `My queue` a first-class destination for the logged-in user.

### 16h. RA! workflow that BEATS theirs
Lightspeed has an "RA!" status (warranty return to vendor). It's just a status. ChainLine should make RA! a real flow:
1. Mechanic flags WO as warranty + selects vendor.
2. App generates an RMA PDF with WO photos, customer letter, and the part list.
3. Once mechanic gets the RMA number from the vendor, attach it to the WO.
4. When the replacement part arrives, status auto-flips to "SO Parts Arrived" + notifies mechanic.
This isn't UI work — it's a process. Build it as a workflow component.

---

## §17 · Implementation order

If Claude Code has 4 hours overnight, do them in this order:

1. **§1 Service preset bar** (1.5h) — the killer feature. Drop `pos-workorder-presets.js`, wire it into WO detail.
2. **§2 Hook In / Hook Out** (15 min) — trivially short, massive shop-floor payoff.
3. **§3 Receipt Note + Internal Note split** (15 min) — one-line schema change + two textareas.
4. **§5 Add custom statuses** (10 min) — extend `DEFAULT_SETTINGS`, add violet badge class.
5. **§11 Save Parts + Warranty toggles** (20 min) — two toggles, light state plumbing.
6. **§7 Cash denom buttons in CashModal** (15 min) — port from EOD.
7. **§9 Print Tag + Request Payment buttons** (45 min) — Print Tag is `pos-print.js` work, Request Payment is a worker endpoint stub.

Skip §4 (Customer Items tab) for tonight — it's bigger; do it tomorrow.
Skip §16 entirely tonight — those are next-week features.

Push, deploy, write outcome into `STATUS.md` so the user finds it on wake.
