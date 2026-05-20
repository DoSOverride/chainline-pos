# ChainLine POS · Round 3 — Lightspeed benchmark + leap-ahead bundle

**Status:** ✅ Pickup ready · see `HANDOFF_READY.txt`

The user said: *"make it and beat it"* → *"do them all"* → *"do leap-ahead too go crazy"*.

This package implements **everything** from the Lightspeed benchmark — the COPY/ADAPT items that bring you to parity, plus the BEAT items (§16) that put you ahead.

## Files

| File | Purpose |
|---|---|
| `LIGHTSPEED_BENCHMARK.md` | 17-item competitive audit. Read first. |
| `MEGA_PATCH.md` | **The integration guide.** Every in-place code edit, numbered. |
| `HANDOFF_READY.txt` | Signal file for Claude Code (timing, order, scope) |
| `pos-styles-v3.css` | All new design tokens (violet badge, customer chips, hook input, RA callout, floor kanban, photos, timer, parked tray, etc.) |
| `pos-workorder-presets.js` | **The killer feature.** Categorized service preset button bar with keyboard shortcuts + low-stock dots + per-mechanic personalization. |
| `pos-shopfloor.js` | Live kanban view of all WOs by status, auto-refreshes every 30s. Designed for a wall-mounted tablet. |
| `pos-myqueue.js` | Per-mechanic queue — only your WOs, sorted by priority + due date. |
| `pos-wo-extras.js` | Bundle: `WoTimer` (live start/stop), `WoPhotos` (drag-drop gallery), `WoRaCallout` (warranty workflow with RMA PDF generator), `CustomerTypeChip` (STAFF/WHOLESALE etc). |
| `pos-customer-items.js` | Customer Items tab — serialized bike tracking with auto-link from sales. |
| `wo-status.html` | **Public customer-facing page.** SMSed to the customer with a token; shows bike status, mechanic notes, photos, ETA. Self-contained, drops at repo root. |

## What's in scope vs what isn't

**Built in this round:**
- All 11 COPY/ADAPT items from §1–11 of the benchmark
- All 7 implementable BEAT items from §16 (a, b, c, e, f, g, h)
- One §16d (daily overdue SMS digest) requires a Cloudflare Worker cron — stubbed in MEGA_PATCH §20

**Deliberately SKIPPED (per §12–15 of the benchmark):**
- Tile-hub landing pages (Lightspeed has them; they're slow)
- Mascot/plant imagery (off-brand for ChainLine)
- Listbox multi-selects (use existing sub-tabs)
- Custom-SKU field clutter (hidden behind "Advanced")

## Quick start

```
1. Open MEGA_PATCH.md
2. Section §1: drop the 7 new files into the repo, add 5 <script> tags + 1 <link>
3. Section §2-§3: 5-minute sidebar + routing edits
4. Sections §4-§19: surgical edits to existing source files, in order
5. Section §20: worker endpoint stubs (or defer)
6. Section §21: acceptance checklist
7. git push → CF Pages auto-deploys → append URL to repo's STATUS.md
```

Everything works in isolation — modules degrade gracefully if MEGA_PATCH isn't applied yet. You can ship in pieces.
