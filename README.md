# ChainLine POS

Internal point-of-sale and service management system for ChainLine Cycle, Kelowna BC.

## Access
- Production: https://pos.chainline.ca
- Dev: https://chainline-pos.pages.dev

## Staff PINs (change in production)
- Jason: 1234
- Florian: 5678  
- Darrin: 9999 (Manager)

## Tech
- Vanilla JS + React 18 CDN (no build step)
- Cloudflare Pages
- CF Worker backend: still-term-f1ec.taocaruso77.workers.dev
- Lightspeed R-Series via Worker API

## Screens
- Dashboard - open WOs, overdue, today's revenue
- Work Orders - full CRUD, status management
- Sales/Register - POS with tax (GST+PST), item search
- Customers - lookup, history, create
- Inventory - search, quick edit
- Reports - revenue, top items, mechanic performance
- Purchase Orders - view, create

## Deploy
Push to main -> CF Pages auto-deploys.
