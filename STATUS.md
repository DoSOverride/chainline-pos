# ChainLine POS — Round 3 Complete

**Live:** https://chainline-pos.pages.dev (pos-app.js?v=21)
**GitHub:** https://github.com/DoSOverride/chainline-pos
**Built:** 2026-05-20 | 4 wakeup rounds, ~80 commits
**Worker:** still-term-f1ec.taocaruso77.workers.dev
**LS:** Live OAuth — 7766 items, 5 categories, 100+ customers. WorkOrders backed by CF KV (LS Workbench add-on not enabled).

## Login — All staff PIN: 1139
Darrin=Owner | Tao/Matt=Manager | Phil/Steve/Beckett/Curren/Danny=Mechanic | Jason=Warranty

## Screens

- **Dashboard**: live `/api/pos-stats` (open WOs, overdue, today's revenue), service queue, quick actions, activity feed, End of Day
- **My Queue** (new): per-mechanic filtered WO list sorted by priority + due date
- **Floor** (new): live kanban view of all WOs by status, auto-refreshes 30s — wall-mount-tablet friendly
- **Work Orders**: KV-backed CRUD, 6 status tabs, search + filters, Hook column (rack code like "FLOR 27"), live count in sidebar
- **WO Detail** (LS-matching layout): Print Tag · Print Quote · Send As Email · Request Payment · Checkout · Duplicate · Delete · ⋯
  - 24-status dropdown (PHIL, STEVE, MATT, DARRIN, TAO, BECKETT, JASON, WARRANTY, RA!, BOOKED, !!! ASSESS & ORDER PARTS !!!, etc.)
  - Description/Color/Size/Serial fields
  - Employee + Assign all checkbox
  - Date In/Due/Hook In/Hook Out (rack codes)
  - Receipt Note + Internal Note (separate)
  - Warranty + Save Parts toggles (warranty zeros labor in totals)
  - Service preset bar (categorized buttons with low-stock dots + keyboard shortcuts)
  - WoTimer (live start/stop per WO)
  - WoPhotos (drag-drop gallery, R2-backed)
  - WoRaCallout (RA! warranty workflow + RMA PDF)
  - Customer block with STAFF/Customer chip + Edit/Remove + Send Status Link (SMS)
  - Quick add lines: + New / Misc. / Labor / Services / Mountain Bike / Road Bike
  - Totals: Labor / Parts / Fees / Tax / Total
  - 3-dot ⋯ menu: Add Tag, Add Time, Add Discount, Add Fee, Reserve, Convert to Quote/Sale, Audit Log, Archive
- **Sales Register**: barcode scanner (LS API), GST/PST independent + PST-exempt for labour, **LineEditModal** (price/discount/qty/UPC/cost/margin), CashModal w/ denomination buttons (100/50/20/10/5/2/1/¢ + Exact/Round+5/Round+10), Card payment modal, parked sales tray + WO link, keyboard shortcuts (/ F1 F2 F3)
- **Inventory**: 7766 LS items, lazy-load on search ≥2 chars, full-screen detail view with UPC/cost/supplier/per-location stock, scan button, low-stock badges
- **Customers** (LS-matching layout):
  - Top tabs with live counts: Details · Items (n) · Sales (n) · Workorders (n) · Account · Merge
  - Two-column form: First/Last/Title/Company/Birth/Seat Height, Home/Work/Mobile/Pager/Fax, Country/Address/City/Province/Postal, Email1/Email2/Website/Custom, Tags
  - Right sidebar: Contact consent + Email/Mail/Call prefs
  - Items tab: serialized customer items (bikes on file with auto-link from sales) via CustomerItemsTab
  - Save Changes / Checkout (green) / Archive (red) / prev/next navigation
  - STAFF/Customer chip everywhere
- **Reports**: SVG charts, date range (Today/Week/Month/Custom), CSV export (revenue summary + top items + mechanic breakdown), by-mechanic, EOD
- **Purchase Orders**: 14 vendors (HLC/LTP/OSS/OGC + brands), live API, **vendor sheet sidebar** in PO detail (account #, phone, email, location, API status, notes), vendor filter pills, receive items modal
- **Settings**: theme toggle, terminal/printer config, **Custom Statuses editor**, **Customer Types editor** (retail/staff/wholesale/friends/vip with discount %), staff management with PIN reset, receipt header/footer, tax toggles
- **wo-status.html** (public): customer-facing WO status page, accessed via signed token from SMS

## Worker API (50+ endpoints)
- **Inventory/Items**: `/api/items-search` (LS), `/api/items-popular`, `/api/pos-item-image-index`
- **Customers**: `/api/customers?q=` (LS), `/api/customer/:id` (LS), `POST /api/customers`
- **Work Orders (KV)**: `GET/POST /api/workorders`, `GET/PUT /api/workorder/:id`, `POST /api/workorder/:id/status`, `POST /api/workorder/:id/notes`
- **Round 3 endpoints**: `/api/wo/:id/time` (timer), `/api/wo/:id/photo` (R2), `/api/wo/:id/photos`, `/api/wo-public-token/:woId`, `/api/wo-public/:token` (no auth), `/api/wo/:id/email` (Resend), `/api/wo/:id/sms-status-link`, `/api/sms` (Twilio stub), `/api/wo/queue?employee=`, `/api/parked-sale*`, `/api/request-payment` (Stripe stub)
- **POS**: `/api/pos-stats`, `/api/sale` (KV), `/api/pos-login` (PIN), `/api/pos-staff`
- **PO**: `/api/purchase-orders`, `/api/vendors`, `POST /api/purchase-order`
- **Reports**: `/api/reports?from=&to=`
- **Bikes/Site**: `/api/bikes`, `/api/parts`, `/api/part/:sku`, all the public chainline.ca endpoints

## Design
- Dark #0f0f0f bg, accent #c8392c, Manrope + JetBrains Mono
- 0px radius (badge pills + chips only)
- Sidebar: 2px left accent border active
- All scripts `defer` — parallel download, ~3x faster first load
- 21 JS modules + 3 CSS files
- Status strip bottom (sync · terminal · printer · version)
- Offline banner below topbar; instant `navigator.onLine` detection

## PWA
- Service worker caches local files (CDN scripts pass through)
- manifest.json: standalone, maskable icons, orientation any

## Round 3 Highlights
- ✅ §1-§11 sidebar nav + WO detail full redesign
- ✅ §12 CashModal denomination buttons
- ✅ §13 expanded custom statuses (11 default colored badges)
- ✅ §14 Customer Types editor in Settings
- ✅ §15 STAFF chip in sidebar foot + customers list + customer detail + WO customer block
- ✅ §16 PO vendor sheet sidebar
- ✅ §17 Customer top tabs with live counts
- ✅ §18 CustomerItemsTab integration (serialized bike tracking)
- ✅ §19 Parked sales tray + WO link
- ✅ §20 Worker endpoints (13 new) — timer/photos/SMS/email/parked sales/public status
- ⏳ Daily overdue digest SMS cron — deferred, needs Twilio creds

## Actions Needed
1. **Twilio** (for SMS): `npx wrangler secret put TWILIO_SID --name still-term-f1ec` + `TWILIO_TOKEN` + `TWILIO_FROM`
2. **Stripe** (for real payments): `npx wrangler secret put STRIPE_SECRET_KEY --name still-term-f1ec`
3. **Custom domain**: CF Pages → chainline-pos → Custom domains → `pos.chainline.ca`

## Cost
Lightspeed ~$900/mo vs this system: $0/mo (CF Workers free tier + 2.7%/tap Stripe)
