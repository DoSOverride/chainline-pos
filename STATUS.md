# ChainLine POS — Build Complete

**Live:** https://chainline-pos.pages.dev
**GitHub:** https://github.com/DoSOverride/chainline-pos
**Built:** 2026-05-20 overnight (36 commits)

## Login — All staff PIN: 1139
Darrin=Owner | Tao/Matt=Manager | Phil/Steve/Beckett/Curren/Danny=Mechanic | Jason=Warranty

## Screens

- **Dashboard**: stats (open WOs, overdue, today's revenue, bookings), service queue, quick actions, activity feed, End of Day
- **Work Orders**: full CRUD, status tabs (All/Open/In Progress/Ready/Booked/Overdue), search + filters, tasks, SMS, print WO, priority flag, mechanic assign
- **New Work Order**: customer search with "Create new" row, bike on file, mechanic chip single-select, service type, due date, priority, SMS opt-in
- **Sales Register**: barcode scanner, cart with qty stepper, GST 5% + PST 7% independent, Stripe-ready (mock until key set), keyboard shortcuts (/ = item search, F1/F2/F3 = payment methods)
- **Inventory**: 7766 items, click-through detail panel, scan button, low-stock badges (amber/red dots), R2 images
- **Customers**: CRM, bikes on file, purchase history, SMS templates, notes, New WO/Sale shortcuts
- **Reports**: SVG charts, date range filter (Today/Week/Month/Custom), CSV export, by-mechanic, EOD cash reconciliation
- **Purchase Orders**: 14 vendors (HLC/LTP/OSS/OGC + all brands), vendor filter pills, receive items modal, auto-status on full receive
- **Settings**: theme toggle, terminal config, printer config, staff management placeholder

## Design
- Matches design handoff: dark=#0f0f0f, accent=#c8392c, Manrope UI + JetBrains Mono numbers
- 0px radius everywhere except badge pills (999px)
- Sidebar: 2px left accent border on active (not background fill)
- Status strip at bottom: sync indicator, terminal status, printer status, version
- Breadcrumbs in topbar, ⌘K search, station/drawer status

## Technical
- 13 JS modules, 223+ Playwright tests (13 spec files)
- 40+ worker API endpoints (still-term-f1ec.taocaruso77.workers.dev)
- 7766 LS items in virtual scroll
- 105 vendors in vendor directory
- Virtual scroll, LRU cache, offline queue, mobile bottom nav
- GST/PST computed independently off subtotal

## Actions Needed
1. LS token expired — regenerate at lightspeedhq.com → Settings → API
   then: `npx wrangler secret put LS_REFRESH_TOKEN --name still-term-f1ec`
2. Stripe (optional): `npx wrangler secret put STRIPE_SECRET_KEY --name still-term-f1ec`
3. Custom domain: CF Pages → chainline-pos → Custom domains → `pos.chainline.ca`

## Cost
Lightspeed ~$900/mo vs this system free/mo + 2.7%/tap (Stripe)
