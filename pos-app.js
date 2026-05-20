/* ChainLine POS — pos-app.js
 * Plain React 18 via CDN, no JSX, no build step.
 * All createElement calls. Worker: https://still-term-f1ec.taocaruso77.workers.dev
 */

'use strict';

const { createElement: h, useState, useEffect, useRef, useCallback, useMemo } = React;
const { createRoot } = ReactDOM;

/* ── Constants ── */
const WORKER = 'https://still-term-f1ec.taocaruso77.workers.dev';

const STAFF = [
  { id: 1, name: 'Jason',   initials: 'JA', pin: '1234', role: 'mechanic' },
  { id: 2, name: 'Florian', initials: 'FL', pin: '5678', role: 'mechanic' },
  { id: 3, name: 'Darrin',  initials: 'DA', pin: '9999', role: 'manager'  },
];

const STATUS_CONFIG = {
  'READY':    { label: 'READY',    cls: 'badge-ready'    },
  'Open':     { label: 'OPEN',     cls: 'badge-open'     },
  'BOOKED':   { label: 'BOOKED',   cls: 'badge-booked'   },
  'READY-WO': { label: 'READY-WO', cls: 'badge-ready-wo' },
  'Finished': { label: 'FINISHED', cls: 'badge-finished' },
};

const SERVICE_TYPES = [
  'Tune-Up Basic', 'Tune-Up Standard', 'Tune-Up Premium',
  'Brake Bleed', 'Drivetrain Service', 'Suspension Service',
  'Flat Repair', 'Custom',
];

const GST = 0.05;
const PST = 0.07;
const TAX = GST + PST; // 12% BC

/* ── Mock Data ── */
const MOCK_WO = [
  { id: 22027, customer: 'Nick Kusmich',  item: 'Hydrogen Silver 24',          mechanic: '',     status: 'READY',    dateIn: '2026-05-19', dueOn: '2026-05-19', total: 0,     daysOverdue: 1  },
  { id: 22026, customer: 'Angus Leslie',  item: 'Norco Fireball white/gray Large', mechanic: 'FLOR', status: 'Open',  dateIn: '2026-05-19', dueOn: '2026-05-28', total: 0,     daysOverdue: -8 },
  { id: 22025, customer: 'Joe Wessel',    item: 'Loose Wheel Rainbow 700c',     mechanic: 'WH',   status: 'READY',    dateIn: '2026-05-19', dueOn: '2026-05-29', total: 0,     daysOverdue: -9 },
  { id: 22022, customer: 'Steve Gaucher', item: 'Turbine 27.5 Rear Wheel',     mechanic: 'RA!',  status: 'READY',    dateIn: '2026-05-16', dueOn: '2026-05-16', total: 0,     daysOverdue: 4  },
  { id: 22018, customer: 'Shelley Draper',item: 'Race Face Wheel Black',        mechanic: '',     status: 'Open',     dateIn: '2026-05-15', dueOn: '2026-05-26', total: 35.75, daysOverdue: -6 },
];

const MOCK_CUSTOMERS = [
  { id: 1, firstName: 'Nick',    lastName: 'Kusmich',  email: 'nick@example.com',     phone: '250-555-0101', totalSpent: 1240.00, woCount: 3 },
  { id: 2, firstName: 'Angus',   lastName: 'Leslie',   email: 'angus@example.com',    phone: '250-555-0102', totalSpent: 890.50,  woCount: 2 },
  { id: 3, firstName: 'Joe',     lastName: 'Wessel',   email: 'joe@example.com',      phone: '250-555-0103', totalSpent: 240.00,  woCount: 5 },
  { id: 4, firstName: 'Steve',   lastName: 'Gaucher',  email: 'steve@example.com',    phone: '250-555-0104', totalSpent: 3200.00, woCount: 8 },
  { id: 5, firstName: 'Shelley', lastName: 'Draper',   email: 'shelley@example.com',  phone: '250-555-0105', totalSpent: 567.25,  woCount: 1 },
];

const MOCK_INVENTORY = [
  { id: 1,  name: 'Shimano XT Brake Pads B01S', dept: 'Parts', qty: 12, price: 18.99,  sku: 'SHM-B01S'   },
  { id: 2,  name: 'Maxxis Minion DHF 29x2.5',  dept: 'Tires',  qty: 4,  price: 84.99,  sku: 'MAX-DHF-29' },
  { id: 3,  name: 'Marin Tune-Up Basic',        dept: 'Labour', qty: 99, price: 75.00,  sku: 'SVC-TUNE-B' },
  { id: 4,  name: 'Marin Tune-Up Standard',     dept: 'Labour', qty: 99, price: 120.00, sku: 'SVC-TUNE-S' },
  { id: 5,  name: 'Marin Tune-Up Premium',      dept: 'Labour', qty: 99, price: 175.00, sku: 'SVC-TUNE-P' },
  { id: 6,  name: 'SRAM Eagle Cassette 10-52',  dept: 'Parts',  qty: 2,  price: 219.99, sku: 'SRM-CAS-10' },
  { id: 7,  name: 'Trek Bontrager Flat Kit',    dept: 'Accessories', qty: 8, price: 12.99, sku: 'BNT-FLT-K' },
  { id: 8,  name: 'RockShox Fork Service',      dept: 'Labour', qty: 99, price: 95.00,  sku: 'SVC-FORK'   },
  { id: 9,  name: 'WD-40 Bike Chain Lube',      dept: 'Accessories', qty: 20, price: 14.99, sku: 'WD40-CHAIN' },
  { id: 10, name: 'Shimano Deore Derailleur RD', dept: 'Parts', qty: 1, price: 89.99,  sku: 'SHM-RD-DER'  },
];

/* ── Utilities ── */
function fmt$(n) {
  return '$' + Number(n).toFixed(2);
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function daysDiff(dateStr) {
  const due = new Date(dateStr);
  const today = new Date('2026-05-20');
  const diff = Math.floor((today - due) / 86400000);
  return diff;
}

function fmtDate(str) {
  if (!str) return '-';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

/* ── API ── */
async function apiGet(path) {
  try {
    const r = await fetch(WORKER + path);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) {
    return null;
  }
}

async function apiPost(path, body) {
  try {
    const r = await fetch(WORKER + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch (e) {
    return null;
  }
}

/* ── Toast ── */
let _toastSetter = null;

function Toast() {
  const [toasts, setToasts] = useState([]);
  _toastSetter = setToasts;

  useEffect(() => {
    if (toasts.length === 0) return;
    const t = setTimeout(() => setToasts(prev => prev.slice(1)), 3000);
    return () => clearTimeout(t);
  }, [toasts]);

  return h('div', { className: 'toast-container' },
    ...toasts.map((t, i) =>
      h('div', { key: i, className: 'toast ' + (t.type || '') },
        t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ',
        t.message
      )
    )
  );
}

function toast(message, type = '') {
  if (_toastSetter) _toastSetter(prev => [...prev, { message, type }]);
}

/* ── Status Badge ── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'badge-open' };
  return h('span', { className: 'badge ' + cfg.cls }, cfg.label);
}

/* ── SVG Icons ── */
const Icon = {
  dashboard: () => h('svg', { className: 'nav-icon', viewBox: '0 0 20 20', fill: 'currentColor' },
    h('path', { d: 'M2 10a8 8 0 1116 0A8 8 0 012 10zm8-4a1 1 0 100 2 1 1 0 000-2zm-1 6a1 1 0 011-1h.01a1 1 0 010 2H10a1 1 0 01-1-1z' })
  ),
  workorders: () => h('svg', { className: 'nav-icon', viewBox: '0 0 20 20', fill: 'currentColor' },
    h('path', { fillRule: 'evenodd', d: 'M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z', clipRule: 'evenodd' })
  ),
  sales: () => h('svg', { className: 'nav-icon', viewBox: '0 0 20 20', fill: 'currentColor' },
    h('path', { d: 'M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z' }),
    h('path', { d: 'M16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z' })
  ),
  customers: () => h('svg', { className: 'nav-icon', viewBox: '0 0 20 20', fill: 'currentColor' },
    h('path', { d: 'M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z' })
  ),
  inventory: () => h('svg', { className: 'nav-icon', viewBox: '0 0 20 20', fill: 'currentColor' },
    h('path', { d: 'M4 3a2 2 0 100 4h12a2 2 0 100-4H4z' }),
    h('path', { fillRule: 'evenodd', d: 'M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z', clipRule: 'evenodd' })
  ),
  search: () => h('svg', { width: 14, height: 14, viewBox: '0 0 20 20', fill: 'currentColor' },
    h('path', { fillRule: 'evenodd', d: 'M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z', clipRule: 'evenodd' })
  ),
  plus: () => h('svg', { width: 14, height: 14, viewBox: '0 0 20 20', fill: 'currentColor' },
    h('path', { fillRule: 'evenodd', d: 'M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z', clipRule: 'evenodd' })
  ),
  arrow: () => h('svg', { width: 14, height: 14, viewBox: '0 0 20 20', fill: 'currentColor' },
    h('path', { fillRule: 'evenodd', d: 'M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z', clipRule: 'evenodd' })
  ),
  x: () => h('svg', { width: 14, height: 14, viewBox: '0 0 20 20', fill: 'currentColor' },
    h('path', { fillRule: 'evenodd', d: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z', clipRule: 'evenodd' })
  ),
};

/* ─────────────────────────────────────────────
   LOGIN SCREEN
───────────────────────────────────────────── */
function LoginScreen({ onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  function selectStaff(s) {
    setSelected(s);
    setPin('');
    setError('');
  }

  function pressKey(k) {
    if (!selected) { setError('Select a staff member first'); return; }
    if (k === 'del') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    const next = pin + k;
    setPin(next);
    if (next.length >= 4) {
      // attempt auth
      setTimeout(() => tryLogin(next), 80);
    }
  }

  function tryLogin(p) {
    const match = STAFF.find(s => s.id === selected.id && s.pin === p);
    if (match) {
      sessionStorage.setItem('pos-staff', JSON.stringify(match));
      onLogin(match);
    } else {
      setError('Wrong PIN');
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 400);
    }
  }

  const maxDots = 6;
  const dots = Array.from({ length: maxDots }, (_, i) => {
    const filled = i < pin.length;
    return h('div', {
      key: i,
      className: 'pin-dot' + (filled ? ' filled' : '') + (shake ? ' error' : ''),
    });
  });

  const keys = ['1','2','3','4','5','6','7','8','9','del','0','ok'];

  return h('div', { id: 'login-screen' },
    h('div', { className: 'login-logo' },
      h('div', { className: 'logo-monogram' }, 'CL'),
      h('h1', null, 'ChainLine POS'),
      h('p', null, 'Workshop Terminal')
    ),

    h('div', { className: 'staff-grid' },
      STAFF.map(s =>
        h('button', {
          key: s.id,
          className: 'staff-btn' + (selected?.id === s.id ? ' selected' : ''),
          onClick: () => selectStaff(s),
        },
          h('div', { className: 'staff-avatar' }, s.initials),
          h('div', { className: 'staff-name' }, s.name),
          h('div', { className: 'staff-role' }, s.role)
        )
      )
    ),

    h('div', { className: 'pin-container' },
      h('div', { className: 'pin-label' },
        selected ? 'Enter PIN for ' + selected.name : 'Select a staff member'
      ),
      h('div', { className: 'pin-display' }, ...dots),
      h('div', { className: 'pin-grid' },
        keys.map(k =>
          h('button', {
            key: k,
            className: 'pin-key' + (k === 'del' ? ' delete' : '') + (k === '0' ? ' zero' : '') + (k === 'ok' ? ' zero' : ''),
            onClick: () => k === 'ok' ? (pin.length >= 4 ? tryLogin(pin) : null) : pressKey(k),
          }, k === 'del' ? '⌫' : k === 'ok' ? '↵' : k)
        )
      ),
      h('div', { className: 'pin-error' }, error)
    )
  );
}

/* ─────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────── */
function Sidebar({ page, setPage, staff, onLock, overdueCount }) {
  const navItems = [
    { key: 'dashboard',   label: 'Dashboard',    icon: Icon.dashboard  },
    { key: 'workorders',  label: 'Work Orders',  icon: Icon.workorders, badge: overdueCount > 0 ? overdueCount : null, badgeCls: 'orange' },
    { key: 'sales',       label: 'Sales',        icon: Icon.sales      },
    { key: 'customers',   label: 'Customers',    icon: Icon.customers  },
    { key: 'inventory',   label: 'Inventory',    icon: Icon.inventory  },
  ];

  return h('aside', { id: 'sidebar' },
    // Header
    h('div', { className: 'sidebar-header' },
      h('div', { className: 'sidebar-logo' }, 'CL'),
      h('div', { className: 'sidebar-title' },
        h('div', { className: 'shop-name' }, 'ChainLine'),
        h('div', { className: 'shop-sub' }, 'POS')
      )
    ),

    // Nav
    h('nav', { className: 'sidebar-nav' },
      h('div', { className: 'nav-section-label' }, 'Menu'),
      navItems.map(item =>
        h('div', {
          key: item.key,
          className: 'nav-item' + (page === item.key ? ' active' : ''),
          onClick: () => setPage(item.key),
        },
          h(item.icon),
          item.label,
          item.badge ? h('span', { className: 'nav-badge ' + (item.badgeCls || '') }, item.badge) : null
        )
      )
    ),

    // Footer
    h('div', { className: 'sidebar-footer' },
      h('div', { className: 'staff-info' },
        h('div', { className: 'avatar' }, staff.initials),
        h('div', { className: 'info' },
          h('div', { className: 'name' }, staff.name),
          h('div', { className: 'role' }, staff.role)
        )
      ),
      h('div', { className: 'sidebar-actions' },
        h('button', { className: 'btn-sidebar-action', onClick: () => window.open('https://chainline.ca', '_blank') }, 'chainline.ca'),
        h('button', { className: 'btn-sidebar-action danger', onClick: onLock }, 'Lock')
      )
    )
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD
───────────────────────────────────────────── */
function Dashboard({ setPage, workOrders }) {
  const today = new Date('2026-05-20');

  const openCount    = workOrders.filter(w => w.status === 'Open').length;
  const readyCount   = workOrders.filter(w => w.status === 'READY').length;
  const overdueCount = workOrders.filter(w => w.daysOverdue > 0).length;
  const totalToday   = workOrders
    .filter(w => w.dateIn === '2026-05-19' || w.dateIn === '2026-05-20')
    .length;

  const recent = [
    { type: 'green',  text: h('span', null, 'WO #22027 marked ', h('strong', null, 'READY'), ' - Nick Kusmich'),      time: '9:14 AM' },
    { type: 'blue',   text: h('span', null, 'New work order ', h('strong', null, '#22026'), ' - Angus Leslie'),         time: '8:52 AM' },
    { type: 'orange', text: h('span', null, 'WO #22022 overdue - ', h('strong', null, 'Steve Gaucher')),                time: 'Yesterday' },
    { type: 'blue',   text: h('span', null, 'New work order ', h('strong', null, '#22025'), ' - Joe Wessel'),           time: 'Yesterday' },
    { type: 'green',  text: h('span', null, 'Sale completed - ', h('strong', null, '$84.99'), ' Maxxis Minion DHF'),    time: 'Yesterday' },
  ];

  return h('div', null,
    h('div', { className: 'page-header' },
      h('div', { className: 'page-title' }, 'Dashboard'),
      h('div', { className: 'page-subtitle' }, 'Wed, May 20, 2026'),
      h('div', { className: 'page-header-actions' },
        h('button', { className: 'btn btn-primary', onClick: () => setPage('workorders') },
          h(Icon.plus), 'New Work Order'
        )
      )
    ),

    h('div', { className: 'page-body' },
      h('div', { className: 'dash-stats' },
        h('div', { className: 'stat-card' },
          h('div', { className: 'stat-label' }, 'Open WOs'),
          h('div', { className: 'stat-value blue' }, openCount),
          h('div', { className: 'stat-sub' }, 'Active work orders')
        ),
        h('div', { className: 'stat-card' },
          h('div', { className: 'stat-label' }, 'Ready for Pickup'),
          h('div', { className: 'stat-value green' }, readyCount),
          h('div', { className: 'stat-sub' }, 'Awaiting customer')
        ),
        h('div', { className: 'stat-card' },
          h('div', { className: 'stat-label' }, 'Overdue'),
          h('div', { className: 'stat-value ' + (overdueCount > 0 ? 'red' : '') }, overdueCount),
          h('div', { className: 'stat-sub' }, 'Past due date')
        ),
        h('div', { className: 'stat-card' },
          h('div', { className: 'stat-label' }, "Today's Intake"),
          h('div', { className: 'stat-value' }, totalToday),
          h('div', { className: 'stat-sub' }, 'New this morning')
        )
      ),

      h('div', { className: 'dash-grid' },
        // Quick actions
        h('div', { className: 'card' },
          h('div', { className: 'dash-section-title' }, 'Quick Actions'),
          h('div', { className: 'quick-actions' },
            h('button', { className: 'quick-action-btn', onClick: () => setPage('workorders') },
              h('div', { className: 'qa-icon' }, '🔧'),
              h('div', { className: 'qa-label' }, 'New Work Order'),
              h('div', { className: 'qa-sub' }, 'Open service ticket')
            ),
            h('button', { className: 'quick-action-btn', onClick: () => setPage('sales') },
              h('div', { className: 'qa-icon' }, '💰'),
              h('div', { className: 'qa-label' }, 'New Sale'),
              h('div', { className: 'qa-sub' }, 'Open register')
            ),
            h('button', { className: 'quick-action-btn', onClick: () => setPage('customers') },
              h('div', { className: 'qa-icon' }, '👤'),
              h('div', { className: 'qa-label' }, 'Customer Lookup'),
              h('div', { className: 'qa-sub' }, 'Search customers')
            ),
            h('button', { className: 'quick-action-btn', onClick: () => setPage('workorders') },
              h('div', { className: 'qa-icon' }, '📋'),
              h('div', { className: 'qa-label' }, 'Work Orders'),
              h('div', { className: 'qa-sub' }, overdueCount + ' overdue')
            )
          )
        ),

        // Recent activity
        h('div', { className: 'card' },
          h('div', { className: 'dash-section-title' }, 'Recent Activity'),
          h('div', { className: 'activity-list' },
            recent.map((item, i) =>
              h('div', { key: i, className: 'activity-item' },
                h('div', { className: 'activity-dot ' + item.type }),
                h('div', { className: 'activity-text' }, item.text),
                h('div', { className: 'activity-time' }, item.time)
              )
            )
          )
        )
      )
    )
  );
}

/* ─────────────────────────────────────────────
   WORK ORDER — NEW FORM (slide panel)
───────────────────────────────────────────── */
function NewWOPanel({ onClose, onSave, staff }) {
  const [form, setForm] = useState({
    customer: '', item: '', service: 'Tune-Up Basic',
    notes: '', dueOn: '2026-05-27', mechanic: staff.name,
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.customer || !form.item) {
      toast('Customer and item are required', 'error');
      return;
    }
    setSaving(true);
    const newWO = {
      customer: form.customer,
      item: form.item,
      mechanic: form.mechanic.slice(0, 4).toUpperCase(),
      status: 'Open',
      dateIn: '2026-05-20',
      dueOn: form.dueOn,
      total: 0,
      daysOverdue: daysDiff(form.dueOn),
      notes: form.notes,
      service: form.service,
    };
    const result = await apiPost('/api/workorder', newWO);
    if (!result) {
      // Mock success
      newWO.id = 22028 + Math.floor(Math.random() * 100);
      toast('Work order created (offline mode)', 'success');
    } else {
      toast('Work order created', 'success');
    }
    setSaving(false);
    onSave(newWO);
  }

  return h('div', { className: 'modal-overlay', onClick: e => e.target === e.currentTarget && onClose() },
    h('div', { className: 'slide-panel' },
      h('div', { className: 'panel-header' },
        h('button', { className: 'btn btn-ghost btn-icon', onClick: onClose }, h(Icon.x)),
        h('div', { className: 'panel-title' }, 'New Work Order'),
        h('button', { className: 'btn btn-primary', onClick: handleSave, disabled: saving },
          saving ? h('span', { className: 'loading-spinner' }) : null,
          'Save WO'
        )
      ),
      h('div', { className: 'panel-body' },
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label' }, 'Customer Name'),
          h('input', {
            className: 'form-input',
            placeholder: 'e.g. John Smith',
            value: form.customer,
            onChange: e => set('customer', e.target.value),
          })
        ),
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label' }, 'Bike / Item'),
          h('input', {
            className: 'form-input',
            placeholder: 'e.g. Marin Rift Zone 29 Large',
            value: form.item,
            onChange: e => set('item', e.target.value),
          })
        ),
        h('div', { className: 'form-group' },
          h('label', { className: 'form-label' }, 'Service Type'),
          h('select', {
            className: 'form-select',
            value: form.service,
            onChange: e => set('service', e.target.value),
          },
            SERVICE_TYPES.map(s => h('option', { key: s, value: s }, s))
          )
        ),
        h('div', { className: 'form-row' },
          h('div', { className: 'form-group mb-0' },
            h('label', { className: 'form-label' }, 'Due Date'),
            h('input', {
              className: 'form-input',
              type: 'date',
              value: form.dueOn,
              onChange: e => set('dueOn', e.target.value),
            })
          ),
          h('div', { className: 'form-group mb-0' },
            h('label', { className: 'form-label' }, 'Assign Mechanic'),
            h('select', {
              className: 'form-select',
              value: form.mechanic,
              onChange: e => set('mechanic', e.target.value),
            },
              h('option', { value: '' }, 'Unassigned'),
              STAFF.map(s => h('option', { key: s.id, value: s.name }, s.name))
            )
          )
        ),
        h('div', { className: 'form-group mt-3' },
          h('label', { className: 'form-label' }, 'Notes'),
          h('textarea', {
            className: 'form-textarea',
            placeholder: 'Service notes, customer requests...',
            value: form.notes,
            onChange: e => set('notes', e.target.value),
          })
        )
      )
    )
  );
}

/* ─────────────────────────────────────────────
   WORK ORDER DETAIL (slide panel)
───────────────────────────────────────────── */
function WODetail({ wo, onClose, onUpdate, staff }) {
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([
    { text: 'Brake pads worn to metal - replaced front and rear.', by: 'Jason', time: '9:05 AM' },
    { text: 'Derailleur hanger was bent, straightened.', by: 'Jason', time: '8:50 AM' },
  ]);
  const [loading, setLoading] = useState(false);

  async function updateStatus(status) {
    setLoading(true);
    const result = await apiPost('/api/workorder/' + wo.id, { status });
    setLoading(false);
    toast('Status updated to ' + status, 'success');
    onUpdate({ ...wo, status });
  }

  function addNote() {
    if (!note.trim()) return;
    setNotes(n => [...n, { text: note.trim(), by: staff.name, time: 'Just now' }]);
    setNote('');
    toast('Note added', 'success');
  }

  const overdue = wo.daysOverdue > 0;

  return h('div', { className: 'modal-overlay', onClick: e => e.target === e.currentTarget && onClose() },
    h('div', { className: 'slide-panel' },
      h('div', { className: 'panel-header' },
        h('button', { className: 'btn btn-ghost btn-icon', onClick: onClose }, h(Icon.x)),
        h('div', { className: 'panel-title' }, 'WO #' + wo.id),
        loading ? h('span', { className: 'loading-spinner' }) : null
      ),

      h('div', { className: 'panel-body' },
        // Status line
        h('div', { className: 'flex items-center gap-2', style: { marginBottom: 16 } },
          h(StatusBadge, { status: wo.status }),
          overdue ? h('span', { className: 'badge badge-overdue' }, wo.daysOverdue + 'd overdue') : null
        ),

        // Info grid
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 } },
          h('div', null,
            h('div', { className: 'form-label', style: { marginBottom: 4 } }, 'Customer'),
            h('div', { style: { fontWeight: 600, fontSize: 15 } }, wo.customer)
          ),
          h('div', null,
            h('div', { className: 'form-label', style: { marginBottom: 4 } }, 'Mechanic'),
            h('div', null, wo.mechanic ? h('span', { className: 'mechanic-chip' }, wo.mechanic) : h('span', { className: 'text-muted' }, 'Unassigned'))
          ),
          h('div', null,
            h('div', { className: 'form-label', style: { marginBottom: 4 } }, 'Item / Bike'),
            h('div', { style: { fontSize: 13 } }, wo.item)
          ),
          h('div', null,
            h('div', { className: 'form-label', style: { marginBottom: 4 } }, 'Total'),
            h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 13 } }, wo.total > 0 ? fmt$(wo.total) : '-')
          ),
          h('div', null,
            h('div', { className: 'form-label', style: { marginBottom: 4 } }, 'Date In'),
            h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 13 } }, fmtDate(wo.dateIn))
          ),
          h('div', null,
            h('div', { className: 'form-label', style: { marginBottom: 4 } }, 'Due On'),
            h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 13, color: overdue ? 'var(--red)' : 'inherit' } }, fmtDate(wo.dueOn))
          )
        ),

        h('div', { className: 'divider' }),

        // Status buttons
        h('div', { className: 'form-label', style: { marginBottom: 8 } }, 'Update Status'),
        h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 } },
          ['Open', 'BOOKED', 'READY', 'READY-WO', 'Finished'].map(s =>
            h('button', {
              key: s,
              className: 'btn btn-secondary btn-sm' + (wo.status === s ? ' btn-primary' : ''),
              onClick: () => updateStatus(s),
              disabled: wo.status === s,
            }, s)
          )
        ),

        h('div', { className: 'divider' }),

        // Notes
        h('div', { className: 'form-label', style: { marginBottom: 8 } }, 'Notes'),
        notes.map((n, i) =>
          h('div', { key: i, className: 'wo-note-item' },
            h('div', { className: 'wo-note-meta' }, n.by + ' - ' + n.time),
            n.text
          )
        ),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
          h('input', {
            className: 'form-input',
            placeholder: 'Add a note...',
            value: note,
            onChange: e => setNote(e.target.value),
            onKeyDown: e => e.key === 'Enter' && addNote(),
            style: { flex: 1 },
          }),
          h('button', { className: 'btn btn-secondary', onClick: addNote }, 'Add')
        )
      )
    )
  );
}

/* ─────────────────────────────────────────────
   WORK ORDERS PAGE
───────────────────────────────────────────── */
function WorkOrders({ staff }) {
  const [workOrders, setWorkOrders] = useState(MOCK_WO);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mechFilter, setMechFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [detailWO, setDetailWO] = useState(null);
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    setLoading(true);
    apiGet('/api/workorders').then(data => {
      setLoading(false);
      if (data && Array.isArray(data.workOrders)) {
        setWorkOrders(data.workOrders);
        setUsingMock(false);
      }
    });
  }, []);

  function toggleSort(k) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  }

  const filtered = useMemo(() => {
    let r = workOrders;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(w => w.customer.toLowerCase().includes(q) || w.item.toLowerCase().includes(q) || String(w.id).includes(q));
    }
    if (statusFilter !== 'all') r = r.filter(w => w.status === statusFilter);
    if (mechFilter !== 'all') r = r.filter(w => (mechFilter === 'unassigned' ? !w.mechanic : w.mechanic?.toUpperCase().includes(mechFilter.toUpperCase())));

    r = [...r].sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') av = av.toLowerCase(), bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return r;
  }, [workOrders, search, statusFilter, mechFilter, sortKey, sortDir]);

  function handleSaveNew(newWO) {
    setWorkOrders(w => [{ ...newWO, id: newWO.id || 22028 + w.length }, ...w]);
    setShowNew(false);
    toast('WO created', 'success');
  }

  function handleUpdate(updated) {
    setWorkOrders(wos => wos.map(w => w.id === updated.id ? updated : w));
    setDetailWO(updated);
  }

  const overdueCount = workOrders.filter(w => w.daysOverdue > 0).length;

  const ThSort = ({ k, children }) =>
    h('th', {
      className: 'sortable',
      onClick: () => toggleSort(k),
    }, children, sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { className: 'page-header' },
      h('div', { className: 'page-title' }, 'Work Orders'),
      loading ? h('span', { className: 'loading-spinner', style: { marginLeft: 8 } }) : null,
      overdueCount > 0 ? h('span', { className: 'badge badge-overdue', style: { marginLeft: 8 } }, overdueCount + ' overdue') : null,
      h('div', { className: 'page-header-actions' },
        h('button', { className: 'btn btn-primary', onClick: () => setShowNew(true) },
          h(Icon.plus), 'New WO'
        )
      )
    ),

    h('div', { className: 'filter-bar' },
      h('div', { className: 'search-wrap' },
        h(Icon.search),
        h('input', {
          className: 'input-search',
          placeholder: 'Search customer or item...',
          value: search,
          onChange: e => setSearch(e.target.value),
        })
      ),
      h('select', {
        className: 'filter-select',
        value: statusFilter,
        onChange: e => setStatusFilter(e.target.value),
      },
        h('option', { value: 'all' }, 'All Status'),
        ['Open', 'READY', 'BOOKED', 'READY-WO', 'Finished'].map(s =>
          h('option', { key: s, value: s }, s)
        )
      ),
      h('select', {
        className: 'filter-select',
        value: mechFilter,
        onChange: e => setMechFilter(e.target.value),
      },
        h('option', { value: 'all' }, 'All Mechs'),
        h('option', { value: 'unassigned' }, 'Unassigned'),
        STAFF.map(s => h('option', { key: s.id, value: s.name }, s.name))
      ),
      usingMock ? h('div', { className: 'api-banner' }, '⚠ Showing mock data - POS API not yet deployed') : null
    ),

    h('div', { style: { flex: 1, overflow: 'auto', padding: '0 24px 24px' } },
      h('table', { className: 'data-table' },
        h('thead', null,
          h('tr', null,
            h(ThSort, { k: 'id' }, '#'),
            h(ThSort, { k: 'customer' }, 'Customer'),
            h('th', null, 'Item / Bike'),
            h('th', null, 'Status'),
            h(ThSort, { k: 'dateIn' }, 'Date In'),
            h(ThSort, { k: 'dueOn' }, 'Due On'),
            h('th', null, 'Overdue'),
            h('th', null, 'Mech'),
            h('th', { style: { textAlign: 'right' } }, 'Total')
          )
        ),
        h('tbody', null,
          filtered.length === 0
            ? h('tr', null, h('td', { colSpan: 9 },
                h('div', { className: 'empty-state' },
                  h('div', { className: 'es-icon' }, '🔧'),
                  h('p', null, 'No work orders match your filters')
                )
              ))
            : filtered.map(wo =>
                h('tr', {
                  key: wo.id,
                  className: wo.daysOverdue > 0 ? 'overdue-row' : '',
                  onClick: () => setDetailWO(wo),
                },
                  h('td', null, h('span', { className: 'wo-id-cell' }, '#', h('span', { className: 'id-num' }, wo.id))),
                  h('td', null, h('span', { className: 'customer-cell' }, wo.customer)),
                  h('td', null, h('span', { className: 'item-cell' }, wo.item)),
                  h('td', null, h(StatusBadge, { status: wo.status })),
                  h('td', null, h('span', { className: 'text-mono', style: { fontSize: 12 } }, fmtDate(wo.dateIn))),
                  h('td', null, h('span', {
                    className: 'text-mono',
                    style: { fontSize: 12, color: wo.daysOverdue > 0 ? 'var(--red)' : 'inherit' }
                  }, fmtDate(wo.dueOn))),
                  h('td', null,
                    wo.daysOverdue > 0
                      ? h('span', { className: 'days-overdue-cell red' }, '+' + wo.daysOverdue + 'd')
                      : wo.daysOverdue < -14
                        ? h('span', { className: 'days-overdue-cell dim' }, wo.daysOverdue + 'd')
                        : h('span', { className: 'days-overdue-cell green' }, wo.daysOverdue + 'd')
                  ),
                  h('td', null, wo.mechanic ? h('span', { className: 'mechanic-chip' }, wo.mechanic) : h('span', { className: 'text-muted', style:{fontSize:11} }, '-')),
                  h('td', null, h('span', { className: 'total-cell' }, wo.total > 0 ? fmt$(wo.total) : '-'))
                )
              )
        )
      )
    ),

    showNew ? h(NewWOPanel, { onClose: () => setShowNew(false), onSave: handleSaveNew, staff }) : null,
    detailWO ? h(WODetail, { wo: detailWO, onClose: () => setDetailWO(null), onUpdate: handleUpdate, staff }) : null
  );
}

/* ─────────────────────────────────────────────
   SALES / REGISTER
───────────────────────────────────────────── */
function Sales({ staff }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState('');
  const [discount, setDiscount] = useState('');
  const [usingMock, setUsingMock] = useState(false);
  const searchRef = useRef(null);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef(null);

  // Barcode scanner listener
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          setQuery(barcodeBuffer.current);
          doSearch(barcodeBuffer.current);
        }
        barcodeBuffer.current = '';
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ''; }, 100);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  async function doSearch(q) {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const data = await apiGet('/api/items-search?q=' + encodeURIComponent(q));
    setSearching(false);
    if (data && Array.isArray(data.items)) {
      setResults(data.items);
      setUsingMock(false);
    } else {
      const q2 = q.toLowerCase();
      setResults(MOCK_INVENTORY.filter(i => i.name.toLowerCase().includes(q2) || i.sku.toLowerCase().includes(q2)));
      setUsingMock(true);
    }
  }

  const searchDebounce = useRef(null);
  function handleQueryChange(v) {
    setQuery(v);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => doSearch(v), 280);
  }

  function addToCart(item) {
    setCart(c => {
      const ex = c.find(l => l.id === item.id);
      if (ex) return c.map(l => l.id === item.id ? { ...l, qty: l.qty + 1 } : l);
      return [...c, { ...item, qty: 1 }];
    });
    toast(item.name + ' added', 'success');
  }

  function removeFromCart(id) { setCart(c => c.filter(l => l.id !== id)); }

  function adjustQty(id, delta) {
    setCart(c => c.map(l => l.id === id
      ? { ...l, qty: Math.max(0, l.qty + delta) }
      : l
    ).filter(l => l.qty > 0));
  }

  const discPct = parseFloat(discount) || 0;
  const subtotal = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const discAmt = subtotal * (discPct / 100);
  const postDisc = subtotal - discAmt;
  const gst = postDisc * GST;
  const pst = postDisc * PST;
  const total = postDisc + gst + pst;

  async function handlePayment(method) {
    if (cart.length === 0) { toast('Cart is empty', 'error'); return; }
    const result = await apiPost('/api/sale', { items: cart, customer, total, method, staff: staff.name });
    toast('Sale complete - ' + fmt$(total) + ' via ' + method, 'success');
    setCart([]);
    setCustomer('');
    setDiscount('');
    setQuery('');
    setResults([]);
  }

  async function handleQuote() {
    toast('Saved as quote (offline mode)', '');
  }

  return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { className: 'page-header' },
      h('div', { className: 'page-title' }, 'Sales / Register'),
      h('div', { className: 'page-subtitle' }, staff.name + ' - ' + new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })),
      h('div', { className: 'page-header-actions' },
        h('div', { className: 'barcode-indicator' },
          h('div', { className: 'dot' }),
          'Barcode ready'
        )
      )
    ),

    h('div', { className: 'register-layout', style: { flex: 1, overflow: 'hidden' } },
      // Left: item search
      h('div', { className: 'register-items' },
        h('div', { className: 'register-search' },
          h('div', { className: 'search-wrap', style: { flex: 1 } },
            h(Icon.search),
            h('input', {
              ref: searchRef,
              className: 'input-search',
              placeholder: 'Search item by name or SKU...',
              value: query,
              onChange: e => handleQueryChange(e.target.value),
              autoFocus: true,
            })
          ),
          searching ? h('span', { className: 'loading-spinner' }) : null
        ),

        h('div', { className: 'item-results' },
          query && results.length === 0 && !searching
            ? h('div', { className: 'no-results' },
                h('div', { className: 'nr-icon' }, '🔍'),
                'No items found for "' + query + '"'
              )
            : !query
              ? h('div', { className: 'no-results' },
                  h('div', { className: 'nr-icon' }, '⌨'),
                  h('p', null, 'Type to search inventory'),
                  h('p', { style: { marginTop: 8, fontSize: 12, color: 'var(--text-muted)' } }, 'or scan barcode to auto-add')
                )
              : results.map(item =>
                  h('div', { key: item.id, className: 'item-result-row', onClick: () => addToCart(item) },
                    h('div', { style: { flex: 1 } },
                      h('div', { className: 'item-result-name' }, item.name),
                      h('div', { className: 'item-result-dept' }, item.sku + ' - ' + item.dept)
                    ),
                    h('div', { className: 'item-result-qty', style: { color: item.qty <= 2 ? 'var(--orange)' : 'var(--text-muted)' } },
                      item.qty <= 0 ? 'OUT' : 'Qty: ' + item.qty
                    ),
                    h('div', { className: 'item-result-price' }, fmt$(item.price)),
                    h('div', { className: 'btn btn-primary btn-sm' }, h(Icon.plus))
                  )
                )
        )
      ),

      // Right: cart
      h('div', { className: 'cart-panel' },
        h('div', { className: 'cart-header' },
          h('div', { className: 'cart-title' }, 'Cart', cart.length > 0 ? h('span', { style: { fontSize: 12, fontFamily: 'var(--font-mono)', marginLeft: 6, color: 'var(--text-dim)' } }, cart.length + ' item' + (cart.length === 1 ? '' : 's')) : null),
          cart.length > 0 ? h('button', { className: 'btn btn-ghost btn-sm', onClick: () => setCart([]) }, 'Clear') : null
        ),

        h('div', { className: 'cart-customer' },
          h('input', {
            className: 'form-input',
            placeholder: 'Customer name (optional)',
            value: customer,
            onChange: e => setCustomer(e.target.value),
          })
        ),

        cart.length === 0
          ? h('div', { className: 'cart-empty' },
              h('div', { className: 'ce-icon' }, '🛒'),
              h('p', null, 'Cart is empty'),
              h('p', { style: { fontSize: 12 } }, 'Search and click items to add')
            )
          : h('div', { className: 'cart-items' },
              cart.map(line =>
                h('div', { key: line.id, className: 'cart-line' },
                  h('div', { className: 'cart-line-info' },
                    h('div', { className: 'cart-line-name' }, line.name),
                    h('div', { className: 'cart-line-price' }, fmt$(line.price) + ' ea')
                  ),
                  h('div', { className: 'cart-line-controls' },
                    h('button', { className: 'qty-btn', onClick: () => adjustQty(line.id, -1) }, '-'),
                    h('span', { className: 'qty-display' }, line.qty),
                    h('button', { className: 'qty-btn', onClick: () => adjustQty(line.id, 1) }, '+')
                  ),
                  h('div', { className: 'cart-line-subtotal' }, fmt$(line.price * line.qty)),
                  h('button', { className: 'void-btn', onClick: () => removeFromCart(line.id) }, '×')
                )
              )
            ),

        h('div', { className: 'cart-totals' },
          h('div', { className: 'cart-total-line' },
            h('span', { className: 'label' }, 'Subtotal'),
            h('span', { className: 'value' }, fmt$(subtotal))
          ),
          h('div', { className: 'discount-row' },
            h('span', { style: { fontSize: 12, color: 'var(--text-dim)', flex: 1 } }, 'Discount (%)'),
            h('input', {
              className: 'discount-input',
              type: 'number',
              min: 0,
              max: 100,
              placeholder: '0',
              value: discount,
              onChange: e => setDiscount(e.target.value),
            }),
            h('span', { style: { fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' } }, discPct > 0 ? '-' + fmt$(discAmt) : '')
          ),
          h('div', { className: 'cart-total-line' },
            h('span', { className: 'label' }, 'GST (5%)'),
            h('span', { className: 'value' }, fmt$(gst))
          ),
          h('div', { className: 'cart-total-line' },
            h('span', { className: 'label' }, 'PST (7%)'),
            h('span', { className: 'value' }, fmt$(pst))
          ),
          h('div', { className: 'cart-total-line grand-total' },
            h('span', { className: 'label' }, 'TOTAL'),
            h('span', { className: 'value' }, fmt$(total))
          )
        ),

        h('div', { className: 'cart-actions' },
          h('div', { className: 'payment-btns' },
            h('button', { className: 'btn btn-primary btn-lg', onClick: () => handlePayment('Card'), disabled: cart.length === 0 }, 'Card'),
            h('button', { className: 'btn btn-secondary btn-lg', onClick: () => handlePayment('Cash'), disabled: cart.length === 0 }, 'Cash'),
            h('button', { className: 'btn btn-secondary btn-lg', onClick: () => handlePayment('Other'), disabled: cart.length === 0 }, 'Other')
          ),
          h('button', { className: 'btn btn-ghost', onClick: handleQuote, disabled: cart.length === 0 }, 'Save as Quote')
        )
      )
    )
  );
}

/* ─────────────────────────────────────────────
   CUSTOMER DETAIL (slide panel)
───────────────────────────────────────────── */
function CustomerDetail({ customer: c, onClose }) {
  const recentWOs = MOCK_WO.filter(w => w.customer.includes(c.lastName));

  return h('div', { className: 'modal-overlay', onClick: e => e.target === e.currentTarget && onClose() },
    h('div', { className: 'slide-panel' },
      h('div', { className: 'panel-header' },
        h('button', { className: 'btn btn-ghost btn-icon', onClick: onClose }, h(Icon.x)),
        h('div', { className: 'panel-title' }, c.firstName + ' ' + c.lastName)
      ),
      h('div', { className: 'panel-body' },
        // Avatar + info
        h('div', { style: { display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' } },
          h('div', { className: 'customer-avatar-lg', style: { width: 56, height: 56, fontSize: 20 } }, initials(c.firstName + ' ' + c.lastName)),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 20, fontWeight: 600, marginBottom: 8 } }, c.firstName + ' ' + c.lastName),
            h('div', { className: 'contact-item', style: { marginBottom: 4 } }, '✉ ' + c.email),
            h('div', { className: 'contact-item' }, '📞 ' + c.phone)
          )
        ),

        h('div', { style: { display: 'flex', gap: 24, marginBottom: 20, padding: '16px', background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' } },
          h('div', { className: 'cs-stat' },
            h('div', { className: 'cs-val', style: { color: 'var(--green)' } }, fmt$(c.totalSpent)),
            h('div', { className: 'cs-label' }, 'Total Spent')
          ),
          h('div', { className: 'cs-stat' },
            h('div', { className: 'cs-val' }, c.woCount),
            h('div', { className: 'cs-label' }, 'Work Orders')
          )
        ),

        h('div', { className: 'divider' }),

        h('div', { className: 'form-label', style: { marginBottom: 8 } }, 'Recent Work Orders'),
        recentWOs.length === 0
          ? h('div', { style: { color: 'var(--text-muted)', fontSize: 13 } }, 'No work orders found')
          : recentWOs.map(wo =>
              h('div', { key: wo.id, style: { padding: '10px 12px', background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 6, display: 'flex', gap: 10, alignItems: 'center' } },
                h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' } }, '#' + wo.id),
                h('span', { style: { flex: 1, fontSize: 13 } }, wo.item),
                h(StatusBadge, { status: wo.status }),
                h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' } }, fmtDate(wo.dateIn))
              )
            )
      )
    )
  );
}

/* ─────────────────────────────────────────────
   CUSTOMERS PAGE
───────────────────────────────────────────── */
function Customers() {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState(MOCK_CUSTOMERS);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(true);
  const [detail, setDetail] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const debounce = useRef(null);

  useEffect(() => {
    setLoading(true);
    apiGet('/api/customers?q=').then(data => {
      setLoading(false);
      if (data && Array.isArray(data.customers)) {
        setCustomers(data.customers);
        setUsingMock(false);
      }
    });
  }, []);

  function handleSearch(v) {
    setSearch(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      if (!v.trim()) {
        setCustomers(MOCK_CUSTOMERS);
        return;
      }
      setLoading(true);
      const data = await apiGet('/api/customers?q=' + encodeURIComponent(v));
      setLoading(false);
      if (data && Array.isArray(data.customers)) {
        setCustomers(data.customers);
      } else {
        const q = v.toLowerCase();
        setCustomers(MOCK_CUSTOMERS.filter(c =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q)
        ));
      }
    }, 300);
  }

  function handleNewCustomer() {
    if (!newForm.firstName || !newForm.lastName) {
      toast('First and last name required', 'error');
      return;
    }
    const nc = { ...newForm, id: Date.now(), totalSpent: 0, woCount: 0 };
    setCustomers(c => [nc, ...c]);
    setShowNew(false);
    setNewForm({ firstName: '', lastName: '', email: '', phone: '' });
    toast(newForm.firstName + ' ' + newForm.lastName + ' added', 'success');
  }

  return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { className: 'page-header' },
      h('div', { className: 'page-title' }, 'Customers'),
      loading ? h('span', { className: 'loading-spinner', style: { marginLeft: 8 } }) : null,
      h('div', { className: 'page-header-actions' },
        h('button', { className: 'btn btn-primary', onClick: () => setShowNew(s => !s) },
          h(Icon.plus), 'New Customer'
        )
      )
    ),

    h('div', { className: 'filter-bar' },
      h('div', { className: 'search-wrap', style: { maxWidth: 400 } },
        h(Icon.search),
        h('input', {
          className: 'input-search',
          placeholder: 'Search name, email or phone...',
          value: search,
          onChange: e => handleSearch(e.target.value),
          autoFocus: true,
        })
      ),
      usingMock ? h('div', { className: 'api-banner', style: { marginBottom: 0 } }, '⚠ Mock data') : null
    ),

    showNew ? h('div', { style: { padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' } },
      h('div', { style: { display: 'flex', gap: 12, alignItems: 'flex-end' } },
        ...[
          { k: 'firstName', label: 'First Name', ph: 'John' },
          { k: 'lastName',  label: 'Last Name',  ph: 'Smith' },
          { k: 'email',     label: 'Email',       ph: 'john@example.com' },
          { k: 'phone',     label: 'Phone',       ph: '250-555-0100' },
        ].map(f =>
          h('div', { key: f.k, className: 'form-group mb-0', style: { flex: 1 } },
            h('label', { className: 'form-label' }, f.label),
            h('input', {
              className: 'form-input',
              placeholder: f.ph,
              value: newForm[f.k],
              onChange: e => setNewForm(p => ({ ...p, [f.k]: e.target.value })),
              onKeyDown: e => e.key === 'Enter' && handleNewCustomer(),
            })
          )
        ),
        h('button', { className: 'btn btn-primary', onClick: handleNewCustomer }, 'Add'),
        h('button', { className: 'btn btn-ghost', onClick: () => setShowNew(false) }, 'Cancel')
      )
    ) : null,

    h('div', { className: 'customer-grid' },
      customers.length === 0
        ? h('div', { className: 'empty-state', style: { gridColumn: '1/-1' } },
            h('div', { className: 'es-icon' }, '👤'),
            h('p', null, 'No customers found')
          )
        : customers.map(c =>
            h('div', {
              key: c.id,
              className: 'customer-card',
              onClick: () => setDetail(c),
            },
              h('div', { className: 'customer-card-top' },
                h('div', { className: 'customer-avatar-lg' }, initials(c.firstName + ' ' + c.lastName)),
                h('div', { style: { flex: 1, minWidth: 0 } },
                  h('div', { className: 'customer-card-name' }, c.firstName + ' ' + c.lastName),
                  h('div', { className: 'customer-card-email' }, c.email)
                )
              ),
              c.phone ? h('div', { style: { fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 10 } }, c.phone) : null,
              h('div', { className: 'customer-card-stats' },
                h('div', { className: 'cs-stat' },
                  h('div', { className: 'cs-val', style: { color: 'var(--green)' } }, fmt$(c.totalSpent)),
                  h('div', { className: 'cs-label' }, 'Spent')
                ),
                h('div', { className: 'cs-stat' },
                  h('div', { className: 'cs-val' }, c.woCount),
                  h('div', { className: 'cs-label' }, 'WOs')
                )
              )
            )
          )
    ),

    detail ? h(CustomerDetail, { customer: detail, onClose: () => setDetail(null) }) : null
  );
}

/* ─────────────────────────────────────────────
   INVENTORY PAGE
───────────────────────────────────────────── */
function Inventory() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState(MOCK_INVENTORY);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(true);
  const [deptFilter, setDeptFilter] = useState('all');
  const debounce = useRef(null);

  useEffect(() => {
    setLoading(true);
    apiGet('/api/parts').then(data => {
      setLoading(false);
      if (data && (Array.isArray(data) || Array.isArray(data.items))) {
        setItems(Array.isArray(data) ? data : data.items);
        setUsingMock(false);
      }
    });
  }, []);

  function handleSearch(v) {
    setQuery(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      if (!v.trim()) { setItems(MOCK_INVENTORY); return; }
      setLoading(true);
      const data = await apiGet('/api/items-search?q=' + encodeURIComponent(v));
      setLoading(false);
      if (data && Array.isArray(data.items)) {
        setItems(data.items);
        setUsingMock(false);
      } else {
        const q = v.toLowerCase();
        setItems(MOCK_INVENTORY.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.dept.toLowerCase().includes(q)));
      }
    }, 280);
  }

  const depts = ['all', ...Array.from(new Set(MOCK_INVENTORY.map(i => i.dept)))];

  const filtered = useMemo(() => {
    if (deptFilter === 'all') return items;
    return items.filter(i => i.dept === deptFilter);
  }, [items, deptFilter]);

  function stockCls(qty) {
    if (qty <= 0) return 'out-stock';
    if (qty <= 2) return 'low-stock';
    return 'in-stock';
  }

  function stockLabel(qty) {
    if (qty <= 0) return 'OUT';
    if (qty <= 2) return 'LOW: ' + qty;
    return qty;
  }

  return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { className: 'page-header' },
      h('div', { className: 'page-title' }, 'Inventory'),
      loading ? h('span', { className: 'loading-spinner', style: { marginLeft: 8 } }) : null,
      h('div', { className: 'page-header-actions' })
    ),

    h('div', { className: 'filter-bar' },
      h('div', { className: 'search-wrap' },
        h(Icon.search),
        h('input', {
          className: 'input-search',
          placeholder: 'Search items or SKU...',
          value: query,
          onChange: e => handleSearch(e.target.value),
          autoFocus: true,
        })
      ),
      h('select', {
        className: 'filter-select',
        value: deptFilter,
        onChange: e => setDeptFilter(e.target.value),
      },
        depts.map(d => h('option', { key: d, value: d }, d === 'all' ? 'All Depts' : d))
      ),
      usingMock ? h('div', { className: 'api-banner', style: { marginBottom: 0 } }, '⚠ Mock data - connect Lightspeed') : null
    ),

    h('div', { className: 'inventory-table-wrap', style: { flex: 1, overflow: 'auto', paddingTop: 0 } },
      h('table', { className: 'data-table' },
        h('thead', null,
          h('tr', null,
            h('th', null, 'SKU'),
            h('th', null, 'Name'),
            h('th', null, 'Dept'),
            h('th', { style: { textAlign: 'center' } }, 'Stock'),
            h('th', { style: { textAlign: 'right' } }, 'Price')
          )
        ),
        h('tbody', null,
          filtered.length === 0
            ? h('tr', null, h('td', { colSpan: 5 },
                h('div', { className: 'empty-state' },
                  h('div', { className: 'es-icon' }, '📦'),
                  h('p', null, 'No items found')
                )
              ))
            : filtered.map(item =>
                h('tr', { key: item.id },
                  h('td', null, h('span', { className: 'text-mono', style: { fontSize: 12, color: 'var(--text-muted)' } }, item.sku)),
                  h('td', null, h('span', { style: { fontWeight: 500 } }, item.name)),
                  h('td', null, h('span', { className: 'text-mono', style: { fontSize: 12, color: 'var(--text-dim)' } }, item.dept)),
                  h('td', { style: { textAlign: 'center' } },
                    h('span', { className: 'stock-badge ' + stockCls(item.qty) }, stockLabel(item.qty))
                  ),
                  h('td', { style: { textAlign: 'right' } },
                    h('span', { className: 'text-mono', style: { fontWeight: 500 } }, fmt$(item.price))
                  )
                )
              )
        )
      )
    )
  );
}

/* ─────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────── */
function App() {
  const [staff, setStaff] = useState(() => {
    try {
      const s = sessionStorage.getItem('pos-staff');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [page, setPage] = useState('dashboard');
  const [workOrders, setWorkOrders] = useState(MOCK_WO);

  function handleLogin(s) {
    setStaff(s);
    setPage('dashboard');
  }

  function handleLock() {
    sessionStorage.removeItem('pos-staff');
    setStaff(null);
  }

  const overdueCount = workOrders.filter(w => w.daysOverdue > 0).length;

  if (!staff) {
    return h('div', null,
      h(LoginScreen, { onLogin: handleLogin }),
      h(Toast)
    );
  }

  function renderPage() {
    switch (page) {
      case 'dashboard':  return h(Dashboard, { setPage, workOrders });
      case 'workorders': return h(WorkOrders, { staff });
      case 'sales':      return h(Sales, { staff });
      case 'customers':  return h(Customers);
      case 'inventory':  return h(Inventory);
      default:           return h(Dashboard, { setPage, workOrders });
    }
  }

  return h('div', { id: 'app' },
    h(Sidebar, { page, setPage, staff, onLock: handleLock, overdueCount }),
    h('main', { id: 'main' }, renderPage()),
    h(Toast)
  );
}

/* ── Mount ── */
const root = createRoot(document.getElementById('root'));
root.render(h(App));
