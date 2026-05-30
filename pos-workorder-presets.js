/* ChainLine POS — Workorder service preset bar
 * Drop-in module. Loads BEFORE pos-app.js (or after, doesn't matter — uses window check).
 *
 * Exposes: window.WorkOrderPresetBar (React component)
 * Mount it inside WorkOrderDetail just below the line-items table.
 * It receives an `onAddLine(line)` callback that should append a line to the WO.
 *
 * Beats Lightspeed by:
 *   - Presets are user-editable (Settings → Services → Presets) — Lightspeed's are hardcoded
 *   - Each preset can bundle labor + multiple parts (Lightspeed: labor only)
 *   - Keyboard shortcut per preset (Tap T then T = Tune Up, B = Brake Bleed, etc.)
 *   - Low-stock dot when a bundled part is below threshold
 *   - Per-mechanic personalization (top-6 surfaced for active mechanic)
 *
 * Loaded as:
 *   <script defer src="/pos-workorder-presets.js?v=1"></script>
 */

(function() {
  'use strict';

  // ─── Default preset library ──────────────────────────────────────
  // 'kind' drives the button color via .preset-btn-{kind}.
  // 'parts' is optional: array of {sku, qty} that get appended along with the labor line.
  // 'hotkey' is the keystroke after the category letter (e.g. ['m','tu'] = Mountain Bike > Tune Up).
  const DEFAULT_PRESETS = {
    services: [
      { id: 's1',  label: 'Basic Tune Up',          price: 65.00,  kind: 'amber',    hotkey: 'bt' },
      { id: 's2',  label: 'Tune Up',                price: 95.00,  kind: 'amber',    hotkey: 'tu' },
      { id: 's3',  label: 'FS Tune Up',             price: 125.00, kind: 'amber',    hotkey: 'fs' },
      { id: 's4',  label: 'E-Bike Tune Up',         price: 145.00, kind: 'amber',    hotkey: 'et' },
      { id: 's5',  label: 'Brake Bleed',            price: 45.00,  kind: 'red',      hotkey: 'bb', parts: [{ sku: 'BRAKE-FLUID-DOT', qty: 1 }] },
      { id: 's6',  label: 'Flat Fix',               price: 18.00,  kind: 'red',      hotkey: 'ff' },
      { id: 's7',  label: 'Flat Fix · E-Bike Front',price: 28.00,  kind: 'red' },
      { id: 's8',  label: 'Flat Fix · Rear Hub E-Bike', price: 48.00, kind: 'red' },
      { id: 's9',  label: 'Flat Fix · Mid Drive E-Bike',price: 65.00, kind: 'red' },
      { id: 's10', label: 'Flat Fix · Rear Bolt/Cruiser/Belt', price: 38.00, kind: 'red' },
      { id: 's11', label: 'Wheel Rebuild',          price: 95.00,  kind: 'green',    hotkey: 'wr' },
      { id: 's12', label: 'Wheel True',             price: 25.00,  kind: 'green',    hotkey: 'wt' },
      { id: 's13', label: 'Cable Half Package',     price: 35.00,  kind: 'blue',     hotkey: 'ch' },
      { id: 's14', label: 'Cable Full Package',     price: 65.00,  kind: 'blue',     hotkey: 'cf' },
      { id: 's15', label: 'Internal Cable Half Package', price: 65.00,  kind: 'teal' },
      { id: 's16', label: 'Internal Cable Full Package', price: 125.00, kind: 'teal' },
      { id: 's17', label: 'Dropper Service',        price: 75.00,  kind: 'violet',   hotkey: 'ds' },
      { id: 's18', label: 'Shop Supplies',          price: 5.00,   kind: 'violet',   hotkey: 'ss' },
    ],
    mountain: [
      { id: 'm1',  label: 'Tune Up',                price: 95.00,  kind: 'amber',    hotkey: 'tu' },
      { id: 'm2',  label: 'FS Tune Up',             price: 125.00, kind: 'amber' },
      { id: 'm3',  label: 'E-Bike Tune Up',         price: 145.00, kind: 'amber' },
      { id: 'm4',  label: 'FS E-Bike Tune Up',      price: 175.00, kind: 'amber' },
      { id: 'm5',  label: 'Fork Seal Service',      price: 110.00, kind: 'red',      hotkey: 'fk' },
      { id: 'm6',  label: 'Brake Bleed',            price: 45.00,  kind: 'red' },
      { id: 'm7',  label: 'Shock Air Can Service',  price: 95.00,  kind: 'gray' },
      { id: 'm8',  label: 'Dropper Service',        price: 75.00,  kind: 'green' },
      { id: 'm9',  label: 'One CushCore Install',   price: 55.00,  kind: 'gray',     hotkey: 'cc' },
      { id: 'm10', label: 'Shimano Clutch Service', price: 35.00,  kind: 'gray' },
      { id: 'm11', label: 'Cable Half Package',     price: 35.00,  kind: 'blue' },
      { id: 'm12', label: 'Cable Full Package',     price: 65.00,  kind: 'blue' },
      { id: 'm13', label: 'Single Cable Package',   price: 22.00,  kind: 'teal' },
      { id: 'm14', label: 'Internal Cable Half Package', price: 65.00, kind: 'teal' },
      { id: 'm15', label: 'Internal Cable Full Package', price: 125.00, kind: 'teal' },
      { id: 'm16', label: 'Valve Core Presta',      price: 8.00,   kind: 'gray' },
      { id: 'm17', label: 'Wheel True',             price: 25.00,  kind: 'green' },
      { id: 'm18', label: "Stan's Sealant",         price: 18.00,  kind: 'violet',   hotkey: 'st', parts: [{ sku: 'STANS-2OZ', qty: 1 }] },
      { id: 'm19', label: 'Tubeless Install',       price: 35.00,  kind: 'amber',    hotkey: 'tl' },
      { id: 'm20', label: 'Ride Wrap Covered',      price: 295.00, kind: 'gray' },
      { id: 'm21', label: 'Ride Wrap Tailored',     price: 395.00, kind: 'gray' },
      { id: 'm22', label: 'Ride Wrap Fork',         price: 75.00,  kind: 'gray' },
      { id: 'm23', label: 'Ride Wrap Essential',    price: 195.00, kind: 'gray' },
      { id: 'm24', label: 'Shop Supplies',          price: 5.00,   kind: 'violet' },
    ],
    road: [
      { id: 'r1',  label: 'Basic Tune Up',          price: 65.00,  kind: 'amber' },
      { id: 'r2',  label: 'Tune Up',                price: 95.00,  kind: 'amber' },
      { id: 'r3',  label: 'Brake Bleed',            price: 45.00,  kind: 'red' },
      { id: 'r4',  label: 'Wheel True',             price: 25.00,  kind: 'gray' },
      { id: 'r5',  label: 'Cable Half Package',     price: 35.00,  kind: 'blue' },
      { id: 'r6',  label: 'Cable Full Package',     price: 65.00,  kind: 'blue' },
      { id: 'r7',  label: 'Internal Cable Half Package', price: 65.00, kind: 'teal' },
      { id: 'r8',  label: 'Internal Cable Full Package', price: 125.00, kind: 'teal' },
      { id: 'r9',  label: 'Bar Wrap',               price: 45.00,  kind: 'violet',   hotkey: 'bw' },
      { id: 'r10', label: 'Shop Supplies',          price: 5.00,   kind: 'violet' },
    ],
  };

  const CATEGORIES = [
    { id: 'services', label: 'Services',     accent: 'var(--accent)' },
    { id: 'mountain', label: 'Mountain Bike',accent: 'var(--accent)' },
    { id: 'road',     label: 'Road Bike',    accent: 'var(--accent)' },
  ];

  // Wait for React + the host app to be ready
  function init() {
    if (!window.React || !window.apiGet) return setTimeout(init, 50);

    const { createElement: h, useState, useEffect, useMemo, useCallback, Fragment } = React;

    // Load persisted preset library if user has edited it via Settings
    function loadPresets() {
      try {
        const stored = localStorage.getItem('pos-wo-presets');
        if (!stored) return DEFAULT_PRESETS;
        const parsed = JSON.parse(stored);
        // Light validation
        if (!parsed.services || !parsed.mountain || !parsed.road) return DEFAULT_PRESETS;
        return parsed;
      } catch { return DEFAULT_PRESETS; }
    }

    function savePresets(presets) {
      try { localStorage.setItem('pos-wo-presets', JSON.stringify(presets)); } catch {}
    }

    // ─── Preset button ─────────────────────────────────────────────
    function PresetButton({ preset, onClick, lowStock }) {
      return h('button', {
        className: 'preset-btn preset-btn-' + (preset.kind || 'gray'),
        onClick: function() { onClick(preset); },
        title: preset.hotkey ? 'Hotkey: ' + preset.hotkey.toUpperCase() : preset.label
      },
        h('span', { className: 'preset-btn-label' }, preset.label),
        h('span', { className: 'preset-btn-price' }, '$' + preset.price.toFixed(2)),
        lowStock ? h('span', { className: 'preset-btn-warn', title: 'A bundled part is low stock' }) : null,
        preset.hotkey ? h('span', { className: 'preset-btn-key' }, preset.hotkey.toUpperCase()) : null
      );
    }

    // ─── The bar itself ────────────────────────────────────────────
    function WorkOrderPresetBar(props) {
      const onAddLine = props.onAddLine || function() {};
      const onAddPart = props.onAddPart || onAddLine;
      const mechanic = props.mechanic;   // optional: { initials } — for personalization

      const [presets, setPresets] = useState(loadPresets);
      const [activeCat, setActiveCat] = useState(null);   // null = closed; or 'services'|'mountain'|'road'
      const [search, setSearch] = useState('');

      // Reload presets if Settings edits them while WO is open
      useEffect(function() {
        function refresh() { setPresets(loadPresets()); }
        window.addEventListener('storage', refresh);
        return function() { window.removeEventListener('storage', refresh); };
      }, []);

      // Low-stock check for bundled parts
      const lowStockMap = useMemo(function() {
        const map = {};
        const catalog = window.lsCatalog || window.MOCK_CATALOG || [];
        function check(preset) {
          if (!preset.parts || preset.parts.length === 0) return false;
          return preset.parts.some(function(p) {
            const sku = catalog.find(function(c) { return c.sku === p.sku; });
            return sku && (sku.low || (typeof sku.stock === 'number' && sku.stock < (p.qty || 1)));
          });
        }
        Object.keys(presets).forEach(function(cat) {
          presets[cat].forEach(function(preset) {
            if (check(preset)) map[preset.id] = true;
          });
        });
        return map;
      }, [presets]);

      // Apply a preset: add the labor line + any bundled parts
      const applyPreset = useCallback(function(preset) {
        const labor = {
          sku: 'LAB-' + preset.id.toUpperCase(),
          name: preset.label,
          qty: 1,
          price: preset.price,
          taxablePst: false,        // BC labour is PST-exempt
          isLabor: true,
          presetId: preset.id,
        };
        onAddLine(labor);

        if (preset.parts && preset.parts.length) {
          const catalog = window.lsCatalog || window.MOCK_CATALOG || [];
          preset.parts.forEach(function(p) {
            const item = catalog.find(function(c) { return c.sku === p.sku; });
            onAddPart({
              sku: p.sku,
              name: item ? item.name : p.sku,
              qty: p.qty || 1,
              price: item ? item.price : 0,
              taxablePst: item ? (item.taxablePst !== false) : true,
            });
          });
        }
        if (window.toast) window.toast('Added: ' + preset.label, 'success');
      }, [onAddLine, onAddPart]);

      // ─── Keyboard shortcuts ──────────────────────────────────────
      // Two-letter combo: first letter focuses category (S=services, M=mountain, R=road),
      // second letter triggers the preset's hotkey within that category.
      useEffect(function() {
        let buffer = '';
        let timer = null;

        function reset() { buffer = ''; if (timer) { clearTimeout(timer); timer = null; } }

        function handle(e) {
          // Ignore if user is typing in an input/textarea
          const tag = (document.activeElement && document.activeElement.tagName) || '';
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
          // Ignore with modifiers
          if (e.ctrlKey || e.metaKey || e.altKey) return;

          const k = e.key.toLowerCase();
          if (!/^[a-z]$/.test(k)) { reset(); return; }

          buffer += k;
          if (timer) clearTimeout(timer);
          timer = setTimeout(reset, 900);

          // Map first letter to category
          const catLetter = buffer[0];
          const catKey = catLetter === 's' ? 'services'
                       : catLetter === 'm' ? 'mountain'
                       : catLetter === 'r' ? 'road'
                       : null;
          if (!catKey) { reset(); return; }

          if (buffer.length === 1) {
            setActiveCat(catKey);
            return;
          }

          // Look up the preset by 2-letter hotkey within the category
          const hk = buffer.slice(1);
          const match = presets[catKey].find(function(p) { return p.hotkey === hk; });
          if (match) {
            e.preventDefault();
            applyPreset(match);
            reset();
          } else if (buffer.length >= 3) {
            reset();
          }
        }

        window.addEventListener('keydown', handle);
        return function() { window.removeEventListener('keydown', handle); };
      }, [presets, applyPreset]);

      // Filtered list when search has a value (search across ALL categories)
      const allPresets = useMemo(function() {
        return [].concat(presets.services, presets.mountain, presets.road);
      }, [presets]);
      const searchResults = search.trim()
        ? allPresets.filter(function(p) { return p.label.toLowerCase().indexOf(search.toLowerCase()) !== -1; })
        : [];

      // Personalized top-6 for the assigned mechanic (stored per mechanic in localStorage)
      const topForMech = useMemo(function() {
        if (!mechanic || !mechanic.initials) return [];
        try {
          const stored = JSON.parse(localStorage.getItem('pos-wo-preset-counts-' + mechanic.initials) || '{}');
          const ranked = Object.keys(stored).sort(function(a, b) { return stored[b] - stored[a]; }).slice(0, 6);
          return ranked.map(function(id) { return allPresets.find(function(p) { return p.id === id; }); }).filter(Boolean);
        } catch { return []; }
      }, [mechanic, allPresets]);

      // Track usage when a preset is applied (for personalization)
      function applyAndTrack(preset) {
        applyPreset(preset);
        if (mechanic && mechanic.initials) {
          try {
            const key = 'pos-wo-preset-counts-' + mechanic.initials;
            const stored = JSON.parse(localStorage.getItem(key) || '{}');
            stored[preset.id] = (stored[preset.id] || 0) + 1;
            localStorage.setItem(key, JSON.stringify(stored));
          } catch {}
        }
      }

      return h('div', { className: 'wo-preset-bar' },
        // Top row: search + category tabs
        h('div', { className: 'wo-preset-top' },
          h('div', { className: 'wo-preset-search' },
            h('input', {
              className: 'input',
              placeholder: 'Search items, services, presets...',
              value: search,
              onChange: function(e) { setSearch(e.target.value); }
            })
          ),
          h('button', { className: 'wo-preset-cat wo-preset-cat-neutral', title: 'Add custom item' }, '+ New'),
          h('button', { className: 'wo-preset-cat wo-preset-cat-neutral', title: 'Misc charge' }, 'Misc.'),
          h('button', { className: 'wo-preset-cat wo-preset-cat-neutral', title: 'Plain labor line' }, 'Labor'),
          CATEGORIES.map(function(cat) {
            return h('button', {
              key: cat.id,
              className: 'wo-preset-cat wo-preset-cat-accent' + (activeCat === cat.id ? ' is-active' : ''),
              onClick: function() { setActiveCat(activeCat === cat.id ? null : cat.id); }
            },
              cat.label,
              h('span', { className: 'wo-preset-cat-key' }, cat.id[0].toUpperCase())
            );
          })
        ),

        // Mechanic's top-6 (always visible if mechanic assigned + we have usage data)
        topForMech.length > 0 && !activeCat && !search && h('div', { className: 'wo-preset-personal' },
          h('div', { className: 'wo-preset-section-head' },
            'Your top presets · ', mechanic.initials
          ),
          h('div', { className: 'wo-preset-grid' },
            topForMech.map(function(p) {
              return h(PresetButton, { key: p.id, preset: p, onClick: applyAndTrack, lowStock: lowStockMap[p.id] });
            })
          )
        ),

        // Search results (when typing)
        search && searchResults.length > 0 && h('div', { className: 'wo-preset-panel' },
          h('div', { className: 'wo-preset-panel-head' },
            'Matching "', h('span', { className: 'mono' }, search), '"',
            h('span', { className: 'wo-preset-count' }, searchResults.length)
          ),
          h('div', { className: 'wo-preset-grid' },
            searchResults.map(function(p) {
              return h(PresetButton, { key: p.id, preset: p, onClick: applyAndTrack, lowStock: lowStockMap[p.id] });
            })
          )
        ),

        // Expanded category panel
        activeCat && !search && h('div', { className: 'wo-preset-panel' },
          h('div', { className: 'wo-preset-panel-head' },
            CATEGORIES.find(function(c) { return c.id === activeCat; }).label,
            h('span', { className: 'wo-preset-count' }, presets[activeCat].length),
            h('button', {
              className: 'wo-preset-close',
              onClick: function() { setActiveCat(null); },
              title: 'Close'
            }, '\xd7')
          ),
          h('div', { className: 'wo-preset-grid' },
            presets[activeCat].map(function(p) {
              return h(PresetButton, { key: p.id, preset: p, onClick: applyAndTrack, lowStock: lowStockMap[p.id] });
            })
          )
        ),

        // Footer hint
        !activeCat && !search && topForMech.length === 0 && h('div', { className: 'wo-preset-hint' },
          'Tap a category or type ',
          h('span', { className: 'kbd' }, 'S'),
          ' / ',
          h('span', { className: 'kbd' }, 'M'),
          ' / ',
          h('span', { className: 'kbd' }, 'R'),
          ' to open Services / Mountain Bike / Road Bike presets'
        )
      );
    }

    // ─── Inject styles (match v1 design system: 0 radius, hairlines) ─────
    const STYLE_ID = 'pos-wo-presets-styles';
    if (!document.getElementById(STYLE_ID)) {
      const css = `
        .wo-preset-bar {
          margin-top: 14px;
          border: 1px solid var(--line2);
          background: var(--bg);
        }

        .wo-preset-top {
          display: flex; align-items: center; gap: 6px;
          padding: 8px;
          border-bottom: 1px solid var(--line2);
          background: var(--bg2);
          flex-wrap: wrap;
        }
        .wo-preset-search {
          flex: 1; min-width: 200px;
          display: flex; align-items: center;
          background: var(--bg);
          border: 1px solid var(--line2);
        }
        .wo-preset-search .input {
          background: transparent; border: 0; height: 30px;
          font-size: 13px; padding: 0 10px;
        }

        .wo-preset-cat {
          height: 30px;
          padding: 0 14px;
          font-family: var(--ui); font-size: 12px; font-weight: 600;
          letter-spacing: 0.02em;
          background: var(--bg3);
          border: 1px solid var(--line2);
          color: var(--text);
          cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          transition: background 80ms, border-color 80ms;
        }
        .wo-preset-cat:hover { background: var(--bg2); border-color: var(--line3); }
        .wo-preset-cat.is-active {
          background: var(--accent-glow);
          border-color: var(--accent);
        }
        .wo-preset-cat-accent {
          background: rgba(200, 57, 44, 0.08);
          border-color: rgba(200, 57, 44, 0.32);
          color: var(--accent);
        }
        .wo-preset-cat-accent:hover {
          background: rgba(200, 57, 44, 0.12);
          border-color: var(--accent);
          color: var(--text);
        }
        .wo-preset-cat-accent.is-active {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
        .wo-preset-cat-key {
          font-family: var(--mono); font-size: 9px;
          letter-spacing: 0.08em;
          padding: 1px 5px;
          border: 1px solid currentColor;
          opacity: 0.6;
        }
        .wo-preset-cat-neutral { color: var(--text2); }

        .wo-preset-panel, .wo-preset-personal {
          padding: 10px 10px 12px;
          border-top: 1px solid var(--line);
        }
        .wo-preset-personal {
          background: rgba(255,255,255,0.015);
        }

        .wo-preset-panel-head, .wo-preset-section-head {
          display: flex; align-items: center; gap: 8px;
          padding: 4px 4px 10px;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text2);
        }
        .wo-preset-panel-head .mono { color: var(--text); }
        .wo-preset-count {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--text3);
          background: var(--bg2);
          padding: 1px 6px;
          border: 1px solid var(--line2);
        }
        .wo-preset-close {
          margin-left: auto;
          width: 22px; height: 22px;
          background: transparent;
          border: 1px solid var(--line2);
          color: var(--text2);
          font-family: var(--mono);
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
        }
        .wo-preset-close:hover { color: var(--text); border-color: var(--text3); }

        .wo-preset-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 6px;
        }

        .preset-btn {
          position: relative;
          padding: 10px 12px 8px;
          background: var(--bg2);
          border: 1px solid var(--line2);
          border-left-width: 2px;
          color: var(--text);
          font-family: var(--ui);
          text-align: left;
          cursor: pointer;
          transition: background 80ms, border-color 80ms, transform 60ms;
          display: flex; flex-direction: column;
          min-height: 56px;
        }
        .preset-btn:hover {
          background: var(--bg3);
          border-color: var(--line3);
        }
        .preset-btn:active { transform: translateY(1px); }

        .preset-btn-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text);
          line-height: 1.25;
          margin-bottom: 4px;
          overflow-wrap: break-word;
          padding-right: 18px;  /* room for hotkey badge */
        }
        .preset-btn-price {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--text2);
          font-variant-numeric: tabular-nums;
          margin-top: auto;
        }
        .preset-btn-key {
          position: absolute;
          top: 6px; right: 6px;
          font-family: var(--mono); font-size: 9px;
          letter-spacing: 0.06em;
          padding: 0 4px;
          border: 1px solid var(--line2);
          color: var(--text3);
          line-height: 1.4;
          background: var(--bg);
        }
        .preset-btn-warn {
          position: absolute;
          top: 8px; left: 8px;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--amber-fg);
          box-shadow: 0 0 4px var(--amber-fg);
        }

        /* Color variants — left border accent */
        .preset-btn-amber  { border-left-color: var(--amber-fg); }
        .preset-btn-red    { border-left-color: var(--red-fg); }
        .preset-btn-green  { border-left-color: var(--green-fg); }
        .preset-btn-blue   { border-left-color: var(--blue-fg); }
        .preset-btn-teal   { border-left-color: #4dc6c6; }
        .preset-btn-violet { border-left-color: #a78bfa; }
        .preset-btn-gray   { border-left-color: var(--text3); }

        .wo-preset-hint {
          padding: 14px;
          text-align: center;
          font-family: var(--mono);
          font-size: 10.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text3);
        }
        .wo-preset-hint .kbd {
          margin: 0 2px;
        }

        @media (max-width: 768px) {
          .wo-preset-grid { grid-template-columns: repeat(2, 1fr); }
          .wo-preset-top { flex-wrap: wrap; }
          .wo-preset-search { width: 100%; flex: 1 1 100%; order: -1; }
        }
      `;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = css;
      document.head.appendChild(style);
    }

    // Expose
    window.WorkOrderPresetBar = WorkOrderPresetBar;
    window.WO_DEFAULT_PRESETS = DEFAULT_PRESETS;
    window.loadWoPresets = loadPresets;
    window.saveWoPresets = savePresets;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
