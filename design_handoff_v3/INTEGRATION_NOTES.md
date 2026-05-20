# How to wire `pos-workorder-presets.js` into the app

Two small edits, ~5 minutes.

---

## 1. Load the script in `index.html`

Add this `<script>` tag **after** `pos-purchase-orders-v2.js` and **before** `pos-app.js`:

```html
<!-- 13b. Workorder service preset bar -->
<script defer src="/pos-workorder-presets.js?v=1"></script>
```

---

## 2. Mount the bar in `WorkOrderDetail`

Open `pos-app.js`, find `function WorkOrderDetail({ wo, onClose, fullPage, setScreen })` (around line 916).

Look for where the WO line items table is rendered (search for `wo-line-row` — it's the loop that renders each line). **Below** that loop, **above** the `wo-totals` block, add:

```js
// ── Service preset bar ─────────────────────────────────────────────
h(window.WorkOrderPresetBar || (function() { return null; }), {
  mechanic: { initials: wo.mech, tone: wo.tone },
  onAddLine: function(line) {
    setLines(function(prev) { return prev.concat([line]); });
  },
  onAddPart: function(part) {
    setLines(function(prev) { return prev.concat([part]); });
  }
}),
```

Replace `setLines` with whatever the actual setter in `WorkOrderDetail` is called — if it's not already lifted, you'll need to refactor the line state out of the `wo` prop into local state. Pattern:

```js
const [lines, setLines] = useState(wo.lines || []);

// Then where lines render, use `lines` instead of `wo.lines`
// And when saving, push `lines` back to `wo`.
```

---

## 3. (optional) Add preset editor to Settings → Services

In the Settings expansion patch I sent in Round 2, the `services` tab already manages custom statuses. Below the statuses, add a presets section. Skeleton:

```js
tab === 'services' && h('div', { style: { padding: 18 } },
  // ... existing statuses code ...

  h('div', { className: 'panel-section-head', style: { margin: '24px 0 8px' } }, 'Service Presets'),
  h('p', { style: { fontSize: 12, color: 'var(--text2)', marginBottom: 12 } },
    'Edit the preset buttons shown on the Work Order screen. Reorder, recolor, rename, change price, or attach parts. Changes apply immediately on next workorder open.'
  ),
  ['services', 'mountain', 'road'].map(function(catKey) {
    const catLabels = { services: 'Services', mountain: 'Mountain Bike', road: 'Road Bike' };
    const presets = (window.loadWoPresets ? window.loadWoPresets() : window.WO_DEFAULT_PRESETS)[catKey] || [];
    return h('div', { key: catKey, style: { marginBottom: 18 } },
      h('div', { className: 'panel-section-head', style: { fontSize: 11, marginBottom: 6 } }, catLabels[catKey]),
      presets.map(function(p) {
        return h('div', { key: p.id, className: 'aside-row', style: { gap: 8 } },
          h('span', { style: { width: 12, height: 12, background: 'var(--' + p.kind + '-fg, var(--text3))', display: 'inline-block', flexShrink: 0 } }),
          h('input', { className: 'input', defaultValue: p.label, style: { flex: 2, height: 26 },
            onBlur: function(e) {
              const next = (window.loadWoPresets ? window.loadWoPresets() : window.WO_DEFAULT_PRESETS);
              next[catKey] = next[catKey].map(function(x) { return x.id === p.id ? Object.assign({}, x, { label: e.target.value }) : x; });
              window.saveWoPresets && window.saveWoPresets(next);
            }
          }),
          h('input', { className: 'input mono', type: 'number', defaultValue: p.price, step: 0.5, style: { width: 80, height: 26 },
            onBlur: function(e) {
              const next = (window.loadWoPresets ? window.loadWoPresets() : window.WO_DEFAULT_PRESETS);
              next[catKey] = next[catKey].map(function(x) { return x.id === p.id ? Object.assign({}, x, { price: parseFloat(e.target.value) || 0 }) : x; });
              window.saveWoPresets && window.saveWoPresets(next);
            }
          }),
          h('input', { className: 'input mono', placeholder: 'hotkey', defaultValue: p.hotkey || '', maxLength: 2, style: { width: 60, height: 26 },
            onBlur: function(e) {
              const next = (window.loadWoPresets ? window.loadWoPresets() : window.WO_DEFAULT_PRESETS);
              next[catKey] = next[catKey].map(function(x) { return x.id === p.id ? Object.assign({}, x, { hotkey: e.target.value.toLowerCase() }) : x; });
              window.saveWoPresets && window.saveWoPresets(next);
            }
          })
        );
      }),
      h('button', { className: 'btn ghost', style: { marginTop: 6, fontSize: 11 },
        onClick: function() {
          const next = (window.loadWoPresets ? window.loadWoPresets() : window.WO_DEFAULT_PRESETS);
          next[catKey] = next[catKey].concat([{ id: catKey[0] + Date.now(), label: 'New preset', price: 0, kind: 'gray' }]);
          window.saveWoPresets && window.saveWoPresets(next);
          toast('Added — refresh to see changes', 'success');
        }
      }, '+ Add preset')
    );
  })
),
```

For tonight, **skip the editor** — defaults are good enough to ship. The user can edit JSON in localStorage directly if needed. Build the editor tomorrow.

---

## Acceptance test (do before pushing)

1. Open a WO detail (any WO).
2. Below the line items table you should see: search input + `+ New / Misc. / Labor` (gray) + `Services / Mountain Bike / Road Bike` (red).
3. Click `Services` → grid of ~18 colored preset buttons appears.
4. Click any preset (e.g. `Tune Up`) → toast says "Added: Tune Up", a labor line appears in the WO line items at $95.00.
5. Click `Brake Bleed` → toast "Added: Brake Bleed" + labor line at $45.00 + a brake fluid part line (because it has `parts`).
6. Type `tune` in the preset search → matching presets across all 3 categories.
7. Hit `M` then `T` then `U` on the keyboard (no input focused) → Mountain Bike's Tune Up auto-adds.
8. Refresh the page → bar still works (no persistent state required for v1).
