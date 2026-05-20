/**
 * ChainLine POS — Design System v2
 * Design tokens, UI components, keyboard shortcuts, command palette.
 */

/* ─────────────────────────────────────────────
   1. DESIGN TOKENS
   ───────────────────────────────────────────── */

const DESIGN = {
  colors: {
    bg:             '#0a0a0a',
    surface:        '#141414',
    card:           '#1c1c1c',
    border:         '#2a2a2a',
    borderStrong:   '#3a3a3a',
    accent:         '#c8392c',
    accentHover:    '#e04436',
    green:          '#16a34a',
    amber:          '#d97706',
    blue:           '#2563eb',
    red:            '#dc2626',
    purple:         '#7c3aed',
    textPrimary:    '#f5f4f2',
    textSecondary:  '#8a8885',
    textTertiary:   '#5a5856',
    mono:           '"SF Mono", "Fira Code", monospace',
    display:        '"Space Grotesk", system-ui, sans-serif',
  }
};

/** Inject all design tokens as CSS custom properties on :root */
function injectDesignTokens() {
  const map = {
    '--ds-bg':              DESIGN.colors.bg,
    '--ds-surface':         DESIGN.colors.surface,
    '--ds-card':            DESIGN.colors.card,
    '--ds-border':          DESIGN.colors.border,
    '--ds-border-strong':   DESIGN.colors.borderStrong,
    '--ds-accent':          DESIGN.colors.accent,
    '--ds-accent-hover':    DESIGN.colors.accentHover,
    '--ds-green':           DESIGN.colors.green,
    '--ds-amber':           DESIGN.colors.amber,
    '--ds-blue':            DESIGN.colors.blue,
    '--ds-red':             DESIGN.colors.red,
    '--ds-purple':          DESIGN.colors.purple,
    '--ds-text-primary':    DESIGN.colors.textPrimary,
    '--ds-text-secondary':  DESIGN.colors.textSecondary,
    '--ds-text-tertiary':   DESIGN.colors.textTertiary,
  };
  const root = document.documentElement;
  for (const [prop, val] of Object.entries(map)) {
    root.style.setProperty(prop, val);
  }
}


/* ─────────────────────────────────────────────
   2. STATUS BADGE
   ───────────────────────────────────────────── */

/**
 * StatusBadge(status, mechanic?)
 * Returns an HTML string — a colour-coded pill.
 * Optionally shows mechanic initials beside the badge.
 *
 * @param {string} status
 * @param {string} [mechanic] — full name or initials
 * @returns {string} HTML
 */
function StatusBadge(status, mechanic) {
  const STATUS_MAP = {
    'READY':    { cls: 'pos-status-READY',    label: 'Ready'    },
    'Open':     { cls: 'pos-status-Open',     label: 'Open'     },
    'BOOKED':   { cls: 'pos-status-BOOKED',   label: 'Booked'   },
    'Overdue':  { cls: 'pos-status-Overdue',  label: 'Overdue'  },
    'Finished': { cls: 'pos-status-Finished', label: 'Finished' },
    'WAITING':  { cls: 'pos-status-WAITING',  label: 'Waiting'  },
    'Cancelled':{ cls: 'pos-status-Cancelled',label: 'Cancelled'},
  };

  const cfg = STATUS_MAP[status] || { cls: 'pos-status-Finished', label: status };

  let mechHtml = '';
  if (mechanic) {
    const initials = mechanic
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    mechHtml = `<span class="pos-status-initials">${initials}</span>`;
  }

  return `<span class="pos-badge ${cfg.cls}">${cfg.label}${mechHtml}</span>`;
}


/* ─────────────────────────────────────────────
   3. TOAST NOTIFICATIONS
   ───────────────────────────────────────────── */

const Toast = (() => {
  let container = null;

  function _ensureContainer() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'pos-toast-container';
    document.body.appendChild(container);
  }

  function _show(msg, type) {
    _ensureContainer();

    const icons = { success: '✓', error: '✕', info: 'i' };
    const toast = document.createElement('div');
    toast.className = `pos-toast pos-toast-${type}`;
    toast.innerHTML = `
      <span class="pos-toast-icon">${icons[type] || 'i'}</span>
      <span class="pos-toast-msg">${msg}</span>
      <button class="pos-toast-close" aria-label="Dismiss">✕</button>
    `;

    toast.querySelector('.pos-toast-close').addEventListener('click', () => dismiss(toast));
    container.appendChild(toast);

    // Force reflow so enter animation plays
    void toast.offsetWidth;
    toast.classList.add('pos-toast-enter');

    const timer = setTimeout(() => dismiss(toast), 3000);
    toast._timer = timer;
  }

  function dismiss(toast) {
    if (!toast || toast._dismissed) return;
    toast._dismissed = true;
    clearTimeout(toast._timer);
    toast.classList.remove('pos-toast-enter');
    toast.classList.add('pos-toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  return {
    success: (msg) => _show(msg, 'success'),
    error:   (msg) => _show(msg, 'error'),
    info:    (msg) => _show(msg, 'info'),
  };
})();


/* ─────────────────────────────────────────────
   4. MODAL SYSTEM
   ───────────────────────────────────────────── */

const Modal = (() => {
  let overlay = null;
  let onEscClose = null;

  function close() {
    if (!overlay) return;
    const dialog = overlay.querySelector('.pos-modal');
    if (dialog) dialog.classList.add('pos-modal-exit');
    overlay.classList.add('pos-modal-backdrop-exit');
    const cleanup = () => {
      overlay && overlay.remove();
      overlay = null;
    };
    // Wait for animation
    setTimeout(cleanup, 200);
    if (onEscClose) {
      document.removeEventListener('keydown', onEscClose);
      onEscClose = null;
    }
  }

  /**
   * Modal.open({ title, body, actions })
   * actions: [{ label, onClick, primary, danger }]
   */
  function open({ title, body, actions = [] }) {
    // Close any existing modal first
    if (overlay) close();

    overlay = document.createElement('div');
    overlay.className = 'pos-modal-backdrop';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    const actionBtns = actions.map(a => {
      const cls = a.primary ? 'pos-btn-primary' : a.danger ? 'pos-btn-danger' : 'pos-btn-ghost';
      return `<button class="pos-btn ${cls}" data-action="${encodeURIComponent(a.label)}">${a.label}</button>`;
    }).join('');

    overlay.innerHTML = `
      <div class="pos-modal">
        <div class="pos-modal-header">
          <h2 class="pos-modal-title">${title}</h2>
          <button class="pos-modal-x" aria-label="Close">✕</button>
        </div>
        <div class="pos-modal-body">${body}</div>
        ${actions.length ? `<div class="pos-modal-footer">${actionBtns}</div>` : ''}
      </div>
    `;

    // Wire close button
    overlay.querySelector('.pos-modal-x').addEventListener('click', close);

    // Wire action buttons
    actions.forEach(a => {
      const btn = [...overlay.querySelectorAll('.pos-modal-footer .pos-btn')]
        .find(b => b.textContent === a.label);
      if (btn && a.onClick) btn.addEventListener('click', () => { a.onClick(); close(); });
    });

    // Click backdrop to close
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    document.body.appendChild(overlay);
    void overlay.offsetWidth; // reflow

    // ESC key
    onEscClose = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onEscClose);

    // Focus first focusable element
    setTimeout(() => {
      const focusable = overlay.querySelector('button, input, [tabindex]');
      if (focusable) focusable.focus();
    }, 50);
  }

  return { open, close };
})();


/* ─────────────────────────────────────────────
   5. KEYBOARD SHORTCUTS
   ───────────────────────────────────────────── */

const Shortcuts = (() => {
  const _registry = []; // [{ combo, callback, description }]
  let _helpVisible = false;
  let _helpOverlay = null;

  /** Normalize key combo string → lowercase, sorted modifiers */
  function _normalize(combo) {
    const parts = combo.toLowerCase().split('+');
    const mods = ['ctrl', 'shift', 'alt', 'meta'].filter(m => parts.includes(m));
    const key = parts.find(p => !['ctrl', 'shift', 'alt', 'meta'].includes(p));
    return [...mods, key].join('+');
  }

  /** Register a keyboard shortcut */
  function on(combo, callback, description = '') {
    _registry.push({ combo: _normalize(combo), callback, description, raw: combo });
  }

  function _eventToCombo(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    const key = e.key.toLowerCase();
    // Ignore standalone modifier keypress
    if (['control', 'shift', 'alt', 'meta'].includes(key)) return null;
    parts.push(key);
    return parts.join('+');
  }

  function _handler(e) {
    const combo = _eventToCombo(e);
    if (!combo) return;

    // Slash shortcut: only when not in an input
    if (combo === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      const match = _registry.find(r => r.combo === '/');
      if (match) { e.preventDefault(); match.callback(e); return; }
    }

    const match = _registry.find(r => r.combo === combo);
    if (match) {
      e.preventDefault();
      match.callback(e);
    }
  }

  function showHelp() {
    if (_helpVisible) { _closeHelp(); return; }
    _helpVisible = true;

    _helpOverlay = document.createElement('div');
    _helpOverlay.className = 'pos-shortcut-help-overlay';

    const rows = _registry
      .filter(r => r.description)
      .map(r => {
        const keys = r.raw.split('+').map(k => `<kbd class="pos-kbd">${k}</kbd>`).join(' ');
        return `<tr><td class="pos-sh-keys">${keys}</td><td class="pos-sh-desc">${r.description}</td></tr>`;
      }).join('');

    _helpOverlay.innerHTML = `
      <div class="pos-shortcut-help">
        <div class="pos-shortcut-help-header">
          <span>Keyboard Shortcuts</span>
          <button class="pos-modal-x" id="pos-sh-close">✕</button>
        </div>
        <table class="pos-sh-table">${rows}</table>
        <p class="pos-sh-footer">Press <kbd class="pos-kbd">?</kbd> or <kbd class="pos-kbd">ESC</kbd> to close</p>
      </div>
    `;

    _helpOverlay.querySelector('#pos-sh-close').addEventListener('click', _closeHelp);
    _helpOverlay.addEventListener('click', e => { if (e.target === _helpOverlay) _closeHelp(); });
    document.body.appendChild(_helpOverlay);
  }

  function _closeHelp() {
    _helpVisible = false;
    if (_helpOverlay) { _helpOverlay.remove(); _helpOverlay = null; }
  }

  function init() {
    document.addEventListener('keydown', _handler);
  }

  return { on, showHelp, init, _closeHelp };
})();

// Pre-register core POS shortcuts (callbacks wired by app after init)
Shortcuts.on('ctrl+n', () => window.POS_ACTIONS?.newWorkOrder?.(),    'New Work Order');
Shortcuts.on('ctrl+s', () => window.POS_ACTIONS?.newSale?.(),         'New Sale');
Shortcuts.on('ctrl+f', () => window.POS_ACTIONS?.focusSearch?.(),     'Focus Search');
Shortcuts.on('ctrl+k', () => CommandPalette.toggle(),                  'Command Palette');
Shortcuts.on('/',      () => window.POS_ACTIONS?.focusSearch?.(),     'Focus Search');
Shortcuts.on('escape', () => {
  Modal.close();
  CommandPalette.close();
  Shortcuts._closeHelp();
}, 'Close / Cancel');
Shortcuts.on('?',      () => Shortcuts.showHelp(),                    'Show Shortcuts Help');


/* ─────────────────────────────────────────────
   6. COMMAND PALETTE
   ───────────────────────────────────────────── */

const CommandPalette = (() => {
  let _el = null;
  let _items = [];
  let _filtered = [];
  let _cursor = -1;
  let _query = '';

  /** Default static pages — supplement with dynamic data via setItems() */
  const STATIC_ITEMS = [
    { label: 'Work Orders',       icon: '🔧', action: () => window.POS_ACTIONS?.navTo?.('work-orders')  },
    { label: 'New Work Order',    icon: '+',  action: () => window.POS_ACTIONS?.newWorkOrder?.()        },
    { label: 'Sales',             icon: '💳', action: () => window.POS_ACTIONS?.navTo?.('sales')        },
    { label: 'New Sale',          icon: '+',  action: () => window.POS_ACTIONS?.newSale?.()             },
    { label: 'Customers',         icon: '👤', action: () => window.POS_ACTIONS?.navTo?.('customers')    },
    { label: 'Inventory',         icon: '📦', action: () => window.POS_ACTIONS?.navTo?.('inventory')    },
    { label: 'Reports',           icon: '📊', action: () => window.POS_ACTIONS?.navTo?.('reports')      },
    { label: 'Settings',          icon: '⚙',  action: () => window.POS_ACTIONS?.navTo?.('settings')     },
  ];

  /** Fuzzy-ish filter: every query char appears in label in order */
  function _fuzzy(label, query) {
    if (!query) return true;
    const l = label.toLowerCase();
    const q = query.toLowerCase();
    let li = 0;
    for (let qi = 0; qi < q.length; qi++) {
      li = l.indexOf(q[qi], li);
      if (li === -1) return false;
      li++;
    }
    return true;
  }

  function _render() {
    if (!_el) return;
    const list = _el.querySelector('.pos-cp-results');
    if (!_filtered.length) {
      list.innerHTML = `<li class="pos-cp-empty">No results for "${_query}"</li>`;
      return;
    }
    list.innerHTML = _filtered.map((item, i) => `
      <li class="pos-cp-item ${i === _cursor ? 'pos-cp-item-active' : ''}" data-idx="${i}">
        <span class="pos-cp-icon">${item.icon || '→'}</span>
        <span class="pos-cp-label">${item.label}</span>
        ${item.meta ? `<span class="pos-cp-meta">${item.meta}</span>` : ''}
      </li>
    `).join('');

    list.querySelectorAll('.pos-cp-item').forEach(li => {
      li.addEventListener('mouseenter', () => {
        _cursor = parseInt(li.dataset.idx, 10);
        _render();
      });
      li.addEventListener('click', () => {
        _select(_cursor);
      });
    });

    // Scroll active item into view
    const active = list.querySelector('.pos-cp-item-active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function _select(idx) {
    const item = _filtered[idx];
    if (!item) return;
    close();
    item.action?.();
  }

  function _filter(query) {
    _query = query;
    _filtered = _items.filter(item => _fuzzy(item.label, query));
    _cursor = _filtered.length ? 0 : -1;
    _render();
  }

  function open() {
    if (_el) return; // already open
    _items = [...STATIC_ITEMS, ...(CommandPalette._extra || [])];

    _el = document.createElement('div');
    _el.className = 'pos-command-palette-backdrop';
    _el.innerHTML = `
      <div class="pos-command-palette" role="dialog" aria-label="Command Palette">
        <input
          class="pos-cp-input"
          type="text"
          placeholder="Search pages, work orders, customers..."
          autocomplete="off"
          spellcheck="false"
        />
        <ul class="pos-cp-results"></ul>
        <div class="pos-cp-footer">
          <span><kbd class="pos-kbd">↑↓</kbd> navigate</span>
          <span><kbd class="pos-kbd">↵</kbd> select</span>
          <span><kbd class="pos-kbd">ESC</kbd> close</span>
        </div>
      </div>
    `;

    const input = _el.querySelector('.pos-cp-input');

    input.addEventListener('input', e => _filter(e.target.value));

    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        _cursor = Math.min(_cursor + 1, _filtered.length - 1);
        _render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _cursor = Math.max(_cursor - 1, 0);
        _render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        _select(_cursor);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    });

    _el.addEventListener('click', e => { if (e.target === _el) close(); });

    document.body.appendChild(_el);
    _filter('');
    setTimeout(() => input.focus(), 30);
  }

  function close() {
    if (!_el) return;
    _el.remove();
    _el = null;
    _cursor = -1;
    _query = '';
  }

  function toggle() {
    _el ? close() : open();
  }

  /**
   * Inject extra items (recent work orders, customers, etc.)
   * Call from app after fetching data.
   * @param {Array} items [{ label, icon, meta, action }]
   */
  function setExtraItems(items) {
    CommandPalette._extra = items;
  }

  return { open, close, toggle, setExtraItems };
})();


/* ─────────────────────────────────────────────
   7. AVATAR COMPONENT
   ───────────────────────────────────────────── */

const AVATAR_PALETTE = [
  '#c8392c', '#2563eb', '#16a34a', '#d97706',
  '#7c3aed', '#0891b2', '#be185d', '#ea580c',
];

/**
 * Avatar(name, size?)
 * Returns HTML string — a circle with initials.
 * Color derived from name hash for consistency.
 *
 * @param {string} name
 * @param {'sm'|'md'|'lg'} [size='md']
 * @returns {string} HTML
 */
function Avatar(name, size = 'md') {
  if (!name) return '';

  const initials = name
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const color = AVATAR_PALETTE[hash % AVATAR_PALETTE.length];

  return `<span class="pos-avatar pos-avatar-${size}" style="background:${color}" title="${name}">${initials}</span>`;
}


/* ─────────────────────────────────────────────
   8. SKELETON LOADER
   ───────────────────────────────────────────── */

/**
 * Skeleton(rows?, cols?)
 * Returns HTML string with animated shimmer rows.
 * Use inside any container while data loads.
 *
 * @param {number} [rows=4]
 * @param {'list'|'table'|'card'} [variant='list']
 * @returns {string} HTML
 */
function Skeleton(rows = 4, variant = 'list') {
  if (variant === 'card') {
    const cards = Array.from({ length: rows }, (_, i) => `
      <div class="pos-skeleton-card">
        <div class="pos-skeleton-line pos-skeleton-w-40"></div>
        <div class="pos-skeleton-line pos-skeleton-w-70 pos-skeleton-sm"></div>
        <div class="pos-skeleton-line pos-skeleton-w-50 pos-skeleton-sm"></div>
      </div>
    `).join('');
    return `<div class="pos-skeleton-grid">${cards}</div>`;
  }

  if (variant === 'table') {
    const tableRows = Array.from({ length: rows }, (_, i) => `
      <div class="pos-skeleton-row">
        <div class="pos-skeleton-line pos-skeleton-w-20"></div>
        <div class="pos-skeleton-line pos-skeleton-w-40"></div>
        <div class="pos-skeleton-line pos-skeleton-w-30"></div>
        <div class="pos-skeleton-line pos-skeleton-w-15"></div>
      </div>
    `).join('');
    return `<div class="pos-skeleton-table">${tableRows}</div>`;
  }

  // Default: list
  const widths = ['pos-skeleton-w-60', 'pos-skeleton-w-80', 'pos-skeleton-w-50', 'pos-skeleton-w-70'];
  const lines = Array.from({ length: rows }, (_, i) => `
    <div class="pos-skeleton-item">
      <div class="pos-skeleton-avatar"></div>
      <div class="pos-skeleton-lines">
        <div class="pos-skeleton-line ${widths[i % widths.length]}"></div>
        <div class="pos-skeleton-line pos-skeleton-w-40 pos-skeleton-sm"></div>
      </div>
    </div>
  `).join('');
  return `<div class="pos-skeleton-list">${lines}</div>`;
}


/* ─────────────────────────────────────────────
   9. STAT CARD
   ───────────────────────────────────────────── */

/**
 * StatCard({ label, value, delta, icon, trend })
 * Returns HTML string — a metric card.
 * delta: number (e.g. +12 or -3), shown as % if trendType='percent'
 *
 * @param {object} opts
 * @returns {string} HTML
 */
function StatCard({ label, value, delta, icon, trendType = 'percent' }) {
  let deltaHtml = '';
  if (delta !== undefined && delta !== null) {
    const isPos = delta >= 0;
    const arrow = isPos ? '↑' : '↓';
    const cls = isPos ? 'pos-stat-delta-up' : 'pos-stat-delta-down';
    const fmt = trendType === 'percent'
      ? `${isPos ? '+' : ''}${delta}%`
      : `${isPos ? '+' : ''}${delta}`;
    deltaHtml = `<span class="pos-stat-delta ${cls}">${arrow} ${fmt}</span>`;
  }

  const iconHtml = icon ? `<span class="pos-stat-icon">${icon}</span>` : '';

  return `
    <div class="pos-stat-card">
      <div class="pos-stat-header">
        <span class="pos-stat-label">${label}</span>
        ${iconHtml}
      </div>
      <div class="pos-stat-body">
        <span class="pos-stat-value">${value}</span>
        ${deltaHtml}
      </div>
    </div>
  `;
}


/* ─────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────── */

/**
 * Call once on DOMContentLoaded.
 * Injects tokens, wires keyboard shortcuts.
 */
function initDesignSystem() {
  injectDesignTokens();
  Shortcuts.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDesignSystem);
} else {
  initDesignSystem();
}

// Expose to global scope for use from other scripts
window.DESIGN          = DESIGN;
window.StatusBadge     = StatusBadge;
window.Toast           = Toast;
window.Modal           = Modal;
window.Shortcuts       = Shortcuts;
window.CommandPalette  = CommandPalette;
window.Avatar          = Avatar;
window.Skeleton        = Skeleton;
window.StatCard        = StatCard;
