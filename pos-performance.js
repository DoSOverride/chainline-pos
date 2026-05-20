/* ChainLine POS — pos-performance.js
 * Performance utilities: virtual scroll, search cache, prefetch, skeleton.
 * Vanilla JS. No framework dependencies. Safe to load before React.
 */

'use strict';

/* ── 1. VirtualList ──────────────────────────────────────────────────────── */
/**
 * VirtualList(items, rowHeight, renderRow, containerHeight)
 *
 * Virtual scrolling for large lists (handles 7766+ items without perf hit).
 * Returns a React element (requires React to be loaded).
 *
 * @param {Array}    items           - Full array of data items
 * @param {number}   rowHeight       - Fixed row height in px
 * @param {Function} renderRow       - (item, index) => React element
 * @param {number}   containerHeight - Visible container height in px
 *
 * Usage:
 *   VirtualList(myItems, 48, (item, i) => h('div', {key: i}, item.name), 600)
 */
window.VirtualList = function VirtualList({ items, rowHeight, renderRow, containerHeight }) {
  const { createElement: h, useState, useEffect, useRef, useCallback } = React;

  const BUFFER = 5; // rows to render above/below viewport

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const totalHeight = items.length * rowHeight;
  const visibleCount = Math.ceil(containerHeight / rowHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER);
  const endIndex   = Math.min(items.length - 1, startIndex + visibleCount + BUFFER * 2);

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push({ item: items[i], index: i });
  }

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return h('div', {
    ref: containerRef,
    style: {
      height: containerHeight,
      overflowY: 'auto',
      position: 'relative',
      willChange: 'transform',
    },
    onScroll: handleScroll,
  },
    // Spacer to maintain total scroll height
    h('div', { style: { height: totalHeight, position: 'relative' } },
      visibleItems.map(({ item, index }) =>
        h('div', {
          key: item.id !== undefined ? item.id : index,
          style: {
            position: 'absolute',
            top: index * rowHeight,
            left: 0,
            right: 0,
            height: rowHeight,
          },
        }, renderRow(item, index))
      )
    )
  );
};

/* ── 2. ItemSearchCache ──────────────────────────────────────────────────── */
/**
 * In-memory LRU cache with localStorage persistence.
 * Max 100 queries. 5-minute TTL. Max 2MB localStorage.
 */
window.ItemSearchCache = (function () {
  const MAX_ENTRIES = 100;
  const TTL_MS = 5 * 60 * 1000;  // 5 min
  const LS_KEY = 'pos-search-cache-v1';
  const MAX_LS_BYTES = 2 * 1024 * 1024; // 2 MB

  // LRU map: key = query string, value = { items, ts }
  const _cache = new Map();

  function _load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const now = Date.now();
      for (const [k, v] of Object.entries(data)) {
        if (v && v.ts && (now - v.ts) < TTL_MS) {
          _cache.set(k, v);
        }
      }
    } catch (_) {}
  }

  function _persist() {
    try {
      const obj = {};
      for (const [k, v] of _cache.entries()) {
        obj[k] = v;
      }
      const serialized = JSON.stringify(obj);
      if (serialized.length < MAX_LS_BYTES) {
        localStorage.setItem(LS_KEY, serialized);
      } else {
        // Over budget — persist only first 50 entries
        const obj2 = {};
        let i = 0;
        for (const [k, v] of _cache.entries()) {
          if (i++ >= 50) break;
          obj2[k] = v;
        }
        localStorage.setItem(LS_KEY, JSON.stringify(obj2));
      }
    } catch (_) {}
  }

  function _evict() {
    if (_cache.size <= MAX_ENTRIES) return;
    // Delete oldest (first inserted in Map)
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }

  // Promote entry to most-recently-used by re-inserting
  function _touch(key) {
    const v = _cache.get(key);
    if (!v) return;
    _cache.delete(key);
    _cache.set(key, v);
  }

  function get(query) {
    const key = query.trim().toLowerCase();
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > TTL_MS) {
      _cache.delete(key);
      return null;
    }
    _touch(key);
    return entry.items;
  }

  function set(query, items) {
    const key = query.trim().toLowerCase();
    _cache.delete(key); // remove before re-inserting to update recency
    _cache.set(key, { items, ts: Date.now() });
    _evict();
    _persist();
  }

  function invalidate(query) {
    if (query) {
      _cache.delete(query.trim().toLowerCase());
    } else {
      _cache.clear();
      try { localStorage.removeItem(LS_KEY); } catch (_) {}
    }
  }

  function size() { return _cache.size; }

  // Preload top common queries
  async function preloadTop(fetchFn) {
    const TOP_QUERIES = ['shimano', 'maxxis', 'brake', 'chain', 'tube', 'sram', 'fork', 'cassette', 'pedal', 'grips'];
    for (const q of TOP_QUERIES) {
      if (get(q)) continue; // already cached
      try {
        const items = await fetchFn(q);
        if (items && items.length > 0) set(q, items);
      } catch (_) {}
      // Small delay to avoid hammering API
      await new Promise(r => setTimeout(r, 120));
    }
  }

  // Init: load persisted data
  _load();

  return { get, set, invalidate, size, preloadTop };
})();

/* ── 3. PrefetchManager ──────────────────────────────────────────────────── */
/**
 * Prefetches common searches + first items page on idle.
 * Uses requestIdleCallback when available.
 */
window.PrefetchManager = (function () {
  const WARM_QUERIES = ['shimano', 'maxxis', 'brake', 'chain', 'tube'];
  let _started = false;
  let _workerBase = null;

  function _idle(fn) {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(fn, { timeout: 4000 });
    } else {
      setTimeout(fn, 1000);
    }
  }

  async function _fetchItems(q) {
    const base = _workerBase || (typeof WORKER !== 'undefined' ? WORKER : 'https://still-term-f1ec.taocaruso77.workers.dev');
    try {
      const r = await fetch(base + '/api/items-search?q=' + encodeURIComponent(q));
      if (!r.ok) return null;
      const d = await r.json();
      return d && Array.isArray(d.items) ? d.items : null;
    } catch (_) { return null; }
  }

  async function _fetchPage1() {
    const base = _workerBase || (typeof WORKER !== 'undefined' ? WORKER : 'https://still-term-f1ec.taocaruso77.workers.dev');
    try {
      const r = await fetch(base + '/api/pos-items-page?page=1');
      if (!r.ok) return;
      const d = await r.json();
      if (d && d.items && window.ItemSearchCache) {
        // Cache each item under its own SKU for direct lookups
        for (const item of (d.items || [])) {
          if (item.sku) window.ItemSearchCache.set(item.sku, [item]);
        }
      }
    } catch (_) {}
  }

  function start(workerBase) {
    if (_started) return;
    _started = true;
    _workerBase = workerBase || null;

    _idle(async () => {
      // Warm search cache with top queries
      for (const q of WARM_QUERIES) {
        if (window.ItemSearchCache && window.ItemSearchCache.get(q)) continue;
        const items = await _fetchItems(q);
        if (items && window.ItemSearchCache) window.ItemSearchCache.set(q, items);
        await new Promise(r => setTimeout(r, 200));
      }

      // Fetch first items page in background
      await _fetchPage1();
    });
  }

  function reset() { _started = false; }

  return { start, reset };
})();

/* ── 4. SkeletonTable ────────────────────────────────────────────────────── */
/**
 * SkeletonTable(cols, rows)
 *
 * Animated shimmer placeholder while data loads.
 *
 * @param {Array}  cols - Array of column widths in px, e.g. [60, 200, 100, 80]
 * @param {number} rows - Number of skeleton rows (default 8)
 *
 * Returns a React element.
 */
window.SkeletonTable = function SkeletonTable({ cols, rows }) {
  const { createElement: h } = React;
  rows = rows || 8;
  cols = cols || [60, 200, 100, 80];

  const shimmerStyle = {
    background: 'linear-gradient(90deg, var(--card) 25%, var(--border) 50%, var(--card) 75%)',
    backgroundSize: '400% 100%',
    animation: 'pos-shimmer 1.4s ease infinite',
    borderRadius: 4,
    height: 14,
  };

  // Inject keyframes once
  if (!window._posSkeletonStyleInjected) {
    window._posSkeletonStyleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pos-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }

  return h('table', { className: 'data-table' },
    h('tbody', null,
      Array.from({ length: rows }, (_, ri) =>
        h('tr', { key: ri },
          cols.map((w, ci) =>
            h('td', { key: ci },
              h('div', { style: { ...shimmerStyle, width: w, opacity: 0.6 + 0.4 * (ri % 2 === 0 ? 1 : 0) } })
            )
          )
        )
      )
    )
  );
};

/* ── 5. debounce + throttle ──────────────────────────────────────────────── */
/**
 * debounce(fn, ms) — delays fn until ms has passed since last call.
 */
window.posDebounce = function debounce(fn, ms) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
};

/**
 * throttle(fn, ms) — calls fn at most once per ms interval.
 */
window.posThrottle = function throttle(fn, ms) {
  let last = 0;
  let timer = null;
  return function (...args) {
    const now = Date.now();
    const remaining = ms - (now - last);
    clearTimeout(timer);
    if (remaining <= 0) {
      last = now;
      fn.apply(this, args);
    } else {
      timer = setTimeout(() => {
        last = Date.now();
        fn.apply(this, args);
      }, remaining);
    }
  };
};
