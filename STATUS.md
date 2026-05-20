# ChainLine POS — Build Status

**Preview:** https://chainline-pos.pages.dev
**Last deploy:** 2026-05-20

## Implemented

- Dashboard (4 stat cards, quick actions, service queue, activity feed)
- Work Orders list (filterable table, mechanic chips, status badges, search)
- New Work Order form (customer combobox, mechanic chips, keyboard shortcuts)
- Sales/Register (item search/barcode, cart, GST+PST, F1/F2/F3 payments)
- Staff PIN login (Jason/1234, Florian/5678, Darrin/9999)
- Keyboard shortcuts (cmd+K, cmd+N, N, cmd+Enter, /, F1-F3)
- Real Lightspeed data via CF Worker API (falls back to mock data offline)

## Acceptance Checklist (§11)

- [x] All four screens at fidelity
- [x] Sidebar navigation + breadcrumbs (Work Orders stays highlighted on New WO)
- [x] Status badges correct colors (ready=green, open=blue, booked=amber, inprogress=neutral)
- [x] JetBrains Mono on all numbers/codes/SKUs
- [x] Brand red only as accent (active nav, primary CTAs, overdue text, priority flag)
- [x] No rounded corners except status badge pills (radius 999px)
- [x] GST 5% + PST 7% compute independently from subtotal
- [x] Cart adds at qty 1, clears search, refocuses search input
- [x] Mechanic chip group acts as required-single-select
- [x] Customer combobox "Create new customer" affordance as last row
- [x] All keyboard shortcuts work
- [x] Empty states render (cart, work orders, search)
