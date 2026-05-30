/* ChainLine POS v2.1 — 2026-05-20
 * React 18 via CDN. No JSX, no Babel. Pure createElement.
 * Design: design_handoff_chainline_pos/README.md
 * Worker: https://still-term-f1ec.taocaruso77.workers.dev
 */

'use strict';

const { createElement: h, useState, useEffect, useRef, useCallback, Fragment } = React;
const { createRoot } = ReactDOM;

/* ── Constants ── */
const WORKER = 'https://still-term-f1ec.taocaruso77.workers.dev';

const STAFF = [
  { id:  1, name: 'Jason',   initials: 'JA', role: 'Warranty', tone: 'ja', pin: '1139' },
  { id:  5, name: 'Phil',    initials: 'PH', role: 'Mechanic', tone: 'ph', pin: '1139' },
  { id:  6, name: 'Steve',   initials: 'ST', role: 'Mechanic', tone: 'st', pin: '1139' },
  { id:  7, name: 'Matt',    initials: 'MA', role: 'Manager',  tone: 'ma', pin: '1139' },
  { id:  8, name: 'Darrin',  initials: 'DA', role: 'Owner',    tone: 'da', pin: '1139' },
  { id:  9, name: 'Tao',     initials: 'TC', role: 'Manager',  tone: 'tc', pin: '1139' },
  { id: 10, name: 'Beckett', initials: 'BE', role: 'Mechanic', tone: 'be', pin: '1139' },
  { id: 11, name: 'Curren',  initials: 'CU', role: 'Mechanic', tone: 'cu', pin: '1139' },
  { id: 12, name: 'Danny',   initials: 'DN', role: 'Mechanic', tone: 'dn', pin: '1139' },
];

const MECHANICS = STAFF.filter(s => s.role === 'Mechanic' || s.role === 'Manager').map(s => ({
  initials: s.initials, name: s.name, tone: s.tone, load: '0 open',
}));

const SERVICE_TYPES = [
  'Basic tune', 'Full tune', 'Premium tune', 'Brake bleed', 'Drivetrain replace',
  'Suspension service', 'Shock service', 'Wheel build', 'Tubeless setup', 'Bike fit', 'Other',
];

const SERVICE_ESTIMATES = {
  'Basic tune':         { time: '45-60 min', price: '$55-$75',   desc: 'Brakes + derailleur adjust, lube chain, safety check.' },
  'Full tune':          { time: '1-2 hrs',   price: '$95-$135',  desc: 'Full adjustment, cable check, clean + lube drivetrain.' },
  'Premium tune':       { time: '2-3 hrs',   price: '$145-$185', desc: 'Disassembly, overhaul, bearings checked, full detail.' },
  'Brake bleed':        { time: '30-45 min', price: '$35-$55',   desc: 'Per brake. Hydraulic bleed + new fluid.' },
  'Drivetrain replace': { time: '1-1.5 hrs', price: '$45-$75',   desc: 'Labour only. Chain/cassette/chainrings billed extra.' },
  'Suspension service': { time: '1-2 hrs',   price: '$95-$145',  desc: 'Fork lowers service, seals + oil. Recommended yearly.' },
  'Shock service':      { time: '45-90 min', price: '$85-$125',  desc: 'Rear shock air can service + damper oil.' },
  'Wheel build':        { time: '1.5-2 hrs', price: '$75-$120',  desc: 'Labour only. Spokes + rim billed extra if needed.' },
  'Tubeless setup':     { time: '30-45 min', price: '$35-$55',   desc: 'Per wheel. Sealant included.' },
  'Bike fit':           { time: '60-90 min', price: '$95-$145',  desc: 'Saddle height, reach, cleat alignment.' },
  'Other':              { time: 'Varies',    price: 'TBD',         desc: 'Describe in notes. Mechanic will estimate.' },
};

/* ── Live data arrays (populated on init from LS API) ── */
// These replace the old MOCK_* arrays. Module-level so all consumers share one copy.
let lsWorkOrders = [];   // from /api/workorders (KV-backed)
let lsCustomers  = [];   // from /api/pos-customers?limit=100
let lsCatalog    = [];   // from /api/items-search (popular items, lazy-loaded)

// Sync status — set after each successful bootstrapLiveData() run.
// Exposed on window so DashboardScreen can re-read without prop drilling.
let bootstrapLastRun = null; // Date object or null

// Backward-compat aliases — const references to the same arrays.
// bootstrapLiveData() pushes into these arrays in-place so all consumers see live data.
const MOCK_WO        = lsWorkOrders;
const MOCK_CUSTOMERS = lsCustomers;
const MOCK_CATALOG   = lsCatalog;

// Normalise a raw KV workorder into the flat shape used throughout the POS
function normaliseWo(w) {
  if (w.cust) return w; // already flat
  return {
    id:       w.workOrderID || w.id,
    cust:     [w.Contact?.firstName, w.Contact?.lastName].filter(Boolean).join(' ') || w.customerName || 'Unknown',
    phone:    w.Contact?.mobile || w.Contact?.phone || '',
    bike:     w.itemDescription || w.bikeDescription || '',
    svc:      w.note?.split('\n')[0] || w.serviceType || 'Service',
    due:      w.dateDue || (w.timeIn ? new Date(w.timeIn).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : 'TBD'),
    dateDue:  w.dateDue || (w.timeIn ? w.timeIn.slice(0, 10) : ''),
    dueState: null,
    status:   (w.workOrderStatus || w.status || 'open').toLowerCase().replace(/\s+/g, ''),
    mech:     (w.Employee?.firstName?.[0] || '') + (w.Employee?.lastName?.[0] || '') || w.mech || 'UN',
    tone:     w.tone || 'am',
    prio:     !!w.priority || !!w.prio,
    total:    parseFloat(w.total || 0),
    hookIn:   w.hookIn || '',
    hookOut:  w.hookOut || '',
    notes:    w.notes || w.note || '',
  };
}

// Normalise a raw LS customer into the flat shape used by MOCK_CUSTOMERS consumers
function normaliseCustomer(c) {
  if (c.name) return c; // already flat
  const firstName = c.firstName || '';
  const lastName  = c.lastName  || '';
  return {
    id:          c.id || c.customerID,
    name:        [firstName, lastName].filter(Boolean).join(' ') || 'Unknown',
    phone:       c.mobile || c.phone || '',
    bikes:       c.bikesCount || 0,
    memberSince: c.created ? c.created.slice(0, 10) : '',
    email:       c.email || '',
    firstName,
    lastName,
  };
}

// Normalise a raw LS item into the flat shape used by MOCK_CATALOG consumers
function normaliseItem(i) {
  if (typeof i.sku === 'string' && typeof i.price === 'number') return i; // already flat
  return {
    sku:        i.systemSku || i.customSku || i.sku || '',
    name:       i.description || i.name || '',
    price:      parseFloat(i.Prices?.ItemPrice?.amount || i.price || 0),
    stock:      parseInt(i.qoh || i.stock || 0),
    low:        (parseInt(i.qoh || i.stock || 0)) < 3,
    taxablePst: !i.taxClass || i.taxClass !== 'Labour',
    upc:        i.upc || i.customSku || '',
    cost:       parseFloat(i.defaultCost || 0),
    dept:       i.Department?.name || i.dept || '',
    brand:      i.ItemAttributes?.brand || i.brand || '',
  };
}

// Bootstrap: called once on mount. Loads WOs + customers into live arrays in-place.
// Catalog seeded with popular items so barcode fallback has real data immediately.
async function bootstrapLiveData() {
  // Work orders
  try {
    const woData = await apiGet('/api/workorders');
    if (woData && Array.isArray(woData.workorders)) {
      woData.workorders.map(normaliseWo).forEach(w => lsWorkOrders.push(w));
      window.MOCK_WO = lsWorkOrders;
    } else if (woData === null) {
      console.warn('[POS] /api/workorders failed — check X-POS-Auth pin in Settings');
    }
  } catch(e) { console.error('[POS] workorders bootstrap error:', e); }

  // Customers
  try {
    const custData = await apiGet('/api/pos-customers?limit=100');
    const raw = custData?.customers || (Array.isArray(custData) ? custData : null);
    if (raw) {
      raw.map(normaliseCustomer).forEach(c => lsCustomers.push(c));
      window.MOCK_CUSTOMERS = lsCustomers;
    } else if (custData === null) {
      console.warn('[POS] /api/pos-customers failed — check X-POS-Auth pin in Settings');
    }
  } catch(e) { console.error('[POS] customers bootstrap error:', e); }

  // Catalog — seed with popular/recent items so barcode fallback has real data
  try {
    const catData = await apiGet('/api/items-search?q=tube');
    if (catData && Array.isArray(catData.items) && catData.items.length > 0) {
      catData.items.map(normaliseItem).forEach(it => lsCatalog.push(it));
      window.MOCK_CATALOG = lsCatalog;
    }
  } catch(e) { console.error('[POS] catalog bootstrap error:', e); }

  // Mark bootstrap complete — used by sync status indicator
  bootstrapLastRun = new Date();
  window._lsBootstrapAt = bootstrapLastRun;
  // Notify dashboard if it's mounted
  window.dispatchEvent(new CustomEvent('ls:synced', { detail: { at: bootstrapLastRun } }));
}

/* ── Utilities ── */
function fmt$(n) {
  return '$' + Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function round2(n) { return Math.round(n * 100) / 100; }

/* ── API ── */
// PIN is stored in localStorage('pos-api-pin') — set in Settings → General.
// Never hardcode here; rotate via Settings after changing the POS_PIN worker secret.
function getApiPin() {
  try { return localStorage.getItem('pos-api-pin') || ''; } catch { return ''; }
}

async function apiGet(path) {
  try {
    const r = await fetch(WORKER + path, {
      headers: { 'X-POS-Auth': getApiPin() },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch { return null; }
}

async function apiPost(path, body) {
  try {
    const r = await fetch(WORKER + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-POS-Auth': getApiPin() },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch { return null; }
}

async function apiPut(path, body) {
  try {
    const r = await fetch(WORKER + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-POS-Auth': getApiPin() },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch { return null; }
}

async function apiDelete(path) {
  try {
    const r = await fetch(WORKER + path, {
      method: 'DELETE',
      headers: { 'X-POS-Auth': getApiPin() },
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } catch { return null; }
}

/* ── Work Order Statuses (LS R-Series parity) ── */
const WO_STATUSES = [
  'READY', 'Scheduled - Parts Arriving', 'READY - S.O. Parts Arrived', 'Finished',
  'ONLINE BOOKING', 'BOOKED', '!!! ASSESS & ORDER PARTS !!!',
  'PHIL', 'STEVE', 'MATT', 'DARRIN', 'TAO', 'BECKETT', 'JASON', 'WARRANTY',
  'Suspension Out For Service', 'RA!', 'PARTS ORDERED - BIKE OFFSITE',
  'PARTS ORDERED - BIKE HERE', 'Estimate', 'Waiting', 'Open',
  'Consignment', 'Bike Storage',
];

/* ── Toast ── */
let _toastSetter = null;
let _toastIdSeq = 0;
function Toast() {
  const [toasts, setToasts] = useState([]);
  _toastSetter = setToasts;
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map(function(t) {
      if (t.persistent) return null;
      const dur = t.type === 'error' ? 5000 : 3000;
      return setTimeout(function() { setToasts(function(p) { return p.filter(function(x) { return x.id !== t.id; }); }); }, dur);
    });
    return function() { timers.forEach(function(t) { if (t) clearTimeout(t); }); };
  }, [toasts.length]);
  if (!toasts.length) return null;
  return h('div', { className: 'toast-container' },
    toasts.map(function(t) {
      return h('div', { key: t.id, className: 'toast ' + (t.type || ''), onClick: function() { setToasts(function(p) { return p.filter(function(x) { return x.id !== t.id; }); }); } },
        h('span', { className: 'toast-icon' }, t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'i'),
        h('span', { className: 'toast-msg' }, t.message),
        h('span', { className: 'toast-close' }, '×')
      );
    })
  );
}
function toast(msg, type, opts) {
  if (_toastSetter) _toastSetter(function(p) { return p.concat([{ id: ++_toastIdSeq, message: msg, type: type || '', persistent: !!(opts && opts.persistent) }]); });
}

/* ── Mobile helpers ── */

// Detect touch device once at module level
const IS_MOBILE = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

// Swipe hook: returns touch event props to spread onto an element
function useSwipe(onSwipeLeft, onSwipeRight, threshold) {
  const startX = useRef(0);
  const startY = useRef(0);
  return {
    onTouchStart: function(e) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    onTouchEnd: function(e) {
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      // Ignore vertical swipes (scrolling)
      if (Math.abs(dy) > Math.abs(dx)) return;
      const min = threshold || 60;
      if (Math.abs(dx) < min) return;
      if (dx > 0) { onSwipeRight && onSwipeRight(); }
      else { onSwipeLeft && onSwipeLeft(); }
    },
  };
}

// Pull-to-refresh hook
function usePullToRefresh(onRefresh) {
  const startY = useRef(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  function doRefresh() {
    setRefreshing(true);
    Promise.resolve(onRefresh()).finally(function() { setRefreshing(false); });
  }

  const handlers = {
    onTouchStart: function(e) {
      // Only activate when scrolled to top
      const el = e.currentTarget;
      if (el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
    },
    onTouchMove: function(e) {
      if (!startY.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 60 && !pulling && !refreshing) {
        setPulling(true);
      }
    },
    onTouchEnd: function() {
      if (pulling) {
        setPulling(false);
        doRefresh();
      }
      startY.current = 0;
    },
  };

  return { handlers, pulling, refreshing };
}

// scrollIntoView handler for form inputs on mobile (prevents keyboard clip)
function mobileInputFocus(e) {
  if (!IS_MOBILE) return;
  const el = e.target;
  setTimeout(function() {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 320);
}

/* ── Skeleton loader helpers ── */
function SkeletonRow(props) {
  const n = (props && props.cols) || 5;
  return h('tr', null,
    Array.from({ length: n }, function(_, i) {
      return h('td', { key: i }, h('div', { className: 'skel-line', style: { width: i === 0 ? '60%' : i === n - 1 ? '40%' : '80%' } }));
    })
  );
}
function SkeletonStat() {
  return h('div', { className: 'stat' },
    h('div', { className: 'skel-line', style: { width: '60%', marginBottom: 10 } }),
    h('div', { className: 'skel-line', style: { width: '45%', height: 28, marginBottom: 8 } }),
    h('div', { className: 'skel-line', style: { width: '70%' } })
  );
}
// Card-shaped skeleton for list screens (Customers, Inventory, POs, Reports)
function SkeletonCard(props) {
  const count = (props && props.count) || 4;
  return h('div', { className: 'card' },
    Array.from({ length: count }, function(_, i) {
      return h('div', { key: i, className: 'skel-card-row' },
        h('div', { className: 'skel-card-main' },
          h('div', { className: 'skel-line', style: { width: '55%', marginBottom: 6 } }),
          h('div', { className: 'skel-line', style: { width: '35%', height: 10 } })
        ),
        h('div', { className: 'skel-card-side' },
          h('div', { className: 'skel-line', style: { width: 48, height: 20 } })
        )
      );
    })
  );
}

/* ── Connection-slow timeout hook ── */
function useLoadTimeout(loading, timeoutMs) {
  const [slow, setSlow] = useState(false);
  useEffect(function() {
    if (!loading) { setSlow(false); return; }
    const t = setTimeout(function() { setSlow(true); }, timeoutMs || 10000);
    return function() { clearTimeout(t); };
  }, [loading]);
  return slow;
}

/* ── Error boundary wrapper ── */
function withErrorBoundary(ScreenFn) {
  return function SafeScreen(props) {
    try { return ScreenFn(props); }
    catch(e) {
      console.error('[POS] Screen crash:', e);
      return h('div', { className: 'error-state' },
        h('div', { className: 'error-state-icon' }, '!'),
        h('p', { className: 'error-state-title' }, 'Something went wrong'),
        h('p', { className: 'error-state-sub' }, e && e.message ? e.message : 'Unexpected error'),
        h('button', { className: 'btn primary', style: { marginTop: 16 }, onClick: function() { window.location.reload(); } }, 'Reload POS')
      );
    }
  };
}

/* ── Time-of-day greeting ── */
function getGreeting(name) {
  const hr = new Date().getHours();
  const part = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';
  return 'Good ' + part + (name ? ', ' + name : '');
}

/* ── SVG Icons ── */
const Ico = {
  Dashboard: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2'},
      h('rect',{x:'2',y:'2',width:'5',height:'6'}),h('rect',{x:'9',y:'2',width:'5',height:'3'}),
      h('rect',{x:'2',y:'10',width:'5',height:'4'}),h('rect',{x:'9',y:'7',width:'5',height:'7'})),
  List: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.4',strokeLinecap:'round'},
      h('path',{d:'M3 4h10M3 8h10M3 12h10'})),
  Grid: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2'},
      h('rect',{x:'2',y:'2',width:'5',height:'5'}),h('rect',{x:'9',y:'2',width:'5',height:'5'}),
      h('rect',{x:'2',y:'9',width:'5',height:'5'}),h('rect',{x:'9',y:'9',width:'5',height:'5'})),
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
  MessageBubble: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'M13.5 2.5H2.5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2l1.5 2 1.5-2h6a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1Z'})),
  Phone: ({ size=14 }) =>
    h('svg',{viewBox:'0 0 16 16',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'M3 2.5c0 0 1 0 2 2s.5 3.5.5 3.5L4 9.5c.7 1.3 2.2 2.8 3.5 3.5l1.5-1.5s1.5-.5 3.5.5 2 2 2 2v1c0 .8-.8 1.5-2 1.5C5.2 16.5 0 11.3 0 4c0-1.2.7-1.5 1.5-1.5h1.5Z'})),
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

/* ── OptionsMenu (contextual kebab dropdown) ── */
function OptionsMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return h('div', { className: 'options-menu-wrap', ref },
    h('button', {
      className: 'btn ghost options-btn',
      style: { height: 24, padding: '0 6px' },
      onClick: e => { e.stopPropagation(); setOpen(o => !o); },
    }, h(Ico.Dots, { size: 12 })),
    open && h('div', { className: 'options-dropdown' },
      items.map((item, i) =>
        item === 'divider'
          ? h('div', { key: 'div'+i, className: 'options-divider' })
          : h('button', {
              key: i,
              className: 'options-item' + (item.danger ? ' danger' : ''),
              onClick: e => { e.stopPropagation(); setOpen(false); item.onClick && item.onClick(); },
            }, item.label)
      )
    )
  );
}

/* ── Modal wrapper ── */
function Modal({ title, onClose, width, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return h('div', { className: 'modal-overlay', onClick: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { className: 'modal-box', style: width ? { width } : null },
      h('div', { className: 'modal-head' },
        h('span', { className: 'modal-title' }, title),
        h('button', { className: 'btn ghost', style: { height: 24, padding: '0 6px', marginLeft: 'auto' }, onClick: onClose }, '×')
      ),
      children
    )
  );
}

/* ── Confirm modal ── */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return h(Modal, { title: 'Confirm', onClose: onCancel, width: 360 },
    h('div', { style: { padding: 18 } },
      h('p', { style: { marginBottom: 18, color: 'var(--text-1)' } }, message),
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
        h('button', { className: 'btn', onClick: onCancel }, 'Cancel'),
        h('button', { className: 'btn primary', onClick: onConfirm }, 'Confirm')
      )
    )
  );
}

/* ── SMS Modal ── */
function SmsModal({ customer, phone, onClose }) {
  const [body, setBody] = useState('Your bike is ready for pickup at ChainLine Kelowna!');
  function send() {
    toast('SMS queued to ' + (phone || customer), 'success');
    onClose();
  }
  return h(Modal, { title: 'SMS Customer', onClose, width: 440 },
    h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 12 } },
      h(Field, { label: 'To' },
        h('input', { className: 'input', value: phone || customer, readOnly: true })
      ),
      h(Field, { label: 'Message' },
        h('textarea', { className: 'textarea', rows: 4, value: body, onChange: e => setBody(e.target.value) })
      ),
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
        h('button', { className: 'btn', onClick: onClose }, 'Cancel'),
        h('button', { className: 'btn primary', onClick: send }, 'Send SMS')
      )
    )
  );
}

/* ── WO Inline Notify Button ── */
function WONotifyButton({ wo }) {
  const [open, setOpen]       = useState(false);
  const [msg, setMsg]         = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const phone = wo.phone || (wo.customer && wo.customer.phone) || '';
  const firstName = (wo.cust || '').split(' ')[0] || 'there';

  function defaultMsg() {
    return 'Hi ' + firstName + ', your bike is ready for pickup at ChainLine Cycle! We’re open Mon–Sat 10am–6pm, Sun 11am–5pm.';
  }

  function handleOpen(e) {
    e.stopPropagation();
    if (!phone) { toast('No phone number on file', 'error'); return; }
    setMsg(defaultMsg());
    setOpen(true);
    setSent(false);
  }

  async function handleSend(e) {
    e.stopPropagation();
    setSending(true);
    const res = await apiPost('/api/send-sms', { to: phone, message: msg });
    setSending(false);
    if (res && !res.error) {
      setSent(true);
      setOpen(false);
      setTimeout(() => setSent(false), 3000);
    } else {
      toast('SMS failed: ' + ((res && res.error) || 'worker error'), 'error');
    }
  }

  function handleClose(e) { if (e) e.stopPropagation(); setOpen(false); }

  return h('div', { style: { position: 'relative', display: 'inline-block' }, onClick: e => e.stopPropagation() },
    sent
      ? h('span', {
          style: { fontSize: 11, color: 'var(--green, #16a34a)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', padding: '2px 4px' },
        }, '✅ Sent')
      : h('button', {
          className: 'btn ghost',
          title: phone ? 'Text customer' : 'No phone on file',
          style: { fontSize: 11, padding: '2px 7px', opacity: phone ? 1 : 0.4 },
          onClick: handleOpen,
        }, '📱'),

    open && h('div', {
      style: {
        position: 'absolute', right: 0, top: '100%', zIndex: 999,
        background: 'var(--bg2, #1e1e2e)', border: '1px solid var(--border, #333)',
        borderRadius: 8, padding: 14, width: 320,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      },
    },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
        h('span', { style: { fontSize: 12, fontWeight: 600, color: 'var(--text-1)' } }, '📱 Notify ' + firstName),
        h('button', { className: 'btn ghost', style: { padding: '1px 6px', fontSize: 12 }, onClick: handleClose }, '×')
      ),
      h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginBottom: 8, fontFamily: 'var(--font-mono)' } }, phone),
      h('textarea', {
        style: {
          width: '100%', boxSizing: 'border-box',
          background: 'var(--bg3, #2a2a3a)', border: '1px solid var(--border, #333)',
          color: 'var(--text-1)', borderRadius: 6, padding: 8, fontSize: 12,
          resize: 'vertical', minHeight: 72,
        },
        rows: 4,
        value: msg,
        onChange: e => setMsg(e.target.value),
        onClick: e => e.stopPropagation(),
      }),
      h('div', { style: { display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' } },
        h('button', { className: 'btn', style: { fontSize: 11 }, onClick: handleClose }, 'Cancel'),
        h('button', {
          className: 'btn primary',
          style: { fontSize: 11 },
          disabled: sending || !msg.trim(),
          onClick: handleSend,
        }, sending ? 'Sending…' : 'Send')
      )
    )
  );
}

/* ─────────────────────────────────────────
   CONNECTION STATUS
───────────────────────────────────────── */
function useConnectionStatus() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    let mounted = true;
    async function check() {
      // Instant fail when browser knows WiFi is dead
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (mounted) setOnline(false);
        return;
      }
      try {
        const r = await fetch(WORKER + '/api/ping', { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(4000) });
        if (mounted) setOnline(r.ok || r.status < 500);
      } catch { if (mounted) setOnline(false); }
    }
    check();
    // Native online/offline events fire on WiFi drop/reconnect — instant
    let wasOffline = false;
    function onOnline()  {
      if (wasOffline) {
        toast('Back online — reconnected to worker', 'success');
        wasOffline = false;
        // Auto-refresh key data
        bootstrapLiveData && bootstrapLiveData();
      }
      check();
    }
    function onOffline() {
      wasOffline = true;
      if (mounted) setOnline(false);
    }
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    // Periodic re-check every 30s as a backup
    const id = setInterval(check, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  return online;
}

/* ─────────────────────────────────────────
   GLOBAL BARCODE SCANNER HOOK
───────────────────────────────────────── */
function useBarcodeScanner(onScan) {
  const buf = useRef('');
  const last = useRef(0);
  useEffect(() => {
    const DELAY_MS = 50;
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (['INPUT','TEXTAREA','SELECT'].includes(tag) && !document.activeElement?.dataset.barcodeTarget) return;
      const now = Date.now();
      if (now - last.current > 500) buf.current = '';
      last.current = now;
      if (e.key === 'Enter' && buf.current.length >= 3) {
        onScan(buf.current.trim());
        buf.current = '';
        return;
      }
      if (e.key.length === 1) buf.current += e.key;
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onScan]);
}

/* ─────────────────────────────────────────
   GLOBAL SEARCH (Cmd+K) — v2: live API enrichment + quick-nav
───────────────────────────────────────── */
function GlobalSearch({ onNavigate, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [apiExtras, setApiExtras] = useState({ customers: [], items: [] });
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  // Local instant results from bootstrapped arrays
  const localResults = [];
  if (q.trim().length > 1) {
    const ql = q.toLowerCase();
    lsCustomers.filter(c => c.name.toLowerCase().includes(ql) || (c.phone || '').includes(ql)).slice(0,3).forEach(c =>
      localResults.push({ type: 'customer', label: c.name, sub: c.phone || 'No phone', id: c.id, screen: 'customers' })
    );
    lsWorkOrders.filter(r => (r.id || '').toLowerCase().includes(ql) || (r.cust || '').toLowerCase().includes(ql) || (r.bike || '').toLowerCase().includes(ql)).slice(0,4).forEach(r =>
      localResults.push({ type: 'workorder', label: (r.id || '') + ' \xb7 ' + (r.cust || ''), sub: (r.bike || '') + ' \xb7 ' + (r.status || ''), id: r.id, screen: 'work-orders', _wo: r })
    );
    lsCatalog.filter(it => it.name.toLowerCase().includes(ql) || it.sku.toLowerCase().includes(ql)).slice(0,3).forEach(it =>
      localResults.push({ type: 'item', label: it.name, sub: it.sku + ' \xb7 ' + fmt$(it.price) + (it.stock > 0 ? ' \xb7 ' + it.stock + ' in stock' : ' \xb7 OOS'), id: it.sku, screen: 'inventory', _item: it })
    );
  }

  // Debounced API enrichment
  useEffect(() => {
    if (q.trim().length < 2) { setApiExtras({ customers: [], items: [] }); setSearching(false); return; }
    clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      Promise.all([
        apiGet('/api/pos-customers?search=' + encodeURIComponent(q) + '&limit=5').catch(() => null),
        apiGet('/api/items-search?q=' + encodeURIComponent(q) + '&limit=5').catch(() => null),
      ]).then(([cd, id]) => {
        const rawC = (cd && (cd.customers || (Array.isArray(cd) ? cd : []))) || [];
        const rawI = (id && id.items) ? id.items : [];
        setApiExtras({
          customers: rawC.map(normaliseCustomer).filter(c => !lsCustomers.find(x => x.id === c.id)),
          items:     rawI.map(normaliseItem).filter(it => !lsCatalog.find(x => x.sku === it.sku)),
        });
        setSearching(false);
      }).catch(() => setSearching(false));
    }, 320);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  // Merge local + API extras
  const results = [...localResults];
  const localCustCount = localResults.filter(r => r.type === 'customer').length;
  const localItemCount = localResults.filter(r => r.type === 'item').length;
  apiExtras.customers.slice(0, Math.max(0, 3 - localCustCount)).forEach(c =>
    results.push({ type: 'customer', label: c.name, sub: c.phone || 'No phone', id: c.id, screen: 'customers' })
  );
  apiExtras.items.slice(0, Math.max(0, 3 - localItemCount)).forEach(it =>
    results.push({ type: 'item', label: it.name, sub: it.sku + ' \xb7 ' + fmt$(it.price) + (it.stock > 0 ? ' \xb7 ' + it.stock + ' in stock' : ' \xb7 OOS'), id: it.sku, screen: 'inventory', _item: it })
  );

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s+1, results.length-1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s-1, 0)); }
    if (e.key === 'Enter' && results[sel]) { onNavigate(results[sel]); onClose(); }
    if (e.key === 'Escape') onClose();
  }

  const typeLabel = { customer: 'Customer', workorder: 'Work Order', item: 'Parts' };
  const typeColor  = { customer: '#3b82f6', workorder: 'var(--accent)', item: '#10b981' };

  return h(Modal, { title: 'Global Search \xb7 \u2318K', onClose, width: 580 },
    h('div', { style: { padding: '12px 18px' } },
      h('div', { style: { position: 'relative' } },
        h('input', {
          ref: inputRef,
          className: 'input',
          placeholder: 'Search customers, work orders, parts, SKUs\u2026',
          value: q,
          onChange: e => { setQ(e.target.value); setSel(0); },
          onKeyDown: onKey,
          style: { fontSize: 15, paddingRight: 40 },
        }),
        searching && h('span', {
          style: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.06em', pointerEvents: 'none' },
        }, 'searching\u2026')
      ),
      q.length < 2 && h('div', { style: { marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' } },
        [
          { label: 'Work Orders', screen: 'work-orders' },
          { label: 'Sales', screen: 'sales' },
          { label: 'Customers', screen: 'customers' },
          { label: 'Inventory', screen: 'inventory' },
          { label: 'Reports', screen: 'reports' },
        ].map(nav => h('button', {
          key: nav.screen,
          className: 'btn ghost',
          style: { fontSize: 11, padding: '3px 10px', height: 26 },
          onClick: () => { onNavigate({ screen: nav.screen }); onClose(); },
        }, nav.label))
      )
    ),
    results.length > 0 && h('div', { style: { borderTop: '1px solid var(--line)', maxHeight: 400, overflowY: 'auto' } },
      results.map((r, i) =>
        h('div', {
          key: i,
          className: 'global-search-result' + (i === sel ? ' selected' : ''),
          onClick: () => { onNavigate(r); onClose(); },
          style: { display: 'flex', alignItems: 'center', gap: 10 },
        },
          h('div', {
            className: 'gs-type',
            style: { color: typeColor[r.type] || 'var(--text3)', borderColor: typeColor[r.type] || 'var(--line)', flexShrink: 0 },
          }, typeLabel[r.type] || r.type),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { className: 'gs-label' }, r.label),
            h('div', { className: 'gs-sub' }, r.sub)
          ),
          r.type === 'workorder' && r._wo && h('div', {
            style: { fontSize: 10, flexShrink: 0, alignSelf: 'center', fontFamily: 'var(--mono)', color: r._wo.dueState === 'overdue' ? 'var(--accent)' : 'var(--text3)' },
          }, r._wo.due || ''),
          r.type === 'item' && r._item && r._item.stock > 0 && h('div', {
            style: { fontSize: 10, color: '#10b981', fontFamily: 'var(--mono)', flexShrink: 0, alignSelf: 'center' },
          }, r._item.stock + ' stk')
        )
      )
    ),
    q.length > 1 && results.length === 0 && !searching && h('div', {
      style: { padding: '28px 18px', textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em' }
    }, 'NO RESULTS FOR "' + q.toUpperCase() + '"')
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
// WO_ACTIVE_COUNT is computed dynamically from lsWorkOrders at render time (see Sidebar below).
// Kept as a getter so sibling modules that read window.WO_ACTIVE_COUNT get a fresh value.
function getWoActiveCount() {
  return lsWorkOrders.filter(wo => wo.status !== 'done' && wo.status !== 'ready' && wo.status !== 'booked').length;
}
// Legacy alias for any callers that expect a number (will be 0 until bootstrap completes).
Object.defineProperty(window, 'WO_ACTIVE_COUNT', { get: getWoActiveCount, configurable: true });

const NAV_MAIN = [
  { id: 'my-queue',    label: 'My Queue',    mobileLabel: 'Queue',   Icon: 'List',      count: null },
  { id: 'floor',       label: 'Floor',       mobileLabel: 'Floor',   Icon: 'Grid',      count: null },
  { id: 'dashboard',   label: 'Dashboard',   mobileLabel: 'Home',    Icon: 'Dashboard', count: null },
  { id: 'work-orders', label: 'Work Orders', mobileLabel: 'WOs',     Icon: 'Wrench',    count: null },
  { id: 'sales',       label: 'Sales',       mobileLabel: 'Sales',   Icon: 'Cart',      count: null },
  { id: 'customers',   label: 'Customers',   mobileLabel: 'Customers', Icon: 'Users',   count: null },
  { id: 'inventory',   label: 'Inventory',   mobileLabel: 'Stock',   Icon: 'Box',       count: null },
];
const NAV_TOOLS = [
  { id: 'messages',          label: 'Messages',        mobileLabel: 'SMS',     Icon: 'MessageBubble' },
  { id: 'bookings',         label: 'Bookings',        mobileLabel: 'Book',    Icon: 'Calendar' },
  { id: 'purchase-orders',  label: 'Purchase Orders', mobileLabel: 'POs',     Icon: 'Box'      },
  { id: 'vendor-catalog',   label: 'Vendor Catalog',  mobileLabel: 'Vendors', Icon: 'Search'   },
  { id: 'reports',          label: 'Reports',         mobileLabel: 'Reports', Icon: 'Clock'    },
  { id: 'settings',         label: 'Settings',        mobileLabel: 'Settings', Icon: 'Dots'    },
];

// Unread SMS count — polled every 30s, shared across Sidebar and MessagesScreen
let _smsUnreadCount = 0;
let _smsUnreadListeners = [];
function getSmsUnreadCount() { return _smsUnreadCount; }
function onSmsUnreadChange(fn) { _smsUnreadListeners.push(fn); return () => { _smsUnreadListeners = _smsUnreadListeners.filter(f => f !== fn); }; }
function _setSmsUnread(n) { _smsUnreadCount = n; _smsUnreadListeners.forEach(f => f(n)); }
function startSmsUnreadPoller() {
  const poll = () => apiGet('/api/sms-inbox').then(d => {
    const msgs = d.messages || [];
    _setSmsUnread(msgs.filter(m => m.direction === 'Inbound' && m.readStatus === 'Unread').length);
  }).catch(() => {});
  poll();
  return setInterval(poll, 30000);
}

function OfflineBanner() {
  const online = useConnectionStatus();
  const [reconnecting, setReconnecting] = useState(false);
  useEffect(() => {
    if (online) { setReconnecting(false); return; }
    // Show "Reconnecting…" after 2s offline to indicate retry is active
    const t = setTimeout(function() { setReconnecting(true); }, 2000);
    return function() { clearTimeout(t); };
  }, [online]);
  if (online) return null;
  return h('div', { className: 'offline-banner' },
    h('span', { className: 'offline-dot' }, '●'),
    reconnecting
      ? h(Fragment, null, 'Reconnecting… ', h('span', { className: 'offline-spinner' }))
      : 'Offline · changes queued, will sync on reconnect'
  );
}

// PST-exempt dept/category keywords (BC: bikes, helmets, bike lights per RSBC 1996 c.431 Sched I)
const PST_EXEMPT_DEPTS = ['bicycle', 'bikes', 'e-bike', 'ebike', 'helmet', 'helmets', 'bike light', 'bike lights', 'lighting'];
function isPstExempt(item) {
  if (item.taxablePst === false) return true;
  const haystack = ((item.dept || '') + ' ' + (item.category || '') + ' ' + (item.name || '')).toLowerCase();
  // Labour/service SKU prefix check
  if ((item.sku || '').toUpperCase().startsWith('LAB-') || (item.sku || '').toUpperCase().startsWith('SVC-')) return true;
  return PST_EXEMPT_DEPTS.some(kw => haystack.includes(kw));
}

function StripeBanner() {
  const [status, setStatus] = useState(null); // null = loading, false = configured, 'unconfigured' = show banner
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    apiGet('/api/stripe-status').then(d => {
      if (d && !d.configured) setStatus('unconfigured');
      else if (d && d.mode === 'test') setStatus('test');
      else setStatus('ok');
    }).catch(() => setStatus(null));
  }, []);
  if (dismissed || status === null || status === 'ok') return null;
  const isTest = status === 'test';
  const bg    = isTest ? 'rgba(180,130,0,0.08)' : 'rgba(200,57,44,0.08)';
  const bdr   = isTest ? '1px solid rgba(180,130,0,0.3)' : '1px solid rgba(200,57,44,0.25)';
  const dot   = isTest ? '#b48200' : 'var(--accent)';
  const msg   = isTest
    ? 'Stripe TEST mode · card charges are simulated'
    : 'Payments not configured · set STRIPE_SECRET_KEY in Cloudflare Worker secrets';
  return h('div', { style: {
    background: bg, borderBottom: bdr,
    borderLeft: '3px solid ' + dot, padding: '7px 20px',
    fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase',
    color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8,
  }},
    h('span', { style: { color: dot } }, '●'),
    msg,
    h('button', {
      onClick: () => setDismissed(true),
      style: { marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 4px' },
      'aria-label': 'Dismiss',
    }, '\xd7')
  );
}

function ConnectionStatus() {
  const online = useConnectionStatus();
  return h('div', { className: 'conn-status' },
    h('span', { className: 'conn-dot ' + (online ? 'conn-green' : 'conn-red') }),
    h('span', null, online ? 'Worker live' : 'Offline - cached')
  );
}

function Sidebar({ screen, setScreen, staff, onLogout }) {
  const activeNav = (screen === 'new-wo' || screen === 'wo-detail' || screen === 'wo-calendar') ? 'work-orders' : screen;
  const [moreOpen, setMoreOpen] = useState(false);
  const [smsUnread, setSmsUnread] = useState(getSmsUnreadCount());
  useEffect(() => onSmsUnreadChange(setSmsUnread), []);
  const navItem = (n) => {
    const count = n.id === 'work-orders' ? getWoActiveCount() : n.id === 'messages' ? (smsUnread || null) : n.count;
    return h('a', {
      key: n.id,
      className: 'nav-item' + (activeNav === n.id ? ' active' : '') + (n.mobileHidden ? ' mobile-hidden' : ''),
      onClick: () => { setScreen(n.id); setMoreOpen(false); },
    },
      h('span', { className: 'nav-icon' }, h(Ico[n.Icon], { size: 14 })),
      h('span', { className: 'nav-item-label' }, n.label),
      h('span', { className: 'nav-item-label-mobile' }, n.mobileLabel || n.label),
      count ? h('span', { className: 'nav-count' }, count) : null
    );
  };

  // Mobile bottom-nav: pin 5 most-used + "More" sheet for the rest. Order:
  // Sales · WOs · My Queue · Floor · More. Items beyond top 4 hidden on mobile.
  const MOBILE_PIN_IDS = new Set(['sales','work-orders','my-queue','floor']);
  const annotatedMain = NAV_MAIN.map(n => ({ ...n, mobileHidden: !MOBILE_PIN_IDS.has(n.id) }));
  const annotatedTools = NAV_TOOLS.map(n => ({ ...n, mobileHidden: true }));
  const overflowItems = [...NAV_MAIN, ...NAV_TOOLS].filter(n => !MOBILE_PIN_IDS.has(n.id));
  const moreItem = h('a', {
    key: '__more',
    className: 'nav-item nav-item-more mobile-only',
    onClick: () => setMoreOpen(o => !o),
  },
    h('span', { className: 'nav-icon' }, h(Ico.Dots, { size: 14 })),
    h('span', { className: 'nav-item-label-mobile' }, 'More')
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
      annotatedMain.map(navItem),
      moreItem
    ),
    h('div', { className: 'nav-section nav-grow' },
      h('div', { className: 'nav-label' }, 'Tools'),
      annotatedTools.map(navItem)
    ),
    // Mobile "More" bottom-sheet — opens from the More tab
    moreOpen && h('div', {
      className: 'mobile-more-sheet',
      onClick: (e) => { if (e.target === e.currentTarget) setMoreOpen(false); }
    },
      h('div', { className: 'mobile-more-content' },
        h('div', { className: 'mobile-more-head' },
          h('span', null, 'More'),
          h('button', { onClick: () => setMoreOpen(false), 'aria-label': 'Close' }, '×')
        ),
        h('div', { className: 'mobile-more-grid' },
          overflowItems.map(n =>
            h('a', {
              key: n.id,
              className: 'mobile-more-item' + (activeNav === n.id ? ' active' : ''),
              onClick: () => { setScreen(n.id); setMoreOpen(false); }
            },
              h('span', { className: 'mobile-more-icon' }, h(Ico[n.Icon], { size: 18 })),
              h('span', { className: 'mobile-more-label' }, n.label)
            )
          )
        )
      )
    ),
    h('div', { className: 'sidebar-foot' },
      h(AvInit, { initials: staff ? staff.initials : 'CL', tone: staff ? staff.tone : 'am' }),
      h('div', { className: 'user-meta' },
        h('span', { className: 'user-name' },
          staff ? staff.name : 'ChainLine',
          // §15 STAFF chip - every signed-in user is staff
          staff && window.CustomerTypeChip && h(window.CustomerTypeChip, { type: 'staff' })
        ),
        h('span', { className: 'user-role' }, staff ? staff.role : '')
      ),
      h(ConnectionStatus),
      onLogout && h('button', {
        className: 'btn ghost',
        title: 'Log out',
        style: { height: 24, padding: '0 6px', marginLeft: 4, flexShrink: 0 },
        onClick: onLogout,
      },
        h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: '1.3', strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('path', { d: 'M10 3h3v10h-3M7 5l3 3-3 3M2 8h8' })
        )
      )
    )
  );
}

/* ─────────────────────────────────────────
   TOPBAR
───────────────────────────────────────── */
function Topbar({ screen, topbarSearchRef, onOpenSearch }) {
  const crumbs = {
    'dashboard': ['Shop', 'Dashboard'],
    'floor': ['Service', 'Shop Floor'],
    'my-queue': ['Service', 'My Queue'],
    'work-orders': ['Service', 'Work Orders'],
    'new-wo': ['Service', 'Work Orders', 'New'],
    'wo-detail': ['Service', 'Work Orders', 'Detail'],
    'wo-calendar': ['Service', 'Work Orders', 'Calendar'],
    'sales': ['Retail', 'Sales Register'],
    'customers': ['CRM', 'Customers'],
    'inventory': ['Stock', 'Inventory'],
    'bookings': ['Tools', 'Bookings'],
    'purchase-orders': ['Tools', 'Purchase Orders'],
    'reports': ['Tools', 'Reports'],
    'settings': ['Tools', 'Settings'],
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
    h('div', { className: 'topbar-search', style: { cursor: 'pointer' }, onClick: onOpenSearch },
      h(Ico.Search, { size: 12 }),
      h('input', { ref: topbarSearchRef, placeholder: 'Search WO, customer, SKU…', readOnly: true, style: { cursor: 'pointer' } }),
      h('span', { className: 'kbd' }, '⌘K')
    ),
    // Mobile-only search button — replaces the desktop topbar-search bar when
    // viewport hides it. Opens the same global command palette / search sheet.
    h('button', {
      className: 'btn ghost topbar-search-mobile mobile-only',
      onClick: onOpenSearch,
      'aria-label': 'Search'
    }, h(Ico.Search, { size: 18 })),
    h('div', { className: 'station' }, 'Drawer ', h('b', null, 'open'), ' \xb7 08:14'),
    h('button', { className: 'btn ghost' }, h(Ico.Dots, { size: 14 }))
  );
}

/* ─────────────────────────────────────────
   STATUS STRIP
───────────────────────────────────────── */
function StatusStrip() {
  const online = useConnectionStatus();
  return h('div', { className: 'status-strip' },
    h('span', { className: online ? 'dot-live' : 'status-dot', style: online ? null : { background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', animation: 'none' } }),
    h('span', null, online ? '● ONLINE' : '● OFFLINE'),
    h('span', { style: { color: 'var(--text3)', margin: '0 4px' } }, '\xb7'),
    h('span', null, 'TERMINAL READY'),
    h('span', { style: { color: 'var(--text3)', margin: '0 4px' } }, '\xb7'),
    h('span', null, 'PRINTER READY'),
    h('span', { className: 'spacer' }),
    h('span', null, 'CHAINLINE POS \xb7 v2.1 \xb7 MAY 20')
  );
}

/* ─────────────────────────────────────────
   SCREEN A — DASHBOARD
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   END OF DAY MODAL
───────────────────────────────────────── */
function EndOfDayModal({ onClose }) {
  const DENOMS = [
    { label: '$100', val: 100 }, { label: '$50', val: 50 },
    { label: '$20', val: 20  }, { label: '$10', val: 10  },
    { label: '$5',  val: 5   }, { label: '$2',  val: 2   },
    { label: '$1',  val: 1   }, { label: '25¢', val: 0.25 },
    { label: '10¢', val: 0.10 }, { label: '5¢', val: 0.05 },
  ];
  const [counts, setCounts] = useState(() => Object.fromEntries(DENOMS.map(d => [d.label, ''])));
  const expected = 412.00;
  const counted = DENOMS.reduce((sum, d) => sum + d.val * (parseFloat(counts[d.label]) || 0), 0);
  const variance = Math.round((counted - expected) * 100) / 100;

  function print() {
    toast('Z-report sent to printer', 'success');
    onClose();
  }

  return h(Modal, { title: 'End of Day \xb7 Cash Count', onClose, width: 520 },
    h('div', { style: { padding: 18 } },
      h('div', { className: 'eod-grid' },
        DENOMS.map(d =>
          h('div', { key: d.label, className: 'eod-row' },
            h('span', { className: 'eod-denom' }, d.label),
            h('input', {
              className: 'input mono',
              type: 'number', min: '0',
              placeholder: '0',
              value: counts[d.label],
              onChange: e => setCounts(c => ({ ...c, [d.label]: e.target.value })),
              style: { width: 80, textAlign: 'right' },
            }),
            h('span', { className: 'eod-sub' }, fmt$(d.val * (parseFloat(counts[d.label]) || 0)))
          )
        )
      ),
      h('div', { className: 'eod-summary' },
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Expected cash'), h('span', { className: 'v mono' }, fmt$(expected))),
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Counted'), h('span', { className: 'v mono' }, fmt$(counted))),
        h('div', { className: 'aside-row', style: { background: variance < 0 ? 'var(--red-bg)' : variance > 0 ? 'var(--green-bg)' : '' } },
          h('span', { className: 'k strong' }, 'Variance'),
          h('span', { className: 'v mono', style: { color: variance < 0 ? 'var(--red)' : variance > 0 ? 'var(--green)' : 'var(--text)' } },
            (variance >= 0 ? '+' : '') + fmt$(variance)
          )
        )
      ),
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 } },
        h('button', { className: 'btn', onClick: onClose }, 'Cancel'),
        h('button', { className: 'btn primary', onClick: print }, 'Print Z-Report')
      )
    )
  );
}

function DashboardScreen({ setScreen, staff }) {
  const [showEod, setShowEod] = useState(false);
  const [apiStats, setApiStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [syncAt, setSyncAt] = useState(window._lsBootstrapAt || null);
  const slow = useLoadTimeout(statsLoading, 10000);

  useEffect(() => {
    setStatsLoading(true);
    apiGet('/api/pos-stats').then(function(d) {
      if (d && d.openWorkOrders != null) setApiStats(d);
      setStatsLoading(false);
    }).catch(function() { setStatsLoading(false); });
    function onSync(e) { setSyncAt(e.detail && e.detail.at ? e.detail.at : Date.now()); }
    window.addEventListener('ls:bootstrap', onSync);
    return function() { window.removeEventListener('ls:bootstrap', onSync); };
  }, []);

  // Live WO counts from bootstrapped data
  const openCount = lsWorkOrders.filter(function(w) { return w.status !== 'done' && w.status !== 'closed'; }).length;
  const overdueCount = lsWorkOrders.filter(function(w) { return w.dueState === 'overdue'; }).length;

  const stats = [
    {
      label: 'Open Work Orders',
      value: statsLoading ? null : String(apiStats ? apiStats.openWorkOrders : openCount),
      foot: statsLoading ? null : (apiStats ? String(apiStats.inProgressWorkOrders || 0) + ' in progress' : openCount + ' total'),
      accentColor: null, delta: null,
    },
    {
      label: 'Overdue',
      value: statsLoading ? null : String(apiStats ? apiStats.overdueWorkOrders : overdueCount),
      foot: statsLoading ? null : 'Action required',
      accentColor: 'var(--accent)', delta: null,
    },
    {
      label: "Today's Revenue",
      value: statsLoading ? null : (apiStats && apiStats.todayRevenue != null ? fmt$(apiStats.todayRevenue) : '--'),
      foot: statsLoading ? null : (apiStats && apiStats.todayRevenue != null ? 'Live from Lightspeed' : 'No data yet'),
      accentColor: null, delta: apiStats && apiStats.todayRevenue > 0 ? 'up' : null,
    },
    {
      label: 'Bookings This Week',
      value: statsLoading ? null : String(apiStats ? (apiStats.bookingsThisWeek || 0) : '--'),
      foot: statsLoading ? null : (apiStats ? String(apiStats.bookingsAwaitingDropoff || 0) + ' awaiting drop-off' : 'No data'),
      accentColor: null, delta: null,
    },
  ];

  const activity = [
    { t: '11:42', who: 'A. Miller', what: 'closed',    obj: 'WO-2384',      tail: ' · Full Tune' },
    { t: '11:18', who: 'J. Kovac',  what: 'sold',      obj: 'SHIM-XT-CS',   tail: ' · $189.00' },
    { t: '10:55', who: 'S. Reyes',  what: 'booked',    obj: 'WO-2401',      tail: ' · Suspension service · due Thu' },
    { t: '10:31', who: 'A. Miller', what: 'received',  obj: 'PO-0451',      tail: ' · 24 items' },
    { t: '09:48', who: 'M. Bell',   what: 'completed', obj: 'WO-2378',      tail: ' · Brake bleed' },
  ];

  const staffName = staff && staff.name ? staff.name : null;

  return h(Fragment, null,
    showEod && h(
      (window.EODModal || EndOfDayModal),
      {
        onClose: function() { setShowEod(false); },
        wosCompleted: lsWorkOrders.filter(function(w) { return (w.status || '').toLowerCase().includes('done') || (w.status || '').toLowerCase().includes('finished'); }).length || null,
        wosCreated: lsWorkOrders.filter(function(w) { var d = w.dateIn || ''; return d.startsWith(new Date().toISOString().slice(0,10)); }).length || null,
      }
    ),
    h(PageHead, {
      title: 'Dashboard',
      sub: getGreeting(staffName),
      actions: [
        h('button', { key: 'today', className: 'btn' }, 'Today ', h(Ico.ChevronRight, { size: 10 })),
        h('button', { key: 'sale', className: 'btn primary', onClick: function() { setScreen('sales'); } },
          h(Ico.Plus, { size: 13 }), ' New Sale ', h('span', { className: 'kbd' }, 'N')
        ),
      ],
    }),

    slow && statsLoading && h('div', { className: 'slow-conn-banner' },
      h('span', null, '⚠️ Connection slow — still loading…'),
      h('button', { className: 'btn', style: { marginLeft: 12 }, onClick: function() {
        setStatsLoading(true);
        apiGet('/api/pos-stats').then(function(d) { if (d && d.openWorkOrders != null) setApiStats(d); setStatsLoading(false); }).catch(function() { setStatsLoading(false); });
      }}, 'Retry')
    ),

    h('div', { className: 'stat-grid mb-22' },
      statsLoading
        ? [h(SkeletonStat, { key: 0 }), h(SkeletonStat, { key: 1 }), h(SkeletonStat, { key: 2 }), h(SkeletonStat, { key: 3 })]
        : stats.map(function(s, i) {
            return h('div', { key: i, className: 'stat' },
              h('div', { className: 'stat-label' }, s.label),
              h('div', { className: 'stat-value', style: s.accentColor ? { color: s.accentColor } : null }, s.value),
              h('div', { className: 'stat-foot' },
                s.delta === 'up' && h('span', { className: 'delta-up' }, h(Ico.ArrowUp, { size: 10 })),
                h('span', null, s.foot)
              )
            );
          })
    ),

    /* ─── Overdue alert banner ─── */
    !statsLoading && overdueCount > 0 && h('div', { className: 'dashboard-alert-banner' },
      h('div', { className: 'dab-icon' }, '\u26a0\ufe0f'),
      h('div', { style: { flex: 1 } },
        h('div', { style: { fontWeight: 600, fontSize: 13 } }, overdueCount + ' overdue work order' + (overdueCount === 1 ? '' : 's')),
        h('div', { style: { fontSize: 11, color: 'var(--text2)', marginTop: 2 } }, 'Customers are waiting — action required')
      ),
      h('button', { className: 'btn', style: { height: 28, fontSize: 11 }, onClick: function() { setScreen('work-orders'); } }, 'View all overdue')
    ),

    /* ─── Ready for pickup strip ─── */
    (function() {
      const readyList = lsWorkOrders.filter(function(w) {
        const s = (w.status || '').toLowerCase().replace(/\s+/g, '');
        return s === 'ready' || s.includes('ready');
      }).slice(0, 4);
      if (!readyList.length) return null;
      return h('div', { className: 'dashboard-ready-strip' },
        h('div', { style: { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 } }, '\u2705 Ready for pickup (' + readyList.length + ')'),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          readyList.map(function(w) {
            return h('div', { key: w.id, className: 'ready-wo-chip', onClick: function() { setScreen('work-orders'); } },
              h('span', { className: 'rwc-id' }, w.id || ''),
              h('span', { className: 'rwc-name' }, w.cust || ''),
              h('span', { className: 'rwc-bike' }, w.bike ? w.bike.slice(0, 20) : '')
            );
          })
        )
      );
    })(),

    h('div', { className: 'grid-2' },
      // Left column
      h('div', { className: 'col', style: { gap: 16 } },
        h('div', { className: 'card' },
          h('div', { className: 'card-head' },
            h('h3', null, 'Quick actions'),
            h('span', { className: 'sub' }, 'Shortcuts')
          ),
          h('div', { className: 'qa-grid' },
            h('button', { className: 'qa', onClick: function() { setScreen('new-wo'); } },
              h('span', { className: 'qa-ico' }, h(Ico.Wrench, { size: 18 })),
              h('span', { className: 'qa-title' }, 'New Work Order'),
              h('span', { className: 'qa-sub' }, 'Intake a bike')
            ),
            h('button', { className: 'qa', onClick: function() { setScreen('sales'); } },
              h('span', { className: 'qa-ico' }, h(Ico.Cart, { size: 18 })),
              h('span', { className: 'qa-title' }, 'New Sale'),
              h('span', { className: 'qa-sub' }, 'Open register')
            ),
            h('button', { className: 'qa', onClick: function() { setScreen('customers'); } },
              h('span', { className: 'qa-ico' }, h(Ico.Users, { size: 18 })),
              h('span', { className: 'qa-title' }, 'Customer Lookup'),
              h('span', { className: 'qa-sub' }, 'Search profiles')
            ),
            h('button', { className: 'qa', onClick: function() { setShowEod(true); } },
              h('span', { className: 'qa-ico' }, h(Ico.Clock, { size: 18 })),
              h('span', { className: 'qa-title' }, 'End of Day'),
              h('span', { className: 'qa-sub' }, 'Close drawer')
            )
          )
        ),

        h('div', { className: 'card' },
          h('div', { className: 'card-head' },
            h('h3', null, 'Service queue'),
            h('span', { className: 'sub' }, openCount + ' open'),
            h('div', { className: 'right' },
              h('button', { className: 'btn ghost', onClick: function() { setScreen('work-orders'); } },
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
              lsWorkOrders.length > 0
                ? lsWorkOrders.slice(0, 5).map(function(wo) {
                    return h('tr', { key: wo.id },
                      h('td', { className: 'num' }, wo.id),
                      h('td', null, wo.cust),
                      h('td', { className: 'muted' }, wo.bike),
                      h('td', null, h(Badge, { kind: wo.status }, wo.status === 'inprogress' ? 'In Progress' : (wo.status || '').charAt(0).toUpperCase() + (wo.status || '').slice(1))),
                      h('td', null, wo.dueState === 'overdue'
                        ? h('span', { className: 'overdue-text' }, 'Overdue')
                        : h('span', { className: 'num muted' }, wo.due || 'TBD')
                      ),
                      h('td', null, h(AvInit, { initials: wo.mech || 'UN', tone: wo.tone || 'am' }))
                    );
                  })
                : [
                    ['WO-2391', 'Devon Tran',    'Norco Sight C2 · 2023', 'ready',      'May 30', null,     'AM', 'am'],
                    ['WO-2388', 'Hannah Riise',  'Santa Cruz Bronson',        'inprogress', 'May 30', null,     'JK', 'jk'],
                    ['WO-2382', 'Marc Lefebvre', 'Trek Fuel EX 8',            'open',       null,     '2d late','SR', 'sr'],
                    ['WO-2402', 'Priya Sharma',  'Specialized Stumpjumper',   'booked',     'Jun 1',  null,     'MB', 'mb'],
                  ].map(function(row) {
                    const id = row[0], cust = row[1], bike = row[2], status = row[3], due = row[4], overdue = row[5], mech = row[6], tone = row[7];
                    return h('tr', { key: id },
                      h('td', { className: 'num' }, id),
                      h('td', null, cust),
                      h('td', { className: 'muted' }, bike),
                      h('td', null, h(Badge, { kind: status }, status === 'inprogress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1))),
                      h('td', null, overdue ? h('span', { className: 'overdue-text' }, overdue) : h('span', { className: 'num muted' }, due)),
                      h('td', null, h(AvInit, { initials: mech, tone }))
                    );
                  })
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
              h('span', { className: 'mono', style: { fontSize: 10, color: 'var(--text2)', letterSpacing: '0.08em' } }, 'SHOP · KEL-01')
            )
          ),
          h('div', null,
            activity.map(function(a, i) {
              return h('div', { key: i, className: 'feed-item' },
                h('span', { className: 'feed-time' }, a.t),
                h('span', { className: 'feed-text' },
                  h('span', { className: 'who' }, a.who), ' ',
                  h('span', { className: 'what' }, a.what), ' ',
                  h('span', { className: 'obj' }, a.obj),
                  h('span', { className: 'muted' }, a.tail)
                ),
                h('button', { className: 'btn ghost', style: { height: 24, padding: '0 6px' } }, h(Ico.Dots, { size: 12 }))
              );
            })
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
   WO DETAIL MODALS (Tag / Time / Discount / Fee / Reserve / Audit)
───────────────────────────────────────── */
const PRESET_TAGS = ['Ready', 'Waiting on Parts', 'Customer Contacted', 'Rush', 'Warranty', 'Insurance'];

function AddTagModal({ woId, currentTags, onSave, onClose }) {
  const [tags, setTags] = useState(currentTags || []);
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);

  function toggle(tag) {
    const has = tags.includes(tag);
    const next = has ? tags.filter(t => t !== tag) : [...tags, tag];
    setTags(next);
    if (woId) {
      apiPost('/api/workorder/' + woId + '/tag', { tag, remove: has }).catch(() => toast('Failed to save tag', 'error'));
    }
    onSave && onSave(next);
  }

  function addCustom() {
    const t = custom.trim();
    if (!t || tags.includes(t)) { setCustom(''); return; }
    const next = [...tags, t];
    setTags(next);
    if (woId) apiPost('/api/workorder/' + woId + '/tag', { tag: t }).catch(() => toast('Failed to save tag', 'error'));
    onSave && onSave(next);
    setCustom('');
  }

  const M = { overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }, box: { background: 'var(--bg2)', border: '1px solid var(--line)', width: 380, maxWidth: '94vw', padding: 20 }, title: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14 }, chips: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }, chip: { padding: '4px 10px', fontSize: 12, border: '1px solid var(--line2)', cursor: 'pointer', background: 'var(--bg3)', color: 'var(--text)' }, chipOn: { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }, row: { display: 'flex', gap: 6, marginBottom: 14 }, footer: { display: 'flex', justifyContent: 'flex-end', gap: 6 } };

  return h('div', { style: M.overlay, onMouseDown: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { style: M.box },
      h('div', { style: M.title }, 'Add Tag / Label'),
      h('div', { style: M.chips },
        PRESET_TAGS.map(tag =>
          h('button', { key: tag, style: Object.assign({}, M.chip, tags.includes(tag) ? M.chipOn : {}), onClick: () => toggle(tag) }, tag)
        )
      ),
      h('div', { style: M.row },
        h('input', { className: 'input', placeholder: 'Custom tag...', value: custom, onChange: e => setCustom(e.target.value), onKeyDown: e => e.key === 'Enter' && addCustom(), style: { flex: 1, height: 30 } }),
        h('button', { className: 'btn', style: { height: 30 }, onClick: addCustom }, '+ Add')
      ),
      h('div', { style: M.footer },
        h('button', { className: 'btn', onClick: onClose }, 'Done')
      )
    )
  );
}

function AddTimeModal({ woId, currentTech, onSave, onClose }) {
  const [technician, setTechnician] = useState(currentTech || '');
  const [hours, setHours] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [totalHours, setTotalHours] = useState(null);

  async function submit() {
    if (!technician || !hours) { toast('Technician and hours required', 'error'); return; }
    setSaving(true);
    const r = await apiPost('/api/workorder/' + woId + '/time', { technician, hours: parseFloat(hours), description: desc });
    setSaving(false);
    if (r && r.ok) {
      setTotalHours(r.totalHours);
      toast('Time logged: ' + hours + 'h', 'success');
      onSave && onSave(r);
      setHours(''); setDesc('');
    } else {
      toast('Failed to log time', 'error');
    }
  }

  const M = { overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }, box: { background: 'var(--bg2)', border: '1px solid var(--line)', width: 400, maxWidth: '94vw', padding: 20 }, title: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14 }, field: { marginBottom: 12 }, label: { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4, display: 'block' }, footer: { display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 16 } };

  return h('div', { style: M.overlay, onMouseDown: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { style: M.box },
      h('div', { style: M.title }, 'Log Time'),
      totalHours !== null && h('div', { style: { marginBottom: 10, fontSize: 12, color: 'var(--accent)' } }, 'Running total: ' + totalHours + ' hrs'),
      h('div', { style: M.field },
        h('label', { style: M.label }, 'Technician'),
        h('select', { className: 'input', value: technician, onChange: e => setTechnician(e.target.value), style: { width: '100%' } },
          h('option', { value: '' }, '-- Select --'),
          STAFF.map(s => h('option', { key: s.id, value: s.name }, s.name))
        )
      ),
      h('div', { style: M.field },
        h('label', { style: M.label }, 'Hours'),
        h('input', { className: 'input mono', type: 'number', step: '0.25', min: '0', placeholder: '1.5', value: hours, onChange: e => setHours(e.target.value), style: { width: '100%' } })
      ),
      h('div', { style: M.field },
        h('label', { style: M.label }, 'Description'),
        h('input', { className: 'input', placeholder: 'What was done...', value: desc, onChange: e => setDesc(e.target.value), style: { width: '100%' } })
      ),
      h('div', { style: M.footer },
        h('button', { className: 'btn', onClick: onClose }, 'Cancel'),
        h('button', { className: 'btn primary', onClick: submit, disabled: saving }, saving ? 'Saving...' : 'Log Time')
      )
    )
  );
}

function AddDiscountModal({ woId, currentDiscount, onSave, onClose }) {
  const [type, setType] = useState(currentDiscount ? currentDiscount.type : 'pct');
  const [value, setValue] = useState(currentDiscount ? String(currentDiscount.value) : '');
  const [reason, setReason] = useState(currentDiscount ? currentDiscount.reason : '');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!value || parseFloat(value) <= 0) { toast('Enter a valid discount value', 'error'); return; }
    setSaving(true);
    const r = await apiPost('/api/workorder/' + woId + '/discount', { type, value: parseFloat(value), reason });
    setSaving(false);
    if (r && r.ok) {
      toast('Discount applied', 'success');
      onSave && onSave(r.discount);
      onClose();
    } else {
      toast('Failed to apply discount', 'error');
    }
  }

  async function remove() {
    setSaving(true);
    const r = await apiPost('/api/workorder/' + woId + '/discount', { remove: true });
    setSaving(false);
    if (r && r.ok) { toast('Discount removed', 'success'); onSave && onSave(null); onClose(); }
  }

  const M = { overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }, box: { background: 'var(--bg2)', border: '1px solid var(--line)', width: 380, maxWidth: '94vw', padding: 20 }, title: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14 }, field: { marginBottom: 12 }, label: { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4, display: 'block' }, toggle: { display: 'flex', gap: 6, marginBottom: 12 }, toggleBtn: { flex: 1, height: 32, fontSize: 12 }, footer: { display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 16 } };

  return h('div', { style: M.overlay, onMouseDown: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { style: M.box },
      h('div', { style: M.title }, 'Add Discount'),
      h('div', { style: M.toggle },
        h('button', { className: 'btn' + (type === 'pct' ? ' primary' : ''), style: M.toggleBtn, onClick: () => setType('pct') }, '% Percent'),
        h('button', { className: 'btn' + (type === 'flat' ? ' primary' : ''), style: M.toggleBtn, onClick: () => setType('flat') }, '$ Flat')
      ),
      h('div', { style: M.field },
        h('label', { style: M.label }, type === 'pct' ? 'Percentage (%)' : 'Amount ($)'),
        h('input', { className: 'input mono', type: 'number', step: type === 'pct' ? '1' : '0.01', min: '0', placeholder: type === 'pct' ? '10' : '25.00', value, onChange: e => setValue(e.target.value), style: { width: '100%' } })
      ),
      h('div', { style: M.field },
        h('label', { style: M.label }, 'Reason'),
        h('input', { className: 'input', placeholder: 'Staff discount, damage, etc.', value: reason, onChange: e => setReason(e.target.value), style: { width: '100%' } })
      ),
      h('div', { style: M.footer },
        h('div', { style: { display: 'flex', gap: 6 } },
          currentDiscount && h('button', { className: 'btn', style: { color: '#d04a3a', borderColor: '#d04a3a' }, onClick: remove, disabled: saving }, 'Remove'),
          h('button', { className: 'btn', onClick: onClose }, 'Cancel')
        ),
        h('button', { className: 'btn primary', onClick: submit, disabled: saving }, saving ? 'Saving...' : 'Apply')
      )
    )
  );
}

function AddFeeModal({ woId, currentFees, onSave, onClose }) {
  const [fees, setFees] = useState(currentFees || []);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  async function addFee() {
    if (!desc.trim() || !amount || parseFloat(amount) <= 0) { toast('Enter description and amount', 'error'); return; }
    setSaving(true);
    const r = await apiPost('/api/workorder/' + woId + '/fee', { description: desc.trim(), amount: parseFloat(amount) });
    setSaving(false);
    if (r && r.ok) {
      const next = r.fees || [...fees, r.fee];
      setFees(next);
      onSave && onSave(next);
      toast('Fee added', 'success');
      setDesc(''); setAmount('');
    } else {
      toast('Failed to add fee', 'error');
    }
  }

  async function removeFee(id) {
    const r = await apiPost('/api/workorder/' + woId + '/fee', { removeId: id });
    if (r && r.ok) {
      const next = fees.filter(f => f.id !== id);
      setFees(next);
      onSave && onSave(next);
    }
  }

  const M = { overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }, box: { background: 'var(--bg2)', border: '1px solid var(--line)', width: 400, maxWidth: '94vw', padding: 20 }, title: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14 }, row: { display: 'flex', gap: 6, marginBottom: 12, alignItems: 'flex-end' }, label: { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4, display: 'block' }, feeRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 12 }, footer: { display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 16 } };

  return h('div', { style: M.overlay, onMouseDown: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { style: M.box },
      h('div', { style: M.title }, 'Add Fee'),
      fees.length > 0 && h('div', { style: { marginBottom: 12 } },
        fees.map(f => h('div', { key: f.id, style: M.feeRow },
          h('span', null, f.description),
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            h('span', { className: 'mono' }, '$' + (f.amount || 0).toFixed(2)),
            h('button', { className: 'btn ghost', style: { padding: '2px 6px', fontSize: 11, color: '#d04a3a' }, onClick: () => removeFee(f.id) }, '\xd7')
          )
        ))
      ),
      h('div', { style: M.row },
        h('div', { style: { flex: 1 } },
          h('label', { style: M.label }, 'Description'),
          h('input', { className: 'input', placeholder: 'Shop supplies', value: desc, onChange: e => setDesc(e.target.value), style: { width: '100%', height: 30 } })
        ),
        h('div', { style: { width: 90 } },
          h('label', { style: M.label }, 'Amount $'),
          h('input', { className: 'input mono', type: 'number', step: '0.01', min: '0', placeholder: '5.00', value: amount, onChange: e => setAmount(e.target.value), onKeyDown: e => e.key === 'Enter' && addFee(), style: { width: '100%', height: 30 } })
        ),
        h('button', { className: 'btn', style: { height: 30, alignSelf: 'flex-end' }, onClick: addFee, disabled: saving }, '+ Add')
      ),
      h('div', { style: M.footer },
        h('button', { className: 'btn', onClick: onClose }, 'Done')
      )
    )
  );
}

function ReserveItemModal({ woId, currentItems, onSave, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [reserved, setReserved] = useState(currentItems || []);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const r = await apiGet('/api/items-search?q=' + encodeURIComponent(query));
      setSearching(false);
      setResults((r && r.items) ? r.items.slice(0, 8) : []);
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  async function reserve(item) {
    const r = await apiPost('/api/workorder/' + woId + '/reserve', { itemId: item.id, name: item.name, sku: item.sku, qty: 1 });
    if (r && r.ok) {
      const next = r.reservedItems || [...reserved, r.item];
      setReserved(next);
      onSave && onSave(next);
      toast('Reserved: ' + item.name, 'success');
      setQuery(''); setResults([]);
    } else {
      toast('Failed to reserve', 'error');
    }
  }

  async function unreserve(id) {
    const r = await apiPost('/api/workorder/' + woId + '/reserve', { removeId: id });
    if (r && r.ok) {
      const next = reserved.filter(i => i.id !== id);
      setReserved(next);
      onSave && onSave(next);
    }
  }

  const M = { overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }, box: { background: 'var(--bg2)', border: '1px solid var(--line)', width: 440, maxWidth: '94vw', padding: 20 }, title: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14 }, resultRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--line)', fontSize: 12, cursor: 'pointer' }, reservedRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--line)', fontSize: 12 }, footer: { display: 'flex', justifyContent: 'flex-end', marginTop: 16 } };

  return h('div', { style: M.overlay, onMouseDown: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { style: M.box },
      h('div', { style: M.title }, 'Reserve Item for WO'),
      reserved.length > 0 && h('div', { style: { marginBottom: 12 } },
        h('div', { style: { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 } }, 'Reserved'),
        reserved.map(i => h('div', { key: i.id, style: M.reservedRow },
          h('span', null, i.name),
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            h('span', { className: 'mono', style: { fontSize: 11, color: 'var(--text3)' } }, i.sku),
            h('button', { className: 'btn ghost', style: { padding: '2px 6px', fontSize: 11, color: '#d04a3a' }, onClick: () => unreserve(i.id) }, '\xd7')
          )
        ))
      ),
      h('input', { className: 'input', placeholder: 'Search inventory...', value: query, onChange: e => setQuery(e.target.value), style: { width: '100%', marginBottom: 4 } }),
      searching && h('div', { style: { fontSize: 11, color: 'var(--text3)', padding: '4px 0' } }, 'Searching...'),
      results.length > 0 && h('div', { style: { border: '1px solid var(--line)', marginBottom: 8 } },
        results.map(item => h('div', { key: item.id, style: M.resultRow, onClick: () => reserve(item) },
          h('div', null,
            h('div', null, item.name),
            h('div', { className: 'mono', style: { fontSize: 10, color: 'var(--text3)' } }, item.sku + (item.qty > 0 ? ' — ' + item.qty + ' in stock' : ' — OUT'))
          ),
          h('button', { className: 'btn', style: { height: 26, fontSize: 11 } }, 'Reserve')
        ))
      ),
      h('div', { style: M.footer },
        h('button', { className: 'btn', onClick: onClose }, 'Done')
      )
    )
  );
}

function AuditLogModal({ woId, onClose }) {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet('/api/workorder/' + woId + '/audit').then(r => {
      setLog((r && r.auditLog) ? r.auditLog : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [woId]);

  const M = { overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }, box: { background: 'var(--bg2)', border: '1px solid var(--line)', width: 480, maxWidth: '94vw', padding: 20, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }, title: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14 }, scroll: { overflowY: 'auto', flex: 1, paddingRight: 4 }, entry: { display: 'flex', gap: 10, paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--line)' }, dot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 4, flexShrink: 0 }, footer: { display: 'flex', justifyContent: 'flex-end', marginTop: 14 } };

  return h('div', { style: M.overlay, onMouseDown: e => { if (e.target === e.currentTarget) onClose(); } },
    h('div', { style: M.box },
      h('div', { style: M.title }, 'Audit Log — ' + woId),
      loading
        ? h('div', { style: { fontSize: 12, color: 'var(--text3)' } }, 'Loading...')
        : log.length === 0
          ? h('div', { style: { fontSize: 12, color: 'var(--text3)', padding: '16px 0' } }, 'No audit entries yet.')
          : h('div', { style: M.scroll },
              log.map((entry, i) => h('div', { key: i, style: M.entry },
                h('div', { style: M.dot }),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } },
                    h('span', { style: { fontWeight: 600, fontSize: 12 } }, entry.action),
                    h('span', { style: { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' } }, entry.user)
                  ),
                  entry.detail && h('div', { style: { fontSize: 11, color: 'var(--text2)', marginBottom: 2 } }, entry.detail),
                  h('div', { style: { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' } }, new Date(entry.timestamp).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))
                )
              ))
            ),
      h('div', { style: M.footer },
        h('button', { className: 'btn', onClick: onClose }, 'Close')
      )
    )
  );
}

/* ─────────────────────────────────────────
   WORK ORDER DETAIL PANEL
───────────────────────────────────────── */
function WorkOrderDetail({ wo, onClose, fullPage, setScreen }) {
  // ── State ───────────────────────────────────────────────
  const [status, setStatus]           = useState(wo.status || 'Open');
  const [description, setDescription] = useState(wo.description || wo.svc || '');
  const [color, setColor]             = useState(wo.color || '');
  const [size, setSize]               = useState(wo.size || '');
  const [serial, setSerial]           = useState(wo.serial || '');
  const [serialLookup, setSerialLookup] = useState(null); // { found, description, lastServiceDaysAgo, ... }
  const [serialLooking, setSerialLooking] = useState(false);
  const serialDebounce = useRef(null);
  const [employee, setEmployee]       = useState(wo.employee || wo.mech || '');
  const [assignAll, setAssignAll]     = useState(false);
  const [customerItem, setCustomerItem] = useState(wo.bike || '');
  const [warranty, setWarranty]       = useState(!!wo.warranty);
  const [saveParts, setSaveParts]     = useState(false);

  const _todayISO = new Date().toISOString().slice(0, 10);
  const [dateIn, setDateIn]   = useState(wo.dateIn  || _todayISO);
  const [timeIn, setTimeIn]   = useState(wo.timeIn  || '08:30');
  const [dateDue, setDateDue] = useState(wo.dateDue || _todayISO);
  const [timeDue, setTimeDue] = useState(wo.timeDue || '17:00');
  const [hookIn, setHookIn]   = useState(wo.hookIn  || '');
  const [hookOut, setHookOut] = useState(wo.hookOut || '');

  const [receiptNote, setReceiptNote]   = useState(wo.receiptNote || '');
  const [internalNote, setInternalNote] = useState(wo.internalNote || wo.notes || '');
  const [notePos, setNotePos]           = useState('top');

  const [lineQ, setLineQ] = useState('');
  const [woLineResults, setWoLineResults] = useState([]);
  const [woLineSearching, setWoLineSearching] = useState(false);
  const [woDistResults, setWoDistResults] = useState([]);
  const [woDistSearching, setWoDistSearching] = useState(false);
  const [woShowCatalog, setWoShowCatalog] = useState(false);
  const [lines, setLines] = useState(wo.lines || []);
  const [presetCat, setPresetCat] = useState(null); // 'services' | 'mountain' | 'road' | null

  const [confirm, setConfirm] = useState(null);
  const [showSms, setShowSms] = useState(false);
  const [showRequestPay, setShowRequestPay] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const notesDebounce = useRef(null);

  // ── WO extras state ─────────────────────────────────────
  const [tags, setTags]                   = useState(wo.tags || []);
  const [timeEntries, setTimeEntries]     = useState(wo.timeEntries || []);
  const [discount, setDiscount]           = useState(wo.discount || null);
  const [extraFees, setExtraFees]         = useState(wo.fees || []);
  const [reservedItems, setReservedItems] = useState(wo.reservedItems || []);

  const [showTagModal, setShowTagModal]         = useState(false);
  const [showTimeModal, setShowTimeModal]       = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showFeeModal, setShowFeeModal]         = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showAuditModal, setShowAuditModal]     = useState(false);

  // ── Click-outside for 3-dot menu ────────────────────────
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  // ── Debounced notes save (1s) ───────────────────────────
  useEffect(() => {
    if (!wo.id) return;
    if (notesDebounce.current) clearTimeout(notesDebounce.current);
    notesDebounce.current = setTimeout(() => {
      apiPost('/api/workorder/' + wo.id + '/notes', {
        receiptNote: receiptNote, internalNote: internalNote, notePos: notePos,
      });
    }, 1000);
    return () => { if (notesDebounce.current) clearTimeout(notesDebounce.current); };
    // eslint-disable-next-line
  }, [receiptNote, internalNote, notePos]);

  // ── Serial number lookup (debounced 600ms) ───────────────
  useEffect(() => {
    const sn = serial.trim();
    if (!sn || sn.length < 4) { setSerialLookup(null); return; }
    if (serialDebounce.current) clearTimeout(serialDebounce.current);
    serialDebounce.current = setTimeout(async () => {
      setSerialLooking(true);
      try {
        const r = await apiGet('/api/pos-serial-lookup?serial=' + encodeURIComponent(sn));
        if (r) {
          setSerialLookup(r);
          // Auto-fill description if it is empty and we got a hit
          if (r.found && !description.trim() && r.description) {
            setDescription(r.description);
          }
        }
      } catch {}
      setSerialLooking(false);
    }, 600);
    return () => { if (serialDebounce.current) clearTimeout(serialDebounce.current); };
    // eslint-disable-next-line
  }, [serial]);

  // ── Helpers ─────────────────────────────────────────────
  // lineResults kept for keydown Enter (first result), backed by woLineResults from API
  const lineResults = woLineResults.length > 0 ? woLineResults
    : lineQ ? MOCK_CATALOG.filter(c => c.name.toLowerCase().includes(lineQ.toLowerCase()) || c.sku.toLowerCase().includes(lineQ.toLowerCase())).slice(0,5)
    : [];

  // WO line item search: LS API always; distributor only in Catalog mode
  useEffect(() => {
    if (!lineQ || lineQ.trim().length < 2) { setWoLineResults([]); setWoDistResults([]); return; }
    const t = setTimeout(() => {
      setWoLineSearching(true);
      apiGet('/api/items-search?q=' + encodeURIComponent(lineQ.trim()))
        .then(function(data) {
          var items = data && data.items ? data.items.slice(0, 5) : [];
          setWoLineResults(items.map(function(i) {
            var shop = Array.isArray(i.ItemShops && i.ItemShops.ItemShop) ? i.ItemShops.ItemShop[0] : (i.ItemShops && i.ItemShops.ItemShop) || {};
            return {
              sku: i.customSku || i.systemSku || i.sku || '',
              name: i.description || i.name || '',
              price: parseFloat((i.Prices && i.Prices.ItemPrice && i.Prices.ItemPrice[0] && i.Prices.ItemPrice[0].amount) || i.defaultCost || 0),
              qty: parseInt(shop.qoh || 0, 10),
              source: 'ls',
            };
          }));
        })
        .catch(function() { setWoLineResults([]); })
        .finally(function() { setWoLineSearching(false); });
      // Distributor search only when Catalog tab is active
      if (woShowCatalog) {
        setTimeout(function() {
          setWoDistSearching(true);
          apiGet('/api/pos-parts-search?q=' + encodeURIComponent(lineQ.trim()))
            .then(function(data) {
              var distOnly = (data && data.items ? data.items : []).filter(function(i) { return i.source !== 'ls'; });
              setWoDistResults(distOnly.slice(0, 6));
            })
            .catch(function() { setWoDistResults([]); })
            .finally(function() { setWoDistSearching(false); });
        }, 600);
      } else {
        setWoDistResults([]);
      }
    }, 350);
    return function() { clearTimeout(t); };
  }, [lineQ, woShowCatalog]);

  function addLine(it) {
    setLines(l => [...l, {
      sku: it.sku, name: it.name, qty: 1, price: it.price,
      // BC PST: auto-exempt bikes, helmets, bike lights, labour (RSBC 1996 c.431)
      taxablePst: !isPstExempt(it), employee: employee, status: 'Open',
      specialOrder: it.specialOrder || false,
      source: it.source || '',
      leadTime: it.leadTime || '',
      dealerCost: it.dealerCost || 0,
    }]);
    setLineQ('');
    setWoLineResults([]);
    setWoDistResults([]);
  }
  function removeLine(i) { setLines(l => l.filter((_, ii) => ii !== i)); }
  function updateLine(i, patch) { setLines(l => l.map((row, ii) => ii === i ? Object.assign({}, row, patch) : row)); }

  function changeStatus(s) {
    setStatus(s);
    if (wo.id) apiPost('/api/workorder/' + wo.id + '/status', { status: s })
      .then(() => toast('Status updated to ' + s, 'success'))
      .catch(() => { setStatus(wo.status || 'open'); toast('Failed to update status', 'error'); });
    else toast('Status updated to ' + s, 'success');
  }

  // Auto-save (full PUT) on field changes
  useEffect(() => {
    if (!wo.id) return;
    const t = setTimeout(() => {
      apiPut('/api/workorder/' + wo.id, {
        status: status, description: description, color: color, size: size, serial: serial, employee: employee,
        customerItem: customerItem, warranty: warranty, saveParts: saveParts,
        dateIn: dateIn, timeIn: timeIn, dateDue: dateDue, timeDue: timeDue, hookIn: hookIn, hookOut: hookOut,
        receiptNote: receiptNote, internalNote: internalNote, notePos: notePos, lines: lines,
      }).catch(() => toast('Auto-save failed — check connection', 'error'));
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [description, color, size, serial, employee, customerItem, warranty, saveParts,
      dateIn, timeIn, dateDue, timeDue, hookIn, hookOut]);

  // ── Totals ──────────────────────────────────────────────
  // Warranty WOs bill the vendor — zero out labor.
  const laborGross = round2(lines.filter(l => /^lab|labor|labour|svc/i.test(l.sku || '')).reduce((a, l) => a + l.qty * l.price, 0));
  const labor = warranty ? 0 : laborGross;
  const parts = round2(lines.filter(l => !/^lab|labor|labour|svc/i.test(l.sku || '')).reduce((a, l) => a + l.qty * l.price, 0));
  const extraFeesTotal = round2(extraFees.reduce((a, f) => a + (f.amount || 0), 0));
  const fees     = extraFeesTotal;
  const subtotalPreDiscount = round2(labor + parts + fees);
  const discountAmt = discount
    ? discount.type === 'flat'
      ? round2(Math.min(discount.value, subtotalPreDiscount))
      : round2(subtotalPreDiscount * discount.value / 100)
    : 0;
  const subtotal = round2(subtotalPreDiscount - discountAmt);
  const pstSubtotal = lines.reduce((a, l) => {
    if (l.taxablePst === false) return a;
    if (warranty && /^lab|labor|labour|svc/i.test(l.sku || '')) return a;
    return a + l.qty * l.price;
  }, 0);
  const tax   = round2(subtotal * 0.05 + pstSubtotal * 0.07);
  const total = round2(subtotal + tax);
  const totalHoursLogged = round2(timeEntries.reduce((a, e) => a + (e.hours || 0), 0));

  // ── Action button handlers ──────────────────────────────
  function handlePrintTag() {
    // §10 helper from pos-print.js (printBikeTag) - bike-shop sticker
    if (window.printBikeTag) { window.printBikeTag(wo); toast('Printing tag...', 'success'); return; }
    if (window.printWorkOrderTag) { window.printWorkOrderTag(wo); toast('Printing tag...', 'success'); return; }
    window.printWorkOrder && window.printWorkOrder(wo);
    toast('Printing...', 'success');
  }
  function handlePrintQuote() {
    if (window.printWorkOrderQuote) { window.printWorkOrderQuote(wo); toast('Printing quote...', 'success'); return; }
    window.printWorkOrder && window.printWorkOrder(wo);
    toast('Printing...', 'success');
  }
  function handleEmail() {
    if (wo.email) {
      const subj = encodeURIComponent('Work Order ' + (wo.id || ''));
      const body = encodeURIComponent('Hi ' + (wo.cust || '') + ',\n\nYour work order details:\nWO: ' + (wo.id || '') + '\nStatus: ' + status + '\nTotal: ' + fmt$(total) + '\n\nThanks,\nChainLine Cycle');
      window.location.href = 'mailto:' + wo.email + '?subject=' + subj + '&body=' + body;
    }
    if (wo.id) apiPost('/api/workorder/' + wo.id + '/email', { to: wo.email })
      .catch(() => {}); // best-effort log — mailto already opened
    if (wo.email) toast('Email opened in mail app', 'success');
  }
  function handleRequestPayment() {
    if (window.RequestPaymentModal) setShowRequestPay(true);
    else toast('Payment module not loaded', 'error');
  }
  // §10 Customer self-status SMS link
  async function handleSendStatusLink() {
    const phone = wo.phone || (wo.customer && wo.customer.phone);
    if (!phone) { toast('No phone on file', 'error'); return; }
    if (!wo.id) { toast('Save the work order first', 'error'); return; }
    try {
      // Public token (worker creates if needed)
      const tokenRes = await apiPost('/api/wo-public-token/' + wo.id, {});
      const token = (tokenRes && tokenRes.token) || wo.id;
      const url = location.origin + '/wo-status.html?t=' + encodeURIComponent(token);
      const firstName = (wo.cust || '').split(' ')[0] || 'there';
      const body = 'Hi ' + firstName + " - check your bike status here: " + url;
      const smsRes = await apiPost('/api/sms', { to: phone, body: body });
      if (smsRes) toast('Status link sent', 'success');
      else toast('SMS queued (worker offline)', '');
    } catch (e) {
      toast('Send failed: ' + (e && e.message ? e.message : 'error'), 'error');
    }
  }
  function handleCheckout() {
    if (window.posAddToCart) lines.forEach(l => window.posAddToCart(l));
    if (setScreen) setScreen('sales');
    toast('Sent to checkout', 'success');
  }
  function handleDuplicate() {
    apiPost('/api/workorder', {
      customer: wo.cust, bike: customerItem, service: description,
      mechanic: employee, due: wo.due, notes: internalNote, lines: lines,
    }).then(r => {
      if (r && r.id) toast('Duplicated as ' + r.id, 'success');
      else toast('Duplicated', 'success');
    }).catch(() => toast('Failed to duplicate work order', 'error'));
  }
  function handleDelete() {
    setConfirm({
      message: 'Archive this work order? It can be restored later.',
      onConfirm: () => {
        setConfirm(null);
        if (wo.id) apiPost('/api/workorder/' + wo.id + '/status', { status: 'Archived' })
          .then(() => { toast('Archived', 'success'); onClose && onClose(); })
          .catch(() => toast('Failed to archive work order', 'error'));
        else { toast('Archived', 'success'); onClose && onClose(); }
      },
    });
  }
  function handleEditCustomer() { if (setScreen) setScreen('customers'); }
  function handleRemoveCustomer() {
    setConfirm({
      message: 'Remove customer from this work order?',
      onConfirm: () => {
        setConfirm(null);
        if (wo.id) apiPut('/api/workorder/' + wo.id, { customer: null })
          .then(() => toast('Customer removed', 'success'))
          .catch(() => toast('Failed to remove customer', 'error'));
        else toast('Customer removed', 'success');
      },
    });
  }

  // ── 3-dot menu items ────────────────────────────────────
  const menuItems = [
    { label: 'Add Tag/Label',    onClick: () => setShowTagModal(true) },
    { label: 'Add Time',         onClick: () => setShowTimeModal(true) },
    { label: 'Add Discount',     onClick: () => setShowDiscountModal(true) },
    { label: 'Add Fee',          onClick: () => setShowFeeModal(true) },
    { label: 'Reserve Item',     onClick: () => setShowReserveModal(true) },
    'divider',
    { label: 'Convert to Quote', onClick: () => changeStatus('Estimate') },
    { label: 'Convert to Sale',  onClick: handleCheckout },
    'divider',
    { label: 'View Audit Log',   onClick: () => setShowAuditModal(true) },
    { label: 'Archive',          onClick: handleDelete, danger: true },
  ];

  // ── Inline style tokens ─────────────────────────────────
  const S = {
    page:        { padding: '20px 24px 60px', color: 'var(--text)' },
    actionBar:   { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0', flexWrap: 'wrap' },
    leftGroup:   { display: 'flex', gap: 6, flexWrap: 'wrap' },
    rightGroup:  { display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center', position: 'relative' },
    btnSuccess:  { background: '#1f7a2f', borderColor: '#1f7a2f', color: '#fff' },
    btnDanger:   { background: 'transparent', color: '#d04a3a', borderColor: '#d04a3a' },
    btnBlue:     { background: '#2a6fc4', borderColor: '#2a6fc4', color: '#fff' },
    custBlock:   { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--line)', marginTop: 6 },
    custLeft:    { display: 'flex', flexDirection: 'column', gap: 4 },
    custLabel:   { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)' },
    custName:    { fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' },
    custMeta:    { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 },
    pillBadge:   { padding: '2px 8px', fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--bg3)', border: '1px solid var(--line2)' },
    formCard:    { display: 'grid', gridTemplateColumns: '32px 1fr 280px', marginTop: 12, border: '1px solid var(--line)', background: 'var(--bg2)' },
    ribbon:      { background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '12px 4px', textAlign: 'center' },
    formBody:    { padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    fieldLabel:  { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 4, display: 'block' },
    rightCol:    { padding: 16, borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 14 },
    addImg:      { width: '100%', height: 110, border: '1px dashed var(--line3)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)', fontSize: 12 },
    totalsBox:   { display: 'flex', flexDirection: 'column', gap: 6 },
    totalRow:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 },
    totalGrand:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15, fontWeight: 700, paddingTop: 8, borderTop: '1px solid var(--line)' },
    rowCheck:    { display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--text2)' },
    fourCol:     { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 },
    linesBox:    { marginTop: 14, border: '1px solid var(--line)', background: 'var(--bg2)' },
    linesHead:   { padding: 12, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' },
    quickPurple: { background: '#6b3fa0', borderColor: '#6b3fa0', color: '#fff' },
    quickRed:    { background: '#b9342c', borderColor: '#b9342c', color: '#fff' },
    quickKhaki:  { background: '#a48a2c', borderColor: '#a48a2c', color: '#fff' },
    linesTable:  { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
    th:          { textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', borderBottom: '1px solid var(--line)' },
    td:          { padding: '10px 12px', borderBottom: '1px solid var(--line)' },
    empty:       { padding: '40px 12px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)' },
    menuPanel:   { position: 'absolute', top: '100%', right: 0, marginTop: 4, minWidth: 220, background: 'var(--bg2)', border: '1px solid var(--line)', zIndex: 50, boxShadow: '0 6px 24px rgba(0,0,0,0.4)' },
    menuItem:    { display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--ui)' },
  };

  const EMPLOYEES = ['PHIL', 'STEVE', 'MATT', 'DARRIN', 'TAO', 'BECKETT', 'JASON'];

  return h(Fragment, null,
    confirm && h(ConfirmModal, { message: confirm.message, onConfirm: confirm.onConfirm, onCancel: () => setConfirm(null) }),
    showSms && h(SmsModal, { customer: wo.cust, phone: wo.phone, onClose: () => setShowSms(false) }),
    showRequestPay && window.RequestPaymentModal && h(window.RequestPaymentModal, {
      sale: { id: wo.id, total: total },
      customer: { name: wo.cust, phone: wo.phone, email: wo.email },
      onSuccess: () => { setShowRequestPay(false); toast('Payment received', 'success'); },
      onClose: () => setShowRequestPay(false),
    }),

    showTagModal && h(AddTagModal, { woId: wo.id, currentTags: tags, onSave: setTags, onClose: () => setShowTagModal(false) }),
    showTimeModal && h(AddTimeModal, { woId: wo.id, currentTech: employee, onSave: r => { if (r && r.entry) setTimeEntries(prev => [...prev, r.entry]); }, onClose: () => setShowTimeModal(false) }),
    showDiscountModal && h(AddDiscountModal, { woId: wo.id, currentDiscount: discount, onSave: setDiscount, onClose: () => setShowDiscountModal(false) }),
    showFeeModal && h(AddFeeModal, { woId: wo.id, currentFees: extraFees, onSave: setExtraFees, onClose: () => setShowFeeModal(false) }),
    showReserveModal && h(ReserveItemModal, { woId: wo.id, currentItems: reservedItems, onSave: setReservedItems, onClose: () => setShowReserveModal(false) }),
    showAuditModal && h(AuditLogModal, { woId: wo.id, onClose: () => setShowAuditModal(false) }),

    h('div', { style: S.page },
      // ── Top back / breadcrumb ──
      fullPage && h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
        h('button', { className: 'btn ghost', onClick: onClose, style: { padding: '4px 8px' } },
          h(Ico.ChevronRight, { size: 12, style: { transform: 'rotate(180deg)' } }), ' Back'
        ),
        h('span', { className: 'page-sub' }, 'WORK ORDER ' + (wo.id || ''))
      ),

      // ── Action bar ──
      h('div', { style: S.actionBar },
        h('div', { style: S.leftGroup },
          h('button', { className: 'btn', onClick: handlePrintTag }, 'Print Tag'),
          h('button', { className: 'btn', onClick: handlePrintQuote }, 'Print Quote'),
          h('button', { className: 'btn', onClick: handleEmail }, 'Send As Email'),
          h('button', { className: 'btn', onClick: handleSendStatusLink, title: 'SMS the customer a public status URL' }, 'Send status link'),
          h('button', { className: 'btn', style: S.btnBlue, onClick: handleRequestPayment }, 'Request payment'),
          h('button', { className: 'btn', style: S.btnSuccess, onClick: handleCheckout }, 'Checkout')
        ),
        h('div', { style: S.rightGroup, ref: menuRef },
          h('button', { className: 'btn', onClick: handleDuplicate }, 'Duplicate'),
          h('button', { className: 'btn', style: S.btnDanger, onClick: handleDelete }, 'Delete'),
          h('button', {
            className: 'btn ghost',
            style: { padding: '4px 10px', fontSize: 16, lineHeight: 1 },
            onClick: () => setMenuOpen(o => !o),
            'aria-label': 'More actions',
          }, '⋯'),
          menuOpen && h('div', { style: S.menuPanel },
            menuItems.map((item, i) =>
              item === 'divider'
                ? h('div', { key: 'div'+i, style: { height: 1, background: 'var(--line)' } })
                : h('button', {
                    key: i,
                    style: Object.assign({}, S.menuItem, { color: item.danger ? '#d04a3a' : 'var(--text)' }),
                    onMouseDown: e => { e.preventDefault(); setMenuOpen(false); item.onClick && item.onClick(); },
                  }, item.label)
            )
          )
        )
      ),

      // ── Customer block ──
      h('div', { style: S.custBlock },
        h('div', { style: S.custLeft },
          h('span', { style: S.custLabel }, 'Customer'),
          h('span', { style: S.custName },
            wo.cust || 'Walk-in',
            // §15 STAFF / WHOLESALE / VIP chip inline with the name
            window.CustomerTypeChip && h(window.CustomerTypeChip, { type: wo.customerType || (wo.staffCustomer ? 'staff' : 'retail') })
          ),
          h('div', { style: S.custMeta },
            h('span', { style: S.pillBadge }, wo.staffCustomer ? 'Staff' : 'Customer'),
            wo.phone && h('span', { className: 'mono', style: { fontSize: 12, color: 'var(--text2)' } }, 'Mobile: ' + wo.phone),
            wo.email && h('a', { href: 'mailto:' + wo.email, style: { fontSize: 12, color: 'var(--accent)' } }, wo.email)
          ),
          tags.length > 0 && h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 } },
            tags.map(tag => h('span', {
              key: tag,
              style: { padding: '2px 8px', fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'var(--accent)', color: '#fff', cursor: 'pointer' },
              onClick: () => setShowTagModal(true),
              title: 'Click to manage tags',
            }, tag))
          )
        ),
        h('div', { style: { display: 'flex', gap: 6 } },
          h('button', { className: 'btn', onClick: handleEditCustomer }, 'Edit Customer'),
          h('button', { className: 'btn ghost', onClick: handleRemoveCustomer }, 'Remove')
        )
      ),

      // ── Form card with status ribbon ──
      h('div', { style: S.formCard },
        h('div', { style: S.ribbon }, status || 'Open'),

        // middle column - form fields
        h('div', { style: S.formBody },
          // Row 1: Status + Customer Item
          h('div', null,
            h('label', { style: S.fieldLabel }, 'Status'),
            // M9: Mobile-only quick-status chips above the 24-option select.
            // Five most-used statuses surface as 44px-tall pills so users don't
            // have to scroll the native iOS picker for common transitions.
            h('div', { className: 'status-quick-row mobile-only' },
              ['Open','In Progress','Ready','BOOKED','RA!'].map(s =>
                h('button', {
                  key: s,
                  type: 'button',
                  className: 'status-quick-chip' + (status === s ? ' active' : ''),
                  onClick: () => changeStatus(s),
                }, s)
              )
            ),
            h('select', {
              className: 'input',
              value: status,
              onChange: e => changeStatus(e.target.value),
              style: { width: '100%' },
            },
              !WO_STATUSES.includes(status) && status && h('option', { value: status }, status),
              WO_STATUSES.map(s => h('option', { key: s, value: s }, s))
            )
          ),
          h('div', null,
            h('label', { style: S.fieldLabel }, 'Customer Item'),
            h('div', { style: { display: 'flex', gap: 6 } },
              h('select', {
                className: 'input',
                value: customerItem,
                onChange: e => setCustomerItem(e.target.value),
                style: { flex: 1 },
              },
                h('option', { value: '' }, '-- Select --'),
                customerItem && h('option', { value: customerItem }, customerItem)
              ),
              h('button', { className: 'btn', type: 'button' }, 'Edit')
            ),
            h('div', { className: 'wo-flags' + (warranty ? ' wo-flag-warranty is-on' : ''), style: S.rowCheck },
              h(Toggle, {
                on: warranty, onChange: setWarranty,
                label: 'Warranty', sub: 'Bills vendor, not customer',
              }),
              h(Toggle, {
                on: saveParts, onChange: setSaveParts,
                label: 'Save parts', sub: 'Bag removed parts for customer',
              })
            )
          ),

          // Row 2: Description / Color / Size / Serial
          h('div', { style: { gridColumn: '1 / -1' } },
            h('div', { style: S.fourCol },
              h('div', null,
                h('label', { style: S.fieldLabel }, 'Description'),
                h('input', { className: 'input', value: description, onChange: e => setDescription(e.target.value), style: { width: '100%' } })
              ),
              h('div', null,
                h('label', { style: S.fieldLabel }, 'Color'),
                h('input', { className: 'input', value: color, onChange: e => setColor(e.target.value), style: { width: '100%' } })
              ),
              h('div', null,
                h('label', { style: S.fieldLabel }, 'Size'),
                h('input', { className: 'input', value: size, onChange: e => setSize(e.target.value), style: { width: '100%' } })
              ),
              h('div', null,
                h('label', { style: S.fieldLabel }, 'Serial',
                  serialLooking && h('span', { style: { marginLeft: 6, fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' } }, 'looking up...')
                ),
                h('input', { className: 'input mono', value: serial, onChange: e => setSerial(e.target.value), style: { width: '100%' } }),
                serialLookup && serialLookup.found && h('div', {
                  style: {
                    marginTop: 4, padding: '6px 8px', fontSize: 11,
                    background: 'var(--bg-2)', border: '1px solid var(--line)',
                    color: 'var(--text-2)', lineHeight: '1.5',
                  }
                },
                  h('div', { style: { fontWeight: 600, color: 'var(--text)', marginBottom: 2 } }, serialLookup.description),
                  serialLookup.category && h('div', null, serialLookup.category),
                  serialLookup.lastServiceDaysAgo != null && h('div', {
                    style: { color: serialLookup.lastServiceDaysAgo < 30 ? '#22c55e' : serialLookup.lastServiceDaysAgo < 180 ? 'var(--text-2)' : '#f59e0b' }
                  }, 'Last service: ' + serialLookup.lastServiceDaysAgo + ' days ago'),
                  serialLookup.lastServiceDaysAgo == null && h('div', { style: { color: 'var(--text-3)' } }, 'No prior service on record'),
                  serialLookup.pastWos && serialLookup.pastWos.length > 0 && h('div', { style: { color: 'var(--text-3)', fontSize: 10, marginTop: 2 } },
                    serialLookup.pastWos.length + ' past WO' + (serialLookup.pastWos.length !== 1 ? 's' : '') + ' found'
                  )
                ),
                serialLookup && !serialLookup.found && serial.length >= 4 && h('div', {
                  style: { marginTop: 4, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }
                }, 'Not found in Lightspeed')
              )
            )
          ),

          // Row 3: Employee
          h('div', { style: { gridColumn: '1 / -1' } },
            h('label', { style: S.fieldLabel }, 'Employee'),
            h('div', { style: { display: 'flex', gap: 10, alignItems: 'center' } },
              h('select', {
                className: 'input',
                value: employee,
                onChange: e => setEmployee(e.target.value),
                style: { minWidth: 220 },
              },
                h('option', { value: '' }, '-- Unassigned --'),
                EMPLOYEES.map(name => h('option', { key: name, value: name }, name)),
                employee && EMPLOYEES.indexOf(employee) === -1 && h('option', { value: employee }, employee)
              ),
              h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' } },
                h('input', { type: 'checkbox', checked: assignAll, onChange: e => setAssignAll(e.target.checked) }),
                'Assign Employee To All Lines'
              )
            )
          ),

          // Row 4: Dates / Hook
          h('div', { style: { gridColumn: '1 / -1' } },
            h('div', { style: S.fourCol },
              h('div', null,
                h('label', { style: S.fieldLabel }, 'Date In'),
                h('div', { style: { display: 'flex', gap: 4 } },
                  h('input', { className: 'input mono', type: 'date', value: dateIn, onChange: e => setDateIn(e.target.value), style: { flex: 1, minWidth: 0 } }),
                  h('input', { className: 'input mono', type: 'time', value: timeIn, onChange: e => setTimeIn(e.target.value), style: { width: 86 } })
                )
              ),
              h('div', null,
                h('label', { style: S.fieldLabel }, 'Due'),
                h('div', { style: { display: 'flex', gap: 4 } },
                  h('input', { className: 'input mono', type: 'date', value: dateDue, onChange: e => setDateDue(e.target.value), style: { flex: 1, minWidth: 0 } }),
                  h('input', { className: 'input mono', type: 'time', value: timeDue, onChange: e => setTimeDue(e.target.value), style: { width: 86 } })
                )
              ),
              h('div', null,
                h('label', { style: S.fieldLabel }, 'Hook In'),
                h('input', {
                  className: 'input mono hook-input',
                  value: hookIn,
                  placeholder: 'e.g. FLOR 27',
                  onChange: e => setHookIn(e.target.value.toUpperCase().slice(0, 12)),
                  style: { width: '100%' },
                  title: 'Rack / pile / location',
                })
              ),
              h('div', null,
                h('label', { style: S.fieldLabel }, 'Hook Out'),
                h('input', {
                  className: 'input mono hook-input',
                  value: hookOut,
                  placeholder: 'e.g. WH',
                  onChange: e => setHookOut(e.target.value.toUpperCase().slice(0, 12)),
                  style: { width: '100%' },
                  title: 'Where the bike is now if moved',
                })
              )
            )
          ),

          // Row 5: Notes
          h('div', null,
            h('label', { style: S.fieldLabel }, 'Receipt Note'),
            h('textarea', {
              className: 'textarea', rows: 4,
              value: receiptNote, onChange: e => setReceiptNote(e.target.value),
              style: { width: '100%', resize: 'vertical' },
            })
          ),
          h('div', null,
            h('label', { style: S.fieldLabel }, 'Internal Note'),
            h('textarea', {
              className: 'textarea', rows: 4,
              value: internalNote, onChange: e => setInternalNote(e.target.value),
              style: { width: '100%', resize: 'vertical' },
            }),
            h('div', { style: { display: 'flex', gap: 6, marginTop: 6 } },
              h('select', {
                className: 'input',
                value: notePos,
                onChange: e => setNotePos(e.target.value),
                style: { flex: 1, height: 28 },
              },
                h('option', { value: 'top' }, 'To top'),
                h('option', { value: 'bottom' }, 'To bottom')
              ),
              h('button', {
                className: 'btn', type: 'button',
                style: { height: 28 },
                onClick: () => {
                  const ts = new Date().toLocaleString('en-CA', { hour12: false });
                  setInternalNote(prev => (notePos === 'top' ? '[' + ts + '] \n' + prev : prev + '\n[' + ts + '] '));
                },
              }, 'Add time')
            )
          )
        ),

        // right column - images + totals
        h('div', { style: S.rightCol },
          h('button', { className: 'btn', style: S.addImg, type: 'button' },
            h(Ico.Plus, { size: 14 }), ' Add Images'
          ),
          h('div', { style: S.totalsBox },
            h('div', { style: S.totalRow },
              h('span', { style: { color: 'var(--text2)' } }, 'Labor'),
              h('span', { className: 'mono', style: { fontVariantNumeric: 'tabular-nums' } }, fmt$(labor))
            ),
            h('div', { style: S.totalRow },
              h('span', { style: { color: 'var(--text2)' } }, 'Parts'),
              h('span', { className: 'mono', style: { fontVariantNumeric: 'tabular-nums' } }, fmt$(parts))
            ),
            fees > 0 && h('div', { style: S.totalRow },
              h('span', { style: { color: 'var(--text2)', cursor: 'pointer' }, onClick: () => setShowFeeModal(true), title: 'Edit fees' }, 'Fees'),
              h('span', { className: 'mono', style: { fontVariantNumeric: 'tabular-nums' } }, fmt$(fees))
            ),
            discountAmt > 0 && h('div', { style: S.totalRow },
              h('span', { style: { color: '#3fa34e', cursor: 'pointer' }, onClick: () => setShowDiscountModal(true), title: 'Edit discount' },
                'Discount' + (discount ? (discount.type === 'pct' ? ' (' + discount.value + '%)' : '') : '')
              ),
              h('span', { className: 'mono', style: { fontVariantNumeric: 'tabular-nums', color: '#3fa34e' } }, '−' + fmt$(discountAmt))
            ),
            h('div', { style: S.totalRow },
              h('span', { style: { color: 'var(--text2)' } }, 'Tax'),
              h('span', { className: 'mono', style: { fontVariantNumeric: 'tabular-nums' } }, fmt$(tax))
            ),
            h('div', { style: S.totalGrand },
              h('span', null, 'Total'),
              h('span', { className: 'mono', style: { fontVariantNumeric: 'tabular-nums' } }, fmt$(total))
            ),
            totalHoursLogged > 0 && h('div', { style: Object.assign({}, S.totalRow, { marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--line)' }) },
              h('span', { style: { color: 'var(--text3)', fontSize: 11 }, title: 'Total technician time logged' }, 'Time logged'),
              h('span', { className: 'mono', style: { fontSize: 11, color: 'var(--text3)' } }, totalHoursLogged + ' hrs')
            )
          )
        )
      ),

      // ── Line items section ──
      h('div', { style: S.linesBox },
        h('div', { style: S.linesHead },
          h('div', { style: { flex: 1, display: 'flex', gap: 6, minWidth: 240 } },
            h('input', {
              className: 'input',
              placeholder: 'Item',
              value: lineQ,
              onChange: e => setLineQ(e.target.value),
              onKeyDown: e => { if (e.key === 'Enter' && lineResults[0]) addLine(lineResults[0]); },
              style: { flex: 1, height: 30, padding: '4px 8px' },
            }),
            h('button', { className: 'btn', style: { height: 30 } }, 'Search')
          ),
          h('button', { className: 'btn', style: { height: 30 }, onClick: () => addLine({ sku: 'NEW-' + Date.now(), name: 'New Item', price: 0 }) }, '+ New'),
          h('button', { className: 'btn', style: { height: 30 }, onClick: () => addLine({ sku: 'MISC', name: 'Miscellaneous', price: 0 }) }, 'Misc.'),
          h('button', { className: 'btn', style: { height: 30 }, onClick: () => addLine({ sku: 'LAB-GEN', name: 'Labor', price: 95, taxablePst: false }) }, 'Labor'),
          h('button', {
            className: 'btn' + (presetCat === 'services' ? ' is-active' : ''),
            style: Object.assign({ height: 30 }, S.quickPurple, presetCat === 'services' ? { outline: '2px solid var(--accent)' } : {}),
            onClick: () => setPresetCat(presetCat === 'services' ? null : 'services')
          }, 'Services'),
          h('button', {
            className: 'btn' + (presetCat === 'mountain' ? ' is-active' : ''),
            style: Object.assign({ height: 30 }, S.quickRed, presetCat === 'mountain' ? { outline: '2px solid var(--accent)' } : {}),
            onClick: () => setPresetCat(presetCat === 'mountain' ? null : 'mountain')
          }, 'Mountain Bike'),
          h('button', {
            className: 'btn' + (presetCat === 'road' ? ' is-active' : ''),
            style: Object.assign({ height: 30 }, S.quickKhaki, presetCat === 'road' ? { outline: '2px solid var(--accent)' } : {}),
            onClick: () => setPresetCat(presetCat === 'road' ? null : 'road')
          }, 'Road Bike')
        ),

        // Service preset row — LS-style: click category above → row of services here
        presetCat && (function() {
          const lib = (window.loadWoPresets && window.loadWoPresets()) || window.WO_DEFAULT_PRESETS || {};
          const items = lib[presetCat] || [];
          const KIND_BG = {
            amber:  '#a8731f', red:    '#b54a3e', green:  '#3f7a4e',
            blue:   '#3a5e96', teal:   '#2f7472', violet: '#6a4795',
            gray:   '#3d3d3d', orange: '#b56831',
          };
          const catLabel = presetCat === 'services' ? 'General Services' : presetCat === 'mountain' ? 'Mountain Bike' : 'Road Bike';
          return h('div', {
            style: {
              padding: '10px 12px 12px', background: 'var(--bg3)',
              borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)'
            }
          },
            h('div', {
              style: {
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 8, fontFamily: 'var(--mono)', fontSize: 10,
                letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)'
              }
            },
              h('span', null, catLabel),
              h('button', {
                onClick: () => setPresetCat(null),
                style: {
                  background: 'transparent', border: '1px solid var(--line)', color: 'var(--text2)',
                  padding: '3px 8px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10
                }
              }, '× close')
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              items.map(p => h('button', {
                key: p.id,
                onClick: () => {
                  addLine({
                    sku: 'LAB-' + p.id.toUpperCase(),
                    name: p.label,
                    qty: 1,
                    price: p.price,
                    taxablePst: false,
                    isLabor: true,
                    presetId: p.id,
                  });
                  // Add bundled parts if any
                  if (p.parts && p.parts.length) {
                    const catalog = window.lsCatalog || window.MOCK_CATALOG || [];
                    p.parts.forEach(part => {
                      const it = catalog.find(c => c.sku === part.sku);
                      addLine({
                        sku: part.sku,
                        name: it ? it.name : part.sku,
                        qty: part.qty || 1,
                        price: it ? it.price : 0,
                        taxablePst: it ? (it.taxablePst !== false) : true,
                      });
                    });
                  }
                  if (window.toast) window.toast('Added: ' + p.label, 'success');
                },
                style: {
                  background: KIND_BG[p.kind] || '#3d3d3d',
                  color: '#fff', border: '1px solid rgba(255,255,255,0.08)',
                  padding: '8px 12px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start',
                  minWidth: 130, lineHeight: 1.15,
                }
              },
                h('span', null, p.label),
                h('span', {
                  style: { fontFamily: 'var(--mono)', fontSize: 10, opacity: 0.85, marginTop: 2 }
                }, '$' + p.price.toFixed(2))
              ))
            )
          );
        })(),
        lineQ && lineQ.trim().length >= 2 && h('div', { className: 'search-mode-tabs', style: { margin: '4px 0 2px' } },
          h('button', {
            className: 'tab' + (!woShowCatalog ? ' active' : ''),
            onClick: function() { setWoShowCatalog(false); setWoDistResults([]); },
          }, 'In Stock'),
          h('button', {
            className: 'tab' + (woShowCatalog ? ' active' : ''),
            onClick: function() { setWoShowCatalog(true); },
          }, 'Catalog')
        ),
        lineQ && woLineSearching && h('div', { style: { padding: '6px 12px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' } }, 'Searching inventory...'),
        lineQ && lineResults.length > 0 && h('div', { style: { background: 'var(--bg3)', borderBottom: '1px solid var(--line)' } },
          lineResults.map(c =>
            h('div', {
              key: c.sku,
              onClick: () => addLine(c),
              style: { padding: '6px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid var(--line)' },
            },
              h('div', null,
                h('span', null, c.name + ' '),
                c.qty != null && h('span', { style: { fontFamily: 'var(--mono)', fontSize: 10, color: c.qty > 0 ? '#3fa34e' : 'var(--text3)', marginLeft: 6 } }, c.qty > 0 ? c.qty + ' in stock' : 'OUT')
              ),
              h('span', { className: 'mono', style: { color: 'var(--text3)' } }, c.sku + ' - ' + fmt$(c.price))
            )
          )
        ),
        lineQ && woShowCatalog && woDistSearching && h('div', { style: { padding: '6px 12px', background: 'var(--bg3)', fontSize: 11, color: '#b45309', fontFamily: 'var(--mono)' } }, 'Checking distributors...'),
        lineQ && woShowCatalog && !woDistSearching && woDistResults.length > 0 && h('div', { style: { background: 'var(--bg3)', borderTop: '2px solid var(--line2)' } },
          h('div', { style: { padding: '4px 8px', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)' } }, 'Distributor — Special Order'),
          woDistResults.map(function(c) {
            var sourceBadge = c.source === 'hlc' ? 'HLC' : c.source === 'ogc' ? 'OGC' : c.source === 'oss' ? 'OSS' : (c.source || 'DIST').toUpperCase();
            var badgeBg = c.source === 'hlc' ? '#b45309' : c.source === 'ogc' ? '#1d4ed8' : '#334155';
            return h('div', {
              key: c.id || c.sku,
              onClick: function() { addLine(c); },
              style: { padding: '6px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid var(--line)' },
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { background: badgeBg, color: '#fff', fontFamily: 'var(--mono)', fontSize: 9, padding: '1px 5px', flexShrink: 0 } }, sourceBadge),
                h('span', null, c.name),
                c.leadTime && h('span', { style: { fontFamily: 'var(--mono)', fontSize: 10, color: '#b45309' } }, c.leadTime)
              ),
              h('span', { className: 'mono', style: { color: 'var(--text3)' } }, c.sku + ' - ' + fmt$(c.price))
            );
          })
        ),
        h('table', { style: S.linesTable },
          h('thead', null,
            h('tr', null,
              h('th', { style: S.th }, 'Description'),
              h('th', { style: S.th }, 'Employee'),
              h('th', { style: S.th }, 'Status'),
              h('th', { style: Object.assign({}, S.th, { textAlign: 'right' }) }, 'Price / Time'),
              h('th', { style: Object.assign({}, S.th, { textAlign: 'right' }) }, 'Qty'),
              h('th', { style: Object.assign({}, S.th, { textAlign: 'right' }) }, 'Reserved'),
              h('th', { style: Object.assign({}, S.th, { textAlign: 'right' }) }, 'Subtotal'),
              h('th', { style: Object.assign({}, S.th, { width: 30 }) }, '')
            )
          ),
          h('tbody', null,
            lines.length === 0
              ? h('tr', null, h('td', { colSpan: 8, style: S.empty }, 'No items added yet'))
              : lines.map((l, i) =>
                  h('tr', { key: i },
                    h('td', { style: S.td },
                      h('div', null, l.name),
                      h('div', { className: 'mono', style: { fontSize: 10, color: 'var(--text3)' } }, l.sku)
                    ),
                    h('td', { style: S.td }, l.employee || employee || '-'),
                    h('td', { style: S.td }, l.status || 'Open'),
                    h('td', { style: Object.assign({}, S.td, { textAlign: 'right' }) },
                      h('input', {
                        className: 'input mono',
                        type: 'number', step: '0.01',
                        value: l.price,
                        onChange: e => updateLine(i, { price: parseFloat(e.target.value) || 0 }),
                        style: { width: 80, height: 26, padding: '2px 6px', textAlign: 'right' },
                      })
                    ),
                    h('td', { style: Object.assign({}, S.td, { textAlign: 'right' }) },
                      h('input', {
                        className: 'input mono',
                        type: 'number', min: '1',
                        value: l.qty,
                        onChange: e => updateLine(i, { qty: parseInt(e.target.value) || 1 }),
                        style: { width: 50, height: 26, padding: '2px 6px', textAlign: 'right' },
                      })
                    ),
                    h('td', { style: Object.assign({}, S.td, { textAlign: 'right' }), className: 'mono' }, l.reserved || 0),
                    h('td', { style: Object.assign({}, S.td, { textAlign: 'right' }), className: 'mono' }, fmt$(l.qty * l.price)),
                    h('td', { style: S.td },
                      h('button', { className: 'btn ghost', style: { padding: '2px 6px' }, onClick: () => removeLine(i) },
                        h(Ico.Trash, { size: 12 })
                      )
                    )
                  )
                )
          )
        ),

        // ── Reserved Items section ──
        reservedItems.length > 0 && h('div', { style: Object.assign({}, S.linesBox, { marginTop: 12 }) },
          h('div', { style: S.linesHead },
            h('span', { style: { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)' } }, 'Reserved Items'),
            h('button', { className: 'btn', style: { height: 30, marginLeft: 'auto' }, onClick: () => setShowReserveModal(true) }, '+ Reserve')
          ),
          h('table', { style: S.linesTable },
            h('thead', null,
              h('tr', null,
                h('th', { style: S.th }, 'Item'),
                h('th', { style: S.th }, 'SKU'),
                h('th', { style: Object.assign({}, S.th, { textAlign: 'right' }) }, 'Qty'),
                h('th', { style: Object.assign({}, S.th, { width: 36 }) }, '')
              )
            ),
            h('tbody', null,
              reservedItems.map(item => h('tr', { key: item.id },
                h('td', { style: S.td }, item.name),
                h('td', { style: S.td, className: 'mono' }, item.sku),
                h('td', { style: Object.assign({}, S.td, { textAlign: 'right' }), className: 'mono' }, item.qty || 1),
                h('td', { style: S.td },
                  h('button', {
                    className: 'btn ghost', style: { padding: '2px 6px' },
                    onClick: async () => {
                      const r = await apiPost('/api/workorder/' + wo.id + '/reserve', { removeId: item.id });
                      if (r && r.ok) setReservedItems(prev => prev.filter(i => i.id !== item.id));
                    },
                  }, h(Ico.Trash, { size: 12 }))
                )
              ))
            )
          )
        ),

        /* ─── WO Timeline ─── */
        h('div', { className: 'wo-timeline', style: { marginTop: 20 } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
            h('div', { style: { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)' } }, 'Work Order Timeline'),
            h('button', { className: 'btn ghost', style: { height: 26, padding: '0 8px', fontSize: 11 }, onClick: () => setShowAuditModal(true) }, 'Full audit log')
          ),
          h('div', { className: 'wo-timeline-track' },
            (function() {
              // Build timeline milestones from WO data
              const milestones = [
                {
                  key: 'created',
                  label: 'Created',
                  icon: '\u2b55',
                  date: wo.dateIn || wo.created || '',
                  done: true,
                  color: '#3b82f6',
                },
                {
                  key: 'assigned',
                  label: 'Assigned',
                  icon: '\u{1f527}',
                  date: employee ? 'To ' + employee : '',
                  done: !!employee,
                  color: '#8b5cf6',
                },
                {
                  key: 'inprogress',
                  label: 'In Progress',
                  icon: '\u26a1',
                  date: totalHoursLogged > 0 ? totalHoursLogged + 'h logged' : '',
                  done: ['inprogress','ready','done','finished'].includes((status || '').toLowerCase().replace(/\s+/g,'')),
                  color: '#f59e0b',
                },
                {
                  key: 'ready',
                  label: 'Ready',
                  icon: '\u2705',
                  date: wo.hookOut || '',
                  done: ['ready','done','finished','pickedup'].includes((status || '').toLowerCase().replace(/\s+/g,'')),
                  color: '#10b981',
                },
                {
                  key: 'pickedup',
                  label: 'Picked Up',
                  icon: '\ud83c\udfc1',
                  date: '',
                  done: ['done','finished','pickedup','closed'].includes((status || '').toLowerCase().replace(/\s+/g,'')),
                  color: '#22c55e',
                },
              ];
              return milestones.map(function(m, i) {
                return h('div', { key: m.key, className: 'wo-tl-step' + (m.done ? ' done' : '') + (i === milestones.length - 1 ? ' last' : '') },
                  h('div', { className: 'wo-tl-dot', style: { background: m.done ? m.color : 'var(--bg3)', borderColor: m.done ? m.color : 'var(--line2)' } },
                    m.done && h('span', { style: { fontSize: 8 } }, '\u2713')
                  ),
                  i < milestones.length - 1 && h('div', { className: 'wo-tl-line', style: { background: m.done ? m.color : 'var(--line)' } }),
                  h('div', { className: 'wo-tl-label' },
                    h('div', { style: { fontWeight: 600, fontSize: 11, color: m.done ? 'var(--text)' : 'var(--text3)' } }, m.label),
                    m.date && h('div', { style: { fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 1 } }, m.date)
                  )
                );
              });
            })()
          )
        )
      )
    )
  );
}

// Alias per spec §3 — same component, canonical name
const WorkOrderDetailPanel = WorkOrderDetail;

/* ─────────────────────────────────────────
   SCREEN B — WORK ORDERS LIST
───────────────────────────────────────── */
function WorkOrdersScreen({ setScreen, onOpenWo }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const openWo = onOpenWo || (() => {});
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(true);

  function fetchWos() {
    setLoading(true);
    return apiGet('/api/workorders')
      .then(data => {
        // KV-backed worker always returns { workorders: [...] }. Even empty.
        // Treat any successful response as authoritative — do NOT keep MOCK_WO if API succeeds.
        if (data && Array.isArray(data.workorders)) {
          setWos(data.workorders.map(w => {
            if (w.cust) return w; // KV-native flat format
            return {
              id: w.workOrderID || w.id,
              cust: [w.Contact?.firstName, w.Contact?.lastName].filter(Boolean).join(' ') || w.customerName || 'Unknown',
              phone: w.Contact?.mobile || w.Contact?.phone || '',
              bike: w.itemDescription || w.bikeDescription || '',
              svc: w.note?.split('\n')[0] || w.serviceType || 'Service',
              due: w.timeIn ? new Date(w.timeIn).toLocaleDateString('en-CA', {month:'short', day:'numeric'}) : 'TBD',
              dueState: null,
              status: (w.workOrderStatus || 'open').toLowerCase().replace(/\s+/g, ''),
              mech: (w.Employee?.firstName?.[0] || '') + (w.Employee?.lastName?.[0] || '') || 'UN',
              tone: 'am',
              prio: !!w.priority,
              total: parseFloat(w.total || 0),
              notes: w.notes || '',
            };
          }));
        }
        // data === null only when fetch failed entirely — keep current wos (mock fallback)
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Initial load
  useEffect(() => { fetchWos(); }, []);

  // Reset visible count when filter changes
  useEffect(() => { setVisibleCount(50); }, [tab, search]);

  // Refetch when a new WO is created elsewhere (NewWorkOrderScreen dispatches this)
  useEffect(() => {
    function onWoCreated() { fetchWos(); }
    window.addEventListener('wo:created', onWoCreated);
    window.addEventListener('wo:updated', onWoCreated);
    return () => {
      window.removeEventListener('wo:created', onWoCreated);
      window.removeEventListener('wo:updated', onWoCreated);
    };
  }, []);

  const counts = {
    all:        wos.length,
    open:       wos.filter(r => r.status === 'open').length,
    inprogress: wos.filter(r => r.status === 'inprogress').length,
    ready:      wos.filter(r => r.status === 'ready').length,
    booked:     wos.filter(r => r.status === 'booked').length,
    overdue:    wos.filter(r => r.dueState === 'overdue').length,
  };

  const filtered = wos.filter(r => {
    const matchTab = tab === 'all' ? true
      : tab === 'overdue' ? r.dueState === 'overdue'
      : r.status === tab;
    const q = search.toLowerCase();
    const matchSearch = !q
      || r.id.toLowerCase().includes(q)
      || r.cust.toLowerCase().includes(q)
      || r.bike.toLowerCase().includes(q)
      || r.phone.includes(q)
      || (r.hookIn || '').toLowerCase().includes(q)
      || (r.hookOut || '').toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  // Sort: overdue first (red), today (amber), then by dateDue ascending
  const sorted = filtered.slice().sort(function(a, b) {
    const states = { overdue: 0, today: 1 };
    const sa = states[a.dueState] != null ? states[a.dueState] : 2;
    const sb = states[b.dueState] != null ? states[b.dueState] : 2;
    if (sa !== sb) return sa - sb;
    if (!a.dateDue && !b.dateDue) return 0;
    if (!a.dateDue) return 1;
    if (!b.dateDue) return -1;
    return a.dateDue < b.dateDue ? -1 : a.dateDue > b.dateDue ? 1 : 0;
  });

  const visibleWos = sorted.slice(0, visibleCount);
  const hasMore = sorted.length > visibleCount;

  const slow = useLoadTimeout(loading, 10000);
  const ptr = usePullToRefresh(fetchWos);

  const TABS = [
    ['all','All'],['open','Open'],['inprogress','In progress'],
    ['ready','Ready'],['booked','Booked'],['overdue','Overdue'],
  ];

  return h(Fragment, null,
    slow && loading && h('div', { className: 'slow-conn-banner' },
      h('span', null, '⚠️ Connection slow—still loading work orders…'),
      h('button', { className: 'btn', style: { marginLeft: 12 }, onClick: fetchWos }, 'Retry')
    ),
    ptr.refreshing && h('div', { className: 'ptr-indicator' }, 'Refreshing…'),
    ptr.pulling    && h('div', { className: 'ptr-indicator ptr-pulling' }, '↓ Release to refresh'),
    h(PageHead, {
      title: 'Work Orders',
      sub: 'Service queue',
      actions: [
        h('button', { key: 'cal', className: 'btn', onClick: () => setScreen('wo-calendar') }, h(Ico.Calendar, { size: 13 }), ' Calendar view'),
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
          onFocus: mobileInputFocus,
        })
      ),
      h('button', { className: 'pill' }, 'Mechanic ', h('span', { className: 'mono' }, '\xb7 all')),
      h('button', { className: 'pill' }, 'Due ', h('span', { className: 'mono' }, '\xb7 any')),
      h('button', { className: 'pill' }, 'Service ', h('span', { className: 'mono' }, '\xb7 any')),
      h('div', { style: { flex: 1 } }),
      h('button', { className: 'btn ghost' }, h(Ico.Dots, { size: 14 }))
    ),

    // ── Mobile card list (swipe right = Ready, swipe left = SMS) ──
    IS_MOBILE && h('div', Object.assign({ className: 'wo-card-list' }, ptr.handlers),
      loading
        ? h(SkeletonCard, { count: 5 })
        : sorted.length === 0
        ? h('div', { className: 'wo-card-empty' },
            h('div', { style: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 } }, 'No work orders match'),
            h('button', { className: 'btn', onClick: () => { setTab('all'); setSearch(''); setVisibleCount(50); } }, 'Clear filters')
          )
        : visibleWos.map(function(r) {
            function smsWo() {
              const ph = r.phone || '';
              if (!ph) { toast('No phone number on file', 'error'); return; }
              const fn = (r.cust || '').split(' ')[0] || 'there';
              const m = 'Hi ' + fn + ", your bike is ready for pickup at ChainLine Cycle! We're open Mon–Sat 10am–6pm, Sun 11am–5pm.";
              apiPost('/api/send-sms', { to: ph, message: m }).then(function(res) {
                if (res && !res.error) toast('SMS sent to ' + ph, 'success');
                else toast('SMS failed', 'error');
              });
            }
            function readyWo() {
              apiPost('/api/workorder/' + r.id + '/status', { status: 'ready' })
                .then(function(res) {
                  if (res && !res.error) { toast('Marked Ready', 'success'); fetchWos(); }
                  else toast('Failed', 'error');
                });
            }
            const swipeProps = useSwipe(smsWo, readyWo);
            return h('div', Object.assign({ key: r.id, className: 'wo-card-mobile', onClick: function() { openWo(r); } }, swipeProps),
              h('div', { className: 'wo-card-mobile-top' },
                h('div', { className: 'wo-card-mobile-id' },
                  h('span', { className: 'num' }, r.id),
                  r.prio && h('span', { className: 'prio-flag', title: 'Priority', style: { marginLeft: 6 } }, h(Ico.Flag, { size: 11 }))
                ),
                r.status === 'ready'      ? h(Badge, { kind: 'ready' }, 'Ready') :
                r.status === 'open'       ? h(Badge, { kind: 'open' }, 'Open') :
                r.status === 'inprogress' ? h(Badge, { kind: 'inprogress' }, 'In Progress') :
                r.status === 'booked'     ? h(Badge, { kind: 'booked' }, 'Booked') :
                r.status ? h(Badge, { kind: 'closed' }, r.status.charAt(0).toUpperCase() + r.status.slice(1)) : null
              ),
              h('div', { className: 'wo-card-mobile-cust' }, r.cust),
              r.phone && h('div', { className: 'mono muted', style: { fontSize: 11, padding: '1px 0' } }, r.phone),
              h('div', { className: 'muted', style: { fontSize: 12 } }, r.bike || r.svc || '—'),
              h('div', { className: 'wo-card-mobile-meta' },
                h('span', { className: 'mono' }, r.mech),
                (r.hookIn || r.hookOut) && h('span', { className: 'mono' }, 'Hook ' + (r.hookOut || r.hookIn)),
                r.dueState === 'overdue'
                  ? h('span', { className: 'due-chip due-overdue' }, r.overdueBy || 'Overdue')
                  : r.dueState === 'today'
                  ? h('span', { className: 'due-chip due-today' }, 'Today')
                  : r.due && h('span', { className: 'mono muted' }, r.due)
              ),
              h('div', { className: 'wo-card-mobile-actions', onClick: function(e) { e.stopPropagation(); } },
                r.phone && h('a', {
                  href: 'tel:' + r.phone,
                  className: 'btn btn-icon',
                  style: { textDecoration: 'none' },
                }, h(Ico.Phone, { size: 14 })),
                r.status !== 'ready' && r.status !== 'finished' && h('button', {
                  className: 'btn btn-icon', title: 'Mark Ready', onClick: readyWo,
                }, h(Ico.Check, { size: 14 })),
                h(WONotifyButton, { wo: r }),
                h(OptionsMenu, { items: [
                  { label: 'View detail',      onClick: function() { openWo(r); } },
                  { label: 'Mark In Progress', onClick: function() { apiPost('/api/workorder/' + r.id + '/status', { status: 'inprogress' }).then(function(res) { if (res && !res.error) { toast('Marked In Progress', 'success'); fetchWos(); } else toast('Failed', 'error'); }); } },
                  { label: 'Mark Ready',       onClick: readyWo },
                  { label: 'SMS Customer',     onClick: smsWo },
                  'divider',
                  { label: 'Delete', onClick: function() { toast('Deleted', 'error'); }, danger: true },
                ]})
              ),
              h('div', { className: 'wo-card-swipe-hint' }, '← SMS  \xb7  Ready →')
            );
          }),
      hasMore && !loading && h('div', { style: { textAlign: 'center', padding: '12px 0' } },
        h('button', {
          className: 'btn ghost',
          style: { fontSize: 12, width: '100%' },
          onClick: () => setVisibleCount(c => c + 50),
        }, 'Show more (' + (sorted.length - visibleCount) + ' remaining)')
      )
    ),

    // ── Desktop table ──
    !IS_MOBILE && h('div', { className: 'card' },
      h('table', { className: 'tbl' },
        h('thead', null,
          h('tr', null,
            h('th', { style: { width: 96 } }, 'WO'),
            h('th', null, 'Customer'),
            h('th', null, 'Bike / Item'),
            h('th', null, 'Service'),
            h('th', { style: { width: 130 } }, 'Status'),
            h('th', { style: { width: 80 } }, 'Hook'),
            h('th', { style: { width: 120 } }, 'Due'),
            h('th', { style: { width: 70 } }, 'Mech'),
            h('th', { style: { width: 72 } })
          )
        ),
        h('tbody', null,
          loading
            ? [0,1,2,3,4].map(function(i) { return h(SkeletonRow, { key: i, cols: 9 }); })
            : sorted.length === 0
            ? h('tr', null,
                h('td', {
                  colSpan: 9,
                  style: { textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)' },
                },
                  h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 } },
                    'No work orders match these filters'
                  ),
                  h('button', {
                    className: 'btn',
                    style: { fontSize: 11 },
                    onClick: () => { setTab('all'); setSearch(''); setVisibleCount(50); },
                  }, 'Clear filters')
                )
              )
            : visibleWos.map(r =>
                h('tr', { key: r.id, style: { cursor: 'pointer' }, onClick: () => openWo(r) },
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
                    r.status === 'booked'     ? h(Badge, { kind: 'booked' }, 'Booked') :
                    r.status === 'finished'   ? h(Badge, { kind: 'finished' }, 'Done') :
                    r.status === 'pickedup'   ? h(Badge, { kind: 'pickedup' }, 'Picked Up') :
                    r.status ? h(Badge, { kind: 'closed' }, r.status.charAt(0).toUpperCase() + r.status.slice(1)) : null
                  ),
                  h('td', null,
                    (r.hookIn || r.hookOut)
                      ? h('span', { className: 'cell-hook mono' }, r.hookOut || r.hookIn)
                      : h('span', { className: 'cell-hook empty mono', style: { color: 'var(--text3)' } }, '-')
                  ),
                  h('td', null,
                    r.dueState === 'overdue'
                      ? h('span', { className: 'due-chip due-overdue' }, r.overdueBy || 'Overdue')
                      : r.dueState === 'today'
                      ? h('span', { className: 'due-chip due-today' }, r.due || 'Today')
                      : h('span', { className: 'num muted', style: { fontSize: 12 } }, r.due || 'TBD')
                  ),
                  h('td', null, h(AvInit, { initials: r.mech, tone: r.tone })),
                  h('td', { onClick: e => e.stopPropagation(), style: { whiteSpace: 'nowrap' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
                      r.phone && h('a', {
                        href: 'tel:' + r.phone,
                        className: 'btn btn-icon qa-quick',
                        title: 'Call ' + r.cust,
                        style: { textDecoration: 'none' },
                        onClick: e => e.stopPropagation(),
                      }, h(Ico.Phone, { size: 13 })),
                      r.status !== 'ready' && r.status !== 'finished' && h('button', {
                        className: 'btn btn-icon qa-quick qa-ready',
                        title: 'Mark Ready',
                        onClick: e => {
                          e.stopPropagation();
                          apiPost('/api/workorder/' + r.id + '/status', { status: 'ready' })
                            .then(res => {
                              if (res && !res.error) { toast('Marked Ready', 'success'); fetchWos(); }
                              else toast('Failed', 'error');
                            });
                        },
                      }, h(Ico.Check, { size: 13 })),
                      h(WONotifyButton, { wo: r }),
                      h(OptionsMenu, { items: [
                        { label: 'View detail',    onClick: () => openWo(r) },
                        { label: 'Mark In Progress', onClick: () => {
                            apiPost('/api/workorder/' + r.id + '/status', { status: 'inprogress' })
                              .then(res => {
                                if (res && !res.error) { toast('Marked In Progress', 'success'); fetchWos(); }
                                else toast('Failed to update status', 'error');
                              });
                          }
                        },
                        { label: 'Mark Ready',     onClick: () => {
                            apiPost('/api/workorder/' + r.id + '/status', { status: 'ready' })
                              .then(res => {
                                if (res && !res.error) { toast('Marked Ready', 'success'); fetchWos(); }
                                else toast('Failed to update status', 'error');
                              });
                          }
                        },
                        { label: 'Mark Done',      onClick: () => {
                            apiPost('/api/workorder/' + r.id + '/status', { status: 'finished' })
                              .then(res => {
                                if (res && !res.error) { toast('Marked Done', 'success'); fetchWos(); }
                                else toast('Failed to update status', 'error');
                              });
                          }
                        },
                        'divider',
                        { label: 'Print Work Order', onClick: () => toast('Printing...', 'success') },
                        { label: 'SMS Customer',   onClick: () => {
                            const ph = r.phone || '';
                            if (!ph) { toast('No phone number on file', 'error'); return; }
                            const fn = (r.cust || '').split(' ')[0] || 'there';
                            const m = 'Hi ' + fn + ', your bike is ready for pickup at ChainLine Cycle! We’re open Mon–Sat 10am–6pm, Sun 11am–5pm.';
                            apiPost('/api/send-sms', { to: ph, message: m }).then(res => {
                              if (res && !res.error) toast('SMS sent to ' + ph, 'success');
                              else toast('SMS failed', 'error');
                            });
                          }
                        },
                        'divider',
                        { label: 'Void',           onClick: () => toast('Voided', 'error'), danger: true },
                        { label: 'Delete',         onClick: () => toast('Deleted', 'error'), danger: true },
                      ]})
                    )
                  )
                )
              )
        ),
        hasMore && !loading && h('tbody', null,
          h('tr', null,
            h('td', { colSpan: 9, style: { textAlign: 'center', padding: '12px 0', borderTop: '1px solid var(--line)' } },
              h('button', {
                className: 'btn ghost',
                style: { fontSize: 11 },
                onClick: () => setVisibleCount(c => c + 50),
              }, 'Show more (' + (sorted.length - visibleCount) + ' remaining)')
            )
          )
        )
      )
    ),

    h('div', {
      className: 'row',
      style: { justifyContent: 'space-between', marginTop: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' },
    },
      h('span', null, 'Showing ' + Math.min(visibleCount, sorted.length) + ' of ' + sorted.length + (sorted.length < wos.length ? ' (filtered)' : '')),
      !hasMore && sorted.length < wos.length && h('span', null, wos.length + ' total')
    ),

  );
}

/* ─────────────────────────────────────────
   SCREEN B2 — WORK ORDER CALENDAR
   Simple month grid. Each cell shows WO dots coloured by status; click opens WO.
───────────────────────────────────────── */
function WorkOrderCalendarScreen({ setScreen, onOpenWo }) {
  // lsWorkOrders is already populated by bootstrapLiveData() (shared module-level array).
  // Re-fetch on mount in case bootstrap hasn't finished yet or calendar was opened early.
  const [wos, setWos] = useState(lsWorkOrders.length > 0 ? lsWorkOrders : []);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  useEffect(() => {
    apiGet('/api/workorders').then(data => {
      if (data && Array.isArray(data.workorders) && data.workorders.length > 0) {
        setWos(data.workorders.map(normaliseWo));
      }
    }).catch(() => {});
  }, []);

  // Build month grid: 6 weeks × 7 days
  const year = cursor.getFullYear();
  const monthIdx = cursor.getMonth();
  const monthName = cursor.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, monthIdx, 1);
  const startWeekday = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  // Group WOs by ISO yyyy-mm-dd
  const wosByDay = {};
  wos.forEach(w => {
    let iso = w.dateDue || w.due || '';
    if (iso && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
      const key = iso.slice(0, 10);
      (wosByDay[key] = wosByDay[key] || []).push(w);
    }
  });

  function isoFor(day) {
    const m = String(monthIdx + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return year + '-' + m + '-' + d;
  }

  function prevMonth() { setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1)); }
  function nextMonth() { setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1)); }
  function thisMonth() { const d = new Date(); d.setDate(1); setCursor(d); }

  const todayISO = new Date().toISOString().slice(0, 10);

  // Build cells: blanks before day 1, then days, padded to multiple of 7
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const STATUS_COLORS = {
    booked: 'var(--violet-fg)',
    open: 'var(--amber-fg)',
    inprogress: 'var(--blue-fg)',
    'parts-ordered': 'var(--amber-fg)',
    'so-arrived': 'var(--teal-fg)',
    ra: 'var(--accent)',
    ready: 'var(--green-fg)',
    done: 'var(--text3)',
    'done-paid': 'var(--text3)',
    finished: 'var(--text3)',
    cancelled: 'var(--text3)',
  };

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return h(Fragment, null,
    h(PageHead, {
      title: 'Work Order Calendar',
      sub: monthName,
      actions: [
        h('button', { key: 'prev', className: 'btn', onClick: prevMonth }, '←'),
        h('button', { key: 'today', className: 'btn', onClick: thisMonth }, 'Today'),
        h('button', { key: 'next', className: 'btn', onClick: nextMonth }, '→'),
        h('button', { key: 'list', className: 'btn', onClick: () => setScreen('work-orders') },
          h(Ico.Calendar, { size: 13 }), ' List view'
        ),
      ],
    }),

    h('div', { style: { padding: '0 32px 60px' } },
      // Weekday header
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 1 } },
        WEEKDAYS.map(wd => h('div', {
          key: wd,
          style: {
            padding: '6px 10px',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text3)',
            background: 'var(--bg2)',
            borderBottom: '1px solid var(--line2)',
          }
        }, wd))
      ),

      // Day cells
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--line2)', border: '1px solid var(--line2)' } },
        cells.map((day, i) => {
          if (day === null) {
            return h('div', { key: 'b-' + i, style: { background: 'var(--bg)', minHeight: 110 } });
          }
          const iso = isoFor(day);
          const isToday = iso === todayISO;
          const dayWos = wosByDay[iso] || [];
          return h('div', {
            key: iso,
            style: {
              background: 'var(--bg)',
              minHeight: 110,
              padding: '6px 8px',
              borderTop: isToday ? '2px solid var(--accent)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              cursor: 'default',
              overflow: 'hidden',
            }
          },
            h('div', {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 2,
              }
            },
              h('span', {
                style: {
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? 'var(--accent)' : 'var(--text2)',
                }
              }, day),
              dayWos.length > 0 && h('span', {
                style: {
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  color: 'var(--text3)',
                  background: 'var(--bg3)',
                  padding: '0 5px',
                }
              }, dayWos.length)
            ),
            // WO chips (max 4, then "+N more")
            dayWos.slice(0, 4).map(w => h('button', {
              key: w.id,
              onClick: () => { if (onOpenWo) onOpenWo(w); },
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 5px',
                background: 'var(--bg2)',
                border: '1px solid var(--line2)',
                borderLeft: '3px solid ' + (STATUS_COLORS[w.status] || 'var(--text3)'),
                color: 'var(--text)',
                fontSize: 10,
                fontFamily: 'var(--ui)',
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }
            },
              h('span', {
                style: { fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text2)', flexShrink: 0 }
              }, (w.id || '').replace(/^WO-?/, '')),
              h('span', {
                style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
              }, w.cust || '')
            )),
            dayWos.length > 4 && h('span', {
              style: {
                fontFamily: 'var(--mono)',
                fontSize: 9,
                color: 'var(--text3)',
                paddingLeft: 5,
              }
            }, '+' + (dayWos.length - 4) + ' more')
          );
        })
      ),

      // Legend
      h('div', {
        style: {
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          padding: '14px 0',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text3)',
        }
      },
        ['booked', 'open', 'inprogress', 'ready', 'ra'].map(s =>
          h('span', { key: s, style: { display: 'inline-flex', alignItems: 'center', gap: 5 } },
            h('span', { style: { width: 10, height: 10, background: STATUS_COLORS[s], display: 'inline-block' } }),
            s
          )
        )
      )
    )
  );
}

/* ─────────────────────────────────────────
   SCREEN C — NEW WORK ORDER
───────────────────────────────────────── */
function NewWorkOrderScreen({ setScreen, pendingCustomer, onClearPending }) {
  const [customer, setCustomer] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const [mech, setMech] = useState('');
  const [prio, setPrio] = useState(false);
  const [notify, setNotify] = useState(true);
  const [service, setService] = useState('');
  const [bike, setBike] = useState('');
  const [due, setDue] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0,10); });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [custItems, setCustItems] = useState([]);
  const [custWoHistory, setCustWoHistory] = useState([]); // last 3 WOs for selected customer
  const suggestRef = useRef(null);

  // ── Customer WO history — last 3 WOs for selected customer ──
  useEffect(() => {
    if (!selectedCustomerId) { setCustWoHistory([]); return; }
    const history = lsWorkOrders.filter(w =>
      String(w.custId || '') === String(selectedCustomerId) ||
      // Fallback: match by name if ID not on cached WO
      (w.cust && customer && w.cust.toLowerCase() === customer.toLowerCase())
    ).slice(0, 3);
    setCustWoHistory(history);
  }, [selectedCustomerId, customer]);

  // ── Customer items lookup (§7) ──
  useEffect(() => {
    if (selectedCustomerId && window.CustomerItems && typeof window.CustomerItems.get === 'function') {
      try { setCustItems(window.CustomerItems.get(selectedCustomerId) || []); }
      catch { setCustItems([]); }
    } else {
      setCustItems([]);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (pendingCustomer) {
      setCustomer(pendingCustomer.name);
      if (pendingCustomer.id) setSelectedCustomerId(pendingCustomer.id);
      onClearPending && onClearPending();
    }
  }, []);

  useEffect(() => {
    function onDown(e) {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) setShowSuggest(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Use lsCustomers (live-loaded) for suggestions; filter client-side on what's cached.
  // Live search is also done via /api/pos-customers?search= for longer queries.
  const suggestions = lsCustomers.filter(c =>
    !customer || c.name.toLowerCase().includes(customer.toLowerCase()) || (c.phone || '').includes(customer)
  ).slice(0, 6);

  function handleCreate() {
    if (!customer.trim()) { toast('Enter customer name', 'error'); return; }
    if (!mech) { toast('Select a mechanic', 'error'); return; }
    if (!bike.trim()) { toast('Enter bike description', 'error'); return; }
    setSubmitting(true);
    apiPost('/api/workorder', { customer, bike, service, mechanic: mech, due, priority: prio, notifySms: notify, notes })
      .then(res => {
        setSubmitting(false);
        toast(res ? 'Work order created' : 'Saved offline (worker unavailable)', res ? 'success' : '');
        // Notify WorkOrdersScreen to refetch the list so the new WO shows immediately
        try {
          window.dispatchEvent(new CustomEvent('wo:created', { detail: (res && res.workorder) || null }));
        } catch {}
        setScreen('work-orders');
      })
      .catch(() => { setSubmitting(false); toast('Failed to create work order', 'error'); });
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
      sub: 'Intake',
      actions: [
        h('button', { key: 'cancel', className: 'btn', onClick: () => setScreen('work-orders') }, 'Cancel'),
        h('button', { key: 'draft', className: 'btn' }, 'Save draft'),
        h('button', { key: 'create', className: 'btn primary', onClick: handleCreate, disabled: submitting },
          h(Ico.Check, { size: 13 }), ' Create work order ', h('span', { className: 'kbd' }, '⌘↵')
        ),
      ],
    }),

    h('div', { className: 'new-wo-2col' },
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
                  h('div', { key: c.id, className: 'suggest-item', onClick: () => { setCustomer(c.name); setSelectedCustomerId(c.id); setShowSuggest(false); } },
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
            custItems.length > 0 && h('div', { className: 'span-2' },
              h(Field, { label: 'Bike on file', hint: "Pick a bike from this customer's items" },
                h('select', {
                  className: 'select',
                  defaultValue: '',
                  onChange: e => {
                    const item = custItems.find(it => String(it.id) === e.target.value);
                    if (item) { setBike(item.description || ''); }
                  },
                },
                  h('option', { value: '' }, '- Select customer\'s bike -'),
                  custItems.map(it =>
                    h('option', { key: it.id, value: it.id },
                      (it.description || 'Unnamed') + (it.color ? ' \xb7 ' + it.color : '') + (it.serial ? ' \xb7 ' + it.serial : '')
                    )
                  )
                )
              )
            ),
            h('div', { className: 'span-2' },
              h(Field, { label: 'Bike / Item', required: true, hint: 'Make \xb7 model \xb7 year \xb7 color \xb7 serial (optional)' },
                h('input', { className: 'input', value: bike, onChange: e => setBike(e.target.value), placeholder: 'Santa Cruz Bronson \xb7 CC X01 \xb7 2023' })
              )
            ),
            h(Field, { label: 'Service type', required: true },
              h('select', { className: 'select', value: service, onChange: e => setService(e.target.value) },
                h('option', { value: '' }, '-- Select service type --'),
                SERVICE_TYPES.map(s => h('option', { key: s }, s))
              ),
              service && SERVICE_ESTIMATES[service] && h('div', { className: 'service-estimate' },
                h('span', { className: 'se-time' }, h(Ico.Clock, { size: 11 }), ' ', SERVICE_ESTIMATES[service].time),
                h('span', { className: 'se-price' }, SERVICE_ESTIMATES[service].price),
                h('span', { className: 'se-desc' }, SERVICE_ESTIMATES[service].desc)
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

      // Right — aside (Customer history + Recent customers + Required fields hint)
      h('div', { className: 'col', style: { gap: 16 } },
        // Customer WO history — appears when a customer is selected
        custWoHistory.length > 0 && h('div', { className: 'aside-card' },
          h('div', { className: 'card-head' },
            h('h3', null, 'Customer history'),
            h('span', { className: 'sub' }, 'Last ' + custWoHistory.length + ' WOs')
          ),
          custWoHistory.map(w =>
            h('div', { key: w.id, className: 'aside-row', style: { flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '8px 14px', borderBottom: '1px solid var(--line)' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' } },
                h('span', { className: 'mono', style: { fontSize: 11, color: 'var(--text3)' } }, w.id),
                h(Badge, { kind: w.status }, w.status === 'inprogress' ? 'In Progress' :
                  w.status === 'ready' ? 'Ready' : w.status === 'open' ? 'Open' :
                  w.status === 'finished' ? 'Done' : w.status)
              ),
              h('span', { style: { fontSize: 12 } }, w.bike || 'No bike listed'),
              h('div', { style: { display: 'flex', gap: 8, fontSize: 11, color: 'var(--text3)' } },
                h('span', null, w.svc || ''),
                w.due && h('span', null, '\xb7 due ' + w.due)
              )
            )
          )
        ),
        h(RecentCustomersAside, { onPick: (c) => { setCustomer(c.firstName + ' ' + c.lastName); setSelectedCustomerId(c.id); } }),
        h('div', { className: 'aside-card' },
          h('div', { className: 'card-head' }, h('h3', null, 'Required'), h('span', { className: 'sub' }, 'To create WO')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Customer'), h('span', { className: 'v mono', style: { color: customer.trim() ? 'var(--green)' : 'var(--text3)' } }, customer.trim() ? '✓ ' + customer : 'Required')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Mechanic'), h('span', { className: 'v mono', style: { color: mech ? 'var(--green)' : 'var(--text3)' } }, mech ? '✓ ' + mech : 'Required')),
          h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Bike'),     h('span', { className: 'v mono', style: { color: bike.trim() ? 'var(--green)' : 'var(--text3)' } }, bike.trim() ? '✓ set' : 'Required'))
        )
      )
    ),

    // Mobile-only sticky bottom action bar (hidden on desktop via CSS)
    h('div', { className: 'new-wo-mobile-foot' },
      h('button', { className: 'btn', onClick: () => setScreen('work-orders') }, 'Cancel'),
      h('button', { className: 'btn primary', onClick: handleCreate, disabled: submitting },
        h(Ico.Check, { size: 13 }), ' ', submitting ? 'Creating...' : 'Create work order'
      )
    )
  );
}

/* ─────────────────────────────────────────
   RECENT CUSTOMERS ASIDE (used in New WO)
───────────────────────────────────────── */
function RecentCustomersAside({ onPick }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    apiGet('/api/customers?q=a').then(d => {
      if (!mounted) return;
      const arr = (d && Array.isArray(d.customers)) ? d.customers.slice(0, 8) : [];
      setList(arr);
    }).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);
  return h('div', { className: 'aside-card' },
    h('div', { className: 'card-head' },
      h('h3', null, 'Recent customers'),
      h('span', { className: 'sub' }, loading ? 'Loading...' : (list.length + ' shown'))
    ),
    list.length === 0 && !loading && h('div', { style: { padding: 14, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', textAlign: 'center' } }, 'No customers yet'),
    list.map(c => h('div', {
      key: c.id,
      className: 'aside-row',
      style: { cursor: 'pointer' },
      onClick: () => onPick && onPick(c),
      title: 'Click to use this customer',
    },
      h('span', { className: 'k' }, c.firstName + ' ' + c.lastName),
      h('span', { className: 'v mono', style: { fontSize: 11 } }, c.mobile || c.email || '')
    ))
  );
}

/* ─────────────────────────────────────────
   RECEIPT MODAL
───────────────────────────────────────── */
function ReceiptModal({ receipt, onClose }) {
  const { customer, saleItems = [], subtotal = 0, gst = 0, pst = 0, total = 0, method, customerObj } = receipt;
  const displayName = customer || (customerObj && customerObj.name) || 'Walk-in';

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose && onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return h('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    onClick: onClose,
  },
    h('div', {
      style: { background: 'var(--bg2)', border: '1px solid var(--line3)', width: 400, maxHeight: '90vh', overflowY: 'auto', padding: 24 },
      onClick: e => e.stopPropagation(),
    },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12 } },
        h('div', null,
          h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 4 } }, 'Sale Complete'),
          h('div', { style: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' } }, fmt$(total))
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 8px', background: 'var(--green-bg, rgba(0,200,100,0.1))', color: 'var(--green)', letterSpacing: '0.08em', textTransform: 'uppercase' } }, 'PAID \xb7 ' + (method || 'card').toUpperCase()),
          h('button', {
            'aria-label': 'Close receipt',
            onClick: onClose,
            style: { width: 32, height: 32, lineHeight: '1', fontSize: 20, color: 'var(--text2)', background: 'transparent', border: '1px solid var(--line2)', cursor: 'pointer' }
          }, '×')
        )
      ),

      displayName !== 'Walk-in' && h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg3)', marginBottom: 14 } },
        h(AvInit, { initials: displayName.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(), tone: 'am' }),
        h('span', { style: { fontSize: 13, fontWeight: 500 } }, displayName)
      ),

      h('div', { style: { borderTop: '1px dashed var(--line2)', paddingTop: 12, marginBottom: 12 } },
        saleItems.map((i, idx) =>
          h('div', { key: idx, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '4px 0', fontSize: 12 } },
            h('div', null,
              h('div', null, i.name,
                i.taxablePst === false && h('span', { style: { marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-3)', background: 'var(--bg3)', padding: '1px 5px' } }, 'PST-EXEMPT')
              ),
              h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' } }, 'x' + i.qty + ' @ ' + fmt$(i.price))
            ),
            h('span', { style: { fontFamily: 'var(--font-mono)', fontWeight: 500 } }, fmt$(i.qty * i.price))
          )
        )
      ),

      h('div', { style: { borderTop: '1px dashed var(--line2)', paddingTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 3 } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)' } }, h('span', null, 'Subtotal'), h('span', null, fmt$(subtotal))),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)' } }, h('span', null, 'GST 5%'), h('span', null, fmt$(gst))),
        pst > 0 && h('div', { style: { display: 'flex', justifyContent: 'space-between', color: 'var(--text-2)' } }, h('span', null, 'PST 7%'), h('span', null, fmt$(pst))),
        h('div', { style: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13, marginTop: 4 } }, h('span', null, 'Total'), h('span', null, fmt$(total)))
      ),

      h('div', { style: { display: 'flex', gap: 8, marginTop: 20 } },
        h('button', { className: 'btn primary', style: { flex: 1 }, onClick: onClose },
          h(Ico.Plus, { size: 13 }), ' New Sale'
        ),
        h('button', { className: 'btn', onClick: () => { if (window.printReceipt) window.printReceipt({ customerName: displayName, items: saleItems.map(i => ({ name: i.name, qty: i.qty, price: i.price, taxablePst: i.taxablePst })), subtotal, gst, pst, total, paymentMethod: method }); } }, 'Print Receipt')
      )
    )
  );
}

/* ─────────────────────────────────────────
   LINE EDIT MODAL — edit price, discount, qty per cart line
───────────────────────────────────────── */
function LineEditModal({ line, onSave, onRemove, onClose }) {
  const [price, setPrice]               = useState(String(line.price));
  const [qty, setQty]                   = useState(String(line.qty));
  const [discount, setDiscount]         = useState(String(line.discount || 0));
  const [discountType, setDiscountType] = useState(line.discountType || 'pct');
  const [note, setNote]                 = useState(line.note || '');

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose && onClose();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  function save() {
    const p = parseFloat(price) || 0;
    const q = Math.max(1, parseInt(qty, 10) || 1);
    const d = Math.max(0, parseFloat(discount) || 0);
    onSave({ price: p, qty: q, discount: d, discountType, note });
  }

  const base = (parseFloat(price)||0) * (parseInt(qty,10)||1);
  const lineSubtotal = discountType === 'pct'
    ? base * (1 - Math.min(100, Math.max(0, parseFloat(discount)||0)) / 100)
    : Math.max(0, base - (parseFloat(discount)||0));

  return h('div', {
    style: { position:'fixed', inset:0, zIndex:900, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center' },
    onClick: e => { if (e.target === e.currentTarget) onClose(); },
  },
    h('div', { style: { background:'var(--bg2)', border:'1px solid var(--line3)', width:480, maxWidth:'92vw', maxHeight:'90vh', overflowY:'auto' } },
      h('div', { style: { padding:'14px 18px', borderBottom:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center' } },
        h('div', null,
          h('div', { style: { fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--text-3)', marginBottom:4 } }, 'Edit Line Item'),
          h('div', { style: { fontSize:14, fontWeight:600 } }, line.name)
        ),
        h('button', { className:'btn ghost', onClick: onClose }, '×')
      ),
      h('div', { className: 'wo-notes-2col', style: { padding:18 } },
        h('div', { style: { gridColumn:'1 / -1', fontFamily:'var(--mono)', fontSize:11, color:'var(--text-2)', display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'4px 16px', padding:'10px 12px', background:'var(--bg3)' } },
          h('div', null, h('span',{style:{color:'var(--text-3)'}}, 'SKU: '), line.sku),
          h('div', null, h('span',{style:{color:'var(--text-3)'}}, 'UPC: '), line.upc || '—'),
          h('div', null, h('span',{style:{color:'var(--text-3)'}}, 'STOCK: '), line.stock != null ? line.stock : '—'),
          h('div', null, h('span',{style:{color:'var(--text-3)'}}, 'COST: '), line.cost ? '$'+line.cost.toFixed(2) : '—'),
          h('div', null, h('span',{style:{color:'var(--text-3)'}}, 'DEPT: '), line.dept || '—'),
          h('div', null, h('span',{style:{color:'var(--text-3)'}}, 'BRAND: '), line.brand || '—')
        ),
        h(Field, { label:'Price' }, h('input', { className:'input mono', type:'number', step:'0.01', value: price, onChange: e => setPrice(e.target.value), autoFocus: true })),
        h(Field, { label:'Quantity' }, h('input', { className:'input mono', type:'number', min:'1', step:'1', value: qty, onChange: e => setQty(e.target.value) })),
        h(Field, { label:'Discount' },
          h('div', { style: { display:'flex', gap:6, flexWrap:'wrap' } },
            h('div', { style: { display:'flex', gap:4, width:'100%', marginBottom:4 } },
              [5,10,15,20].map(function(pct) {
                return h('button', {
                  key: pct,
                  className: 'btn' + (discountType === 'pct' && parseFloat(discount) === pct ? ' primary' : ' ghost'),
                  style: { flex:1, padding:'4px 0', fontSize:11 },
                  onClick: function() { setDiscount(String(pct)); setDiscountType('pct'); }
                }, pct + '%');
              })
            ),
            h('input', { className:'input mono', type:'number', min:'0', step:'0.01', value: discount, onChange: function(e) { setDiscount(e.target.value); }, style:{ flex:1 } }),
            h('select', { className:'input', value: discountType, onChange: function(e) { setDiscountType(e.target.value); }, style:{ width:60 } },
              h('option', { value:'pct' }, '%'),
              h('option', { value:'amt' }, '$')
            )
          )
        ),
        h(Field, { label:'Note (optional)' }, h('input', { className:'input', value: note, onChange: e => setNote(e.target.value), placeholder:'Custom message for this line...' })),
        line.description && h('div', { style: { gridColumn:'1 / -1', fontSize:11, color:'var(--text-2)', padding:'8px 10px', background:'var(--bg)', lineHeight:1.5 } }, line.description)
      ),
      h('div', { style: { padding:'14px 18px', borderTop:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center' } },
        h('div', { style: { fontFamily:'var(--mono)', fontSize:13, color:'var(--text)' } },
          h('span', { style:{ color:'var(--text-3)', marginRight:6, fontSize:10, letterSpacing:'.1em', textTransform:'uppercase' } }, 'Line Total:'),
          fmt$(lineSubtotal)
        ),
        h('div', { style: { display:'flex', gap:8 } },
          h('button', { className:'btn', onClick: onRemove, style:{ color:'var(--red)' } }, 'Remove'),
          h('button', { className:'btn primary', onClick: save }, 'Save changes ', h('span',{className:'kbd'}, '⌘↵'))
        )
      )
    )
  );
}

/* ─────────────────────────────────────────
   SCREEN D — SALES REGISTER
───────────────────────────────────────── */
function SalesScreen({ onBarcodeScan, pendingCustomer, onClearPending, saleCount, onSaleComplete }) {
  const [items, setItems] = useState([
    { sku: 'SHIM-XT-CS-12',   name: 'Shimano XT M8100 Cassette \xb7 12-spd',        qty: 1, price: 189.00 },
    { sku: 'TIRE-MAXX-29-DH', name: 'Maxxis Minion DHF 29\xd72.5 \xb7 3C MaxxGrip',  qty: 2, price: 84.00  },
    { sku: 'LAB-INSTALL-CS',  name: 'Labour \xb7 Cassette install',                   qty: 1, price: 25.00, taxablePst: false },
    { sku: 'CHAIN-XT-126L',   name: 'Shimano XT Chain \xb7 126L',                    qty: 1, price: 62.00  },
  ]);
  const [query, setQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saleCustomer, setSaleCustomer] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (pendingCustomer) {
      setCustomerName(pendingCustomer.name);
      setSaleCustomer(pendingCustomer);
      onClearPending && onClearPending();
    }
  }, []);

  useEffect(() => { if (searchRef.current) searchRef.current.focus(); }, []);

  // Wire barcode scanner: rapid keystrokes ending in Enter
  useBarcodeScanner(useCallback(code => {
    const found = MOCK_CATALOG.find(c => c.sku === code || c.sku.replace(/-/g,'') === code.replace(/-/g,''));
    if (found) { addItem(found); toast('Scanned: ' + found.name, 'success'); return; }
    // Fallback: try API
    apiGet('/api/items-search?q=' + encodeURIComponent(code))
      .then(data => {
        if (data && data.items && data.items.length > 0) {
          const i = data.items[0];
          const item = {
            sku: i.systemSku || i.customSku || i.sku,
            name: i.description || i.name,
            price: parseFloat(i.Prices?.ItemPrice?.amount || i.price || 0),
            stock: parseInt(i.qoh || i.stock || 0),
            taxablePst: !i.taxClass || i.taxClass !== 'Labour',
          };
          addItem(item);
          toast('Scanned: ' + item.name, 'success');
        } else {
          toast('Barcode not found: ' + code, 'error');
        }
      })
      .catch(() => toast('Barcode not found: ' + code, 'error'));
  }, []));

  useEffect(() => {
    function onKey(e) {
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        if (searchRef.current) searchRef.current.focus();
      }
      if (e.key === 'F1') { e.preventDefault(); handlePayCard(); }
      if (e.key === 'F2') { e.preventDefault(); handlePayCash(); }
      if (e.key === 'F3') { e.preventDefault(); handlePay('other'); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [distResults, setDistResults] = useState([]);
  const [distSearching, setDistSearching] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [editingLine, setEditingLine] = useState(null);

  // ── Parked sales (§19) ────────────────────────────────────
  const [parkedSales, setParkedSales] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pos-parked-sales') || '[]'); }
    catch { return []; }
  });

  function parkCurrent(woId) {
    if (!items.length) { toast('Cart is empty', 'error'); return; }
    const parked = {
      id: 'PRK-' + Date.now(),
      items: items,
      customer: saleCustomer
        ? { id: saleCustomer.id, name: saleCustomer.name, phone: saleCustomer.phone }
        : (customerName ? { name: customerName } : null),
      woId: woId || null,
      parkedAt: new Date().toISOString(),
    };
    const next = parkedSales.concat([parked]);
    setParkedSales(next);
    try { localStorage.setItem('pos-parked-sales', JSON.stringify(next)); } catch {}
    setItems([]);
    setSaleCustomer(null);
    setCustomerName('');
    toast('Sale parked' + (woId ? ' for ' + woId : ''), 'success');
  }

  function resumeParked(p) {
    setItems(p.items || []);
    if (p.customer) {
      setCustomerName(p.customer.name || '');
      if (p.customer.id) setSaleCustomer(p.customer);
    }
    const next = parkedSales.filter(x => x.id !== p.id);
    setParkedSales(next);
    try { localStorage.setItem('pos-parked-sales', JSON.stringify(next)); } catch {}
    toast('Resumed ' + (p.woId || p.id), 'success');
  }

  function discardParked(p, e) {
    if (e) e.stopPropagation();
    if (!confirm('Discard parked sale ' + (p.woId || p.id) + '?')) return;
    const next = parkedSales.filter(x => x.id !== p.id);
    setParkedSales(next);
    try { localStorage.setItem('pos-parked-sales', JSON.stringify(next)); } catch {}
  }

  function handleParkClick() {
    if (!items.length) { toast('Cart is empty', 'error'); return; }
    const woId = window.prompt('Link to Work Order? (e.g. WO-1234 or leave blank)', '');
    if (woId === null) return; // cancelled
    parkCurrent((woId || '').trim() || null);
  }

  // Debounced API search
  useEffect(() => {
    if (query.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      apiGet('/api/items-search?q=' + encodeURIComponent(query.trim()))
        .then(data => {
          if (data && data.items && data.items.length > 0) {
            setSearchResults(data.items.map(i => ({
              sku: i.systemSku || i.customSku || i.sku,
              name: i.description || i.name,
              price: parseFloat(i.Prices?.ItemPrice?.amount || i.price || 0),
              stock: parseInt(i.qoh || i.stock || 0),
              taxablePst: !i.taxClass || i.taxClass !== 'Labour',
              upc: i.upc || i.customSku,
              cost: parseFloat(i.defaultCost || 0),
              dept: i.Department?.name || i.dept || '',
              brand: i.ItemAttributes?.brand || i.brand || '',
              description: i.longDescription || i.description || i.name || '',
            })));
          } else {
            // Fallback to MOCK_CATALOG for demo
            setSearchResults(MOCK_CATALOG.filter(c =>
              c.name.toLowerCase().includes(query.toLowerCase()) ||
              c.sku.toLowerCase().includes(query.toLowerCase())
            ));
          }
        })
        .catch(() => {
          setSearchResults(MOCK_CATALOG.filter(c =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.sku.toLowerCase().includes(query.toLowerCase())
          ));
        })
        .finally(() => setSearching(false));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  // Distributor catalog search — only fires when Catalog tab is active
  useEffect(() => {
    if (!showCatalog || query.trim().length < 2) { setDistResults([]); return; }
    const t = setTimeout(() => {
      setDistSearching(true);
      apiGet('/api/pos-parts-search?q=' + encodeURIComponent(query.trim()))
        .then(function(data) {
          var distOnly = (data && data.items ? data.items : []).filter(function(i) { return i.source !== 'ls'; });
          setDistResults(distOnly);
        })
        .catch(function() { setDistResults([]); })
        .finally(function() { setDistSearching(false); });
    }, 600);
    return () => clearTimeout(t);
  }, [query, showCatalog]);

  function addItem(it) {
    const existing = items.find(i => i.sku === it.sku);
    if (existing) {
      setItems(items.map(i => i.sku === it.sku ? { ...i, qty: i.qty + 1 } : i));
    } else {
      // BC PST: auto-exempt bikes, helmets, bike lights, labour (RSBC 1996 c.431)
      const taxablePst = !isPstExempt(it);
      setItems([...items, {
        sku: it.sku,
        name: it.name,
        qty: 1,
        price: it.price,
        taxablePst,
        upc: it.upc,
        stock: it.stock,
        cost: it.cost,
        dept: it.dept,
        brand: it.brand,
        description: it.description,
        specialOrder: it.specialOrder || false,
        source: it.source || '',
        leadTime: it.leadTime || '',
        dealerCost: it.dealerCost || 0,
      }]);
    }
    setQuery('');
    setDistResults([]);
    if (searchRef.current) searchRef.current.focus();
  }

  function setQty(sku, delta) { setItems(items.map(i => i.sku === sku ? { ...i, qty: Math.max(1, i.qty + delta) } : i)); }
  function setQtyDirect(sku, val) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1) setItems(items.map(i => i.sku === sku ? { ...i, qty: n } : i));
  }
  function removeItem(sku) { setItems(items.filter(i => i.sku !== sku)); }
  function updateLine(sku, patch) { setItems(items.map(i => i.sku === sku ? { ...i, ...patch } : i)); }

  // Per-line total with discount
  function lineTotal(i) {
    const base = i.qty * i.price;
    if (!i.discount) return round2(base);
    if (i.discountType === 'pct') return round2(base * (1 - Math.min(100, Math.max(0, i.discount)) / 100));
    return round2(Math.max(0, base - i.discount));
  }

  // GST 5% applies to everything; PST 7% exempt for labour/services (BC PSTA s.37)
  const subtotal    = items.reduce((a, i) => a + lineTotal(i), 0);
  const pstSubtotal = items.reduce((a, i) => a + (i.taxablePst !== false ? lineTotal(i) : 0), 0);
  const gst         = round2(subtotal * 0.05);
  const pst         = round2(pstSubtotal * 0.07);
  const total    = round2(subtotal + gst + pst);

  function handlePayCash() {
    if (!items.length) { toast('Cart is empty', 'error'); return; }
    if (window.CashModal) {
      setShowCashModal(true);
    } else {
      handlePay('cash');
    }
  }

  function handlePayCard() {
    if (!items.length) { toast('Cart is empty', 'error'); return; }
    if (window.RequestPaymentModal) {
      setShowCardModal(true);
    } else {
      handlePay('card');
    }
  }

  function handlePay(method, extra) {
    if (!items.length) { toast('Cart is empty', 'error'); return; }
    const saleData = {
      customer: customerName,
      customerObj: saleCustomer,
      lines: items.map(i => ({ sku: i.sku, name: i.name, qty: i.qty, unitPrice: i.price, taxablePst: i.taxablePst })),
      subtotal, gst, pst, total, payment: { method, ...(extra || {}) },
    };
    apiPost('/api/sale', saleData)
      .then(res => {
        toast(res ? 'Sale completed \xb7 ' + fmt$(total) : 'Sale recorded offline', res ? 'success' : '');
        setReceipt({ ...saleData, method, saleItems: items });
      })
      .catch(() => toast('Failed to record sale', 'error'));
  }

  function handleNewSale() {
    setItems([]);
    setReceipt(null);
    setSaleCustomer(null);
    setCustomerName('');
    onSaleComplete && onSaleComplete();
  }

  const totalUnits = items.reduce((a, i) => a + i.qty, 0);

  return h(Fragment, null,
    editingLine && h(LineEditModal, {
      line: editingLine,
      onSave: (patch) => { updateLine(editingLine.sku, patch); setEditingLine(null); },
      onRemove: () => { removeItem(editingLine.sku); setEditingLine(null); },
      onClose: () => setEditingLine(null),
    }),
    receipt && h(ReceiptModal, { receipt, onClose: handleNewSale }),
    showCashModal && window.CashModal && h(window.CashModal, {
      total,
      onSuccess: function(result) {
        setShowCashModal(false);
        handlePay('cash', { tendered: result.tendered, change: result.change });
      },
      onClose: function() { setShowCashModal(false); },
    }),
    showCardModal && window.RequestPaymentModal && h(window.RequestPaymentModal, {
      sale: { total, id: 'pos-' + Date.now() },
      customer: saleCustomer || customerName || null,
      onSuccess: function(ref) {
        setShowCardModal(false);
        handlePay('card', { stripeRef: ref });
      },
      onClose: function() { setShowCardModal(false); },
    }),
    h(PageHead, {
      title: 'Sales Register',
      sub: 'Sale #S-' + (1188 + (saleCount || 0)) + ' \xb7 Drawer open',
      actions: [
        h('button', { key: 'park', className: 'btn', onClick: handleParkClick }, 'Park sale'),
        h('button', { key: 'disc', className: 'btn' }, 'Discount'),
        h('button', { key: 'ret', className: 'btn' }, 'Returns'),
      ],
    }),

    // ── Parked sales tray (§19) ──
    parkedSales.length > 0 && h('div', { className: 'parked-tray' },
      h('span', { className: 'label' }, 'Parked'),
      parkedSales.map(p =>
        h('button', {
          key: p.id,
          className: 'parked-chip' + (p.woId ? ' parked-chip-wo' : ''),
          onClick: () => resumeParked(p),
          title: 'Resume this parked sale',
        },
          p.woId ? p.woId : p.id,
          p.customer && h('span', { style: { color: 'var(--text2)' } },
            ' \xb7 ' + (p.customer.name || p.customer)
          ),
          h('span', { style: { color: 'var(--text3)' } },
            ' \xb7 $' + (p.items || []).reduce((a, i) => a + i.qty * i.price, 0).toFixed(2)
          ),
          h('span', {
            onClick: (e) => discardParked(p, e),
            style: { marginLeft: 8, color: 'var(--text3)', cursor: 'pointer', padding: '0 4px' },
            title: 'Discard',
          }, '\xd7')
        )
      )
    ),

    h('div', { className: 'sales-2col' },
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
              onFocus: mobileInputFocus,
              placeholder: 'Scan barcode or search items, SKUs, services…',
            }),
            h('span', { className: 'kbd-hint' }, '/')
          )
        ),

        !query && h('div', { className: 'quick-items-grid-section' },
          h('div', { className: 'quick-items-grid-label' }, 'Quick Add'),
          h('div', { className: 'quick-items-grid' },
            (function() {
              const FIXED = [
                { sku: 'TUBE-700-PRESTA',  name: 'Tube 700c Presta',      price: 12 },
                { sku: 'TUBE-26-SCHRADER', name: 'Tube 26" Schrader',      price: 10 },
                { sku: 'LUBE-DRY',         name: 'Dry Chain Lube',         price: 18 },
                { sku: 'LUBE-WET',         name: 'Wet Chain Lube',         price: 18 },
                { sku: 'LAB-BASIC-TUNE',   name: 'Labour \xb7 Basic Tune', price: 55, taxablePst: false },
                { sku: 'LAB-BRAKE-BLD',    name: 'Labour \xb7 Brake Bleed', price: 45, taxablePst: false },
                { sku: 'BARTAPE-BLK',      name: 'Bar Tape',               price: 24 },
                { sku: 'CABLE-BRAKE',      name: 'Brake Cable Kit',        price: 16 },
              ];
              const enriched = FIXED.map(function(fi) {
                const live = lsCatalog.find(function(c) { return c.sku === fi.sku; });
                return live ? Object.assign({}, fi, { price: live.price, stock: live.stock, low: live.low }) : fi;
              });
              const liveExtras = lsCatalog.filter(function(c) { return !FIXED.find(function(f) { return f.sku === c.sku; }); }).slice(0, Math.max(0, 12 - enriched.length));
              return enriched.concat(liveExtras);
            })().map(function(it) {
              const inStock = it.stock == null || it.stock > 0;
              return h('button', {
                key: it.sku,
                className: 'quick-item-btn' + (!inStock ? ' oos' : ''),
                onClick: function() { if (inStock) addItem(it); else toast(it.name + ' is out of stock', 'error'); },
                title: it.sku + (it.stock != null ? ' \xb7 ' + it.stock + ' in stock' : ''),
              },
                h('span', { className: 'qi-name' }, it.name.length > 28 ? it.name.slice(0, 28) + '\u2026' : it.name),
                h('div', { className: 'qi-footer' },
                  h('span', { className: 'qi-price' }, fmt$(it.price)),
                  it.stock != null && h('span', { className: 'qi-stock' + (it.low ? ' low' : '') }, it.stock > 0 ? it.stock + ' stk' : 'OOS')
                )
              );
            })
          )
        ),

        query && query.trim().length >= 2 && h('div', { className: 'search-mode-tabs' },
          h('button', {
            className: 'tab' + (!showCatalog ? ' active' : ''),
            onClick: function() { setShowCatalog(false); setDistResults([]); },
          }, 'In Stock'),
          h('button', {
            className: 'tab' + (showCatalog ? ' active' : ''),
            onClick: function() { setShowCatalog(true); },
          }, 'Catalog')
        ),

        query && searching && h('div', { className: 'item-results' },
          h('div', { style: { padding: '12px 14px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 } },
            'Searching...')
        ),
        query && !searching && searchResults.length > 0 && h('div', { className: 'item-results' },
          searchResults.map(c =>
            h('div', { key: c.sku, className: 'item-row', onClick: () => addItem(c) },
              h('div', null,
                h('div', null, c.name),
                h('div', { className: 'sku' }, c.sku)
              ),
              h('div', { className: 'stock' + (c.low ? ' low' : '') }, c.stock != null ? c.stock + ' in stock' : ''),
              h('div', { className: 'price' }, fmt$(c.price))
            )
          ),
          h('div', { style: { padding: '4px 14px 8px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10 } },
            searchResults.length + ' result' + (searchResults.length === 1 ? '' : 's'))
        ),
        query && !searching && searchResults.length === 0 && query.trim().length >= 2 && h('div', { className: 'item-results' },
          h('div', { style: { padding: '12px 14px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 } },
            'No results for "' + query + '"')
        ),

        // ── Distributor results (HLC / OGC) — only shown in Catalog mode ──────
        query && showCatalog && distSearching && h('div', { className: 'item-results', style: { borderTop: '2px solid var(--line2)' } },
          h('div', { style: { padding: '8px 14px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 } },
            h('span', { style: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#b45309', animation: 'pulse 1s infinite' } }),
            'Checking distributors...'
          )
        ),
        query && showCatalog && !distSearching && distResults.length > 0 && h('div', { className: 'item-results', style: { borderTop: '2px solid var(--line2)' } },
          h('div', { style: { padding: '6px 14px 4px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'flex', gap: 8 } },
            'Distributor Catalog — Special Order'
          ),
          distResults.map(function(c) {
            var sourceBadge = c.source === 'hlc' ? 'HLC' : c.source === 'ogc' ? 'OGC' : c.source === 'oss' ? 'OSS' : (c.source || 'DIST').toUpperCase();
            var badgeBg = c.source === 'hlc' ? '#b45309' : c.source === 'ogc' ? '#1d4ed8' : '#334155';
            return h('div', { key: c.id || c.sku, className: 'item-row', onClick: function() { addItem(c); }, style: { opacity: 0.92 } },
              h('div', null,
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { style: { background: badgeBg, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', padding: '1px 5px', flexShrink: 0 } }, sourceBadge),
                  h('span', null, c.name)
                ),
                h('div', { className: 'sku', style: { display: 'flex', gap: 8, marginTop: 2 } },
                  h('span', null, c.sku),
                  c.brand && h('span', { style: { color: 'var(--text-3)' } }, c.brand),
                  c.leadTime && h('span', { style: { color: '#b45309' } }, c.leadTime)
                )
              ),
              h('div', { className: 'stock' }, c.inStock ? c.qty + ' @ dist' : 'Order'),
              h('div', { className: 'price' }, fmt$(c.price))
            );
          }),
          h('div', { style: { padding: '4px 14px 8px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10 } },
            distResults.length + ' distributor item' + (distResults.length === 1 ? '' : 's'))
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
            h('div', {
              onClick: () => setEditingLine(i),
              style: { cursor: 'pointer' },
              title: 'Click to edit price, discount, qty',
            },
              h('div', { className: 'name' },
                i.name,
                i.taxablePst === false && h('span', { style: { marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text3)', background: 'var(--bg3)', padding: '1px 5px' } }, 'PST-EXEMPT'),
                i.specialOrder && h('span', { style: { marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#fff', background: '#b45309', padding: '1px 5px' } }, i.source === 'hlc' ? 'HLC ORDER' : i.source === 'ogc' ? 'OGC ORDER' : 'SPECIAL ORDER'),
                i.specialOrder && i.leadTime && h('span', { style: { marginLeft: 4, fontFamily: 'var(--mono)', fontSize: 9, color: '#b45309' } }, i.leadTime),
                i.discount > 0 && h('span', { style: { marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: '#fff', background: 'var(--accent)', padding: '1px 5px' } }, '-' + (i.discountType === 'pct' ? i.discount + '%' : '$' + i.discount))
              ),
              h('div', { className: 'sku' }, i.sku, i.upc ? ' \xb7 ' + i.upc : '')
            ),
            h('div', null,
              h('div', { className: 'qty-stepper', onClick: e => e.stopPropagation() },
                h('button', { onClick: e => { e.stopPropagation(); setQty(i.sku, -1); } }, '−'),
                h('input', { value: i.qty, onChange: e => setQtyDirect(i.sku, e.target.value), onClick: e => e.stopPropagation() }),
                h('button', { onClick: e => { e.stopPropagation(); setQty(i.sku, +1); } }, '+')
              )
            ),
            h('div', { className: 'num', style: { textAlign: 'right', color: 'var(--text-1)' } }, fmt$(i.price)),
            h('div', { className: 'num', style: { textAlign: 'right', fontWeight: 500 } }, fmt$(lineTotal(i))),
            h(OptionsMenu, { items: [
              { label: 'Edit price / discount', onClick: () => setEditingLine(i) },
              { label: 'View details',          onClick: () => setEditingLine(i) },
              'divider',
              { label: 'Remove', onClick: () => removeItem(i.sku), danger: true },
            ]})
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
          h('button', { className: 'btn ghost', style: { height: 24, padding: '0 8px', fontSize: 11 }, onClick: function() { if (items.length && !confirm('Clear all ' + items.length + ' item' + (items.length === 1 ? '' : 's') + ' from cart?')) return; setItems([]); } }, 'Clear cart')
        )
      ),

      // RIGHT — checkout
      h('div', { className: 'col', style: { gap: 16 } },
        saleCustomer && h('div', { className: 'card', style: { borderLeft: '3px solid var(--accent)' } },
          h('div', { style: { padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 } },
            h(AvInit, { initials: saleCustomer.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(), tone: 'am' }),
            h('div', { style: { flex: 1 } },
              h('div', { style: { fontWeight: 600, fontSize: 13 } }, saleCustomer.name),
              h('div', { style: { fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' } }, saleCustomer.phone + ' \xb7 from Customers')
            ),
            h('button', { className: 'btn ghost', style: { height: 22, padding: '0 6px', fontSize: 11 }, onClick: () => { setSaleCustomer(null); setCustomerName(''); } }, '\xd7')
          )
        ),

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
              h('button', { className: 'pay-btn', onClick: handlePayCash },
                h(Ico.Cash, { size: 14 }), h('span', null, 'Cash'), h('span', { className: 'kbd' }, 'F2')
              ),
              h('button', { className: 'pay-btn primary', onClick: handlePayCard },
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
   SCREEN E — CUSTOMERS
───────────────────────────────────────── */
const MOCK_CUSTOMER_DETAIL = {
  1: {
    bikes: ['Santa Cruz Bronson CC X01 2023', 'Specialized Crux 2022', 'Trek Marlin 7 2019'],
    orders: [
      { id: 'S-1180',   date: '2026-04-12', total: 312.50, items: 'Cassette + chain + labour' },
      { id: 'WO-2210',  date: '2025-11-04', total: 185.00, items: 'Full tune' },
      { id: 'S-1102',   date: '2025-08-19', total:  68.00, items: 'Tires x2' },
    ],
    openWo: ['WO-2388'],
  },
  2: {
    bikes: ['Norco Sight C2 2023 Forest Green', 'Trek Domane AL 3 2021'],
    orders: [
      { id: 'S-1188',  date: '2026-05-20', total: 354.00, items: 'Current sale' },
      { id: 'WO-2391', date: '2026-05-18', total: 312.50, items: 'Drivetrain replace' },
    ],
    openWo: ['WO-2391'],
  },
};

function CustomerDetail({ customer, onClose, onNewSale, onNewWo, onMessage }) {
  const detail = MOCK_CUSTOMER_DETAIL[customer.id] || { bikes: [], orders: [], openWo: [] };
  const [addBikeMode, setAddBikeMode] = useState(false);
  const [newBike, setNewBike] = useState('');

  return h('div', { className: 'slide-panel' },
    h('div', { className: 'panel-head' },
      h('div', null,
        h('div', { className: 'page-sub' }, 'Customer #' + customer.id),
        h('div', { className: 'page-title', style: { fontSize: 18 } }, customer.name)
      ),
      h('div', { style: { display: 'flex', gap: 8, marginLeft: 'auto' } },
        h('button', { className: 'btn primary', onClick: function() { onNewSale && onNewSale(customer); onClose(); } }, 'New Sale'),
        h('button', { className: 'btn', onClick: function() { onNewWo && onNewWo(customer); onClose(); } }, 'New WO'),
        customer.phone && h('button', { className: 'btn', onClick: function() { onMessage && onMessage(customer); onClose(); } }, h(Ico.MessageBubble, { size: 12 }), ' Message'),
        h('button', { className: 'btn ghost', onClick: onClose }, '\xd7')
      )
    ),
    h('div', { className: 'panel-body' },
      h('div', { className: 'wo-detail-info' },
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Phone'),        h('span', { className: 'v mono' }, customer.phone)),
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Member since'), h('span', { className: 'v mono' }, customer.memberSince)),
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Open WOs'),     h('span', { className: 'v mono' }, detail.openWo.join(', ') || 'None'))
      ),
      h('div', { className: 'panel-section' },
        h('div', { className: 'panel-section-head', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('span', null, 'Bikes on File'),
          h('button', { className: 'btn ghost', style: { height: 22, padding: '0 6px', fontSize: 11 }, onClick: function() { setAddBikeMode(true); } }, h(Ico.Plus, { size: 11 }), ' Add')
        ),
        detail.bikes.map(function(b, i) {
          return h('div', { key: i, style: { padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 12, color: 'var(--text-1)' } }, b);
        }),
        addBikeMode && h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
          h('input', { className: 'input', placeholder: 'Make + model + year...', value: newBike, onChange: function(e) { setNewBike(e.target.value); }, style: { flex: 1 } }),
          h('button', { className: 'btn primary', onClick: function() { toast('Bike added', 'success'); setAddBikeMode(false); setNewBike(''); } }, 'Add'),
          h('button', { className: 'btn', onClick: function() { setAddBikeMode(false); } }, 'Cancel')
        )
      ),
      h('div', { className: 'panel-section' },
        h('div', { className: 'panel-section-head' }, 'Purchase History'),
        h('table', { className: 'tbl' },
          h('thead', null, h('tr', null, h('th', null, 'ID'), h('th', null, 'Date'), h('th', null, 'Items'), h('th', null, 'Total'))),
          h('tbody', null,
            detail.orders.map(function(o) {
              return h('tr', { key: o.id },
                h('td', { className: 'num' }, o.id),
                h('td', { className: 'mono muted' }, o.date),
                h('td', { className: 'muted' }, o.items),
                h('td', { className: 'num' }, fmt$(o.total))
              );
            })
          )
        )
      )
    )
  );
}

function CustomersScreen({ setScreen, onNewSale, onNewWo, onMessage }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = lsCustomers.filter(function(c) {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  return h(Fragment, null,
    h(PageHead, {
      title: 'Customers', sub: 'CRM',
      actions: [h('button', { key: 'new', className: 'btn primary' }, h(Ico.Plus, { size: 13 }), ' New Customer')],
    }),
    h('div', { className: 'filters', style: { marginBottom: 14 } },
      h('div', { className: 'search-field', style: { maxWidth: 360, flex: '0 0 360px' } },
        h('span', { className: 'ico' }, h(Ico.Search, { size: 13 })),
        h('input', { className: 'input', placeholder: 'Search name or phone...', value: search, onChange: function(e) { setSearch(e.target.value); } })
      )
    ),
    h('div', { className: 'card' },
      h('table', { className: 'tbl' },
        h('thead', null, h('tr', null,
          h('th', null, 'Name'), h('th', null, 'Phone'),
          h('th', { style: { width: 70 } }, 'Bikes'), h('th', { style: { width: 130 } }, 'Member Since'),
          h('th', { style: { width: 32 } })
        )),
        h('tbody', null,
          filtered.map(function(c) {
            return h('tr', { key: c.id, style: { cursor: 'pointer' }, onClick: function() { setSelected(c); } },
              h('td', null, c.name),
              h('td', { className: 'mono muted' }, c.phone),
              h('td', { className: 'num muted' }, c.bikes),
              h('td', { className: 'mono muted' }, c.memberSince),
              h('td', { onClick: function(e) { e.stopPropagation(); } },
                h(OptionsMenu, { items: [
                  { label: 'View detail',    onClick: function() { setSelected(c); } },
                  { label: 'New Sale',       onClick: function() { onNewSale && onNewSale(c); } },
                  { label: 'New Work Order', onClick: function() { onNewWo && onNewWo(c); } },
                  { label: 'Message',        onClick: function() { onMessage && onMessage(c); } },
                  'divider',
                  { label: 'Edit',   onClick: function() { setSelected(c); } },
                  { label: 'Delete', onClick: function() { toast('Edit customer in Lightspeed to delete', ''); }, danger: true },
                ]})
              )
            );
          })
        )
      )
    ),
    selected && h('div', { className: 'panel-overlay', onClick: function(e) { if (e.target === e.currentTarget) setSelected(null); } },
      h(CustomerDetail, { customer: selected, onClose: function() { setSelected(null); }, onNewSale, onNewWo, onMessage })
    )
  );
}

/* ─────────────────────────────────────────
   SCREEN F — INVENTORY
───────────────────────────────────────── */
function ItemDetail({ item, onClose }) {
  const [price, setPrice]     = useState(item.price.toFixed(2));
  const [cost, setCost]       = useState((item.price * 0.55).toFixed(2));
  const [qty, setQty]         = useState(item.stock);
  const [editing, setEditing] = useState(false);

  const costNum  = parseFloat(cost)  || 0;
  const priceNum = parseFloat(price) || 1;
  const margin   = Math.round((1 - costNum / priceNum) * 100);

  function save() {
    apiPost('/api/inventory/' + item.sku, { price: priceNum, cost: costNum, stock: qty })
      .then(function() { toast('Saved', 'success'); })
      .catch(function() { toast('Failed to save — check connection', 'error'); });
    setEditing(false);
  }

  return h('div', { className: 'slide-panel' },
    h('div', { className: 'panel-head' },
      h('div', null,
        h('div', { className: 'page-sub' }, item.sku),
        h('div', { className: 'page-title', style: { fontSize: 16 } }, item.name)
      ),
      h('div', { style: { display: 'flex', gap: 8, marginLeft: 'auto' } },
        editing
          ? h(Fragment, null,
              h('button', { className: 'btn primary', onClick: save }, 'Save'),
              h('button', { className: 'btn', onClick: function() { setEditing(false); } }, 'Cancel')
            )
          : h('button', { className: 'btn', onClick: function() { setEditing(true); } }, 'Edit'),
        h('button', { className: 'btn ghost', onClick: onClose }, '\xd7')
      )
    ),
    h('div', { className: 'panel-body' },
      h('div', { className: 'wo-detail-info' },
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'SKU'),   h('span', { className: 'v mono' }, item.sku)),
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Price'),
          editing ? h('input', { className: 'input mono', value: price, onChange: function(e) { setPrice(e.target.value); }, style: { width: 100, height: 26, padding: '2px 6px' } })
                  : h('span', { className: 'v mono' }, fmt$(priceNum))
        ),
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Cost'),
          editing ? h('input', { className: 'input mono', value: cost, onChange: function(e) { setCost(e.target.value); }, style: { width: 100, height: 26, padding: '2px 6px' } })
                  : h('span', { className: 'v mono' }, fmt$(costNum))
        ),
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Margin'),
          h('span', { className: 'v mono', style: { color: margin > 30 ? 'var(--green)' : margin < 15 ? 'var(--accent)' : 'var(--text)' } }, margin + '%')
        ),
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'In Stock'),
          editing ? h('input', { className: 'input mono', type: 'number', value: qty, onChange: function(e) { setQty(parseInt(e.target.value,10)||0); }, style: { width: 80, height: 26, padding: '2px 6px' } })
                  : h('span', { className: 'v mono' }, qty)
        ),
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Low stock'),
          h('span', { className: 'v', style: { color: item.low ? 'var(--amber)' : 'var(--green)' } }, item.low ? 'Yes' : 'No')
        )
      ),
      h('div', { className: 'panel-section' },
        h('div', { className: 'panel-section-head' }, 'Actions'),
        h('div', { style: { display: 'flex', gap: 8, padding: '10px 0' } },
          h('button', { className: 'btn', onClick: function() { toast('Go to Purchase Orders to create a reorder', ''); } }, 'Reorder'),
          h('button', { className: 'btn', onClick: function() { toast('Go to Purchase Orders → New PO to add this item', ''); } }, 'Add to PO')
        )
      ),
      h('div', { className: 'panel-section' },
        h('div', { className: 'panel-section-head' }, 'Sales History'),
        h('div', { style: { padding: '8px 0', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 11 } }, 'No sales history in mock data')
      )
    )
  );
}

function InventoryScreen() {
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  // Part image index: sku -> url. Populated from KV part-img-index on mount.
  const [partImgIndex, setPartImgIndex] = useState({});

  useEffect(function() {
    apiGet('/api/part-img-index').then(function(d) {
      if (d && typeof d === 'object') setPartImgIndex(d);
    }).catch(function() {});
  }, []);

  const filtered = lsCatalog.filter(function(c) {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q);
  });

  useBarcodeScanner(useCallback(function(code) {
    const found = lsCatalog.find(function(c) { return c.sku === code; });
    if (found) setSelected(found);
    else toast('Not found: ' + code, 'error');
  }, []));

  return h(Fragment, null,
    h(PageHead, {
      title: 'Inventory', sub: 'Stock',
      actions: [h('button', { key: 'new', className: 'btn primary' }, h(Ico.Plus, { size: 13 }), ' Add Item')],
    }),
    h('div', { className: 'filters', style: { marginBottom: 14 } },
      h('div', { className: 'search-field', style: { maxWidth: 360, flex: '0 0 360px' } },
        h('span', { className: 'ico' }, h(Ico.Search, { size: 13 })),
        h('input', { className: 'input', placeholder: 'Search name or SKU...', value: search, onChange: function(e) { setSearch(e.target.value); } })
      )
    ),
    h('div', { className: 'card' },
      h('table', { className: 'tbl' },
        h('thead', null, h('tr', null,
          h('th', { style: { width: 44 } }),
          h('th', null, 'Name'), h('th', { style: { width: 150 } }, 'SKU'),
          h('th', { style: { width: 90 } }, 'Price'), h('th', { style: { width: 70 } }, 'Stock'),
          h('th', { style: { width: 80 } }, 'Status'), h('th', { style: { width: 32 } })
        )),
        h('tbody', null,
          filtered.map(function(c) {
            const imgUrl = partImgIndex[c.sku] || c.img || null;
            return h('tr', { key: c.sku, style: { cursor: 'pointer' }, onClick: function() { setSelected(c); } },
              h('td', { style: { padding: '4px 8px' } },
                imgUrl
                  ? h('img', { src: imgUrl, alt: '', style: { width: 36, height: 36, objectFit: 'contain', borderRadius: 4, background: 'var(--bg-2)', display: 'block' }, loading: 'lazy' })
                  : h('div', { style: { width: 36, height: 36, background: 'var(--bg-2)', borderRadius: 4 } })
              ),
              h('td', null, c.name),
              h('td', { className: 'num muted' }, c.sku),
              h('td', { className: 'num' }, fmt$(c.price)),
              h('td', { className: 'num' }, c.stock),
              h('td', null, c.low ? h(Badge, { kind: 'booked' }, 'Low') : h(Badge, { kind: 'ready' }, 'OK')),
              h('td', { onClick: function(e) { e.stopPropagation(); } },
                h(OptionsMenu, { items: [
                  { label: 'View detail', onClick: function() { setSelected(c); } },
                  { label: 'Edit',        onClick: function() { setSelected(c); } },
                  { label: 'Reorder',     onClick: function() { toast('Go to Purchase Orders to create a reorder', ''); } },
                  'divider',
                  { label: 'Delete', onClick: function() { toast('Edit item in Lightspeed to delete', ''); }, danger: true },
                ]})
              )
            );
          })
        )
      )
    ),
    selected && h('div', { className: 'panel-overlay', onClick: function(e) { if (e.target === e.currentTarget) setSelected(null); } },
      h(ItemDetail, { item: selected, onClose: function() { setSelected(null); } })
    )
  );
}

/* ─────────────────────────────────────────
   SCREEN G — PURCHASE ORDERS
───────────────────────────────────────── */
const MOCK_POS = [
  { id: 'PO-0451', vendor: 'Shimano Canada', date: '2026-05-15', status: 'received', lines: [
    { sku: 'SHIM-XT-CS-12', name: 'Shimano XT M8100 Cassette', qty: 6,  received: 6,  cost: 98.00 },
    { sku: 'CHAIN-XT-126L', name: 'Shimano XT Chain 126L',     qty: 12, received: 12, cost: 31.00 },
  ]},
  { id: 'PO-0449', vendor: 'Maxxis', date: '2026-05-10', status: 'partial', lines: [
    { sku: 'TIRE-MAXX-29-DH', name: 'Maxxis Minion DHF 29x2.5', qty: 10, received: 4, cost: 44.00 },
  ]},
  { id: 'PO-0447', vendor: 'SRAM', date: '2026-05-08', status: 'ordered', lines: [
    { sku: 'BRAKE-PAD-CODE', name: 'SRAM Code Brake Pads', qty: 20, received: 0, cost: 19.00 },
  ]},
];

function PurchaseOrderDetail({ po, onClose }) {
  const [lines, setLines] = useState(po.lines.map(function(l) { return Object.assign({}, l); }));

  function receiveItem(i) {
    setLines(function(ls) {
      return ls.map(function(l, idx) {
        return idx === i ? Object.assign({}, l, { received: Math.min(l.qty, l.received + 1) }) : l;
      });
    });
    toast('Received qty updated', 'success');
  }

  function completeReceiving() {
    toast('PO ' + po.id + ' marked as Received', 'success');
    onClose();
  }

  const allReceived = lines.every(function(l) { return l.received >= l.qty; });

  return h('div', { className: 'slide-panel' },
    h('div', { className: 'panel-head' },
      h('div', null,
        h('div', { className: 'page-sub' }, po.id),
        h('div', { className: 'page-title', style: { fontSize: 18 } }, po.vendor)
      ),
      h('div', { style: { display: 'flex', gap: 8, marginLeft: 'auto' } },
        !allReceived && h('button', { className: 'btn primary', onClick: completeReceiving }, 'Complete Receiving'),
        h('button', { className: 'btn ghost', onClick: onClose }, '\xd7')
      )
    ),
    h('div', { className: 'panel-body' },
      h('div', { className: 'wo-detail-info' },
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'PO #'),    h('span', { className: 'v mono' }, po.id)),
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Vendor'),  h('span', { className: 'v' }, po.vendor)),
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Date'),    h('span', { className: 'v mono' }, po.date)),
        h('div', { className: 'aside-row' }, h('span', { className: 'k' }, 'Status'),  h('span', { className: 'v' }, po.status))
      ),
      h('div', { className: 'panel-section' },
        h('div', { className: 'panel-section-head' }, 'Line Items'),
        h('table', { className: 'tbl' },
          h('thead', null, h('tr', null,
            h('th', null, 'Item'), h('th', { style: { width: 70 } }, 'Ordered'),
            h('th', { style: { width: 80 } }, 'Received'), h('th', { style: { width: 90 } }, 'Cost'), h('th', { style: { width: 110 } })
          )),
          h('tbody', null,
            lines.map(function(l, i) {
              return h('tr', { key: l.sku },
                h('td', null, h('div', null, l.name), h('div', { className: 'num muted', style: { fontSize: 10 } }, l.sku)),
                h('td', { className: 'num' }, l.qty),
                h('td', { className: 'num', style: { color: l.received >= l.qty ? 'var(--green)' : l.received > 0 ? 'var(--amber)' : 'var(--text-2)' } }, l.received + '/' + l.qty),
                h('td', { className: 'num' }, fmt$(l.cost)),
                h('td', null, l.received < l.qty && h('button', { className: 'btn', style: { height: 26, padding: '0 10px', fontSize: 11 }, onClick: function() { receiveItem(i); } }, '+1 Receive'))
              );
            })
          )
        )
      )
    )
  );
}

function PurchaseOrdersScreen() {
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew]   = useState(false);
  const [vendor, setVendor]     = useState('');
  const [newLines, setNewLines] = useState([]);
  const [lineQ, setLineQ]       = useState('');

  const lineResults = lineQ
    ? MOCK_CATALOG.filter(function(c) { return c.name.toLowerCase().includes(lineQ.toLowerCase()) || c.sku.toLowerCase().includes(lineQ.toLowerCase()); }).slice(0,5)
    : [];

  function addLine(it) {
    setNewLines(function(l) { return l.concat([{ sku: it.sku, name: it.name, qty: 1, cost: (it.price * 0.55).toFixed(2) }]); });
    setLineQ('');
  }

  return h(Fragment, null,
    h(PageHead, {
      title: 'Purchase Orders', sub: 'Tools',
      actions: [h('button', { key: 'new', className: 'btn primary', onClick: function() { setShowNew(true); } }, h(Ico.Plus, { size: 13 }), ' New PO')],
    }),
    showNew && h(Modal, { title: 'New Purchase Order', onClose: function() { setShowNew(false); }, width: 560 },
      h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 12 } },
        h(Field, { label: 'Vendor' },
          h('input', { className: 'input', placeholder: 'Vendor name...', value: vendor, onChange: function(e) { setVendor(e.target.value); } })
        ),
        h(Field, { label: 'Add Line Items' },
          h('div', { className: 'search-field' },
            h('span', { className: 'ico' }, h(Ico.Search, { size: 13 })),
            h('input', { className: 'input', placeholder: 'Search items...', value: lineQ, onChange: function(e) { setLineQ(e.target.value); } })
          ),
          lineQ && lineResults.length > 0 && h('div', { className: 'item-results', style: { border: '1px solid var(--line)', borderTop: 'none' } },
            lineResults.map(function(c) {
              return h('div', { key: c.sku, className: 'item-row', onClick: function() { addLine(c); } },
                h('div', null, h('div', null, c.name), h('div', { className: 'sku' }, c.sku)),
                h('div', { className: 'stock' }, c.stock + ' in stock'),
                h('div', { className: 'price' }, fmt$(c.price))
              );
            })
          )
        ),
        newLines.length > 0 && h('table', { className: 'tbl' },
          h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Qty'), h('th', null, 'Cost'), h('th'))),
          h('tbody', null,
            newLines.map(function(l, i) {
              return h('tr', { key: i },
                h('td', null, l.name),
                h('td', null, h('input', { className: 'input mono', type: 'number', value: l.qty, style: { width: 60, height: 26, padding: '2px 6px' }, onChange: function(e) { setNewLines(function(ls) { return ls.map(function(x,ii) { return ii===i ? Object.assign({},x,{qty:parseInt(e.target.value)||1}) : x; }); }); } })),
                h('td', null, h('input', { className: 'input mono', value: l.cost, style: { width: 80, height: 26, padding: '2px 6px' }, onChange: function(e) { setNewLines(function(ls) { return ls.map(function(x,ii) { return ii===i ? Object.assign({},x,{cost:e.target.value}) : x; }); }); } })),
                h('td', null, h('button', { className: 'icon-btn', onClick: function() { setNewLines(function(ls) { return ls.filter(function(_,ii) { return ii !== i; }); }); } }, h(Ico.Trash, { size: 12 })))
              );
            })
          )
        ),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
          h('button', { className: 'btn', onClick: function() { setShowNew(false); } }, 'Cancel'),
          h('button', { className: 'btn primary', onClick: function() { toast('PO created', 'success'); setShowNew(false); } }, 'Create PO')
        )
      )
    ),
    h('div', { className: 'card' },
      h('table', { className: 'tbl' },
        h('thead', null, h('tr', null, h('th', null, 'PO #'), h('th', null, 'Vendor'), h('th', null, 'Date'), h('th', null, 'Status'), h('th', { style: { width: 32 } }))),
        h('tbody', null,
          MOCK_POS.map(function(po) {
            return h('tr', { key: po.id, style: { cursor: 'pointer' }, onClick: function() { setSelected(po); } },
              h('td', { className: 'num' }, po.id),
              h('td', null, po.vendor),
              h('td', { className: 'mono muted' }, po.date),
              h('td', null,
                po.status === 'received' ? h(Badge, { kind: 'ready'  }, 'Received') :
                po.status === 'partial'  ? h(Badge, { kind: 'booked' }, 'Partial')  :
                h(Badge, { kind: 'open' }, 'Ordered')
              ),
              h('td', { onClick: function(e) { e.stopPropagation(); } },
                h(OptionsMenu, { items: [
                  { label: 'View detail',   onClick: function() { setSelected(po); } },
                  { label: 'Mark Received', onClick: function() { toast('Marked received', 'success'); } },
                  'divider',
                  { label: 'Delete', onClick: function() { toast('Deleted', 'error'); }, danger: true },
                ]})
              )
            );
          })
        )
      )
    ),
    selected && h('div', { className: 'panel-overlay', onClick: function(e) { if (e.target === e.currentTarget) setSelected(null); } },
      h(PurchaseOrderDetail, { po: selected, onClose: function() { setSelected(null); } })
    )
  );
}

/* ─────────────────────────────────────────
   SCREEN H — REPORTS
───────────────────────────────────────── */
function ReportsScreen() {
  const [range, setRange]         = useState('today');
  const [customStart, setCustomStart] = useState('2026-05-01');
  const [customEnd, setCustomEnd]     = useState('2026-05-20');

  const REVENUE_DATA = [
    { day: 'Mon', rev: 2100 }, { day: 'Tue', rev: 3200 }, { day: 'Wed', rev: 1800 },
    { day: 'Thu', rev: 2900 }, { day: 'Fri', rev: 4100 }, { day: 'Sat', rev: 3842 }, { day: 'Sun', rev: 950 },
  ];
  const maxRev = Math.max.apply(null, REVENUE_DATA.map(function(d) { return d.rev; }));

  const TOP_ITEMS = [
    { name: 'Shimano XT Cassette', sku: 'SHIM-XT-CS-12',    qty: 14, rev: 2646 },
    { name: 'Labour - Full Tune',  sku: 'SVC-TUNE-S',        qty: 11, rev: 1320 },
    { name: 'Maxxis Minion DHF',   sku: 'TIRE-MAXX-29-DH',  qty:  9, rev:  756 },
    { name: 'Shimano XT Chain',    sku: 'CHAIN-XT-126L',    qty:  8, rev:  496 },
  ];

  const MECH_DATA = [
    { name: 'A. Miller', open: 3, done: 8, rev: 1240 },
    { name: 'J. Kovac',  open: 2, done: 6, rev:  870 },
    { name: 'S. Reyes',  open: 2, done: 5, rev:  725 },
    { name: 'M. Bell',   open: 1, done: 4, rev:  590 },
  ];

  function exportCsv() {
    const rows = [['Day','Revenue']].concat(REVENUE_DATA.map(function(d) { return [d.day, d.rev]; }));
    const csv = rows.map(function(r) { return r.join(','); }).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'chainline-report-' + range + '.csv';
    a.click();
    toast('CSV exported', 'success');
  }

  return h(Fragment, null,
    h(PageHead, {
      title: 'Reports', sub: 'Tools',
      actions: [h('button', { key: 'csv', className: 'btn', onClick: exportCsv }, 'Export CSV')],
    }),
    h('div', { className: 'sub-tabs', style: { marginBottom: 16 } },
      ['today','week','month','custom'].map(function(r) {
        return h('button', { key: r, className: 'sub-tab' + (range === r ? ' active' : ''), onClick: function() { setRange(r); } },
          r === 'today' ? 'Today' : r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'Custom'
        );
      })
    ),
    range === 'custom' && h('div', { className: 'reports-date-range', style: { display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' } },
      h('input', { className: 'input mono', type: 'date', value: customStart, onChange: function(e) { setCustomStart(e.target.value); }, onFocus: mobileInputFocus }),
      h('span', { style: { color: 'var(--text-2)', whiteSpace: 'nowrap' } }, 'to'),
      h('input', { className: 'input mono', type: 'date', value: customEnd, onChange: function(e) { setCustomEnd(e.target.value); }, onFocus: mobileInputFocus })
    ),
    h('div', { className: 'card mb-22' },
      h('div', { className: 'card-head' }, h('h3', null, 'Revenue'), h('span', { className: 'sub' }, 'By day')),
      h('div', { style: { padding: 18 } },
        h('svg', { viewBox: '0 0 700 160', style: { width: '100%', height: 160 }, xmlns: 'http://www.w3.org/2000/svg' },
          REVENUE_DATA.map(function(d, i) {
            const barH = Math.round((d.rev / maxRev) * 120);
            const x = i * 100 + 20;
            const y = 140 - barH;
            return h(Fragment, { key: d.day },
              h('rect', { x: x, y: y, width: 60, height: barH, fill: 'var(--accent)', opacity: '0.8' }),
              h('text', { x: x+30, y: 156, textAnchor: 'middle', fill: '#7a7a7a', fontSize: '11', fontFamily: 'JetBrains Mono, monospace' }, d.day),
              h('text', { x: x+30, y: y-4, textAnchor: 'middle', fill: '#b8b8b8', fontSize: '10', fontFamily: 'JetBrains Mono, monospace' }, '$' + d.rev.toLocaleString())
            );
          })
        )
      )
    ),
    h('div', { className: 'grid-2' },
      h('div', { className: 'card' },
        h('div', { className: 'card-head' }, h('h3', null, 'Top Items Sold')),
        h('table', { className: 'tbl' },
          h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', { style: { width: 70 } }, 'Qty'), h('th', { style: { width: 90 } }, 'Revenue'))),
          h('tbody', null,
            TOP_ITEMS.map(function(it) {
              return h('tr', { key: it.sku },
                h('td', null, h('div', null, it.name), h('div', { className: 'num muted', style: { fontSize: 10 } }, it.sku)),
                h('td', { className: 'num' }, it.qty),
                h('td', { className: 'num' }, fmt$(it.rev))
              );
            })
          )
        )
      ),
      h('div', { className: 'card' },
        h('div', { className: 'card-head' }, h('h3', null, 'By Mechanic')),
        h('table', { className: 'tbl' },
          h('thead', null, h('tr', null, h('th', null, 'Mechanic'), h('th', { style: { width: 60 } }, 'Open'), h('th', { style: { width: 60 } }, 'Done'), h('th', { style: { width: 90 } }, 'Revenue'))),
          h('tbody', null,
            MECH_DATA.map(function(m) {
              return h('tr', { key: m.name },
                h('td', null, m.name), h('td', { className: 'num' }, m.open),
                h('td', { className: 'num' }, m.done), h('td', { className: 'num' }, fmt$(m.rev))
              );
            })
          )
        )
      )
    )
  );
}

/* ─────────────────────────────────────────
   SCREEN I — SETTINGS
───────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  shopName: 'ChainLine Cycle',
  address: '1139 Ellis St, Kelowna BC V1Y 1Z5',
  phone: '(250) 860-1968',
  email: 'bikes@chainline.ca',
  gst: '843590266 RT0001',
  receiptHeader: 'Thank you for visiting ChainLine!',
  receiptFooter: 'chainline.ca | @chainlinecycles',
  showTaxLine: true,
  showStaffName: true,
  scannerDelay: 50,
  paymentTypes: { cash: true, card: true, giftcard: true, storecredit: true },
  taxes: [
    { id: 1, name: 'GST', rate: 5, active: true },
    { id: 2, name: 'PST', rate: 7, active: true },
  ],
  customStatuses: [
    { id: 1,  label: 'Booked',           color: '#d29a3a' },
    { id: 2,  label: 'Estimate',         color: '#a78bfa' },
    { id: 3,  label: 'Waiting',          color: '#a78bfa' },
    { id: 4,  label: 'Open',             color: '#4d8fd6' },
    { id: 5,  label: 'In Progress',      color: '#ededed' },
    { id: 6,  label: 'Parts Ordered',    color: '#d29a3a' },
    { id: 7,  label: 'SO Parts Arrived', color: '#2f9e5b' },
    { id: 8,  label: 'RA!',              color: '#c8392c' },
    { id: 9,  label: 'Ready',            color: '#2f9e5b' },
    { id: 10, label: 'Done & Paid',      color: '#7a7a7a' },
    { id: 11, label: 'Consignment',      color: '#a78bfa' },
  ],
  customerTypes: [
    { id: 'retail',    label: 'Retail',           discountPct: 0,  chipClass: '' },
    { id: 'staff',     label: 'Staff',            discountPct: 40, chipClass: 'staff' },
    { id: 'wholesale', label: 'Wholesale',        discountPct: 30, chipClass: 'wholesale' },
    { id: 'friends',   label: 'Friends & Family', discountPct: 15, chipClass: 'friends' },
    { id: 'vip',       label: 'VIP',              discountPct: 10, chipClass: 'vip' },
  ],
};

function SettingsScreen() {
  const [settings, setSettings] = useState(function() {
    try {
      const saved = JSON.parse(localStorage.getItem('pos-settings') || 'null');
      // Merge saved with DEFAULT_SETTINGS so new fields/real address apply on top of stale cache
      return saved ? Object.assign({}, DEFAULT_SETTINGS, saved, {
        // Force-overwrite stale placeholder values
        shopName: (saved.shopName === 'ChainLine Kelowna' || !saved.shopName) ? DEFAULT_SETTINGS.shopName : saved.shopName,
        address: (saved.address && saved.address.indexOf('Harvey') >= 0) ? DEFAULT_SETTINGS.address : (saved.address || DEFAULT_SETTINGS.address),
        phone:   (saved.phone === '(250) 555-0100' || !saved.phone) ? DEFAULT_SETTINGS.phone : saved.phone,
        email:   (saved.email === 'kelowna@chainline.ca' || !saved.email) ? DEFAULT_SETTINGS.email : saved.email,
      }) : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });
  const [tab, setTab] = useState('general');
  const [newStatus, setNewStatus] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#4d8fd6');
  const [staffList, setStaffList] = useState(STAFF.map(function(s) { return Object.assign({}, s, { active: true }); }));
  const [scannerTest, setScannerTest] = useState('');
  const [testResult, setTestResult]   = useState('');

  function save(updates) {
    const next = Object.assign({}, settings, updates);
    setSettings(next);
    try { localStorage.setItem('pos-settings', JSON.stringify(next)); } catch {}
    toast('Settings saved', 'success');
  }

  const STABS = [
    { id: 'general',      label: 'General' },
    { id: 'staff',        label: 'Staff' },
    { id: 'payment',      label: 'Payment' },
    { id: 'tax',          label: 'Tax' },
    { id: 'receipt',      label: 'Receipt' },
    { id: 'printer',      label: 'Printer' },
    { id: 'display',      label: 'Display' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'services',     label: 'Services' },
    { id: 'customers',    label: 'Customer Types' },
    { id: 'barcode',      label: 'Barcode' },
    { id: 'backup',       label: 'Backup & Export' },
  ];

  // ── Printer tab state
  const [testPrintResult, setTestPrintResult] = useState('');
  // ── Integrations tab state
  const [intSyncStatus, setIntSyncStatus] = useState({ ls: null, shopify: null });
  const [lsStatusData, setLsStatusData] = useState(null);
  const [lsStatusLoading, setLsStatusLoading] = useState(false);

  function doTestPrint(type) {
    if (type === 'receipt') {
      const w = window.open('', '_blank', 'width=400,height=600');
      w.document.write('<html><head><title>Test Receipt</title><style>body{font-family:monospace;padding:16px;}</style></head><body>');
      w.document.write('<pre>' + settings.receiptHeader + '\n\n--- TEST RECEIPT ---\nDate: ' + new Date().toLocaleDateString() + '\nItem: Test Item  $0.00\n\nGST: $0.00\nTotal: $0.00\n\n' + settings.receiptFooter + '</pre>');
      w.document.write('</body></html>');
      w.document.close();
      w.print();
      setTestPrintResult('Receipt print dialog opened');
    } else if (type === 'label') {
      setTestPrintResult('^XA\n^FO50,50^ADN,36,20^FDHook #A1^FS\n^FO50,100^ADN,24,14^FDTest Bike^FS\n^XZ');
    }
  }

  function doSyncNow(system) {
    setIntSyncStatus(function(s) { return Object.assign({}, s, { [system]: 'syncing' }); });
    var req = system === 'ls' ? window.apiPost('/api/sync/lightspeed', {}) : window.apiPost('/api/sync/shopify', {});
    req.then(function() {
      setIntSyncStatus(function(s) { return Object.assign({}, s, { [system]: 'ok' }); });
      toast('Sync complete', 'success');
    }).catch(function() {
      setIntSyncStatus(function(s) { return Object.assign({}, s, { [system]: 'error' }); });
      toast('Sync failed', 'error');
    });
  }

  function doFetchLsStatus() {
    setLsStatusLoading(true);
    window.apiGet('/api/ls-status').then(function(d) {
      setLsStatusData(d);
      setLsStatusLoading(false);
    }).catch(function() {
      setLsStatusData({ connected: false, error: 'Fetch failed' });
      setLsStatusLoading(false);
    });
  }

  function doExportWosCsv() {
    var wos = window.lsWorkOrders || window.MOCK_WO || [];
    var rows = [['ID','Customer','Bike','Status','Mechanic','Due','Priority']].concat(
      wos.map(function(w) { return [w.id, w.cust, w.bike, w.status, w.mech, w.due, w.prio ? 'Yes' : 'No']; })
    );
    var csv = rows.map(function(r) { return r.map(function(c) { return '"' + String(c || '').replace(/"/g,'""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'chainline-workorders-' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    toast('Work orders exported', 'success');
  }

  function doExportSalesCsv() {
    toast('Sales export: connect to Lightspeed API for live data', 'info');
  }

  function doPrintDailyReport() {
    var w = window.open('', '_blank', 'width=700,height=900');
    var today = new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    var wos = window.lsWorkOrders || window.MOCK_WO || [];
    var open = wos.filter(function(wo) { return wo.status !== 'finished' && wo.status !== 'cancelled'; }).length;
    var done = wos.filter(function(wo) { return wo.status === 'finished'; }).length;
    w.document.write('<html><head><title>Daily Report</title><style>body{font-family:sans-serif;padding:24px;max-width:600px;}h1{font-size:18px;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #ccc;padding:6px 10px;font-size:12px;}@media print{button{display:none;}}</style></head><body>');
    w.document.write('<h1>ChainLine Daily Report — ' + today + '</h1>');
    w.document.write('<p>Open WOs: <b>' + open + '</b> &nbsp; Done: <b>' + done + '</b></p>');
    w.document.write('<table><tr><th>ID</th><th>Customer</th><th>Bike</th><th>Status</th><th>Mechanic</th></tr>');
    wos.forEach(function(wo) {
      w.document.write('<tr><td>' + (wo.id||'') + '</td><td>' + (wo.cust||'') + '</td><td>' + (wo.bike||'') + '</td><td>' + (wo.status||'') + '</td><td>' + (wo.mech||'') + '</td></tr>');
    });
    w.document.write('</table><br><button onclick="window.print()">Print</button></body></html>');
    w.document.close();
    toast('Daily report opened', 'success');
  }

  function StatusDot(props) {
    var color = props.ok ? '#34d399' : props.error ? '#f87171' : props.busy ? '#fbbf24' : '#6b7280';
    var label = props.ok ? 'Connected' : props.error ? 'Error' : props.busy ? 'Syncing…' : 'Unknown';
    return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
      h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 } }),
      h('span', { style: { fontSize: 12, color: color } }, label)
    );
  }

  return h(Fragment, null,
    h(PageHead, { title: 'Settings', sub: 'Configuration' }),
    h('div', { className: 'sub-tabs', style: { marginBottom: 16, flexWrap: 'wrap' } },
      STABS.map(function(t) {
        return h('button', { key: t.id, className: 'sub-tab' + (tab === t.id ? ' active' : ''), onClick: function() { setTab(t.id); } }, t.label);
      })
    ),
    h('div', { className: 'card' },

      /* ── GENERAL ── */
      tab === 'general' && h('div', { style: { padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } },
        h(Field, { label: 'Shop Name' }, h('input', { className: 'input', value: settings.shopName, onChange: function(e) { save({ shopName: e.target.value }); } })),
        h(Field, { label: 'Phone' },     h('input', { className: 'input mono', value: settings.phone,    onChange: function(e) { save({ phone: e.target.value }); } })),
        h('div', { style: { gridColumn: '1/-1' } }, h(Field, { label: 'Address' }, h('input', { className: 'input', value: settings.address, onChange: function(e) { save({ address: e.target.value }); } }))),
        h('div', { style: { gridColumn: '1/-1' } }, h(Field, { label: 'Email' },   h('input', { className: 'input mono', type: 'email', value: settings.email, onChange: function(e) { save({ email: e.target.value }); } }))),
        h('div', { style: { gridColumn: '1/-1' } }, h(Field, { label: 'API PIN', sub: 'Staff PIN for worker API auth. Must match POS_PIN worker secret. Stored in localStorage only.' },
          h('input', { className: 'input mono', type: 'password', placeholder: '••••', autoComplete: 'off',
            defaultValue: (function() { try { return localStorage.getItem('pos-api-pin') || ''; } catch { return ''; } })(),
            onChange: function(e) {
              try { localStorage.setItem('pos-api-pin', e.target.value); } catch {}
              toast('API PIN updated', 'success');
            }
          })
        )),
        h('div', { style: { gridColumn: '1/-1' } },
          h('div', { className: 'panel-section-head', style: { marginBottom: 8 } }, 'Tax Rates'),
          h('div', { style: { display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' } },
            h(Field, { label: 'GST %' }, h('input', { className: 'input mono', type: 'number', min: 0, max: 25, step: 0.5,
              value: (settings.taxes.find(function(t) { return t.id === 1; }) || {}).rate || 5,
              onChange: function(e) { save({ taxes: settings.taxes.map(function(t) { return t.id === 1 ? Object.assign({}, t, { rate: parseFloat(e.target.value) || 5 }) : t; }) }); },
              style: { width: 80 }
            })),
            h(Field, { label: 'PST %' }, h('input', { className: 'input mono', type: 'number', min: 0, max: 25, step: 0.5,
              value: (settings.taxes.find(function(t) { return t.id === 2; }) || {}).rate || 7,
              onChange: function(e) { save({ taxes: settings.taxes.map(function(t) { return t.id === 2 ? Object.assign({}, t, { rate: parseFloat(e.target.value) || 7 }) : t; }) }); },
              style: { width: 80 }
            })),
            h(Field, { label: 'GST Number' }, h('input', { className: 'input mono', value: settings.gst || '',
              onChange: function(e) { save({ gst: e.target.value }); },
              style: { width: 200 }
            }))
          ),
          h('div', { style: { fontSize: 11, color: 'var(--text3)', marginTop: 4 } },
            'PST exemptions: bikes, parts, helmets, bike lights (managed via Shopify tax overrides)'
          )
        )
      ),

      /* ── STAFF ── */
      tab === 'staff' && h('div', { style: { padding: 18 } },
        h('div', { className: 'panel-section-head', style: { marginBottom: 12 } }, 'Staff Members'),
        staffList.map(function(s, i) {
          return h('div', { key: s.id, className: 'aside-row', style: { gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line2)' } },
            h(AvInit, { initials: s.initials, tone: s.tone }),
            h('div', { style: { flex: 1, marginLeft: 8 } },
              h('div', { style: { fontWeight: 500 } }, s.name),
              h('div', { style: { fontSize: 11, color: 'var(--text2)' } }, s.role)
            ),
            h(Badge, { kind: s.role === 'Owner' ? 'inprogress' : s.role === 'Manager' ? 'booked' : 'open' }, s.role),
            h(Toggle, {
              on: s.active,
              onChange: function(v) {
                setStaffList(function(ls) { return ls.map(function(x, ii) { return ii === i ? Object.assign({}, x, { active: v }) : x; }); });
              }
            }),
            h('button', {
              className: 'btn ghost',
              style: { height: 26, padding: '0 10px', fontSize: 11 },
              onClick: function() {
                var pin = window.prompt('New PIN for ' + s.name + ' (4 digits):');
                if (pin && /^\d{4}$/.test(pin)) {
                  setStaffList(function(ls) { return ls.map(function(x, ii) { return ii === i ? Object.assign({}, x, { pin: pin }) : x; }); });
                  toast('PIN updated for ' + s.name, 'success');
                } else if (pin !== null) {
                  toast('PIN must be 4 digits', 'error');
                }
              }
            }, 'Change PIN')
          );
        }),
        h('div', { style: { marginTop: 16 } },
          h('button', {
            className: 'btn primary',
            onClick: function() {
              var name = window.prompt('New staff member name:');
              if (!name || !name.trim()) return;
              var pin = window.prompt('PIN (4 digits):');
              if (!pin || !/^\d{4}$/.test(pin)) { toast('PIN must be 4 digits', 'error'); return; }
              var role = window.prompt('Role (Mechanic / Manager / Owner / Warranty):') || 'Mechanic';
              var initials = name.trim().split(' ').map(function(p) { return p[0] || ''; }).join('').toUpperCase().slice(0,2);
              var newStaff = { id: Date.now(), name: name.trim(), initials: initials, role: role, tone: initials.toLowerCase(), pin: pin, active: true };
              setStaffList(function(ls) { return ls.concat([newStaff]); });
              toast('Added ' + name, 'success');
            }
          }, '+ Add Staff')
        )
      ),

      /* ── PAYMENT ── */
      tab === 'payment' && h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 12 } },
        Object.entries(settings.paymentTypes).map(function(entry) {
          var k = entry[0], v = entry[1];
          var label = k === 'cash' ? 'Cash' : k === 'card' ? 'Card / Tap' : k === 'giftcard' ? 'Gift Card' : 'Store Credit';
          return h(Toggle, { key: k, on: v, onChange: function(val) {
            var pt = Object.assign({}, settings.paymentTypes);
            pt[k] = val;
            save({ paymentTypes: pt });
          }, label: label });
        })
      ),

      /* ── TAX ── */
      tab === 'tax' && h('div', { style: { padding: 18 } },
        settings.taxes.map(function(t, i) {
          return h('div', { key: t.id, className: 'aside-row' },
            h('span', { style: { flex: 1 } }, t.name + ' ' + t.rate + '%'),
            h(Toggle, { on: t.active, onChange: function(v) {
              save({ taxes: settings.taxes.map(function(x, ii) { return ii === i ? Object.assign({}, x, { active: v }) : x; }) });
            }})
          );
        })
      ),

      /* ── RECEIPT ── */
      tab === 'receipt' && h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 12 } },
        h(Field, { label: 'Header Text' }, h('textarea', { className: 'textarea', rows: 2, value: settings.receiptHeader, onChange: function(e) { save({ receiptHeader: e.target.value }); } })),
        h(Field, { label: 'Footer Text' }, h('textarea', { className: 'textarea', rows: 2, value: settings.receiptFooter, onChange: function(e) { save({ receiptFooter: e.target.value }); } })),
        h(Toggle, { on: settings.showTaxLine,   onChange: function(v) { save({ showTaxLine: v }); },   label: 'Show tax breakdown on receipt' }),
        h(Toggle, { on: settings.showStaffName, onChange: function(v) { save({ showStaffName: v }); }, label: 'Show staff name on receipt' })
      ),

      /* ── PRINTER ── */
      tab === 'printer' && h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 20 } },
        h('div', null,
          h('div', { className: 'panel-section-head', style: { marginBottom: 10 } }, 'Receipt Printer'),
          h('div', { style: { fontSize: 12, color: 'var(--text2)', marginBottom: 10 } },
            'Uses browser window.print() — works with any AirPrint or USB receipt printer set as default.'
          ),
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
            h('button', { className: 'btn', onClick: function() { doTestPrint('receipt'); } }, 'Test Print Receipt'),
            testPrintResult && !testPrintResult.startsWith('^XA') && h('span', { style: { fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' } }, testPrintResult)
          )
        ),
        h('div', null,
          h('div', { className: 'panel-section-head', style: { marginBottom: 10 } }, 'Label Printer (ZPL)'),
          h('div', { style: { fontSize: 12, color: 'var(--text2)', marginBottom: 10 } },
            'Zebra ZPL template for hook labels. Send via raw socket or Zebra Browser Print app.'
          ),
          h(Field, { label: 'ZPL Template', hint: 'Variables: {{hookId}} {{customer}} {{bike}} {{date}}' },
            h('textarea', {
              className: 'textarea', rows: 5,
              style: { fontFamily: 'var(--mono)', fontSize: 11 },
              value: settings.zplTemplate || '^XA\n^FO20,20^ADN,36,20^FD{{hookId}}^FS\n^FO20,70^ADN,24,14^FD{{customer}}^FS\n^FO20,100^ADN,20,12^FD{{bike}}^FS\n^FO20,130^ADN,18,10^FD{{date}}^FS\n^XZ',
              onChange: function(e) { save({ zplTemplate: e.target.value }); }
            })
          ),
          h('button', { className: 'btn', onClick: function() { doTestPrint('label'); } }, 'Preview ZPL'),
          testPrintResult && testPrintResult.startsWith('^XA') && h('pre', {
            style: { marginTop: 8, padding: 10, background: 'var(--bg)', border: '1px solid var(--line)', fontSize: 11, fontFamily: 'var(--mono)', overflowX: 'auto' }
          }, testPrintResult)
        )
      ),

      /* ── DISPLAY ── */
      tab === 'display' && h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 16 } },
        h('div', null,
          h('div', { className: 'panel-section-head', style: { marginBottom: 10 } }, 'Appearance'),
          h(Field, { label: 'Theme' },
            h('select', {
              className: 'input',
              style: { width: 200 },
              value: settings.theme || 'dark',
              onChange: function(e) {
                save({ theme: e.target.value });
                document.documentElement.setAttribute('data-theme', e.target.value);
              }
            },
              h('option', { value: 'dark' }, 'Dark'),
              h('option', { value: 'light' }, 'Light'),
              h('option', { value: 'auto' }, 'Auto (system)')
            )
          )
        ),
        h('div', null,
          h('div', { className: 'panel-section-head', style: { marginBottom: 10 } }, 'Locale & Format'),
          h(Field, { label: 'Currency Display' },
            h('select', {
              className: 'input', style: { width: 200 },
              value: settings.currency || 'CAD',
              onChange: function(e) { save({ currency: e.target.value }); }
            },
              h('option', { value: 'CAD' }, 'CAD — Canadian Dollar'),
              h('option', { value: 'USD' }, 'USD — US Dollar')
            )
          ),
          h(Field, { label: 'Date Format' },
            h('select', {
              className: 'input', style: { width: 200 },
              value: settings.dateFormat || 'DD/MM',
              onChange: function(e) { save({ dateFormat: e.target.value }); }
            },
              h('option', { value: 'DD/MM' }, 'DD/MM/YYYY'),
              h('option', { value: 'MM/DD' }, 'MM/DD/YYYY'),
              h('option', { value: 'YYYY-MM-DD' }, 'YYYY-MM-DD (ISO)')
            )
          )
        ),
        h('div', null,
          h('div', { className: 'panel-section-head', style: { marginBottom: 10 } }, 'Floor View'),
          h(Toggle, {
            on: settings.floorShowPricing !== false,
            onChange: function(v) { save({ floorShowPricing: v }); },
            label: 'Show pricing on floor / kanban cards'
          }),
          h(Toggle, {
            on: settings.floorShowPhone !== false,
            onChange: function(v) { save({ floorShowPhone: v }); },
            label: 'Show customer phone number on cards'
          })
        )
      ),

      /* ── INTEGRATIONS ── */
      tab === 'integrations' && h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 20 } },
        h('div', { style: { padding: 14, background: 'var(--bg2)', border: '1px solid var(--line)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
            h('span', { style: { fontWeight: 600 } }, 'Lightspeed'),
            h(StatusDot, { ok: intSyncStatus.ls === 'ok', error: intSyncStatus.ls === 'error', busy: intSyncStatus.ls === 'syncing' })
          ),
          h('div', { style: { fontSize: 11, color: 'var(--text2)', marginBottom: 10 } },
            'POS system. WOs, customers and catalog sync via the worker /api/ endpoints.'
          ),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('button', { className: 'btn', onClick: function() { doSyncNow('ls'); } },
              intSyncStatus.ls === 'syncing' ? '⟳ Syncing…' : '↻ Sync Now'
            ),
            h('button', { className: 'btn ghost', onClick: function() {
              window.apiGet('/api/workorders').then(function(d) {
                setIntSyncStatus(function(s) { return Object.assign({}, s, { ls: 'ok' }); });
                toast('Lightspeed reachable — ' + ((d && d.workorders && d.workorders.length) || 0) + ' WOs', 'success');
              }).catch(function() {
                setIntSyncStatus(function(s) { return Object.assign({}, s, { ls: 'error' }); });
                toast('Lightspeed unreachable', 'error');
              });
            }}, 'Test Connection')
          )
        ),
        h('div', { style: { padding: 14, background: 'var(--bg2)', border: '1px solid var(--line)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
            h('span', { style: { fontWeight: 600 } }, 'Shopify'),
            h(StatusDot, { ok: intSyncStatus.shopify === 'ok', error: intSyncStatus.shopify === 'error', busy: intSyncStatus.shopify === 'syncing' })
          ),
          h('div', { style: { fontSize: 11, color: 'var(--text2)', marginBottom: 10 } },
            'Online store. HLC dropship + tax override collections sync nightly via GH Actions.'
          ),
          h('button', { className: 'btn', onClick: function() { doSyncNow('shopify'); } },
            intSyncStatus.shopify === 'syncing' ? '⟳ Syncing…' : '↻ Trigger Sync'
          )
        ),
        h('div', { style: { padding: 14, background: 'var(--bg2)', border: '1px solid var(--line)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
            h('span', { style: { fontWeight: 600 } }, 'RingCentral (SMS)'),
            h('span', { style: { fontSize: 11, color: settings.ringcentralToken ? '#34d399' : '#9ca3af' } },
              settings.ringcentralToken ? '● Configured' : '○ Not configured'
            )
          ),
          h('div', { style: { fontSize: 11, color: 'var(--text2)', marginBottom: 10 } },
            'Used for "WO Ready" SMS notifications to customers.'
          ),
          h(Field, { label: 'JWT Token' },
            h('input', {
              className: 'input mono', type: 'password', placeholder: 'rc_jwt_…',
              value: settings.ringcentralToken || '',
              onChange: function(e) { save({ ringcentralToken: e.target.value }); }
            })
          ),
          h('button', { className: 'btn ghost', style: { marginTop: 6 }, onClick: function() {
            if (!settings.ringcentralToken) { toast('Enter JWT token first', 'error'); return; }
            window.apiPost('/api/sms/test', { message: 'ChainLine POS test SMS — ignore.' })
              .then(function() { toast('Test SMS sent', 'success'); })
              .catch(function() { toast('SMS failed — check token', 'error'); });
          }}, 'Send Test SMS')
        ),
        h('div', { style: { padding: 14, background: 'var(--bg2)', border: '1px solid var(--line)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
            h('span', { style: { fontWeight: 600 } }, 'Stripe Terminal'),
            h('span', { style: { fontSize: 11, color: settings.stripeKey ? '#34d399' : '#9ca3af' } },
              settings.stripeKey ? '● Configured' : '○ Not configured'
            )
          ),
          h('div', { style: { fontSize: 11, color: 'var(--text2)', marginBottom: 10 } },
            'Card reader payments. STRIPE_SECRET_KEY must also be set as a CF Worker secret.'
          ),
          h(Field, { label: 'Secret Key' },
            h('input', {
              className: 'input mono', type: 'password', placeholder: 'sk_live_…',
              value: settings.stripeKey || '',
              onChange: function(e) { save({ stripeKey: e.target.value }); }
            })
          ),
          h('button', { className: 'btn ghost', style: { marginTop: 6 }, onClick: function() {
            if (!settings.stripeKey) { toast('Enter Stripe key first', 'error'); return; }
            window.apiPost('/api/stripe/test', {})
              .then(function() { toast('Stripe connection OK', 'success'); })
              .catch(function() { toast('Stripe test failed', 'error'); });
          }}, 'Test Payment')
        ),

        /* ── LS Live Status ── */
        h('div', { style: { padding: 14, background: 'var(--bg2)', border: '1px solid var(--line)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
            h('span', { style: { fontWeight: 600 } }, 'Lightspeed Connection Details'),
            lsStatusData && h(StatusDot, {
              ok: lsStatusData.connected,
              error: !lsStatusData.connected
            })
          ),
          h('div', { style: { fontSize: 11, color: 'var(--text2)', marginBottom: 10 } },
            'Live token health, sync timestamps and last-sale push status.'
          ),
          lsStatusData && h('div', { style: { fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: 10 } },
            h('span', { style: { color: 'var(--text3)' } }, 'Connected'),
            h('span', { style: { color: lsStatusData.connected ? '#34d399' : '#f87171' } },
              lsStatusData.connected ? 'Yes' : 'No'
            ),
            h('span', { style: { color: 'var(--text3)' } }, 'Token expires'),
            h('span', null, lsStatusData.tokenExpiry
              ? new Date(lsStatusData.tokenExpiry).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
              : '—'
            ),
            h('span', { style: { color: 'var(--text3)' } }, 'Items synced'),
            h('span', null, lsStatusData.lastSync && lsStatusData.lastSync.items
              ? new Date(lsStatusData.lastSync.items).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '—'
            ),
            h('span', { style: { color: 'var(--text3)' } }, 'Customers synced'),
            h('span', null, lsStatusData.lastSync && lsStatusData.lastSync.customers
              ? new Date(lsStatusData.lastSync.customers).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '—'
            ),
            h('span', { style: { color: 'var(--text3)' } }, 'Sales synced'),
            h('span', null, lsStatusData.lastSync && lsStatusData.lastSync.sales
              ? new Date(lsStatusData.lastSync.sales).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : '—'
            ),
            lsStatusData.scopeWarning && h('span', { style: { gridColumn: '1/-1', color: '#fb923c', marginTop: 4 } },
              '⚠ ' + lsStatusData.scopeWarning
            )
          ),
          h('button', { className: 'btn ghost', onClick: doFetchLsStatus, disabled: lsStatusLoading },
            lsStatusLoading ? '⟳ Fetching…' : '↻ Check Now'
          )
        ),

        /* ── Migration Status ── */
        h('div', { style: { padding: 14, background: 'var(--bg2)', border: '1px solid var(--line)' } },
          h('div', { style: { fontWeight: 600, marginBottom: 8 } }, 'Migration Readiness'),
          h('div', { style: { fontSize: 11, color: 'var(--text2)', marginBottom: 12 } },
            'Features that work independently of Lightspeed (offline-capable or Shopify-only).'
          ),
          (function() {
            var FEATURES = [
              { label: 'Work Order management (create / update / status)',  ok: true,  note: 'R2-backed, works offline' },
              { label: 'Work Order SMS notifications (customer-ready SMS)', ok: !!settings.ringcentralToken, note: settings.ringcentralToken ? 'RingCentral configured' : 'Needs RingCentral JWT token' },
              { label: 'Cash + card payment recording',                    ok: true,  note: 'Stored locally, pushed to LS on sync' },
              { label: 'Sale → Lightspeed sync',                           ok: true,  note: '/api/pos-sync-sale-to-ls — live sync on sale complete' },
              { label: 'WO status → Lightspeed sync',                      ok: true,  note: 'Fires on every status change if lsId set' },
              { label: 'Inventory lookup (parts/gear)',                     ok: true,  note: '/api/parts via HLC+LS worker' },
              { label: 'Customer search + history',                        ok: true,  note: '/api/pos-customer — LS + R2 fallback' },
              { label: 'Stripe Terminal card reader',                      ok: !!settings.stripeKey, note: settings.stripeKey ? 'Stripe key configured' : 'Needs sk_live_ key + CF secret' },
              { label: 'Receipt printing',                                 ok: true,  note: 'Browser print — no hardware dependency' },
              { label: 'Daily report + WO CSV export',                     ok: true,  note: 'Client-side, works offline' },
              { label: 'Shopify online orders (HLC dropship)',             ok: true,  note: 'Nightly GH Action + worker webhook' },
              { label: 'Barcode scanner lookup',                           ok: true,  note: '/api/barcode — UPC → LS item' },
            ];
            var done = FEATURES.filter(function(f) { return f.ok; }).length;
            var pct  = Math.round(done / FEATURES.length * 100);
            return h('div', null,
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                h('div', { style: { flex: 1, height: 8, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' } },
                  h('div', { style: { width: pct + '%', height: '100%', background: pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171', transition: 'width 0.3s' } })
                ),
                h('span', { style: { fontSize: 13, fontWeight: 700, minWidth: 40 } }, pct + '%')
              ),
              h('div', { style: { fontSize: 11, color: 'var(--text2)', marginBottom: 8 } },
                done + ' of ' + FEATURES.length + ' features ready without full LS dependency'
              ),
              FEATURES.map(function(f, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderTop: i > 0 ? '1px solid var(--line2)' : 'none' } },
                  h('span', { style: { fontSize: 14, flexShrink: 0, marginTop: 1 } }, f.ok ? '✓' : '○'),
                  h('div', null,
                    h('div', { style: { fontSize: 12, color: f.ok ? 'var(--text)' : 'var(--text2)' } }, f.label),
                    h('div', { style: { fontSize: 11, color: 'var(--text3)' } }, f.note)
                  )
                );
              })
            );
          })()
        )
      ),

      /* ── SERVICES ── */
      tab === 'services' && h('div', { style: { padding: 18 } },
        h('div', { className: 'panel-section-head', style: { marginBottom: 8 } }, 'Work Order Statuses'),
        settings.customStatuses.map(function(s, i) {
          return h('div', { key: s.id, className: 'aside-row' },
            h('span', { style: { width: 12, height: 12, background: s.color, borderRadius: 2, marginRight: 8, flexShrink: 0, display: 'inline-block' } }),
            h('input', { className: 'input', value: s.label, style: { flex: 1, height: 28, padding: '2px 8px' },
              onChange: function(e) { save({ customStatuses: settings.customStatuses.map(function(x,ii) { return ii===i ? Object.assign({},x,{label:e.target.value}) : x; }) }); } }),
            h('input', { type: 'color', value: s.color, style: { width: 32, height: 28, border: 'none', cursor: 'pointer', background: 'none', padding: 0 },
              onChange: function(e) { save({ customStatuses: settings.customStatuses.map(function(x,ii) { return ii===i ? Object.assign({},x,{color:e.target.value}) : x; }) }); } }),
            h('button', { className: 'icon-btn', onClick: function() { save({ customStatuses: settings.customStatuses.filter(function(_,ii) { return ii !== i; }) }); } }, h(Ico.Trash, { size: 12 }))
          );
        }),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
          h('input', { className: 'input', placeholder: 'New status label...', value: newStatus, onChange: function(e) { setNewStatus(e.target.value); }, style: { flex: 1 } }),
          h('input', { type: 'color', value: newStatusColor, onChange: function(e) { setNewStatusColor(e.target.value); }, style: { width: 36, height: 36, border: 'none', cursor: 'pointer', background: 'none', padding: 0 } }),
          h('button', { className: 'btn primary', onClick: function() {
            if (!newStatus.trim()) return;
            save({ customStatuses: settings.customStatuses.concat([{ id: Date.now(), label: newStatus.trim(), color: newStatusColor }]) });
            setNewStatus('');
          }}, h(Ico.Plus, { size: 12 }))
        )
      ),

      /* ── CUSTOMERS ── */
      tab === 'customers' && h('div', { style: { padding: 18 } },
        h('div', { className: 'panel-section-head', style: { marginBottom: 8 } }, 'Customer Types & Discounts'),
        h('div', { style: { fontSize: 11, color: 'var(--text3, var(--text-3))', marginBottom: 14 } },
          'Each type can carry a default discount. Chip appears next to the customer name everywhere.'
        ),
        (settings.customerTypes || []).map(function(ct, i) {
          return h('div', { key: ct.id, className: 'aside-row', style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('span', { className: 'customer-chip' + (ct.chipClass ? ' customer-chip-' + ct.chipClass : ''), style: { width: 90, justifyContent: 'center' } }, (ct.label || ct.id || '').toUpperCase()),
            h('input', {
              className: 'input', value: ct.label, style: { flex: 1, height: 28, padding: '2px 8px' },
              onChange: function(e) { save({ customerTypes: settings.customerTypes.map(function(x, ii) { return ii === i ? Object.assign({}, x, { label: e.target.value }) : x; }) }); }
            }),
            h('span', { style: { fontSize: 11, color: 'var(--text2, var(--text-2))' } }, 'Discount %'),
            h('input', {
              className: 'input mono', type: 'number', min: 0, max: 100, value: ct.discountPct,
              style: { width: 64, height: 28, padding: '2px 6px', textAlign: 'right' },
              onChange: function(e) {
                var v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                save({ customerTypes: settings.customerTypes.map(function(x, ii) { return ii === i ? Object.assign({}, x, { discountPct: v }) : x; }) });
              }
            }),
            ct.id !== 'retail' && h('button', {
              className: 'icon-btn',
              onClick: function() { save({ customerTypes: settings.customerTypes.filter(function(_, ii) { return ii !== i; }) }); },
            }, h(Ico.Trash, { size: 12 }))
          );
        })
      ),

      /* ── BARCODE ── */
      tab === 'barcode' && h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 12 } },
        h(Field, { label: 'Scanner Input Delay (ms)', hint: 'Max time between keystrokes qualifying as a scan. Default: 50ms.' },
          h('input', { className: 'input mono', type: 'number', value: settings.scannerDelay, onChange: function(e) { save({ scannerDelay: parseInt(e.target.value)||50 }); }, style: { width: 120 } })
        ),
        h(Field, { label: 'Test Scanner', hint: 'Type or scan a barcode, press Enter.' },
          h('input', {
            className: 'input mono',
            placeholder: 'Scan a barcode here...',
            value: scannerTest,
            onChange: function(e) { setScannerTest(e.target.value); },
            onKeyDown: function(e) {
              if (e.key === 'Enter') {
                var f = MOCK_CATALOG.find(function(c) { return c.sku === scannerTest; });
                setTestResult(f ? 'Found: ' + f.name + ' - ' + fmt$(f.price) : 'Not found: ' + scannerTest);
                setScannerTest('');
              }
            },
            'data-barcodeTarget': 'true',
          })
        ),
        testResult && h('div', { style: { padding: '8px 12px', background: 'var(--bg-2)', border: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)' } }, testResult)
      ),

      /* ── BACKUP & EXPORT ── */
      tab === 'backup' && h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 20 } },
        h('div', null,
          h('div', { className: 'panel-section-head', style: { marginBottom: 10 } }, 'Export Data'),
          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { className: 'btn', onClick: doExportWosCsv }, 'Export Work Orders CSV'),
            h('button', { className: 'btn', onClick: doExportSalesCsv }, 'Export Sales CSV')
          ),
          h('div', { style: { fontSize: 11, color: 'var(--text2)', marginTop: 8 } },
            'Work orders export from live data. Sales export requires Lightspeed API access.'
          )
        ),
        h('div', null,
          h('div', { className: 'panel-section-head', style: { marginBottom: 10 } }, 'Reports'),
          h('button', { className: 'btn', onClick: doPrintDailyReport }, 'Print Daily Report'),
          h('div', { style: { fontSize: 11, color: 'var(--text2)', marginTop: 6 } },
            'Opens a print-ready summary of all current work orders.'
          )
        ),
        h('div', null,
          h('div', { className: 'panel-section-head', style: { marginBottom: 10 } }, 'Settings Backup'),
          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { className: 'btn', onClick: function() {
              var data = JSON.stringify(settings, null, 2);
              var a = document.createElement('a');
              a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
              a.download = 'chainline-pos-settings-' + new Date().toISOString().slice(0,10) + '.json';
              a.click();
              toast('Settings exported', 'success');
            }}, 'Export Settings JSON'),
            h('button', { className: 'btn ghost', onClick: function() {
              var input = document.createElement('input');
              input.type = 'file'; input.accept = '.json';
              input.onchange = function(e) {
                var file = e.target.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function(ev) {
                  try {
                    var imported = JSON.parse(ev.target.result);
                    save(imported);
                    toast('Settings imported', 'success');
                  } catch(err) { toast('Invalid JSON file', 'error'); }
                };
                reader.readAsText(file);
              };
              input.click();
            }}, 'Import Settings JSON')
          )
        )
      )
    )
  );
}

/* ─────────────────────────────────────────
   SCREEN — BOOKINGS
───────────────────────────────────────── */
function BookingsScreen({ setScreen }) {
  return h(Fragment, null,
    h(PageHead, { title: 'Bookings', sub: 'Tools' }),
    h('div', { className: 'placeholder-screen' },
      h('div', { className: 'label' }, 'Bookings module coming soon'),
      h('p', { style: { color: 'var(--text-2)', marginTop: 8, marginBottom: 16, fontSize: 13 } },
        'See Work Orders for service queue'
      ),
      h('button', { className: 'btn primary', onClick: () => setScreen('work-orders') },
        h(Ico.Wrench, { size: 13 }), ' View Work Orders'
      )
    )
  );
}

/* ─────────────────────────────────────────
   SCREEN — VENDOR CATALOG
───────────────────────────────────────── */
function VendorCatalogScreen() {
  var _vs  = useState([]);   var vendors = _vs[0];  var setVendors  = _vs[1];
  var _sv  = useState(null); var selectedVendor = _sv[0]; var setSelectedVendor = _sv[1];
  var _it  = useState([]);   var items   = _it[0];  var setItems    = _it[1];
  var _sr  = useState('');   var search  = _sr[0];  var setSearch   = _sr[1];
  var _ld  = useState(false);var loading = _ld[0];  var setLoading  = _ld[1];
  var _tt  = useState(0);    var total   = _tt[0];  var setTotal    = _tt[1];
  var _vl  = useState(true); var vendorsLoading = _vl[0]; var setVendorsLoading = _vl[1];
  var searchTimer = useRef(null);

  useEffect(function() {
    apiGet('/api/pos-vendors-full')
      .then(function(data) {
        var arr = Array.isArray(data) ? data : [];
        setVendors([{ vendorID: 'hlc', name: 'HLC (Highland Cycle)', itemCount: null }].concat(arr));
        setVendorsLoading(false);
      })
      .catch(function() { setVendorsLoading(false); });
  }, []);

  useEffect(function() {
    if (!selectedVendor) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(function() {
      setLoading(true);
      setItems([]);
      var qs = search ? '&search=' + encodeURIComponent(search) : '';
      apiGet('/api/pos-vendor-items?vendorID=' + selectedVendor.vendorID + qs + '&limit=100')
        .then(function(data) {
          setItems((data && data.items) || []);
          setTotal((data && data.total) || 0);
          setLoading(false);
        })
        .catch(function() { setLoading(false); });
    }, search ? 350 : 0);
    return function() { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [selectedVendor, search]);

  function fmtP(n) { return n > 0 ? '$' + parseFloat(n).toFixed(2) : '—'; }

  return h('div', { className: 'screen vendor-catalog' },
    h(PageHead, { title: 'Vendor Catalog', sub: 'All suppliers & item search' }),

    vendorsLoading
      ? h('div', { className: 'vendor-chips' }, h('span', { style: { color: 'var(--text3)', fontSize: 12 } }, 'Loading vendors…'))
      : h('div', { className: 'vendor-chips' },
          vendors.map(function(v) {
            var active = selectedVendor && selectedVendor.vendorID === v.vendorID;
            return h('button', {
              key: v.vendorID,
              className: 'chip' + (active ? ' active' : ''),
              onClick: function() { setSelectedVendor(v); setSearch(''); setItems([]); },
            }, v.name, v.itemCount != null && h('span', { className: 'chip-count' }, v.itemCount));
          })
        ),

    selectedVendor && h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 14px' } },
      h('div', { style: { position: 'relative', flex: 1 } },
        h('span', { style: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' } }, h(Ico.Search, { size: 13 })),
        h('input', { className: 'input', style: { paddingLeft: 30 }, placeholder: 'Search ' + selectedVendor.name + '…', value: search, onChange: function(e) { setSearch(e.target.value); } })
      ),
      !loading && items.length > 0 && h('span', { style: { fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' } }, items.length + (total > items.length ? ' of ' + total : '') + ' items')
    ),

    !selectedVendor && !vendorsLoading && h('div', { style: { padding: '48px 0', textAlign: 'center', color: 'var(--text3)' } },
      h('div', { style: { marginBottom: 8 } }, h(Ico.Box, { size: 28 })),
      h('div', { style: { fontSize: 13 } }, 'Select a vendor above to browse their catalog')
    ),

    loading && h('div', { className: 'vendor-items' },
      [1,2,3,4,5,6].map(function(i) {
        return h('div', { key: i, className: 'vendor-item-card', style: { opacity: 0.35 } },
          h('div', { style: { height: 14, background: 'var(--border)', borderRadius: 3, marginBottom: 6, width: '70%' } }),
          h('div', { style: { height: 11, background: 'var(--border)', borderRadius: 3, width: '40%' } })
        );
      })
    ),

    !loading && selectedVendor && items.length === 0 && h('div', { style: { padding: '36px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 12 } },
      search ? 'No results for "' + search + '"' : 'No items found for this vendor'
    ),

    !loading && items.length > 0 && h('div', { className: 'vendor-items' },
      items.map(function(item) {
        var inStock = item.qoh != null && item.qoh > 0;
        var isHlc   = item.source === 'hlc';
        var dk = (item.systemSku || '') + '|' + (item.customSku || '');
        return h('div', { key: dk, className: 'vendor-item-card' },
          h('div', { className: 'item-info' },
            h('div', { className: 'item-name' }, item.description),
            item.brand && h('div', { style: { fontSize: 10, color: 'var(--text3)', marginBottom: 2 } }, item.brand),
            h('div', { className: 'item-sku mono' }, item.customSku || item.systemSku),
            item.upc && h('div', { className: 'item-upc' }, 'UPC: ' + item.upc)
          ),
          h('div', { className: 'item-pricing' },
            item.defaultCost > 0 && h('div', { className: 'vendor-price' }, 'Cost: ' + fmtP(item.defaultCost)),
            h('div', { className: 'our-price' }, 'Price: ' + fmtP(item.price)),
            h('div', { className: 'stock-badge ' + (item.qoh == null ? 'oos' : inStock ? 'in-stock' : 'oos') },
              item.qoh == null ? (isHlc ? 'Check live' : '—') : inStock ? item.qoh + ' in stock' : 'Out of stock'
            )
          ),
          h('div', { className: 'item-actions' },
            h('button', {
              className: 'btn-sm',
              onClick: function() {
                if (window.addItemToActiveSale) { window.addItemToActiveSale({ id: item.systemSku || item.customSku, name: item.description, sku: item.customSku || item.systemSku, price: item.price || 0, qty: 1, source: item.source || 'ls' }); toast('Added to sale'); }
                else toast('Open a sale first');
              },
            }, '+ Sale'),
            h('button', {
              className: 'btn-sm',
              onClick: function() {
                if (window.addItemToActiveWO) { window.addItemToActiveWO({ id: item.systemSku || item.customSku, name: item.description, sku: item.customSku || item.systemSku, price: item.price || 0, cost: item.defaultCost || 0 }); toast('Added to WO'); }
                else toast('Open a work order first');
              },
            }, '+ WO')
          )
        );
      })
    )
  );
}

/* ─────────────────────────────────────────
   PLACEHOLDER MODULE (fallback)
───────────────────────────────────────── */
function PlaceholderScreen({ name }) {
  return h(Fragment, null,
    h(PageHead, { title: name, sub: 'Module' }),
    h('div', { className: 'placeholder-screen' },
      h('div', { className: 'label' }, 'Coming soon')
    )
  );
}


/* ─────────────────────────────────────────
   SCREEN — MESSAGES  (RingCentral / Telus Business Connect SMS)
───────────────────────────────────────── */
function fmtPhone(p) {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') return '(' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7);
  if (d.length === 10) return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  return p;
}
function fmtMsgTime(iso) {
  if (!iso) return '';
  const dt = new Date(iso); const now = new Date();
  if (dt.toDateString() === now.toDateString()) return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return dt.getFullYear() === now.getFullYear()
    ? dt.toLocaleDateString([], { month: 'short', day: 'numeric' })
    : dt.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}
function MessagesScreen({ initialPhone }) {
  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(initialPhone || null);
  const [draft,     setDraft]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [newPhone,  setNewPhone]  = useState('');
  const [showNew,   setShowNew]   = useState(false);
  const threadEndRef = useRef(null);
  function fetchInbox() {
    return apiGet('/api/sms-inbox')
      .then(function(d) { setMessages(d.messages || []); setLoading(false); })
      .catch(function() { setLoading(false); });
  }
  useEffect(function() { fetchInbox(); const id = setInterval(fetchInbox, 30000); return function() { clearInterval(id); }; }, []);
  useEffect(function() { if (threadEndRef.current) threadEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [selected, messages.length]);
  const convMap = {};
  messages.forEach(function(m) {
    const other = m.direction === 'Inbound' ? m.from : m.to;
    if (!other) return;
    (convMap[other] = convMap[other] || []).push(m);
  });
  const conversations = Object.keys(convMap).map(function(phone) {
    const msgs   = convMap[phone].slice().sort(function(a, b) { return new Date(a.createdTime) - new Date(b.createdTime); });
    const last   = msgs[msgs.length - 1];
    const unread = convMap[phone].filter(function(m) { return m.direction === 'Inbound' && m.readStatus === 'Unread'; }).length;
    return { phone, msgs, last, unread };
  }).sort(function(a, b) { return new Date(b.last.createdTime) - new Date(a.last.createdTime); });
  const activeThread = selected ? (convMap[selected] || []).slice().sort(function(a, b) { return new Date(a.createdTime) - new Date(b.createdTime); }) : [];
  const totalUnread  = conversations.reduce(function(s, c) { return s + c.unread; }, 0);
  function sendReply() {
    const to = selected || newPhone.trim(); const msg = draft.trim();
    if (!to || !msg) return;
    setSending(true);
    apiPost('/api/sms-reply', { to, message: msg })
      .then(function(d) {
        if (d.ok || d.stub) {
          setDraft('');
          if (!selected && to) { setSelected(to); setShowNew(false); setNewPhone(''); }
          toast('Message sent', 'success');
          setMessages(function(prev) { return prev.concat([{ id: Date.now(), from: 'us', to, direction: 'Outbound', body: msg, createdTime: new Date().toISOString(), readStatus: 'Read' }]); });
        } else { toast(d.error || 'Send failed', 'error'); }
      })
      .catch(function(e) { toast(String(e.message || 'Send failed'), 'error'); })
      .finally(function() { setSending(false); });
  }
  function onMsgKeyDown(e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); sendReply(); } }
  return h(Fragment, null,
    h(PageHead, { title: 'Messages', sub: 'SMS \xb7 Telus Business Connect',
      actions: [h('button', { key: 'new', className: 'btn primary', onClick: function() { setShowNew(true); setSelected(null); } }, h(Ico.Plus, { size: 13 }), ' New Message')],
    }),
    h('div', { style: { display: 'flex', height: 'calc(100vh - 120px)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden' } },
      h('div', { style: { width: 280, flexShrink: 0, borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
        h('div', { style: { padding: '10px 12px 8px', borderBottom: '1px solid var(--line)', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.08em' } },
          loading ? 'Loading...' : (conversations.length + ' conversation' + (conversations.length !== 1 ? 's' : '') + (totalUnread ? ' - ' + totalUnread + ' unread' : ''))
        ),
        h('div', { style: { flex: 1, overflowY: 'auto' } },
          conversations.length === 0 && !loading && h('div', { style: { padding: '24px 16px', color: 'var(--text-3)', fontSize: 12, textAlign: 'center' } }, 'No SMS messages yet. Send the first one!'),
          conversations.map(function(conv) {
            return h('div', { key: conv.phone,
              onClick: function() { setSelected(conv.phone); setShowNew(false); },
              style: { padding: '10px 14px', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: selected === conv.phone ? 'var(--bg-2)' : 'transparent' },
            },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 } },
                h('span', { style: { fontWeight: conv.unread ? 600 : 400, fontSize: 13, color: 'var(--text)' } }, fmtPhone(conv.phone)),
                h('span', { style: { fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)' } }, fmtMsgTime(conv.last.createdTime))
              ),
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                h('span', { style: { fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 } },
                  (conv.last.direction === 'Outbound' ? 'You: ' : '') + (conv.last.body || '(media)')
                ),
                conv.unread > 0 && h('span', { style: { background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 600, flexShrink: 0 } }, conv.unread)
              )
            );
          })
        )
      ),
      h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
        h('div', { style: { padding: '10px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 46 } },
          selected
            ? h(Fragment, null,
                h('span', { style: { fontWeight: 600, fontSize: 14 } }, fmtPhone(selected)),
                h('span', { style: { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)' } }, selected)
              )
            : showNew ? h('span', { style: { fontSize: 13, color: 'var(--text-2)' } }, 'New Message')
            : h('span', { style: { fontSize: 13, color: 'var(--text-3)' } }, 'Select a conversation')
        ),
        showNew && !selected && h('div', { style: { padding: '8px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 } },
          h('span', { style: { fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--mono)', width: 22 } }, 'To:'),
          h('input', { className: 'input', placeholder: '+16045551234', value: newPhone, onChange: function(e) { setNewPhone(e.target.value); }, style: { flex: 1, height: 30, fontSize: 12 } })
        ),
        h('div', { style: { flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 } },
          activeThread.length === 0 && selected && h('div', { style: { textAlign: 'center', color: 'var(--text-3)', fontSize: 12, margin: 'auto' } }, 'No messages in this thread'),
          activeThread.length === 0 && !selected && !showNew && h('div', { style: { textAlign: 'center', color: 'var(--text-3)', margin: 'auto' } }, h(Ico.MessageBubble, { size: 40 })),
          activeThread.map(function(m, i) {
            const out = m.direction === 'Outbound';
            return h('div', { key: m.id || i, style: { display: 'flex', justifyContent: out ? 'flex-end' : 'flex-start' } },
              h('div', { title: fmtMsgTime(m.createdTime), style: {
                  maxWidth: '70%', padding: '7px 11px',
                  borderRadius: out ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                  background: out ? 'var(--accent)' : 'var(--bg-2)', color: out ? '#fff' : 'var(--text)',
                  fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word',
                  border: out ? 'none' : '1px solid var(--line)',
              } }, m.body || '(media)')
            );
          }),
          h('div', { ref: threadEndRef })
        ),
        (selected || showNew) && h('div', { style: { padding: '8px 12px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'flex-end' } },
          h('textarea', { className: 'input', rows: 2, placeholder: 'Type a message... (Cmd+Enter to send)',
            value: draft, onChange: function(e) { setDraft(e.target.value); }, onKeyDown: onMsgKeyDown,
            style: { flex: 1, resize: 'none', fontSize: 13, lineHeight: 1.4, padding: '6px 10px' },
          }),
          h('button', { className: 'btn primary',
            disabled: sending || !draft.trim() || (showNew && !selected && !newPhone.trim()),
            onClick: sendReply, style: { alignSelf: 'flex-end', height: 36 },
          }, sending ? '...' : 'Send')
        )
      )
    )
  );
}

/* ─────────────────────────────────────────
   URL ROUTING
───────────────────────────────────────── */
const PATH_TO_SCREEN = {
  '/workorders': 'work-orders',
  '/service':    'work-orders',
  '/sales':      'sales',
  '/customers':  'customers',
  '/inventory':  'inventory',
  '/floor':      'floor',
  '/reports':    'reports',
  '/settings':   'settings',
  '/messages':   'messages',
  '/vendors':    'vendor-catalog',
  '/queue':      'my-queue',
  '/orders':     'purchase-orders',
};

const SCREEN_TO_PATH = {
  'work-orders':     '/workorders',
  'sales':           '/sales',
  'customers':       '/customers',
  'inventory':       '/inventory',
  'floor':           '/floor',
  'reports':         '/reports',
  'settings':        '/settings',
  'messages':        '/messages',
  'vendor-catalog':  '/vendors',
  'my-queue':        '/queue',
  'purchase-orders': '/orders',
  'dashboard':       '/',
};

function screenFromPath() {
  return PATH_TO_SCREEN[window.location.pathname] || null;
}

/* ─────────────────────────────────────────
   APP ROOT
───────────────────────────────────────── */
function App() {
  const [staff, setStaff] = useState(function() {
    try { return JSON.parse(sessionStorage.getItem('pos-staff') || 'null'); } catch { return null; }
  });
  const [screen, setScreenRaw] = useState(function() {
    return screenFromPath() || 'dashboard';
  });
  const [activeWo, setActiveWo]       = useState(null);
  const [pendingCustomer, setPendingCustomer] = useState(null);
  const [pendingMsgPhone, setPendingMsgPhone]   = useState(null);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [saleCount, setSaleCount]     = useState(0);
  const topbarSearchRef = useRef(null);

  // URL-aware setScreen: updates history + state together.
  // Sub-screens (new-wo, wo-detail, wo-calendar) share /workorders URL.
  function setScreen(id) {
    var canonicalId = (id === 'new-wo' || id === 'wo-detail' || id === 'wo-calendar') ? 'work-orders' : id;
    var path = SCREEN_TO_PATH[canonicalId] || '/';
    try { window.history.pushState(null, '', path); } catch (_) {}
    setScreenRaw(id);
  }

  // Handle browser back/forward.
  useEffect(function() {
    function onPopState() {
      var s = screenFromPath();
      setScreenRaw(s || 'dashboard');
    }
    window.addEventListener('popstate', onPopState);
    return function() { window.removeEventListener('popstate', onPopState); };
  }, []);

  // Bootstrap live data (WOs, customers, catalog) on first mount.
  // Runs once; async — components see data fill in as fetches complete.
  useEffect(function() { bootstrapLiveData(); const _rcPoll = startSmsUnreadPoller(); return function() { clearInterval(_rcPoll); }; }, []);

  // G→D sequence state
  const gSeqRef = useRef(null);

  // Keyboard shortcuts
  useEffect(function() {
    function onKey(e) {
      if (!staff) return;
      const tag = document.activeElement && document.activeElement.tagName;
      const inInput = ['INPUT','TEXTAREA','SELECT'].includes(tag);

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (topbarSearchRef.current) topbarSearchRef.current.focus();
        setShowGlobalSearch(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setScreen('new-wo');
        return;
      }
      if (e.key === 'n' && screen === 'dashboard' && !inInput) {
        setScreen('sales');
        return;
      }
      // G→D sequence: press G then D within 1500ms
      if (e.key === 'g' && !inInput && !e.metaKey && !e.ctrlKey) {
        if (gSeqRef.current) clearTimeout(gSeqRef.current);
        gSeqRef.current = setTimeout(function() { gSeqRef.current = null; }, 1500);
        return;
      }
      if (e.key === 'd' && !inInput && !e.metaKey && !e.ctrlKey && gSeqRef.current) {
        clearTimeout(gSeqRef.current);
        gSeqRef.current = null;
        e.preventDefault();
        setScreen('dashboard');
        return;
      }
    }
    document.addEventListener('keydown', onKey);
    return function() { document.removeEventListener('keydown', onKey); };
  }, [staff, screen]);

  function handleGlobalNavigate(result) {
    setScreen(result.screen);
  }

  function handleNewSaleForCustomer(customer) {
    setPendingCustomer(customer);
    setScreen('sales');
  }

  function handleNewWoForCustomer(customer) {
    setPendingCustomer(customer);
    setScreen('new-wo');
  }

  function handleMessageCustomer(customer) {
    setPendingMsgPhone(customer.phone || null);
    setScreen('messages');
  }

  if (!staff) {
    return h(Fragment, null,
      h(LoginScreen, { onLogin: setStaff }),
      h(Toast)
    );
  }

  function renderScreen() {
    switch (screen) {
      case 'dashboard':      return h(DashboardScreen,       { setScreen, staff });
      case 'floor':          return h(window.ShopFloorScreen || PlaceholderScreen, {
                               setScreen,
                               onOpenWo: (wo) => { setActiveWo(wo); setScreen('wo-detail'); },
                             });
      case 'my-queue':       return h(window.MyQueueScreen || PlaceholderScreen, {
                               setScreen, staff,
                               onOpenWo: (wo) => { setActiveWo(wo); setScreen('wo-detail'); },
                             });
      case 'work-orders':    return h(WorkOrdersScreen,      { setScreen, onOpenWo: (wo) => { setActiveWo(wo); setScreen('wo-detail'); } });
      case 'wo-detail':      return h(WorkOrderDetail,       { wo: activeWo || {}, onClose: () => setScreen('work-orders'), fullPage: true, setScreen: setScreen });
      case 'wo-calendar':    return h(WorkOrderCalendarScreen, { setScreen, onOpenWo: (wo) => { setActiveWo(wo); setScreen('wo-detail'); } });
      case 'new-wo':         return h(NewWorkOrderScreen,    { setScreen, pendingCustomer, onClearPending: () => setPendingCustomer(null) });
      case 'sales':          return h(SalesScreen,           { pendingCustomer, onClearPending: () => setPendingCustomer(null), saleCount, onSaleComplete: () => setSaleCount(function(c) { return c + 1; }) });
      case 'customers':      return h(window.CustomersScreen      || CustomersScreen,       { setScreen, onNewSale: handleNewSaleForCustomer, onNewWo: handleNewWoForCustomer, onMessage: handleMessageCustomer, onOpenWo: (wo) => { setActiveWo(wo); setScreen('wo-detail'); } });
      case 'inventory':      return h(window.InventoryScreen      || InventoryScreen,       { staff, setScreen });
      case 'purchase-orders':return h(window.PurchaseOrdersScreen || PurchaseOrdersScreen);
      case 'vendor-catalog': return h(VendorCatalogScreen);
      case 'reports':        return h(window.ReportsScreen        || ReportsScreen);
      case 'settings':       return h(SettingsScreen);
      case 'bookings':       return h(BookingsScreen,        { setScreen });
      case 'messages':       return h(MessagesScreen,       { initialPhone: pendingMsgPhone });
      default:               return h(PlaceholderScreen, { name: screen });
    }
  }

  return h(Fragment, null,
    showGlobalSearch && h(GlobalSearch, { onNavigate: handleGlobalNavigate, onClose: function() { setShowGlobalSearch(false); } }),
    h('div', { className: 'app' },
      h(Sidebar, { screen, setScreen, staff, onLogout: function() { try { sessionStorage.removeItem('pos-staff'); } catch {} setStaff(null); } }),
      h('main', { className: 'main' },
        h(Topbar, { screen, topbarSearchRef, onOpenSearch: function() { setShowGlobalSearch(true); } }),
        h(OfflineBanner),
        h(StripeBanner),
        h('div', { className: 'content' }, renderScreen()),
        h(StatusStrip)
      )
    ),
    h(Toast)
  );
}

/* ── Expose globals for sibling modules (shopfloor, myqueue, presets, etc.) ── */
// MOCK_WO / MOCK_CATALOG / MOCK_CUSTOMERS are the same array refs as lsWorkOrders /
// lsCatalog / lsCustomers — sibling modules that read window.MOCK_* get live data
// once bootstrapLiveData() has run (called in App useEffect on mount).
window.MOCK_WO        = MOCK_WO;
window.MOCK_CATALOG   = MOCK_CATALOG;
window.MOCK_CUSTOMERS = MOCK_CUSTOMERS;
window.lsWorkOrders   = lsWorkOrders;
window.lsCatalog      = lsCatalog;
window.lsCustomers    = lsCustomers;
window.normaliseWo       = normaliseWo;
window.normaliseCustomer = normaliseCustomer;
window.normaliseItem     = normaliseItem;
window.WO_STATUSES    = WO_STATUSES;
window.STAFF          = STAFF;
window.MECHANICS      = MECHANICS;
window.apiGet         = apiGet;
window.apiPost        = apiPost;
window.apiPut         = apiPut;
window.apiDelete      = apiDelete;
window.PageHead       = PageHead;
window.Badge          = Badge;
window.AvInit         = AvInit;
window.Field          = Field;
window.Toggle         = Toggle;
window.Ico            = Ico;
window.isPstExempt    = isPstExempt;
window.PST_EXEMPT_DEPTS = PST_EXEMPT_DEPTS;
window.toast          = toast;
window.withErrorBoundary = withErrorBoundary;
window.SkeletonRow    = SkeletonRow;
window.SkeletonStat   = SkeletonStat;
window.getGreeting    = getGreeting;

/* ── Mount ── */
createRoot(document.getElementById('root')).render(h(App));
