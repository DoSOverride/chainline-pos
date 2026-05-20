# ChainLine POS — Build Status

**Last updated:** 2026-05-20 ~02:00
**GitHub:** https://github.com/DoSOverride/chainline-pos

## ⚠️ Action Required When You Wake Up

**Connect CF Pages** (2 min):
1. Cloudflare dashboard → Pages → Create a project → Connect to Git
2. Select `DoSOverride/chainline-pos` → branch: `main`
3. No build command needed (static files)
4. Save and deploy → live at `chainline-pos.pages.dev`
5. Optional: Add custom domain `pos.chainline.ca`

---

## ✅ What's Built

### Core Screens (all functional, real LS data)
- **Dashboard** — stat cards (open WOs, overdue, today's revenue, bookings), quick actions, service queue, activity feed
- **Work Orders** — sortable/filterable table, status badges, slide panel detail, new WO form with customer search + mechanic chips
- **Sales/Register** — item search (barcode-scanner compatible), cart with qty controls, GST 5% + PST 7% (BC), Card/Cash/Other payments
- **Customers** — search by name/email/phone, customer detail with WO history
- **Inventory** — search 7766 items, dept filter, stock badges
- **Reports** — revenue charts, top items, mechanic performance, CSV export
- **Purchase Orders** — view list + detail, new PO form

### Payment System (Stripe)
- `RequestPaymentModal` — send SMS/email payment link → QR code → polls for completion
- `CardPaymentModal` — Stripe Terminal reader flow (mock until hardware configured)
- `CashModal` — tendered/change calculation with quick amounts
- `TipModal` — 15/18/20/custom % tip selection
- `RefundModal` — partial or full refund with line item selection
- All degrade gracefully without Stripe key → mock mode with warning banner

**To activate Stripe:**
1. Add `STRIPE_SECRET_KEY` to CF Worker secrets: `npx wrangler secret put STRIPE_SECRET_KEY`
2. Replace `pk_test_placeholder` in `pos-payments.js` with your Stripe publishable key
3. Order hardware: WisePOS E ($249) for tap/chip/tip display, M2 ($59) portable backup

### Performance
- Virtual scroll for 7766-item inventory (only renders visible rows)
- LRU search cache (100 entries, 5min TTL, localStorage persistence)
- Prefetch on idle: top 5 search terms + page 1 items
- Debounce/throttle utilities

### Design
- Pixel-faithful to Claude Design handoff spec
- Fonts: Manrope (UI) + JetBrains Mono (all numbers/codes)
- Dark default, light mode toggle in sidebar
- Zero rounded corners except status badge pills
- Brand red `#c8392c` used only as accent (never decorative)

### Infrastructure
- 25 worker endpoints (all POS operations via CF Worker)
- 47 Playwright tests covering all screens + offline mode
- Service worker for offline shell caching
- PWA manifest (installable on tablets)

---

## 💰 Cost Analysis (from benchmark research)

| System | Monthly cost |
|---|---|
| Lightspeed + own payments | ~$500-580/mo |
| Lightspeed + third-party (new 2025 fee) | ~$900+/mo |
| Shopify POS Pro | ~$200/mo |
| **ChainLine custom + Stripe Terminal** | **~$20/mo infra + 2.7%+$0.05/tap** |

**Break-even**: at ~150 transactions/mo, custom system costs ~$20 fixed vs $500 Lightspeed. **Savings: $4,000-6,000/yr.**

Full benchmark at: `docs/pos-benchmark.md`

---

## 📋 Acceptance Checklist (from design spec §11)

- [x] All four screens implemented
- [x] Sidebar navigation works, Work Orders stays highlighted on New WO
- [x] Status badges with correct colors
- [x] JetBrains Mono on all numbers/codes
- [x] Brand red only as accent
- [x] No rounded corners except badge pills
- [x] GST 5% + PST 7% computed independently
- [x] Cart search clears on item add
- [x] Mechanic chips as required-single-select
- [x] Customer combobox "Create new" row
- [x] Keyboard shortcuts (⌘K, ⌘N, N, ⌘↵, /, F1-F3)
- [x] Empty states render

---

## 🔜 Next (V3 — not built yet)

Per benchmark, these are P0 for feature parity with Lightspeed:
1. Stripe Terminal hardware pairing (WisePOS E SDK)
2. Customer-facing display (show total + tip prompt on terminal)
3. Cash drawer open trigger via receipt printer
4. Barcode label printing (Zebra ZPL)
5. End of day cash reconciliation report
6. Loyalty points (10pts per $1, 100pts = $10 off)
7. Customer-facing booking/deposit flow (online → POS notification)
