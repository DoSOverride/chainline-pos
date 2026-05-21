# ChainLine POS — Full Design Audit (Desktop + Mobile)

**Reviewed:** main @ 3247cb8 · 2026-05-20
**Live:** https://chainline-pos.pages.dev
**Scope:** all 3 stylesheets (pos-styles.css 58k, pos-styles-v2.css 20k, pos-styles-v3.css 21k) + index.html loader + key JS modules.

> Round 2 found a v1/v2 design-system split. Round 3 added a third layer (v3) that tries to fix the split with `!important` overrides. That stack of three CSS files is the dominant problem in the codebase right now. Fix it and most of the smaller polish items resolve themselves. This audit numbers the critical fixes (C1–C9), then desktop polish (D1–D10), then mobile (M1–M14), then architecture (A1–A6).
>
> A single drop-in file (`pos-styles-unify.css`) ships next to this audit and resolves C1–C8 with a copy-paste. Apply it first, then work through the rest.

---

## TL;DR

Things that look right today:
- Color system, type system, mono numbers, hairline borders, status badges (visually correct in v3 layer)
- Sidebar with red left-accent active state ✅
- Floor kanban, My Queue, WO preset bar, customer status page — all shipped clean
- Hook In/Out columns, expanded WO statuses, RA workflow — all in
- Mobile bottom nav, modal-becomes-fullscreen-sheet, sticky CTA on New WO — thoughtful

Things that don't:
- **Three layered stylesheets fighting each other.** Modals still ship with `border-radius: 10px` and 24px-blur box-shadows; toasts still have 8px radius + heavy shadow + circle emoji-glyph icons; command palette is 12px-radius with backdrop-blur(4px). The v3 file leans on `!important` to fix one symptom (badge colors) but doesn't touch the radii or shadows. The brand voice ("Vercel meets a darkroom") gets diluted every time a modal opens.
- **Avatar component is two different shapes simultaneously** — circle `.pos-avatar` from v2, square `.av-init` from v1. Both appear in the app depending on which screen.
- **Status badge colors are forked.** v1 uses `#2f9e5b/#4d8fd6/#d29a3a`. v2 uses `#4ade80/#60a5fa/#fbbf24`. v3 uses tertiary tones. Settings stores a fourth set in `customStatuses[].color`. The same "Ready" status renders as four different greens depending on context.
- **Mobile hit-targets inconsistent.** Cash denoms 56px (✅), pay buttons 64px (✅), but the trash icon is still 26px, the WO line "delete" is still 26px, the badge close × is 22px.
- **Bottom nav at 768px overflow-scrolls horizontally** because 9+ nav items don't fit. Items past index 4 are hidden until you swipe — bad on mobile where discoverability matters.

---

## CRITICAL (fix first)

### C1. Modals + toasts + command palette violate the radius rule

**Where:** `pos-styles-v2.css` lines 102, 139, 178, 243, 331, 561, 826, 902 — also `.pos-skeleton-card`, `.pos-stat-card`, `.pos-kbd` (lines 530, 703, 715)

**Severity:** highest. Anything that overlays the page (modal, toast, palette, help overlay, mobile modal-becomes-sheet) reads as a different product than the page underneath.

**Fix:** strip every `border-radius > 0` and every `box-shadow` from those rules. The unification stylesheet does this in one block. Specifically:

| Selector | Today | Fix |
|---|---|---|
| `.pos-modal` | radius 10, shadow 24×64 | radius 0, no shadow |
| `.pos-modal-x` | radius 4 | radius 0 |
| `.pos-toast` | radius 8, shadow 8×24 | radius 0, no shadow |
| `.pos-toast-icon` | radius 50% (emoji circle) | radius 0, swap emoji for SVG or drop |
| `.pos-toast-close` | radius 3 | radius 0 |
| `.pos-btn` (v2 button) | radius 6 | radius 0 (already 0 in v1) |
| `.pos-command-palette` | radius 12, shadow 32×80 | radius 0, no shadow |
| `.pos-cp-input` | inherited radius 12 | radius 0 |
| `.pos-cp-item` | radius 7 | radius 0 |
| `.pos-shortcut-help` | radius 12, shadow 24×60 | radius 0, no shadow |
| `.pos-skeleton-*` | radius 4 | radius 0 |
| `.pos-skeleton-avatar` | radius 50% | radius 0 |
| `.pos-skeleton-card` | radius 8 | radius 0 |
| `.pos-stat-card` | radius 8 | radius 0 |
| `.pos-kbd` | radius 4, bottom 2px shadow line | radius 0, no shadow |
| Modal mobile sheet | radius 14 14 0 0 | radius 0 |

Also drop `backdrop-filter: blur(N)` from `.pos-modal-backdrop`, `.pos-command-palette-backdrop`, `.pos-shortcut-help-overlay`. Backdrop blur is a v2 design language that doesn't match the "darkroom instrument" spec. Use solid `rgba(0,0,0,0.5)` overlays.

### C2. Avatar is rendered as two different shapes

**Where:** `.pos-avatar { border-radius: 50% }` (v2) vs `.av-init { border-radius: 0 }` (v1)

**Fix:** Set `.pos-avatar { border-radius: 0 }` and remove `text-shadow: 0 1px 2px rgba(0,0,0,0.4)`. Migrate `.pos-avatar` to share the `.av-init` tone palette (`.av-am`, `.av-jk`, etc.). Then audit `pos-design.js Avatar()` for any direct usage and unify with the v1 markup.

### C3. Toast/badge/status uses a SECONDARY color palette

**Where:** `pos-styles-v2.css` lines 443–488 (`.pos-status-READY` etc), 257–287 (`.pos-toast-success` etc.)

Today:
- `.badge.ready` (v1) = `#2f9e5b` on `rgba(47,158,91,0.12)`
- `.pos-status-READY` (v2) = `#4ade80` on `rgba(22,163,74,0.15)`
- `.pos-toast-success` (v2) = `#4ade80` on `#0d2318`

These render side-by-side in the UI (table badge + toast confirmation, for example). Three greens, none of them matching.

**Fix:** map every `pos-status-*` and `pos-toast-*` color to the v1 tokens:
```css
.pos-status-READY    { color: var(--green-fg); background: var(--green-bg); border-color: var(--green-line); }
.pos-status-Open     { color: var(--amber-fg); background: var(--amber-bg); border-color: var(--amber-line); }  /* v3 already remaps open→amber */
.pos-status-BOOKED   { color: var(--violet-fg); background: var(--violet-bg); border-color: var(--violet-line); }
.pos-status-Overdue  { color: var(--red-fg); background: var(--red-bg); border-color: rgba(214,70,58,0.32); }
.pos-status-WAITING  { color: var(--violet-fg); background: var(--violet-bg); border-color: var(--violet-line); }
.pos-status-Finished { color: var(--green-fg); background: var(--green-bg); border-color: var(--green-line); opacity: 0.65; }
.pos-toast-success   { color: var(--green-fg); background: var(--green-bg); border-color: var(--green-line); }
.pos-toast-error     { color: var(--red-fg);   background: var(--red-bg);   border-color: rgba(214,70,58,0.32); }
.pos-toast-info      { color: var(--blue-fg);  background: var(--blue-bg);  border-color: var(--blue-line); }
```

Then **fix the data model**: in `DEFAULT_SETTINGS.customStatuses`, the `color` field stores arbitrary hex (`#d29a3a`, `#a78bfa`, etc.). Settings UI shows that color swatch. But the actual badge renders the token-based color. **One of those is wrong.**

Recommend: replace `color: '#d29a3a'` with `kind: 'amber'` (a token name, not a hex), then derive both the badge class and the settings preview swatch from the same kind. That way Settings cannot drift from the badge.

### C4. v3 badge overrides use `!important` instead of fixing v2

**Where:** `pos-styles-v3.css` lines 38–67

```css
.badge.booked, .badge-booked {
  color: var(--violet-fg) !important;
  background: var(--violet-bg) !important;
  border-color: var(--violet-line) !important;
}
```

The reason `!important` is needed is that v1's `.badge.booked` already set amber. v3 wants violet. **The right fix isn't `!important`** — it's to delete the conflicting rule in v1 and replace once. With the unification stylesheet, v1 stops asserting these colors and v3 (or the merged file) is the single source of truth.

### C5. Selector `div[style*="1.5fr 1fr"]` is brittle

**Where:** `pos-styles-v3.css` lines ~565–571

```css
@media (max-width: 768px) {
  div[style*="1.5fr 1fr"] { grid-template-columns: 1fr !important; }
  div[style*="1fr 360px"] { grid-template-columns: 1fr !important; }
}
```

This relies on React serializing inline styles with no space after the colon. The moment somebody refactors the SalesScreen JSX to use a CSS module or even adds an extra space, mobile breaks silently. It's also extremely broad — any other `div` with `grid-template-columns: 1.5fr 1fr` gets clobbered.

**Fix:** give those grids real className handles.
```js
// pos-app.js SalesScreen — replace inline style
- <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:16 }}>
+ <div className="sales-2col">

// pos-app.js NewWorkOrderScreen — same
- <div className="grid-2" style={{ gridTemplateColumns:'1fr 360px' }}>
+ <div className="new-wo-2col">
```

```css
.sales-2col { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: flex-start; }
.new-wo-2col { display: grid; grid-template-columns: 1fr 360px; gap: 16px; align-items: flex-start; }

@media (max-width: 768px) {
  .sales-2col, .new-wo-2col { grid-template-columns: 1fr; }
}
```

### C6. Mobile modal universal selector clobbers more than intended

**Where:** `pos-styles.css` ~lines 1798–1810

```css
@media (max-width: 768px) {
  div[style*="position:fixed"][style*="inset:0"] > div,
  div[style*="position: fixed"][style*="inset: 0"] > div {
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100dvh !important;
    /* etc. */
  }
}
```

Two problems:
1. Same attribute-selector fragility as C5.
2. The rule will catch **anything** matching the inline-style pattern — including nested popovers, tooltips, etc. If anything else uses `position:fixed; inset:0`, it gets forced to full screen.

**Fix:** use a real class — `.modal-overlay`, `.pos-modal-backdrop`, `.panel-overlay`. They all already exist; the rule should just target those:
```css
@media (max-width: 768px) {
  .modal-overlay > .modal-box,
  .pos-modal-backdrop > .pos-modal,
  .panel-overlay > .slide-panel { /* same rules */ }
}
```

### C7. Focus ring stays bright accent red

**Where:** `pos-styles-v2.css` line ~58

```css
*:focus-visible { outline: 2px solid #c8392c; outline-offset: 2px; }
```

Tabbing through any form gives every element a hot 2px red box, on top of inputs already turning red-bordered on focus. The accent is meant to be **scarce**.

**Fix:**
```css
*:focus-visible { outline: 1px solid var(--line3); outline-offset: 1px; }
.input:focus-visible, .select:focus-visible, .textarea:focus-visible,
input:focus-visible, select:focus-visible, textarea:focus-visible { outline: none; }
.btn:focus-visible, .pay-btn:focus-visible, .nav-item:focus-visible { outline-color: var(--accent); }
```
Buttons and nav items get the accent ring (they need to be unmissable); inputs handle focus through their own border.

### C8. Sidebar active state uses both red-tinted background AND red border

**Where:** `pos-styles.css` ~line 175

```css
.nav-item.active {
  color: var(--text);
  border-left-color: var(--accent);
  padding-left: 14px;
  background: rgba(200,57,44,0.06);  /* ← this */
}
```

The 2px red border is the spec'd active indicator. The 6% red wash competes with it and reads slightly murky on small screens. Recommend hover-bg (`var(--bg2)`) for active too, so the border carries the signal cleanly.

```css
.nav-item.active { background: var(--bg2); }  /* drop the red tint */
```

### C9. No `prefers-reduced-motion` support

The `pulse` animation on `.dot-live` runs forever; `.pos-toast-enter`, `.pos-modal-backdrop` animations fire on every overlay. iOS Low Power Mode users + folks with vestibular sensitivity have no escape.

**Fix:** at the end of the unification stylesheet:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
  }
}
```

---

## DESKTOP (D1–D10)

### D1. WO list table is too wide once Hook column lands

The shipped table has columns: WO · Customer · Bike · Service · Hook · Status · Due · Mech · ⋯. On a 1280px laptop with sidebar (220px) + status strip + topbar, that's ~1040px usable. With sticky padding and the new Hook column, Bike and Service start truncating with no ellipsis. Cells just overflow into the next column.

**Fix:**
- Set `.tbl td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }` as default.
- Allow `.tbl td.wrap` opt-in where wrapping is OK (notes preview).
- For Bike + Service, prefer wrapping the **service** (it's usually short anyway). Set Service column to `min-width: 140px; white-space: normal`.

### D2. Floor kanban density is poor at 1280–1440px

At 1280px wide with 7 columns and the 220px sidebar, each kanban column is ~140px wide. Cards inside become near-illegible.

**Fix options:**
- (a) Collapse "Booked" and "Estimate/Waiting" into a single "Inbox" column.
- (b) Default-hide low-volume columns ("RA!", "Consignment") behind an expander when empty or count = 0.
- (c) At <1500px, render the board as 4 columns of grouped statuses: Inbox / Active / Awaiting Parts / Done. Click a card to see substatus.

I'd go with (c) — it matches the §5 lifecycle grouping I suggested in the benchmark. Subgroups appear as small badges within each card.

### D3. Status strip is information-dense but unreadable

Three pulsing green dots in a row, three tiny labels, version stamp, sync time. At a glance it's just a band of nervous green. Users tune it out — which is fine for "everything's fine" but means an actual problem hides too.

**Fix:**
- Only show dots that aren't green. When everything is good, show a single neutral `● ALL SYSTEMS` once and put the rest under hover/tap.
- Use color: green dot when ok, amber when degraded, red when down, grey when unknown. Currently they're all green pulsing forever (because they're CSS animations, not state-driven).
- Drive each dot from real state (`apiHealth`, `terminalStatus`, `printerStatus`).

### D4. Sub-tab underline uses `--text` not `--accent`

**Where:** `pos-styles.css` ~line 832 `.sub-tab.active { border-bottom-color: var(--text); }`

I recommended `--accent` in Round 2; it's still `--text`. The customer detail tabs (`.detail-top-tab`) do use accent — good. The WO list tabs don't.

**Fix:** unify to `--accent` everywhere.

### D5. Page title is 22px next to 30px stat values

Round 2 recommendation was 26px. Still 22px. Page titles get visually demoted under the stat grid. Bump to 26px.

### D6. Drawer/topbar empty zone

When sidebar is 220px and content is ~1060px, the topbar has 4 elements: crumbs (left), search 280px, station chip ~150px, dots 30px. That leaves ~400px of dead space between crumbs and search. Either widen the search to 480px or anchor station to crumbs side and search center.

### D7. Tables — hover indicator causes 1px layout shift

**Where:** `pos-styles.css` ~line 750

```css
.tbl tbody tr:hover td:first-child { border-left: 2px solid var(--accent); padding-left: 10px; }
```

Borders are box-model real → the cell shifts 2px right on hover (the `padding-left: 10px` compensates from base 12px but creates a 1px discrepancy on subsequent rows). Replace with `box-shadow: inset 2px 0 0 var(--accent)` which is layout-free.

### D8. Customer detail Sales/Items/Workorders counts may be stale

If the `t.count` is fetched once at mount, the badge says "Sales · 12" forever even when a new sale closes mid-session. Make the count subscribe to a global store (or window event like `pos-cust-items-changed` you already dispatch in `pos-customer-items.js`).

### D9. Preset bar — category buttons read identical

The 3 accent categories ("Services", "Mountain Bike", "Road Bike") are all `--accent` rectangles. Hard to scan in peripheral vision. Tint each subtly:

```css
.wo-preset-cat-services  { /* leave as primary red — most common */ }
.wo-preset-cat-mountain  { background: rgba(167, 139, 250, 0.08); color: var(--violet-fg); border-color: var(--violet-line); }
.wo-preset-cat-road      { background: rgba(77, 198, 198, 0.08); color: var(--teal-fg);   border-color: var(--teal-line); }
```

Mountain-bike-heavy days (most of them at ChainLine) get a visual landmark.

### D10. Settings dropdown of 11 status colors mixes hex-coded swatches with token-driven badges

The Settings → Services tab has a color picker per status (`<input type="color">`). The status renders via class `.badge.booked` which now ignores the stored hex. **The color picker does nothing.**

**Fix:** either
- (a) make Settings only let users pick a `kind` token from a fixed palette (`amber / blue / violet / teal / red / green / muted`), or
- (b) actually wire the stored hex into a CSS custom property and render `.badge[data-color]` with `color: var(--badge-color)`.

(a) is the right move — the brand voice is curated, not free-form.

---

## MOBILE (M1–M14)

### M1. Bottom nav overflows on phones

You ship 9 nav items (Dashboard, My Queue, Floor, Work Orders, Sales, Customers, Inventory, Tools group: Bookings, POs, Reports, Settings). At 768px the rule converts sidebar → 56px-tall horizontal scroller. On a 360px phone width, only about 5 items fit; the rest are hidden behind a horizontal swipe with no scroll indicator.

**Fix:**
- Pin top 5 most-used: Sales · WO · My Queue · Floor · More
- "More" opens a bottom sheet listing the rest
- Or replicate iOS Health: 4 fixed + tappable "···" overflow that shows the rest as a grid

### M2. Top nav bar nearly empty on mobile

Topbar hides search + station chip → only crumbs + dots remain. Lots of dead space. Surface the **global search icon** there so ⌘K is still reachable (tap → opens command palette as a full-screen sheet, which already works because of C6's modal mobile rule).

```js
// pos-app.js Topbar mobile
<button className="btn ghost mobile-only" onClick={openSearch} aria-label="Search">
  <Ico.Search size={18} />
</button>
```

### M3. iOS home-indicator bar overlaps bottom nav

The bottom nav is at `bottom: 0` without `padding-bottom: env(safe-area-inset-bottom)`. On notched iPhones the last 34px of the nav sits behind the home indicator handle.

**Fix:**
```css
@media (max-width: 768px) {
  #sidebar, .sidebar {
    padding-bottom: env(safe-area-inset-bottom);
    height: calc(56px + env(safe-area-inset-bottom));
  }
  #main, .main {
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
  }
}
```

### M4. Sticky New WO footer covers bottom nav

**Where:** `pos-styles-v3.css` `.new-wo-mobile-foot { bottom: 72px; bottom: max(72px, env(safe-area-inset-bottom) + 72px); }`

Almost right, but `72px` was a hand-calc for 56px nav + 16px buffer. With M3 (safe-area on the nav itself), the offset becomes overcounted. Replace with:
```css
.new-wo-mobile-foot {
  bottom: calc(56px + env(safe-area-inset-bottom));
}
```

### M5. Some hit targets still <44px

| Element | Today | Target | Fix |
|---|---|---|---|
| `.icon-btn` (trash on cart line) | 26×26 | 44×44 | wrap in 44px padded button |
| `.line-row .icon-btn` (delete) | 26×26 | 44×44 | same |
| `.pos-modal-x` close | ~30×30 | 44×44 | already set in mobile media — verify |
| `.pos-toast-close` × | ~22×22 | 36×36 | bigger on mobile |
| `.qty-stepper button` | mobile: 36×36 | 44×44 | bump to 44 |
| `.options-item` rows | 32px | 44px | mobile media query |
| `.pin-key` | 44×44 | ✅ | fine |
| `.cash-denom-btn` mobile | 56×56 | ✅ | fine |

### M6. Floor cards on mobile have `touch-action: none` initially

**Where:** `pos-styles-v3.css` `.floor-card { touch-action: none; }`

Then later in the mobile media query:
```css
.floor-card { touch-action: manipulation; }
```

The base `touch-action: none` is for desktop HTML5 drag-and-drop. But on touch devices, `touch-action: none` would prevent vertical scrolling within the column. The override fixes it, but the better pattern is `touch-action: pan-y` from the start — preserves vertical scroll, still allows drag horizontally with longpress.

```css
.floor-card { touch-action: pan-y; }
```

### M7. Floor board mobile: 84vw snap columns hide overview

The mobile-floor rule sets `grid-template-columns: repeat(6, 84vw); scroll-snap-type: x mandatory`. This is good for legibility but you can only see one column at a time. No way to see the whole board overview.

**Fix:** add a column indicator strip above the board on mobile — 7 dots showing which column you're on, tappable to jump.

```js
// in pos-shopfloor.js, add above the board on mobile:
<div className="floor-column-dots" hidden={!isMobile}>
  {COLUMNS.map((c, i) => (
    <button key={c.id} className={`floor-dot ${activeColIdx === i ? 'active' : ''}`}
      onClick={() => scrollToCol(i)}>{c.label[0]}</button>
  ))}
</div>
```

### M8. PIN login layout on small phones

Login screen renders `.staff-grid` as flex-wrap with `.staff-btn { min-width: 90px }`. With 9 staff at 90px each = 810px → on a 360px phone they wrap to 4 rows. Then the 200px PIN grid below. Total height ≈ 600px before the PIN keypad starts. iPhones with small viewports can only see staff buttons, have to scroll to PIN.

**Fix:** on mobile, switch staff grid to a 3-column CSS grid with smaller buttons:
```css
@media (max-width: 480px) {
  .staff-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    width: 100%; max-width: 320px;
    margin: 0 auto 20px;
    gap: 8px;
  }
  .staff-btn { min-width: 0; padding: 10px 8px; }
  .staff-avatar { width: 28px; height: 28px; font-size: 11px; }
  .staff-role { display: none; }  /* PIN reveals it anyway */
}
```

### M9. Mobile WO detail has 24-status dropdown that hides important options below the fold

A 24-option `<select>` opens a native picker that on iOS spans the bottom 200px of the screen. Some statuses (RA, BOOKED, the named-mechanic statuses) are most-used; surface them as quick chips above the select:

```js
// WO detail mobile
<div className="status-quick-row mobile-only">
  {['Open','InProgress','Ready','BOOKED','RA!'].map(s =>
    <button onClick={() => setStatus(s)} className={`pill ${status===s?'active':''}`}>{s}</button>
  )}
</div>
<select className="select" value={status} onChange={...}>
  {/* full 24 */}
</select>
```

### M10. Cart line row collapses at narrow widths

Sales register cart row uses grid `1fr 70px 90px 90px 30px`. At 360px viewport (mobile) the right 3 columns are 70+90+90+30 = 280px → leaves 80px for item name. Long SKUs and names truncate harshly.

**Fix on mobile only:** stack the row as 2 lines:
```
[Name                                              ]
[ SKU              ] [qty-stepper] [price] [trash]
```

```css
@media (max-width: 480px) {
  .line-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .line-row .line-detail-row {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 8px;
    align-items: center;
  }
}
```

### M11. Date/time pickers on mobile

`<input type="date">` and `<input type="time">` use OS-native pickers — which is fine, but the styled `.input` underneath has `min-height: 48px` from `.form-input` mobile rule but `padding: 8px 10px` from base. The padding stays from base, so visual height is ~36px not 48px. Make sure padding goes up too.

### M12. Inventory list rows aren't touchable

`.item-row` on mobile gets `min-height: 56px` ✅. But the row itself uses `display: grid` with `gap: 12px` between columns and the columns are sized for desktop (`1fr 80px 80px`). On a 360px phone, image (if present) + name takes the 1fr column → SKU + price get truncated. Stack like in M10.

### M13. Receipt note + Internal note side-by-side on mobile

The two-up grid layout (`gridTemplateColumns: '1fr 1fr', gap: 14`) doesn't collapse to single-column on mobile because it's inline-styled (same C5 problem). Add a class.

### M14. Customer detail mobile — top tabs scroll, but counts overflow

`.detail-top-tab` with `.detail-top-tab-count` chip works fine for small numbers. When count > 99 (Sales for a long-time customer), the chip overflows the tab. Set `max-width: 28px; text-overflow: ellipsis` on count, or display "99+".

---

## ARCHITECTURE (A1–A6)

### A1. Consolidate 3 stylesheets → 1

Today: `pos-styles.css` (58k) + `pos-styles-v2.css` (20k) + `pos-styles-v3.css` (21k) = 99k of CSS in 3 separate HTTP roundtrips (one is via @import which is even worse). Each redeclares root tokens. Cascade conflicts are the rule, not the exception.

**Migration plan:**
1. Drop in `pos-styles-unify.css` (shipped with this audit) — it overrides the broken v2 rules first.
2. Once visual parity confirmed, merge v3 + the unify file into v1 in a single commit.
3. Delete v2 (toast/modal/palette JS in `pos-design.js` keeps working — we only changed the CSS).
4. Update `index.html` to load just `pos-styles.css?v=10`.

### A2. JS modules import via `window.*` globals — fragile load order

Every module ends with `window.X = X`. Modules read `window.Y` from other modules. Load order in index.html is hand-maintained. One missed `defer` ordering means a screen renders without its component (you'd see `case 'floor': return h(window.ShopFloorScreen || PlaceholderScreen ...)` which silently falls back).

**Fix:** convert to ES modules (`<script type="module">`) so the import graph is real. Cloudflare Pages serves them fine. Modern browsers handle it. Service worker just caches them.

Optional: bundle with esbuild on push (CF Pages has Functions or you can preprocess in CI).

### A3. `MOCK_WO` / `MOCK_CATALOG` still in the bundle

Module-level constants like `MOCK_WO = [...]` are shipped to every client even in production. ~14kb minified. Move them to a `mocks.js` file that's only loaded when `?demo=1` query param is set, or behind a feature flag.

### A4. Worker URL is hard-coded in 6 places

`const WORKER = 'https://still-term-f1ec.taocaruso77.workers.dev'` appears at the top of `pos-app.js`, then `pos-payments.js`, `pos-customers.js`, etc. all do their own `fetch(WORKER + ...)`. When you move to `pos.chainline.ca` as the API host, that's 6 grep-and-replaces.

**Fix:** single `window.POS_API = location.hostname === 'chainline-pos.pages.dev' ? 'https://still-term-...workers.dev' : 'https://api.chainline.ca'` at the top of `pos-app.js`, then every module reads `window.POS_API`. Better: same-origin via CF Pages `_headers` rewrite so the API is just `/api/*`.

### A5. Service worker caches scripts at fixed `?v=` query strings

`sw.js` (1676 bytes from the tree) probably caches based on URL. Every cache-buster bump (`pos-app.js?v=21` → `v=22`) invalidates the cache. Good. But the cache only updates when the SW itself updates — which happens via the registration in index.html. If a user has the app open for hours without refreshing, they may keep running an old version even after you push.

**Fix:** add a `Refresh available` toast that appears when the SW detects a waiting worker, with a Refresh button that calls `skipWaiting()` and reloads.

### A6. No CSS naming convention

You have `.btn` and `.pos-btn`, `.modal-box` and `.pos-modal`, `.avatar` and `.pos-avatar`, `.tbl` and `.data-table`, `.badge` and `.pos-badge`. The `pos-` prefix on the v2 set was supposed to namespace them but ended up as a parallel system.

**Fix going forward:** all new classes use `.pos-` prefix. Old non-prefixed classes are aliased and slated for deletion. A single audit pass replaces `<div className="btn">` with `<div className="pos-btn">` everywhere, then the non-prefixed rules get deleted.

---

## QUICK WINS

Three things you can do tonight (in order of leverage):

1. **Drop in `pos-styles-unify.css`** (next to this file). Add `<link rel="stylesheet" href="/pos-styles-unify.css?v=1">` to `index.html` **after** `pos-styles-v3.css`. Resolves C1, C2, C3, C7, C8, C9 in one swoop.

2. **C5/C6 className fixes** — 4 small edits in `pos-app.js` (replace inline grid styles with classes) and 2 selector fixes in `pos-styles.css` and `pos-styles-v3.css`.

3. **M1 mobile bottom nav** — replace overflow-scroll with 4 fixed + "More" sheet. ~30 min in the Sidebar component.

After those three, the app reads as a single design system across every screen and overlay. Everything else in this audit is polish.

---

## What I did NOT review

- Print stylesheets (you've got them, didn't deep-dive — the v2 `@media print` block looks reasonable)
- JS code quality, performance, accessibility ARIA
- Color contrast on light theme (light theme exists but v3 tokens don't have light variants → likely contrast failures)
- Animations on prefers-reduced-motion (covered by C9)
- Public `wo-status.html` page — looks clean from my last review, may want to verify on real customers

If you want a follow-up specifically on **light theme** parity (which I suspect is broken because v3 tokens never got light overrides), that's the next logical audit pass.
