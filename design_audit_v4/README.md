# Round 4 — Design audit + unification stylesheet

**Status:** Pickup ready
**Goal:** Resolve the v1/v2/v3 cascade conflict + mobile polish

## Files

| File | Purpose |
|---|---|
| `AUDIT.md` | Full audit — 9 critical, 10 desktop, 14 mobile, 6 architecture findings, each with code-level fix |
| `pos-styles-unify.css` | Drop-in patch stylesheet (24 numbered blocks) — resolves C1–C9 + adds light-theme + reduced-motion + safe-area handling + mobile cart/inventory/login layout |

## How to apply

1. Drop `pos-styles-unify.css` into the repo root next to `pos-styles-v3.css`.
2. In `index.html`, add this line **after** the v3 stylesheet:
   ```html
   <link rel="stylesheet" href="/pos-styles-unify.css?v=1">
   ```
3. Bump the `?v=` cache-buster on each iteration.

That alone resolves the headline finding (rounded modals, secondary palettes, circle avatars, accent focus ring, sidebar wash, light-theme broken for v3 tokens, hit targets, mobile layout, etc.).

## What still needs JS edits

Three things in the audit need touching JS in `pos-app.js` — listed in AUDIT.md "Quick Wins" section:

1. **C5** — replace inline grid styles with `className="sales-2col"` / `"new-wo-2col"`
2. **C6** — modal mobile rule already covered by class-based selector in unify.css; verify markup still uses `.modal-overlay`, `.pos-modal-backdrop`, `.panel-overlay`
3. **M1** — Sidebar bottom-nav: pin 5 items + "More" sheet for the rest
4. **M2** — Topbar: add mobile search button
5. **M9** — WO detail mobile: status quick chips above the 24-status select

All are small (10–30 min each).

## Order to ship

1. Drop stylesheet → push → verify on chainline-pos.pages.dev (5 min)
2. C5/C6 className fixes → push → verify mobile (15 min)
3. M1 + M2 nav/topbar fixes → push (30 min)
4. M9, M11, M14 polish → push (45 min)

Total: ~90 minutes for a major coherence improvement.

## Next audits available

After this lands, the natural next passes are:
- **Light theme parity** — v3 tokens have light overrides now via unify, but every screen needs a walkthrough at `data-theme="light"`
- **Print stylesheets** — receipt, tag, RMA letter, WO printout — currently rely on browser defaults
- **A11y pass** — keyboard nav, ARIA roles on modals, focus traps, screen-reader labels on icon buttons
- **Performance** — 21 JS modules unminified, ~700kb to first paint
