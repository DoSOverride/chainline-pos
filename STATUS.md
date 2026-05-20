# ChainLine POS — Wakeup 3 Complete

**Live:** https://chainline-pos.pages.dev
**GitHub:** https://github.com/DoSOverride/chainline-pos
**Built:** 2026-05-20 | ~60 commits across 3 wakeup sessions
**Worker:** still-term-f1ec.taocaruso77.workers.dev

## Login — All staff PIN: 1139
Darrin=Owner | Tao/Matt=Manager | Phil/Steve/Beckett/Curren/Danny=Mechanic | Jason=Warranty

## Screens

- **Dashboard**: live API stats (open WOs, overdue, today's revenue, bookings), service queue, quick actions, activity feed, End of Day
- **Work Orders**: full CRUD, status tabs (All/Open/In Progress/Ready/Booked/Overdue), search + filters, tasks, SMS, print WO, priority flag, mechanic assign, live WO count in sidebar
- **New Work Order**: customer search with "Create new" row, bike on file, mechanic chip single-select, service type, due date, priority, SMS opt-in. Pre-fills from Customers screen. Demo values cleared.
- **Sales Register**: barcode scanner (API lookup with MOCK_CATALOG fallback), cart with qty stepper, GST 5% + PST 7% independent, PST-exempt for labour/services (BC PSTA s.37), Cash modal + Card payment modal wired, sale counter increments per sale, hardcoded customer name cleared. Keyboard shortcuts: / = item search, F1/F2/F3 = payment methods.
- **Inventory**: 7766 items, lazy-loads on search (≥2 chars or dept filter), click-through detail panel, scan button, low-stock badges (amber/red dots), R2 images
- **Customers**: CRM, bikes on file, purchase history, SMS templates, notes, New WO/Sale shortcuts. Live API search with LS response mapping. Customer pre-fill navigates to New WO/Sale.
- **Reports**: SVG charts, date range filter (Today/Week/Month/Custom), CSV export, by-mechanic, EOD cash reconciliation
- **Purchase Orders**: 14 vendors (HLC/LTP/OSS/OGC + all brands), vendor filter pills, receive items modal, auto-status on full receive
- **Bookings**: placeholder screen (future build)
- **Settings**: theme toggle, terminal config, printer config, staff management placeholder

## Design
- Matches design handoff: dark=#0f0f0f, accent=#c8392c, Manrope UI + JetBrains Mono numbers
- 0px radius everywhere except badge pills (999px)
- Sidebar: 2px left accent border on active (not background fill)
- Status strip at bottom: sync indicator, terminal status, printer status, version
- Breadcrumbs in topbar, ⌘K search, station/drawer status
- Offline banner below topbar when worker unreachable

## PWA
- Service worker caches all 13 modules
- manifest.json: standalone display, maskable icons, orientation any
- Icons: icon-192, icon-512, favicon.ico, apple-touch-icon

## Technical
- 13 JS modules, all with `defer` (parallel download, ~3x faster first load)
- 223+ Playwright tests (13 spec files)
- 40+ worker API endpoints
- 7766 LS items in virtual scroll (lazy-loads on filter/search)
- 105 vendors in vendor directory
- Virtual scroll, LRU cache, offline queue, mobile bottom nav
- Sales item search: live API + MOCK_CATALOG fallback, debounced 200ms
- Barcode scanner: checks live API if not in MOCK_CATALOG
- GST/PST computed independently off subtotal; PST-exempt on LAB lines
- Postal code: V1Y1Z5 (corrected in pos-print.js)

## Bug Fixes (Wakeup 3)
- ReceiptModal was called but never defined — crash on sale complete. Now defined.
- New WO form: cleared demo pre-fill (Hannah Riise, Santa Cruz Bronson, etc.)
- SalesScreen: cleared hardcoded 'Devon Tran' customer name
- Postal code V1Y1Z4 → V1Y1Z5 in pos-print.js

## Actions Needed
1. **LS token** — regenerate at lightspeedhq.com → Settings → API, then:
   `npx wrangler secret put LS_REFRESH_TOKEN --name still-term-f1ec`

3. **Stripe** (optional): `npx wrangler secret put STRIPE_SECRET_KEY --name still-term-f1ec`
4. **Custom domain**: CF Pages → chainline-pos → Custom domains → `pos.chainline.ca`

## Cost
Lightspeed ~$900/mo vs this system free/mo + 2.7%/tap (Stripe)
