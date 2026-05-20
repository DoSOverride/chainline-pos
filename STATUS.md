# ChainLine POS — Overnight Build Complete

**Live:** https://chainline-pos.pages.dev
**GitHub:** https://github.com/DoSOverride/chainline-pos
**Built:** 2026-05-20 overnight (31 commits)

## Login — All staff PIN: 1139
Darrin=Owner | Tao/Matt=Manager | Phil/Steve/Beckett/Curren/Danny=Mechanic | Jason=Warranty

## Screens Built
- Dashboard: stats, service queue, quick actions, End of Day
- Work Orders: full CRUD, status tabs, search, tasks, SMS, print WO
- Sales: barcode scanner, cart, GST+PST, Stripe-ready (mock until key set)
- Inventory: 7766 items, click-through, options menu, R2 images
- Customers: CRM, bikes on file, purchase history, SMS templates, notes
- Reports: SVG charts, EOD cash reconciliation, by-mechanic, CSV export
- Purchase Orders: 14 vendors (HLC/LTP/OSS/OGC + all brands), receive items
- Settings: placeholder (completing)

## Technical
- 17 JS modules, 223 Playwright tests (13 spec files)
- 40+ worker API endpoints
- 7766 LS items synced to R2
- 105 vendors in vendor directory
- Virtual scroll, LRU cache, offline queue, mobile bottom nav

## Actions Needed
1. LS token expired — regenerate at lightspeedhq.com -> Settings -> API
   then: npx wrangler secret put LS_REFRESH_TOKEN --name still-term-f1ec
2. Stripe (optional): npx wrangler secret put STRIPE_SECRET_KEY --name still-term-f1ec
3. Custom domain: CF Pages -> chainline-pos -> Custom domains -> pos.chainline.ca

## Cost: Lightspeed -900/mo vs this system /mo + 2.7%/tap
