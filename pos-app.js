/* ChainLine POS v1.0 — 2026-05-20
 * React 18 via CDN. No JSX, no Babel. Pure createElement.
 * Design: design_handoff_chainline_pos/README.md
 * Worker: https://still-term-f1ec.taocaruso77.workers.dev
 */

'use strict';

const { createElement: h, useState, useEffect, useRef, Fragment } = React;
const { createRoot } = ReactDOM;

/* ── Constants ── */
const WORKER = 'https://still-term-f1ec.taocaruso77.workers.dev';

const STAFF = [
  { id: 1, name: 'Jason',   initials: 'JA', pin: '1234', role: 'Mechanic', tone: 'jk' },
  { id: 2, name: 'Florian', initials: 'FL', pin: '5678', role: 'Mechanic', tone: 'sr' },
  { id: 3, name: 'Darrin',  initials: 'DA', pin: '7777', role: 'Manager',  tone: 'am' },
  { id: 4, name: 'Tao',     initials: 'TC', pin: '7777', role: 'Owner',    tone: 'mb' },
];

const MECHANICS = [
  { initials: 'AM', name: 'Avery Miller', tone: 'am', load: '3 open' },
  { initials: 'JK', name: 'Jude Kovac',  tone: 'jk', load: '5 open' },
  { initials: 'SR', name: 'Sam Reyes',   tone: 'sr', load: '2 open' },
  { initials: 'MB', name: 'Mira Bell',   tone: 'mb', load: '4 open' },
];

const SERVICE_TYPES = [
  'Basic tune', 'Full tune', 'Premium tune', 'Brake bleed', 'Drivetrain replace',
  'Suspension service', 'Shock service', 'Wheel build', 'Tubeless setup', 'Bike fit', 'Other',
];

const MOCK_WO = [
  { id: 'WO-2391', cust: 'Devon Tran',        phone: '(250) 555-0188', bike: 'Norco Sight C2 \xb7 2023 \xb7 Forest Green',  svc: 'Drivetrain replace',         due: 'May 20', dueState: 'today',   status: 'ready',      mech: 'AM', tone: 'am', prio: false, total: 312.50 },
  { id: 'WO-2388', cust: 'Hannah Riise',       phone: '(250) 555-0142', bike: 'Santa Cruz Bronson \xb7 CC X01',               svc: 'Suspension service',         due: 'May 20', dueState: 'today',   status: 'inprogress', mech: 'JK', tone: 'jk', prio: true,  total: 226.81 },
  { id: 'WO-2382', cust: 'Marc Lefebvre',      phone: '(250) 555-0119', bike: 'Trek Fuel EX 8 \xb7 Lithium Grey',             svc: 'Full tune + brake bleed',    due: 'May 18', dueState: 'overdue', overdueBy: '2d late', status: 'open',  mech: 'SR', tone: 'sr', prio: true,  total: 185.00 },
  { id: 'WO-2402', cust: 'Priya Sharma',       phone: '(778) 555-0207', bike: 'Specialized Stumpjumper Comp',                 svc: 'Booking \xb7 pre-season tune',due: 'May 22', status: 'booked',    mech: 'MB', tone: 'mb', prio: false, total: 0 },
  { id: 'WO-2379', cust: 'Owen Bartholomew',   phone: '(250) 555-0166', bike: 'Kona Process 134 \xb7 2022',                   svc: 'Wheel build \xb7 rear',       due: 'May 17', dueState: 'overdue', overdueBy: '3d late', status: 'open',  mech: 'AM', tone: 'am', prio: false, total: 275.00 },
  { id: 'WO-2399', cust: 'Eli Constantine',    phone: '(604) 555-0152', bike: 'Yeti SB140 LR \xb7 Cobalt',                    svc: 'Shock service \xb7 Float X',  due: 'May 21', status: 'inprogress', mech: 'JK', tone: 'jk', prio: false, total: 145.00 },
  { id: 'WO-2404', cust: 'Mei Ito',            phone: '(250) 555-0173', bike: 'Rocky Mountain Altitude',                      svc: 'Booking \xb7 derailleur align',due: 'May 23', status: 'booked',   mech: 'SR', tone: 'sr', prio: false, total: 0 },
  { id: 'WO-2395', cust: 'Jasper Quinn-Holden', phone: '(250) 555-0131',bike: 'Pivot Trail 429 \xb7 Slate',                   svc: 'Tubeless setup + bearing',   due: 'May 20', dueState: 'today',   status: 'ready',      mech: 'MB', tone: 'mb', prio: false, total: 88.50 },
  { id: 'WO-2387', cust: 'Sienna Park',        phone: '(250) 555-0145', bike: 'Devinci Marshall A29',                         svc: 'Hydraulic line replace',     due: 'May 21', status: 'open',      mech: 'AM', tone: 'am', prio: false, total: 95.00 },
  { id: 'WO-2403', cust: 'Augustin Vega',      phone: '(250) 555-0198', bike: 'Cerv\xe9lo Aspero \xb7 Champagne',             svc: 'Booking \xb7 pedal swap + fit',due: 'May 24', status: 'booked',   mech: 'JK', tone: 'jk', prio: false, total: 0 },
];

const MOCK_CUSTOMERS = [
  { id: 1, name: 'Hannah Riise',    phone: '(250) 555-0142', bikes: 3, memberSince: '2021-03-14' },
  { id: 2, name: 'Devon Tran',      phone: '(250) 555-0188', bikes: 2, memberSince: '2020-07-22' },
  { id: 3, name: 'Marc Lefebvre',   phone: '(250) 555-0119', bikes: 1, memberSince: '2019-01-08' },
  { id: 4, name: 'Hannah Kowalski', phone: '(250) 555-0319', bikes: 1, memberSince: '2024-04-11' },
  { id: 5, name: 'Priya Sharma',    phone: '(778) 555-0207', bikes: 2, memberSince: '2022-09-30' },
];

const MOCK_CATALOG = [
  { sku: 'SHIM-XT-CS-12',   name: 'Shimano XT M8100 Cassette \xb7 12-spd',       price: 189.00, stock: 3,  low: false },
  { sku: 'TIRE-MAXX-29-DH', name: 'Maxxis Minion DHF 29\xd72.5 \xb7 3C MaxxGrip', price: 84.00,  stock: 8,  low: false },
  { sku: 'LAB-INSTALL-CS',  name: 'Labour \xb7 Cassette install',                  price: 25.00,  stock: 99, low: false },
  { sku: 'CHAIN-XT-126L',   name: 'Shimano XT Chain \xb7 126L',                   price: 62.00,  stock: 5,  low: false },
  { sku: 'BRAKE-PAD-CODE',  name: 'SRAM Code Brake Pads \xb7 Metallic',           price: 38.00,  stock: 14, low: false },
  { sku: 'GREASE-SLICK',    name: 'SlickHoney Suspension Grease \xb7 32g',        price: 18.00,  stock: 6,  low: true  },
  { sku: 'GRIP-ODI-ELITE',  name: 'ODI Elite Pro Lock-On Grips',                  price: 32.00,  stock: 9,  low: false },
  { sku: 'TUBE-29-PRES',    name: '29" Tube \xb7 Presta Valve',                   price: 11.00,  stock: 38, low: false },
  { sku: 'SVC-TUNE-B',      name: 'Marin Tune-Up Basic',                          price: 75.00,  stock: 99, low: false },
  { sku: 'SVC-TUNE-S',      name: 'Marin Tune-Up Standard',                       price: 120.00, stock: 99, low: false },
];

/* ── Utilities ── */
function fmt$(n) {
  return '$' + Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function round2(n) { return Math.round(n * 100) / 100; }

/* ── API ── */
async function apiGet(path) {
  try {
    const r = await fetch(WORKER + path);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch { return null; }
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
  } catch { return null; }
}

/* ── Toast ── */
let _toastSetter = null;
function Toast() {
  const [toasts, setToasts] = useState([]);
  _toastSetter = setToasts;
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts(p => p.slice(1)), 3000);
    return () => clearTimeout(t);
  }, [toasts]);
  return h('div', { className: 'toast-container' },
    ...toasts.map((t, i) =>
      h('div', { key: i, className: 'toast ' + (t.type || '') },
        t.type === 'success' ? '✓ ' : t.type === 'error' ? '✕ ' : '\xb7 ',
        t.message
      )
    )
  );
}
function toast(msg, type) { if (_toastSetter) _toastSetter(p => [...p, { message: msg, type: type || '' }]); }

/* ── SVG Icons ── */
const Ico = {
  Dashboard: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2'},
      h('rect',{x:'2',y:'2',width:'5',height:'6'}),h('rect',{x:'9',y:'2',width:'5',height:'3'}),
      h('rect',{x:'2',y:'10',width:'5',height:'4'}),h('rect',{x:'9',y:'7',width:'5',height:'7'})),
  Wrench: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'M10.5 2.5a3 3 0 0 0-3.7 3.7l-4.5 4.5 1.5 1.5 4.5-4.5a3 3 0 0 0 3.7-3.7l-1.7 1.7-1.5-1.5 1.7-1.7Z'})),
  Cart: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'M1.5 2.5h2l1.6 7.4a1 1 0 0 0 1 .8h5.6a1 1 0 0 0 1-.8L14 5H4.2'}),
      h('circle',{cx:'6',cy:'13.2',r:'1'}),h('circle',{cx:'12',cy:'13.2',r:'1'})),
  Users: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round',strokeLinejoin:'round'},
      h('circle',{cx:'6',cy:'5.5',r:'2.2'}),h('path',{d:'M2.2 13c0-2 1.7-3.4 3.8-3.4S9.8 11 9.8 13'}),
      h('circle',{cx:'11',cy:'6',r:'1.8'}),h('path',{d:'M10 9.8c2 0 3.8 1.2 3.8 3.2'})),
  Box: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinejoin:'round'},
      h('path',{d:'M8 1.6 2 4v8l6 2.4L14 12V4L8 1.6Z'}),h('path',{d:'M2 4l6 2.4L14 4'}),h('path',{d:'M8 6.4V14.4'})),
  Search: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.4',strokeLinecap:'round'},
      h('circle',{cx:'7',cy:'7',r:'4.5'}),h('path',{d:'m10.5 10.5 3 3'})),
  Plus: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.4',strokeLinecap:'round'},
      h('path',{d:'M8 3v10M3 8h10'})),
  Calendar: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2'},
      h('rect',{x:'2',y:'3',width:'12',height:'11'}),h('path',{d:'M2 6h12M5 2v2M11 2v2'})),
  Flag: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinejoin:'round'},
      h('path',{d:'M3.5 14V2.5h8l-1.5 2.5L11.5 8H3.5'})),
  Trash: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('path',{d:'M3 4.5h10M6 4.5V3h4v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5'})),
  Card: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2'},
      h('rect',{x:'1.5',y:'3.5',width:'13',height:'9'}),h('path',{d:'M1.5 6.5h13'})),
  Cash: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2'},
      h('rect',{x:'1.5',y:'4',width:'13',height:'8'}),h('circle',{cx:'8',cy:'8',r:'1.7'})),
  Dots: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'currentColor'},
      h('circle',{cx:'4',cy:'8',r:'1'}),h('circle',{cx:'8',cy:'8',r:'1'}),h('circle',{cx:'12',cy:'8',r:'1'})),
  ArrowUp: ({ size=12 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.4',strokeLinecap:'round'},
      h('path',{d:'M8 12V4M4.5 7.5 8 4l3.5 3.5'})),
  Check: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.6',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'m3 8 3.5 3.5L13 5'})),
  Clock: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2'},
      h('circle',{cx:'8',cy:'8',r:'6'}),h('path',{d:'M8 4.5V8l2.5 1.5'})),
  ChevronRight: ({ size=12 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.5',strokeLinecap:'round'},
      h('path',{d:'m6 3 4 5-4 5'})),
};

/* ── Atoms ── */
function Badge({ kind, children }) {
  return h('span', { className: 'badge ' + kind },
    h('span', { className: 'dot' }), children);
}

function AvInit({ initials, tone }) {
  return h('span', { className: 'av-init ' + (tone || '') }, initials);
}

function PageHead({ title, sub, actions }) {
  return h('div', { className: 'page-head' },
    h('div', null,
      sub && h('div', { className: 'page-sub' }, sub),
      h('div', { className: 'page-title' }, title)
    ),
    actions && h('div', { className: 'page-head-actions' }, ...actions)
  );
}

function Field({ label, required, hint, children }) {
  return h('div', { className: 'field' },
    h('label', { className: 'field-label' },
      label,
      required && h('span', { className: 'req' }, '*')
    ),
    children,
    hint && h('div', { className: 'field-hint' }, hint)
  );
}

function Toggle({ on, onChange, label, sub }) {
  return h('div', {
    className: 'toggle ' + (on ? 'on' : ''),
    onClick: () => onChange && onChange(!on),
    role: 'switch', 'aria-checked': on,
  },
    h('div', { className: 'track' }, h('div', { className: 'thumb' })),
    label && h('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: '1.15' } },
      h('span', { className: 'lbl' }, label),
      sub && h('span', { className: 'lbl-sub' }, sub)
    )
  );
}

/* ─────────────────────────────────────────
   LOGIN / PIN SCREEN
───────────────────────────────────────── */
function LoginScreen({ onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  function selectStaff(s) { setSelected(s); setPin(''); setError(''); }

  function pressKey(k) {
    if (!selected) { setError('Select a staff member first'); return; }
    if (k === 'del') { setPin(p => p.slice(0, -1)); setError(''); return; }
    const next = pin + k;
    setPin(next);
    if (next.length >= 4) setTimeout(() => tryLogin(next), 80);
  }

  function tryLogin(p) {
    const match = STAFF.find(s => s.id === selected.id && s.pin === p);
    if (match) {
      try { sessionStorage.setItem('pos-staff', JSON.stringify(match)); } catch {}
      onLogin(match);
    } else {
      setError('Wrong PIN');
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 400);
    }
  }

  const keys = ['1','2','3','4','5','6','7','8','9','del','0','ok'];

  return h('div', { id: 'login-screen' },
    h('div', { className: 'login-logo' },
      h('div', { className: 'brand-mark-lg' }),
      h('h1', null, 'ChainLine POS'),
      h('p', null, 'Workshop Terminal \xb7 KEL-01')
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
      h('div', { className: 'pin-label' }, selected ? 'Enter PIN for ' + selected.name : 'Select a staff member'),
      h('div', { className: 'pin-display' },
        [0,1,2,3].map(i =>
          h('div', { key: i, className: 'pin-dot' + (i < pin.length ? ' filled' : '') + (shake ? ' error' : '') })
        )
      ),
      h('div', { className: 'pin-grid' },
        keys.map(k =>
          h('button', {
            key: k,
            className: 'pin-key' + (k === 'del' ? ' delete' : ''),
            onClick: () => k === 'ok' ? (pin.length >= 4 ? tryLogin(pin) : null) : pressKey(k),
          }, k === 'del' ? '⌫' : k === 'ok' ? '↵' : k)
        )
      ),
      h('div', { className: 'pin-error' }, error)
    )
  );
}

/* ─────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────── */
const NAV_MAIN = [
  { id: 'dashboard',   label: 'Dashboard',   Icon: 'Dashboard', count: null },
  { id: 'work-orders', label: 'Work Orders', Icon: 'Wrench',    count: '23' },
  { id: 'sales',       label: 'Sales',       Icon: 'Cart',      count: null },
  { id: 'customers',   label: 'Customers',   Icon: 'Users',     count: null },
  { id: 'inventory',   label: 'Inventory',   Icon: 'Box',       count: null },
];
const NAV_TOOLS = [
  { id: 'bookings',         label: 'Bookings',        Icon: 'Calendar' },
  { id: 'purchase-orders',  label: 'Purchase Orders', Icon: 'Box'      },
  { id: 'reports',          label: 'Reports',         Icon: 'Clock'    },
];

function Sidebar({ screen, setScreen, staff }) {
  const activeNav = screen === 'new-wo' ? 'work-orders' : screen;
  const navItem = (n) =>
    h('a', {
      key: n.id,
      className: 'nav-item' + (activeNav === n.id ? ' active' : ''),
      onClick: () => setScreen(n.id),
    },
      h('span', { className: 'nav-icon' }, h(Ico[n.Icon], { size: 14 })),
      h('span', null, n.label),
      n.count && h('span', { className: 'nav-count' }, n.count)
    );

  return h('aside', { className: 'sidebar' },
    h('div', { className: 'sidebar-brand' },
      h('div', { className: 'brand-mark' }),
      h('div', { style: { display: 'flex', flexDirection: 'column' } },
        h('span', { className: 'brand-name' }, 'ChainLine'),
        h('span', { className: 'brand-sub' }, 'Kelowna \xb7 KEL-01')
      )
    ),
    h('div', { className: 'nav-section' },
      h('div', { className: 'nav-label' }, 'Workspace'),
      NAV_MAIN.map(navItem)
    ),
    h('div', { className: 'nav-section nav-grow' },
      h('div', { className: 'nav-label' }, 'Tools'),
      NAV_TOOLS.map(navItem)
    ),
    h('div', { className: 'sidebar-foot' },
      h(AvInit, { initials: staff ? staff.initials : 'CL', tone: staff ? staff.tone : 'am' }),
      h('div', { className: 'user-meta' },
        h('span', { className: 'user-name' }, staff ? staff.name : 'ChainLine'),
        h('span', { className: 'user-role' }, staff ? staff.role : '')
      )
    )
  );
}

/* ─────────────────────────────────────────
   TOPBAR
───────────────────────────────────────── */
function Topbar({ screen, topbarSearchRef }) {
  const crumbs = {
    'dashboard': ['Shop', 'Dashboard'],
    'work-orders': ['Service', 'Work Orders'],
    'new-wo': ['Service', 'Work Orders', 'New'],
    'sales': ['Retail', 'Sales Register'],
    'customers': ['CRM', 'Customers'],
    'inventory': ['Stock', 'Inventory'],
    'bookings': ['Tools', 'Bookings'],
    'purchase-orders': ['Tools', 'Purchase Orders'],
    'reports': ['Tools', 'Reports'],
  }[screen] || ['ChainLine'];

  return h('div', { className: 'topbar' },
    h('div', { className: 'crumbs' },
      crumbs.reduce((acc, c, i) => {
        if (i > 0) acc.push(h('span', { key: 'sep'+i, className: 'crumb-sep' }, '/'));
        acc.push(h('span', { key: 'c'+i, className: 'crumb' + (i === crumbs.length-1 ? ' last' : '') }, c));
        return acc;
      }, [])
    ),
    h('div', { className: 'topbar-spacer' }),
    h('div', { className: 'topbar-search' },
      h(Ico.Search, { size: 12 }),
      h('input', { ref: topbarSearchRef, placeholder: 'Search WO, customer, SKU…' }),
      h('span', { className: 'kbd' }, '⌘K')
    ),
    h('div', { className: 'station' }, 'Drawer ', h('b', null, 'open'), ' \xb7 08:14'),
    h('button', { className: 'btn ghost' }, h(Ico.Dots, { size: 14 }))
  );
}

/* ─────────────────────────────────────────
   STATUS STRIP
───────────────────────────────────────── */
function StatusStrip() {
  return h('div', { className: 'status-strip' },
    h('span', { className: 'dot-live' }),
    h('span', null, 'Live \xb7 synced 2s ago'),
    h('span', null, '\xb7'),
    h('span', null, 'Terminal MOBY-A920 paired'),
    h('span', null, '\xb7'),
    h('span', null, 'Printer EPSON-TM-T20 ready'),
    h('span', { className: 'spacer' }),
    h('span', null, 'CL POS v1.0 \xb7 2026-05-20')
  );
}

/* ─────────────────────────────────────────
   SCREEN A — DASHBOARD
───────────────────────────────────────── */
function DashboardScreen({ setScreen }) {
  const stats = [
    { label: 'Open Work Orders',  value: '23',       foot: '8 in progress',       accentColor: null,            delta: null },
    { label: 'Overdue',           value: '4',         foot: 'Action required',     accentColor: 'var(--accent)',  delta: null },
    { label: "Today's Revenue",   value: '$3,842.18', foot: '+18.4% vs avg',       accentColor: null,            delta: 'up' },
    { label: 'Bookings This Week',value: '17',        foot: '3 awaiting drop-off', accentColor: null,            delta: null },
  ];

  const activity = [
    { t: '11:42', who: 'A. Miller', what: 'closed',    obj: 'WO-2384',      tail: ' \xb7 Full Tune' },
    { t: '11:18', who: 'J. Kovac',  what: 'sold',      obj: 'SHIM-XT-CS',   tail: ' \xb7 $189.00' },
    { t: '10:55', who: 'S. Reyes',  what: 'booked',    obj: 'WO-2401',      tail: ' \xb7 Suspension service \xb7 due Thu' },
    { t: '10:31', who: 'A. Miller', what: 'received',  obj: 'PO-0451',      tail: ' \xb7 24 items' },
    { t: '09:48', who: 'M. Bell',   what: 'completed', obj: 'WO-2378',      tail: ' \xb7 Brake bleed' },
    { t: '09:12', who: 'J. Kovac',  what: 'sold',      obj: 'TIRE-MAXX-29', tail: ' \xb7 $84.00 \xd7 2' },
  ];

  return h(Fragment, null,
    h(PageHead, {
      title: 'Dashboard',
      sub: 'MON \xb7 MAY 20',
      actions: [
        h('button', { key: 'today', className: 'btn' }, 'Today ', h(Ico.ChevronRight, { size: 10 })),
        h('button', { key: 'sale', className: 'btn primary', onClick: () => setScreen('sales') },
          h(Ico.Plus, { size: 13 }), ' New Sale ', h('span', { className: 'kbd' }, 'N')
        ),
      ],
    }),

    h('div', { className: 'stat-grid mb-22' },
      stats.map((s, i) =>
        h('div', { key: i, className: 'stat' },
          h('div', { className: 'stat-label' }, s.label),
          h('div', { className: 'stat-value', style: s.accentColor ? { color: s.accentColor } : null }, s.value),
          h('div', { className: 'stat-foot' },
            s.delta === 'up' && h('span', { className: 'delta-up' }, h(Ico.ArrowUp, { size: 10 })),
            h('span', null, s.foot)
          )
        )
      )
    ),

    h('div', { className: 'grid-2' },
      // Left column
      h('div', { className: 'col', style: { gap: 16 } },
        h('div', { className: 'card' },
          h('div', { className: 'card-head' },
            h('h3', null, 'Quick actions'),
            h('span', { className: 'sub' }, 'Shortcuts')
          ),
          h('div', { className: 'qa-grid' },
            h('button', { className: 'qa', onClick: () => setScreen('new-wo') },
              h('span', { className: 'qa-ico' }, h(Ico.Wrench, { size: 18 })),
              h('span', { className: 'qa-title' }, 'New Work Order'),
              h('span', { className: 'qa-sub' }, 'Intake a bike')
            ),
            h('button', { className: 'qa', onClick: () => setScreen('sales') },
              h('span', { className: 'qa-ico' }, h(Ico.Cart, { size: 18 })),
              h('span', { className: 'qa-title' }, 'New Sale'),
              h('span', { className: 'qa-sub' }, 'Open register')
            ),
            h('button', { className: 'qa' },
              h('span', { className: 'qa-ico' }, h(Ico.Users, { size: 18 })),
              h('span', { className: 'qa-title' }, 'Customer Lookup'),
              h('span', { className: 'qa-sub' }, 'Search profiles')
            ),
            h('button', { className: 'qa' },
              h('span', { className: 'qa-ico' }, h(Ico.Clock, { size: 18 })),
              h('span', { className: 'qa-title' }, 'End of Day'),
              h('span', { className: 'qa-sub' }, 'Close drawer')
            )
          )
        ),

        h('div', { className: 'card' },
          h('div', { className: 'card-head' },
            h('h3', null, 'Service queue'),
            h('span', { className: 'sub' }, 'Today \xb7 6 open'),
            h('div', { className: 'right' },
              h('button', { className: 'btn ghost', onClick: () => setScreen('work-orders') },
                'View all ', h(Ico.ChevronRight, { size: 10 })
              )
            )
          ),
          h('table', { className: 'tbl' },
            h('thead', null,
              h('tr', null,
                h('th', { style: { width: 90 } }, 'WO'),
                h('th', null, 'Customer'),
                h('th', null, 'Bike'),
                h('th', { style: { width: 130 } }, 'Status'),
                h('th', { style: { width: 110 } }, 'Due'),
                h('th', { style: { width: 60 } }, 'Mech')
              )
            ),
            h('tbody', null,
              [
                ['WO-2391', 'Devon Tran',    'Norco Sight C2 \xb7 2023', 'ready',      'May 20', null,     'AM', 'am'],
                ['WO-2388', 'Hannah Riise',  'Santa Cruz Bronson',        'inprogress', 'May 20', null,     'JK', 'jk'],
                ['WO-2382', 'Marc Lefebvre', 'Trek Fuel EX 8',            'open',       null,     '2d late','SR', 'sr'],
                ['WO-2402', 'Priya Sharma',  'Specialized Stumpjumper',   'booked',     'May 22', null,     'MB', 'mb'],
              ].map(([id, cust, bike, status, due, overdue, mech, tone]) =>
                h('tr', { key: id },
                  h('td', { className: 'num' }, id),
                  h('td', null, cust),
                  h('td', { className: 'muted' }, bike),
                  h('td', null, h(Badge, { kind: status }, status === 'inprogress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1))),
                  h('td', null, overdue ? h('span', { className: 'overdue-text' }, overdue) : h('span', { className: 'num muted' }, due)),
                  h('td', null, h(AvInit, { initials: mech, tone }))
                )
              )
            )
          )
        )
      ),

      // Right column
      h('div', { className: 'col', style: { gap: 16 } },
        h('div', { className: 'card' },
          h('div', { className: 'card-head' },
            h('h3', null, 'Activity'),
            h('span', { className: 'sub' }, 'Live'),
            h('div', { className: 'right' },
              h('span', { className: 'mono', style: { fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.08em' } }, 'SHOP \xb7 KEL-01')
            )
          ),
          h('div', null,
            activity.map((a, i) =>
              h('div', { key: i, className: 'feed-item' },
                h('span', { className: 'feed-time' }, a.t),
                h('span', { className: 'feed-text' },
                  h('span', { className: 'who' }, a.who), ' ',
                  h('span', { className: 'what' }, a.what), ' ',
                  h('span', { className: 'obj' }, a.obj),
                  h('span', { className: 'muted' }, a.tail)
                ),
                h('button', { className: 'btn ghost', style: { height: 24, padding: '0 6px' } }, h(Ico.Dots, { size: 12 }))
              )
            )
          )
        ),

        h('div', { className: 'card' },
          h('div', { className: 'card-head' }, h('h3', null, 'End of day'), h('span', { className: 'sub' }, 'Drawer')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Cash sales'),       h('span', { className: 'v mono' }, '$412.00')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Card sales'),       h('span', { className: 'v mono' }, '$3,189.18')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Other / transfer'), h('span', { className: 'v mono' }, '$241.00')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Refunds'),          h('span', { className: 'v mono' }, '−$48.00')),
          h('div', { className: 'aside-row' },
            h('span', { className: 'k strong' }, 'Net'),
            h('span', { className: 'v mono', style: { fontSize: 15, fontWeight: 600 } }, '$3,794.18')
          )
        )
      )
    )
  );
}

/* ─────────────────────────────────────────
   SCREEN B — WORK ORDERS LIST
───────────────────────────────────────── */
function WorkOrdersScreen({ setScreen }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  const counts = {
    all:        MOCK_WO.length,
    open:       MOCK_WO.filter(r => r.status === 'open').length,
    inprogress: MOCK_WO.filter(r => r.status === 'inprogress').length,
    ready:      MOCK_WO.filter(r => r.status === 'ready').length,
    booked:     MOCK_WO.filter(r => r.status === 'booked').length,
    overdue:    MOCK_WO.filter(r => r.dueState === 'overdue').length,
  };

  const filtered = MOCK_WO.filter(r => {
    const matchTab = tab === 'all' ? true
      : tab === 'overdue' ? r.dueState === 'overdue'
      : r.status === tab;
    const q = search.toLowerCase();
    const matchSearch = !q
      || r.id.toLowerCase().includes(q)
      || r.cust.toLowerCase().includes(q)
      || r.bike.toLowerCase().includes(q)
      || r.phone.includes(q);
    return matchTab && matchSearch;
  });

  const TABS = [
    ['all','All'],['open','Open'],['inprogress','In progress'],
    ['ready','Ready'],['booked','Booked'],['overdue','Overdue'],
  ];

  return h(Fragment, null,
    h(PageHead, {
      title: 'Work Orders',
      sub: 'Service queue',
      actions: [
        h('button', { key: 'cal', className: 'btn' }, h(Ico.Calendar, { size: 13 }), ' Calendar view'),
        h('button', { key: 'new', className: 'btn primary', onClick: () => setScreen('new-wo') },
          h(Ico.Plus, { size: 13 }), ' New Work Order ', h('span', { className: 'kbd' }, '⌘N')
        ),
      ],
    }),

    h('div', { className: 'sub-tabs' },
      TABS.map(([k, l]) =>
        h('button', { key: k, className: 'sub-tab' + (tab === k ? ' active' : ''), onClick: () => setTab(k) },
          l, h('span', { className: 'count' }, counts[k])
        )
      )
    ),

    h('div', { className: 'filters' },
      h('div', { className: 'search-field', style: { maxWidth: 340, flex: '0 0 340px' } },
        h('span', { className: 'ico' }, h(Ico.Search, { size: 13 })),
        h('input', {
          className: 'input',
          placeholder: 'Search WO #, customer, bike, serial…',
          value: search,
          onChange: e => setSearch(e.target.value),
        })
      ),
      h('button', { className: 'pill' }, 'Mechanic ', h('span', { className: 'mono' }, '\xb7 all')),
      h('button', { className: 'pill' }, 'Due ', h('span', { className: 'mono' }, '\xb7 any')),
      h('button', { className: 'pill' }, 'Service ', h('span', { className: 'mono' }, '\xb7 any')),
      h('div', { style: { flex: 1 } }),
      h('button', { className: 'btn ghost' }, h(Ico.Dots, { size: 14 }))
    ),

    h('div', { className: 'card' },
      h('table', { className: 'tbl' },
        h('thead', null,
          h('tr', null,
            h('th', { style: { width: 96 } }, 'WO'),
            h('th', null, 'Customer'),
            h('th', null, 'Bike / Item'),
            h('th', null, 'Service'),
            h('th', { style: { width: 130 } }, 'Status'),
            h('th', { style: { width: 120 } }, 'Due'),
            h('th', { style: { width: 70 } }, 'Mech'),
            h('th', { style: { width: 32 } })
          )
        ),
        h('tbody', null,
          filtered.length === 0
            ? h('tr', null,
                h('td', {
                  colSpan: 8,
                  style: { textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' },
                }, 'No work orders match these filters')
              )
            : filtered.map(r =>
                h('tr', { key: r.id, style: { cursor: 'pointer' } },
                  h('td', null,
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { className: 'num', style: { fontSize: 12 } }, r.id),
                      r.prio && h('span', { className: 'prio-flag', title: 'Priority' }, h(Ico.Flag, { size: 11 }))
                    )
                  ),
                  h('td', null,
                    h('div', { className: 'cell-customer' },
                      h('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: 1.2 } },
                        h('span', { className: 'name' }, r.cust),
                        h('span', { className: 'phone' }, r.phone)
                      )
                    )
                  ),
                  h('td', { className: 'muted' }, r.bike),
                  h('td', null, r.svc),
                  h('td', null,
                    r.status === 'ready'      ? h(Badge, { kind: 'ready' }, 'Ready') :
                    r.status === 'open'       ? h(Badge, { kind: 'open' }, 'Open') :
                    r.status === 'inprogress' ? h(Badge, { kind: 'inprogress' }, 'In Progress') :
                    r.status === 'booked'     ? h(Badge, { kind: 'booked' }, 'Booked') : null
                  ),
                  h('td', null,
                    r.dueState === 'overdue'
                      ? h('span', { className: 'overdue-text' }, r.overdueBy)
                      : h('span', { className: 'num muted', style: { fontSize: 12 } }, r.due)
                  ),
                  h('td', null, h(AvInit, { initials: r.mech, tone: r.tone })),
                  h('td', null, h('button', { className: 'btn ghost', style: { height: 24, padding: '0 6px' } }, h(Ico.Dots, { size: 12 })))
                )
              )
        )
      )
    ),

    h('div', {
      className: 'row',
      style: { justifyContent: 'space-between', marginTop: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' },
    },
      h('span', null, 'Showing ' + filtered.length + ' of ' + MOCK_WO.length),
      h('span', null, 'Page 1 / 1')
    )
  );
}

/* ─────────────────────────────────────────
   SCREEN C — NEW WORK ORDER
───────────────────────────────────────── */
function NewWorkOrderScreen({ setScreen }) {
  const [customer, setCustomer] = useState('Hannah Riise');
  const [showSuggest, setShowSuggest] = useState(false);
  const [mech, setMech] = useState('JK');
  const [prio, setPrio] = useState(true);
  const [notify, setNotify] = useState(true);
  const [service, setService] = useState('Suspension service');
  const [bike, setBike] = useState('Santa Cruz Bronson \xb7 CC X01 \xb7 2023 \xb7 Charcoal');
  const [due, setDue] = useState('2026-05-22');
  const [notes, setNotes] = useState('Rear shock feels harsh on chunder. Customer mentions clicking from BB area under load - inspect cranks/BB. Loaner wheelset OK if needed.');
  const [submitting, setSubmitting] = useState(false);
  const suggestRef = useRef(null);

  useEffect(() => {
    function onDown(e) {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) setShowSuggest(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const suggestions = MOCK_CUSTOMERS.filter(c =>
    !customer || c.name.toLowerCase().includes(customer.toLowerCase()) || c.phone.includes(customer)
  ).slice(0, 6);

  function handleCreate() {
    if (!mech) { toast('Select a mechanic', 'error'); return; }
    if (!bike.trim()) { toast('Enter bike description', 'error'); return; }
    setSubmitting(true);
    apiPost('/api/workorder', { customer, bike, service, mechanic: mech, due, priority: prio, notifySms: notify, notes })
      .then(res => {
        setSubmitting(false);
        toast(res ? 'Work order created' : 'Saved offline (worker unavailable)', res ? 'success' : '');
        setScreen('work-orders');
      });
  }

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleCreate(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return h(Fragment, null,
    h(PageHead, {
      title: 'New Work Order',
      sub: 'Intake \xb7 WO-2405',
      actions: [
        h('button', { key: 'cancel', className: 'btn', onClick: () => setScreen('work-orders') }, 'Cancel'),
        h('button', { key: 'draft', className: 'btn' }, 'Save draft'),
        h('button', { key: 'create', className: 'btn primary', onClick: handleCreate, disabled: submitting },
          h(Ico.Check, { size: 13 }), ' Create work order ', h('span', { className: 'kbd' }, '⌘↵')
        ),
      ],
    }),

    h('div', { className: 'grid-2', style: { gridTemplateColumns: '1fr 360px' } },
      // Left — form
      h('div', { className: 'card' },
        h('div', { className: 'card-head' }, h('h3', null, 'Intake'), h('span', { className: 'sub' }, 'Required marked *')),
        h('div', { style: { padding: 18 } },
          h(Field, { label: 'Customer', required: true, hint: 'Search by name, phone or last 4 of card.' },
            h('div', { className: 'combobox-wrap', ref: suggestRef },
              h('div', { className: 'search-field' },
                h('span', { className: 'ico' }, h(Ico.Search, { size: 13 })),
                h('input', {
                  className: 'input',
                  value: customer,
                  onChange: e => { setCustomer(e.target.value); setShowSuggest(true); },
                  onFocus: () => setShowSuggest(true),
                  placeholder: 'Hannah Riise',
                })
              ),
              showSuggest && h('div', { className: 'suggest-list' },
                suggestions.map(c =>
                  h('div', { key: c.id, className: 'suggest-item', onClick: () => { setCustomer(c.name); setShowSuggest(false); } },
                    h(AvInit, { initials: c.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(), tone: 'mb' }),
                    h('span', { className: 'name' }, c.name),
                    h('span', { className: 'phone' }, c.phone),
                    h('span', { className: 'meta' }, c.bikes + ' bikes \xb7 since ' + c.memberSince.slice(0,4))
                  )
                ),
                h('div', { className: 'suggest-create', onClick: () => setShowSuggest(false) },
                  h('span', { style: { width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--line-2)', color: 'var(--text-2)', flexShrink: 0 } }, h(Ico.Plus, { size: 11 })),
                  h('span', null, 'Create new customer "' + (customer || '') + '"')
                )
              )
            )
          ),

          h('div', { style: { height: 16 } }),

          h('div', { className: 'grid-form' },
            h('div', { className: 'span-2' },
              h(Field, { label: 'Bike / Item', required: true, hint: 'Make \xb7 model \xb7 year \xb7 color \xb7 serial (optional)' },
                h('input', { className: 'input', value: bike, onChange: e => setBike(e.target.value), placeholder: 'Santa Cruz Bronson \xb7 CC X01 \xb7 2023' })
              )
            ),
            h(Field, { label: 'Service type', required: true },
              h('select', { className: 'select', value: service, onChange: e => setService(e.target.value) },
                SERVICE_TYPES.map(s => h('option', { key: s }, s))
              )
            ),
            h(Field, { label: 'Due date', required: true },
              h('input', { className: 'input mono', type: 'date', value: due, onChange: e => setDue(e.target.value) })
            ),
            h('div', { className: 'span-2' },
              h(Field, { label: 'Assigned mechanic', required: true },
                h('div', { className: 'chip-group' },
                  MECHANICS.map(m =>
                    h('button', { key: m.initials, className: 'chip' + (mech === m.initials ? ' active' : ''), onClick: () => setMech(m.initials) },
                      h(AvInit, { initials: m.initials, tone: m.tone }),
                      h('span', { style: { display: 'flex', flexDirection: 'column', lineHeight: 1.1, textAlign: 'left' } },
                        h('span', null, m.name),
                        h('span', { className: 'mono', style: { fontSize: 10, color: 'var(--text-2)' } }, m.load)
                      )
                    )
                  )
                )
              )
            ),
            h('div', { className: 'span-2' },
              h(Field, { label: 'Notes' },
                h('textarea', { className: 'textarea', rows: 5, value: notes, onChange: e => setNotes(e.target.value) })
              )
            ),
            h('div', { className: 'span-2', style: { display: 'flex', gap: 24, borderTop: '1px solid var(--line)', paddingTop: 14 } },
              h(Toggle, { on: prio, onChange: setPrio, label: 'Priority', sub: 'Bump to top of queue' }),
              h(Toggle, { on: notify, onChange: setNotify, label: 'SMS when ready', sub: '(250) 555-0142' })
            )
          )
        )
      ),

      // Right — aside
      h('div', { className: 'col', style: { gap: 16 } },
        h('div', { className: 'aside-card' },
          h('div', { className: 'card-head' }, h('h3', null, 'Customer'), h('span', { className: 'sub' }, 'On file')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Name'),         h('span', { className: 'v' }, 'Hannah Riise')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Phone'),        h('span', { className: 'v mono' }, '(250) 555-0142')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Email'),        h('span', { className: 'v mono', style: { fontSize: 11 } }, 'h.riise@protonmail.com')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Member since'), h('span', { className: 'v mono' }, '2021-03-14')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Bikes on file'), h('span', { className: 'v mono' }, '3')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Open balance'), h('span', { className: 'v mono' }, '$0.00'))
        ),

        h('div', { className: 'aside-card' },
          h('div', { className: 'card-head' }, h('h3', null, 'Estimate'), h('span', { className: 'sub' }, 'Service + parts')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Labour \xb7 1.5h'),     h('span', { className: 'v mono' }, '$142.50')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Shock seal kit'),     h('span', { className: 'v mono' }, '$48.00')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Float fluid \xb7 15ml'), h('span', { className: 'v mono' }, '$12.00')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'GST 5%'),             h('span', { className: 'v mono' }, '$10.13')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'PST 7%'),             h('span', { className: 'v mono' }, '$14.18')),
          h('div', { className: 'aside-row', style: { background: 'var(--bg-2)' } },
            h('span', { className: 'k strong', style: { color: 'var(--text)' } }, 'Estimate total'),
            h('span', { className: 'v mono', style: { fontSize: 16, fontWeight: 600 } }, '$226.81')
          ),
          h('div', { style: { padding: 12, borderTop: '1px solid var(--line)' } },
            h('button', { className: 'btn', style: { width: '100%', justifyContent: 'center' } }, 'Send estimate')
          )
        ),

        h('div', { className: 'aside-card' },
          h('div', { className: 'card-head' }, h('h3', null, 'Last 3 services'), h('span', { className: 'sub' }, 'History')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k mono' }, '2025-11-04'), h('span', { className: 'v' }, 'Full tune')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k mono' }, '2025-06-18'), h('span', { className: 'v' }, 'Brake bleed')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k mono' }, '2024-09-30'), h('span', { className: 'v' }, 'Wheel true \xb7 rear'))
        )
      )
    )
  );
}

/* ─────────────────────────────────────────
   SCREEN D — SALES REGISTER
───────────────────────────────────────── */
function SalesScreen() {
  const [items, setItems] = useState([
    { sku: 'SHIM-XT-CS-12',   name: 'Shimano XT M8100 Cassette \xb7 12-spd',        qty: 1, price: 189.00 },
    { sku: 'TIRE-MAXX-29-DH', name: 'Maxxis Minion DHF 29\xd72.5 \xb7 3C MaxxGrip',  qty: 2, price: 84.00  },
    { sku: 'LAB-INSTALL-CS',  name: 'Labour \xb7 Cassette install',                   qty: 1, price: 25.00  },
    { sku: 'CHAIN-XT-126L',   name: 'Shimano XT Chain \xb7 126L',                    qty: 1, price: 62.00  },
  ]);
  const [query, setQuery] = useState('');
  const [customerName, setCustomerName] = useState('Devon Tran');
  const searchRef = useRef(null);

  useEffect(() => { if (searchRef.current) searchRef.current.focus(); }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        if (searchRef.current) searchRef.current.focus();
      }
      if (e.key === 'F1') { e.preventDefault(); handlePay('card'); }
      if (e.key === 'F2') { e.preventDefault(); handlePay('cash'); }
      if (e.key === 'F3') { e.preventDefault(); handlePay('other'); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const results = query
    ? MOCK_CATALOG.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.sku.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  function addItem(it) {
    const existing = items.find(i => i.sku === it.sku);
    if (existing) {
      setItems(items.map(i => i.sku === it.sku ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setItems([...items, { sku: it.sku, name: it.name, qty: 1, price: it.price }]);
    }
    setQuery('');
    if (searchRef.current) searchRef.current.focus();
  }

  function setQty(sku, delta) { setItems(items.map(i => i.sku === sku ? { ...i, qty: Math.max(1, i.qty + delta) } : i)); }
  function setQtyDirect(sku, val) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1) setItems(items.map(i => i.sku === sku ? { ...i, qty: n } : i));
  }
  function removeItem(sku) { setItems(items.filter(i => i.sku !== sku)); }

  // GST 5% + PST 7% independently from subtotal (BC)
  const subtotal = items.reduce((a, i) => a + round2(i.qty * i.price), 0);
  const gst      = round2(subtotal * 0.05);
  const pst      = round2(subtotal * 0.07);
  const total    = round2(subtotal + gst + pst);

  function handlePay(method) {
    if (!items.length) { toast('Cart is empty', 'error'); return; }
    apiPost('/api/sale', {
      customer: customerName,
      lines: items.map(i => ({ sku: i.sku, name: i.name, qty: i.qty, unitPrice: i.price })),
      subtotal, gst, pst, total, payment: { method },
    }).then(res => {
      toast(res ? 'Sale completed \xb7 ' + fmt$(total) : 'Sale recorded offline', res ? 'success' : '');
      setItems([]);
    });
  }

  const totalUnits = items.reduce((a, i) => a + i.qty, 0);

  return h(Fragment, null,
    h(PageHead, {
      title: 'Sales Register',
      sub: 'Sale #S-1188 \xb7 Drawer open',
      actions: [
        h('button', { key: 'park', className: 'btn' }, 'Park sale'),
        h('button', { key: 'disc', className: 'btn' }, 'Discount'),
        h('button', { key: 'ret', className: 'btn' }, 'Returns'),
      ],
    }),

    h('div', { style: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, alignItems: 'flex-start' } },
      // LEFT — cart
      h('div', { className: 'card' },
        h('div', { className: 'card-head' },
          h('h3', null, 'Cart'),
          h('span', { className: 'sub' }, items.length + ' line' + (items.length === 1 ? '' : 's')),
          h('div', { className: 'right' },
            h('span', { className: 'mono', style: { fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.08em' } }, 'SCAN OR TYPE SKU')
          )
        ),

        h('div', { style: { padding: 12, borderBottom: '1px solid var(--line)' } },
          h('div', { className: 'search-field' },
            h('span', { className: 'ico' }, h(Ico.Search, { size: 13 })),
            h('input', {
              ref: searchRef,
              className: 'input lg',
              value: query,
              onChange: e => setQuery(e.target.value),
              placeholder: 'Scan barcode or search items, SKUs, services…',
            }),
            h('span', { className: 'kbd-hint' }, '/')
          )
        ),

        query && results.length > 0 && h('div', { className: 'item-results' },
          results.map(c =>
            h('div', { key: c.sku, className: 'item-row', onClick: () => addItem(c) },
              h('div', null,
                h('div', null, c.name),
                h('div', { className: 'sku' }, c.sku)
              ),
              h('div', { className: 'stock' + (c.low ? ' low' : '') }, c.stock + ' in stock'),
              h('div', { className: 'price' }, fmt$(c.price))
            )
          )
        ),
        query && results.length === 0 && h('div', { className: 'item-results' },
          h('div', { style: { padding: '12px 14px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 } },
            'No results for "' + query + '"')
        ),

        h('div', { className: 'line-row head' },
          h('span', null, 'Item'),
          h('span', null, 'Qty'),
          h('span', { style: { textAlign: 'right' } }, 'Price'),
          h('span', { style: { textAlign: 'right' } }, 'Line'),
          h('span')
        ),

        items.map(i =>
          h('div', { key: i.sku, className: 'line-row' },
            h('div', null,
              h('div', { className: 'name' }, i.name),
              h('div', { className: 'sku' }, i.sku)
            ),
            h('div', null,
              h('div', { className: 'qty-stepper' },
                h('button', { onClick: () => setQty(i.sku, -1) }, '−'),
                h('input', { value: i.qty, onChange: e => setQtyDirect(i.sku, e.target.value) }),
                h('button', { onClick: () => setQty(i.sku, +1) }, '+')
              )
            ),
            h('div', { className: 'num', style: { textAlign: 'right', color: 'var(--text-1)' } }, fmt$(i.price)),
            h('div', { className: 'num', style: { textAlign: 'right', fontWeight: 500 } }, fmt$(i.qty * i.price)),
            h('button', { className: 'icon-btn', onClick: () => removeItem(i.sku) }, h(Ico.Trash, { size: 13 }))
          )
        ),

        items.length === 0 && h('div', {
          style: { padding: '40px 16px', textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' },
        }, 'Cart empty — scan or search to add items'),

        h('div', {
          className: 'row',
          style: { padding: '10px 14px', justifyContent: 'space-between', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', borderTop: '1px solid var(--line)' },
        },
          h('span', null, totalUnits + ' units'),
          h('button', { className: 'btn ghost', onClick: () => setItems([]), style: { height: 24, padding: '0 8px', fontSize: 11 } }, 'Clear cart')
        )
      ),

      // RIGHT — checkout
      h('div', { className: 'col', style: { gap: 16 } },
        h('div', { className: 'card' },
          h('div', { className: 'card-head' }, h('h3', null, 'Customer'), h('span', { className: 'sub' }, 'Optional')),
          h('div', { style: { padding: 14 } },
            h('div', { className: 'search-field' },
              h('span', { className: 'ico' }, h(Ico.Search, { size: 13 })),
              h('input', {
                className: 'input',
                value: customerName,
                onChange: e => setCustomerName(e.target.value),
                placeholder: 'Walk-in',
              })
            ),
            h('div', { className: 'row', style: { marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.04em' } },
              h(AvInit, { initials: 'DT', tone: 'am' }),
              h('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: 1.2 } },
                h('span', { style: { color: 'var(--text)', fontFamily: 'var(--font-ui)' } }, 'Devon Tran'),
                h('span', null, '(250) 555-0188 \xb7 11 visits')
              )
            )
          )
        ),

        h('div', { className: 'card' },
          h('div', { className: 'card-head' }, h('h3', null, 'Total'), h('span', { className: 'sub' }, 'BC tax')),
          h('div', { className: 'totals' },
            h('div', { className: 'totals-row' }, h('span', { className: 'label' }, 'Subtotal'),   h('span', { className: 'val' }, fmt$(subtotal))),
            h('div', { className: 'totals-row' }, h('span', { className: 'label' }, 'GST \xb7 5%'), h('span', { className: 'val' }, fmt$(gst))),
            h('div', { className: 'totals-row' }, h('span', { className: 'label' }, 'PST \xb7 7%'), h('span', { className: 'val' }, fmt$(pst))),
            h('div', { className: 'totals-row grand' },
              h('span', { className: 'label' }, 'Total CAD'),
              h('span', { className: 'val' }, fmt$(total))
            ),
            h('div', { className: 'pay-grid' },
              h('button', { className: 'pay-btn', onClick: () => handlePay('cash') },
                h(Ico.Cash, { size: 14 }), h('span', null, 'Cash'), h('span', { className: 'kbd' }, 'F2')
              ),
              h('button', { className: 'pay-btn primary', onClick: () => handlePay('card') },
                h(Ico.Card, { size: 14 }), h('span', null, 'Card'), h('span', { className: 'kbd' }, 'F1')
              ),
              h('button', { className: 'pay-btn', onClick: () => handlePay('other') },
                h(Ico.Dots, { size: 14 }), h('span', null, 'Other'), h('span', { className: 'kbd' }, 'F3')
              )
            ),
            h('div', {
              className: 'row',
              style: { padding: '10px 14px', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' },
            },
              h('span', null, 'Terminal \xb7 MOBY-A920 \xb7 paired'),
              h('span', { style: { color: 'var(--green)' } }, '● READY')
            )
          )
        )
      )
    )
  );
}

/* ─────────────────────────────────────────
   PLACEHOLDER MODULE
───────────────────────────────────────── */
function PlaceholderScreen({ name }) {
  const titles = { customers: 'Customers', inventory: 'Inventory', bookings: 'Bookings', 'purchase-orders': 'Purchase Orders', reports: 'Reports' };
  return h(Fragment, null,
    h(PageHead, { title: titles[name] || name, sub: 'Module' }),
    h('div', { className: 'placeholder-screen' },
      h('div', { className: 'label' }, 'Module placeholder — not part of this round'),
      h('div', { style: { marginTop: 8, color: 'var(--text-3)', fontSize: 12 } },
        'Scoped screens: Dashboard, Work Orders, New Work Order, Sales Register.'
      )
    )
  );
}

/* ─────────────────────────────────────────
   APP ROOT
───────────────────────────────────────── */
function App() {
  const [staff, setStaff] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('pos-staff') || 'null'); } catch { return null; }
  });
  const [screen, setScreen] = useState('dashboard');
  const topbarSearchRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (!staff) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (topbarSearchRef.current) topbarSearchRef.current.focus();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setScreen('new-wo');
        return;
      }
      if (e.key === 'n' && screen === 'dashboard' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
        setScreen('sales');
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [staff, screen]);

  if (!staff) {
    return h(Fragment, null,
      h(LoginScreen, { onLogin: setStaff }),
      h(Toast)
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':   return h(DashboardScreen,    { setScreen });
      case 'work-orders': return h(WorkOrdersScreen,   { setScreen });
      case 'new-wo':      return h(NewWorkOrderScreen, { setScreen });
      case 'sales':       return h(SalesScreen);
      default:            return h(PlaceholderScreen,  { name: screen });
    }
  };

  return h(Fragment, null,
    h('div', { className: 'app' },
      h(Sidebar, { screen, setScreen, staff }),
      h('main', { className: 'main' },
        h(Topbar, { screen, topbarSearchRef }),
        h('div', { className: 'content' }, renderScreen()),
        h(StatusStrip)
      )
    ),
    h(Toast)
  );
}

/* ── Mount ── */
createRoot(document.getElementById('root')).render(h(App));
