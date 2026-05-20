/* ChainLine POS — Customers Screen
 * Exports: window.CustomersScreen
 * Pure React.createElement — no JSX, no Babel.
 * Worker: https://still-term-f1ec.taocaruso77.workers.dev
 */

'use strict';

(function () {
  const { createElement: h, useState, useEffect, useRef, useCallback, Fragment } = React;
  const WORKER = 'https://still-term-f1ec.taocaruso77.workers.dev';

  /* ── Helpers ── */
  function fmt$(n) {
    return '$' + Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPhone(raw) {
    const d = raw.replace(/\D/g, '').slice(0, 10);
    if (d.length < 4) return d;
    if (d.length < 7) return d.slice(0,3) + '-' + d.slice(3);
    return d.slice(0,3) + '-' + d.slice(3,6) + '-' + d.slice(6);
  }

  function fmtDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function fmtMemberSince(iso) {
    if (!iso) return '-';
    const diff = Date.now() - new Date(iso).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    const months = Math.floor(diff / (30.5 * 24 * 3600 * 1000));
    if (years >= 1) return years === 1 ? '1 year' : years + ' years';
    if (months >= 1) return months + ' months';
    return 'New';
  }

  /* Derive avatar color from name */
  const AV_COLORS = ['#c8392c','#4d8fd6','#2f9e5b','#d29a3a','#8b5cf6','#06b6d4','#f97316','#ec4899'];
  function avatarColor(name) {
    let hv = 0;
    for (let i = 0; i < (name || '').length; i++) hv = (hv * 31 + name.charCodeAt(i)) & 0xffff;
    return AV_COLORS[hv % AV_COLORS.length];
  }
  function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /* localStorage helpers for notes */
  function loadNotes(customerId) {
    try { return JSON.parse(localStorage.getItem('cl-pos-notes-' + customerId) || '[]'); }
    catch { return []; }
  }
  function saveNote(customerId, text) {
    const notes = loadNotes(customerId);
    notes.unshift({ text, ts: new Date().toISOString() });
    try { localStorage.setItem('cl-pos-notes-' + customerId, JSON.stringify(notes)); } catch {}
    return notes;
  }

  /* ── Mock data ── */
  const MOCK_CUSTOMERS_FULL = [
    {
      id: 1, firstName: 'Hannah', lastName: 'Riise', email: 'hannah.riise@email.com',
      phone: '250-555-0142', city: 'Kelowna', province: 'BC', memberSince: '2021-03-14',
      totalSpent: 4812.50, visitCount: 18, tags: ['VIP'], bikesCount: 3,
      title: '', company: '', address: '', address2: '', postalCode: '', country: 'CA',
      email2: '', website: '', custom: '', seatHeight: '', birthDate: '',
      phoneHome: '250-555-0142', phoneWork: '', phoneMobile: '', phonePager: '', phoneFax: '',
      discount: 'Default', salesTax: 'Default', customerType: 'Customer',
    },
    {
      id: 2, firstName: 'Devon', lastName: 'Tran', email: 'devon.tran@email.com',
      phone: '250-555-0188', city: 'Kelowna', province: 'BC', memberSince: '2020-07-22',
      totalSpent: 2390.00, visitCount: 11, tags: [], bikesCount: 2,
      title: '', company: '', address: '', address2: '', postalCode: '', country: 'CA',
      email2: '', website: '', custom: '', seatHeight: '', birthDate: '',
      phoneHome: '250-555-0188', phoneWork: '', phoneMobile: '', phonePager: '', phoneFax: '',
      discount: 'Default', salesTax: 'Default', customerType: 'Customer',
    },
    {
      id: 3, firstName: 'Marc', lastName: 'Lefebvre', email: 'marc.l@email.com',
      phone: '250-555-0119', city: 'West Kelowna', province: 'BC', memberSince: '2019-01-08',
      totalSpent: 1820.00, visitCount: 9, tags: ['Wholesale'], bikesCount: 1,
      title: '', company: 'Okanagan Cycles', address: '', address2: '', postalCode: '', country: 'CA',
      email2: '', website: '', custom: '', seatHeight: '78cm', birthDate: '',
      phoneHome: '', phoneWork: '250-555-0119', phoneMobile: '', phonePager: '', phoneFax: '',
      discount: 'Default', salesTax: 'Default', customerType: 'Customer',
    },
    {
      id: 4, firstName: 'Hannah', lastName: 'Kowalski', email: 'hkowalski@email.com',
      phone: '250-555-0319', city: 'Kelowna', province: 'BC', memberSince: '2024-04-11',
      totalSpent: 340.00, visitCount: 2, tags: [], bikesCount: 1,
      title: '', company: '', address: '', address2: '', postalCode: '', country: 'CA',
      email2: '', website: '', custom: '', seatHeight: '', birthDate: '',
      phoneHome: '250-555-0319', phoneWork: '', phoneMobile: '', phonePager: '', phoneFax: '',
      discount: 'Default', salesTax: 'Default', customerType: 'Customer',
    },
    {
      id: 5, firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@email.com',
      phone: '778-555-0207', city: 'Penticton', province: 'BC', memberSince: '2022-09-30',
      totalSpent: 1655.00, visitCount: 7, tags: ['Staff'], bikesCount: 2,
      title: '', company: '', address: '', address2: '', postalCode: '', country: 'CA',
      email2: '', website: '', custom: '', seatHeight: '72cm', birthDate: '',
      phoneHome: '', phoneWork: '', phoneMobile: '778-555-0207', phonePager: '', phoneFax: '',
      discount: 'Default', salesTax: 'Default', customerType: 'Staff',
    },
    {
      id: 6, firstName: 'Eli', lastName: 'Constantine', email: 'eli.c@email.com',
      phone: '604-555-0152', city: 'Kelowna', province: 'BC', memberSince: '2023-06-15',
      totalSpent: 920.00, visitCount: 5, tags: [], bikesCount: 1,
      title: '', company: '', address: '', address2: '', postalCode: '', country: 'CA',
      email2: '', website: '', custom: '', seatHeight: '', birthDate: '',
      phoneHome: '', phoneWork: '', phoneMobile: '604-555-0152', phonePager: '', phoneFax: '',
      discount: 'Default', salesTax: 'Default', customerType: 'Customer',
    },
  ];

  const MOCK_BIKES = {
    1: [
      { id: 'b1', year: 2023, make: 'Santa Cruz', model: 'Bronson CC X01', color: 'Matte Black', serial: 'SCB-23-09142', lastServiced: '2026-04-10' },
      { id: 'b2', year: 2021, make: 'Norco', model: 'Fluid FS 3', color: 'Teal', serial: 'NRC-21-55003', lastServiced: '2025-10-22' },
      { id: 'b3', year: 2020, make: 'Salsa', model: 'Warbird GRX', color: 'Copper', serial: 'SAL-20-12398', lastServiced: '2025-06-15' },
    ],
    2: [
      { id: 'b4', year: 2023, make: 'Norco', model: 'Sight C2', color: 'Forest Green', serial: 'NRC-23-77210', lastServiced: '2026-05-10' },
      { id: 'b5', year: 2019, make: 'Trek', model: 'Marlin 7', color: 'Navy', serial: 'TRK-19-30041', lastServiced: '2025-08-03' },
    ],
    3: [{ id: 'b6', year: 2022, make: 'Trek', model: 'Fuel EX 8', color: 'Lithium Grey', serial: 'TRK-22-50188', lastServiced: '2026-03-28' }],
    4: [{ id: 'b7', year: 2024, make: 'Marin', model: 'Pine Mountain 1', color: 'Gloss Teal', serial: 'MAR-24-10091', lastServiced: '2026-04-01' }],
    5: [
      { id: 'b8', year: 2023, make: 'Specialized', model: 'Stumpjumper Comp', color: 'Cool Grey', serial: 'SPZ-23-66720', lastServiced: '2026-05-01' },
      { id: 'b9', year: 2021, make: 'Giant', model: 'Trance X 29 2', color: 'Panther Black', serial: 'GNT-21-44100', lastServiced: '2025-12-09' },
    ],
    6: [{ id: 'b10', year: 2024, make: 'Yeti', model: 'SB140 LR', color: 'Cobalt', serial: 'YET-24-00312', lastServiced: '2026-05-15' }],
  };

  const MOCK_HISTORY = {
    1: [
      { id: 'S-9041', date: '2026-05-10', items: 'Suspension service + Fox Float X rebuild', total: 226.81, method: 'Card' },
      { id: 'S-8817', date: '2026-02-14', items: 'Shimano XT Cassette + Chain', total: 251.00, method: 'Card' },
      { id: 'S-8201', date: '2025-10-22', items: 'Full tune-up', total: 185.00, method: 'Cash' },
    ],
    2: [
      { id: 'S-9044', date: '2026-05-12', items: 'Drivetrain replace + Cassette', total: 312.50, method: 'Card' },
      { id: 'S-8800', date: '2026-01-08', items: 'ODI Grips + Tubes x2', total: 54.00, method: 'Cash' },
    ],
    3: [{ id: 'S-8901', date: '2026-03-28', items: 'Full tune + brake bleed', total: 185.00, method: 'Card' }],
    4: [{ id: 'S-9010', date: '2026-04-01', items: 'Basic tune', total: 75.00, method: 'Card' }],
    5: [
      { id: 'S-9022', date: '2026-05-01', items: 'Shock service + bearings', total: 210.00, method: 'Card' },
      { id: 'S-8760', date: '2025-12-09', items: 'Tubeless setup', total: 90.00, method: 'Cash' },
    ],
    6: [{ id: 'S-9033', date: '2026-05-15', items: 'Shock service Float X', total: 145.00, method: 'Card' }],
  };

  const MOCK_WORKORDERS = {
    1: [
      { id: 'WO-2388', bike: 'Santa Cruz Bronson CC X01', svc: 'Suspension service', due: 'May 20', status: 'inprogress', total: 226.81 },
      { id: 'WO-2201', bike: 'Norco Fluid FS 3', svc: 'Full tune', due: 'Oct 22', status: 'ready', total: 185.00 },
    ],
    2: [{ id: 'WO-2391', bike: 'Norco Sight C2 2023', svc: 'Drivetrain replace', due: 'May 20', status: 'ready', total: 312.50 }],
    3: [{ id: 'WO-2382', bike: 'Trek Fuel EX 8', svc: 'Full tune + brake bleed', due: 'May 18', status: 'open', total: 185.00 }],
    4: [],
    5: [{ id: 'WO-2402', bike: 'Specialized Stumpjumper Comp', svc: 'Pre-season tune', due: 'May 22', status: 'booked', total: 0 }],
    6: [{ id: 'WO-2399', bike: 'Yeti SB140 LR', svc: 'Shock service Float X', due: 'May 21', status: 'inprogress', total: 145.00 }],
  };

  /* ── API ── */
  async function apiFetch(path) {
    try {
      const r = await fetch(WORKER + path);
      if (!r.ok) return null;
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
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }
  async function apiPut(path, body) {
    try {
      const r = await fetch(WORKER + path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-POS-Auth': '1139' },
        body: JSON.stringify(body),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  /* ── Icons ── */
  const I = {
    Search:    () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.4',strokeLinecap:'round'},
      h('circle',{cx:'7',cy:'7',r:'4.5'}),h('path',{d:'m10.5 10.5 3 3'})),
    Plus:      () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.4',strokeLinecap:'round'},
      h('path',{d:'M8 3v10M3 8h10'})),
    X:         () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.5',strokeLinecap:'round'},
      h('path',{d:'m4 4 8 8M12 4l-8 8'})),
    Edit:      () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'M11 2.5 13.5 5 5.5 13 2.5 13.5 3 10.5Z'})),
    Bike:      () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('circle',{cx:'3.5',cy:'11',r:'2'}),h('circle',{cx:'12.5',cy:'11',r:'2'}),
      h('path',{d:'M3.5 11 6 6h4l2 2.5M10 6l.5 2.5M8 11l-2-5'})),
    Receipt:   () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('path',{d:'M3 1.5v13l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5V1.5L13 3l-2-1.5-2 1.5-2-1.5-2 1.5L3 1.5Z'}),
      h('path',{d:'M5.5 6h5M5.5 9h3.5'})),
    Wrench:    () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'M10.5 2.5a3 3 0 0 0-3.7 3.7l-4.5 4.5 1.5 1.5 4.5-4.5a3 3 0 0 0 3.7-3.7l-1.7 1.7-1.5-1.5 1.7-1.7Z'})),
    Note:      () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2'},
      h('rect',{x:'2.5',y:'2',width:'11',height:'12'}),h('path',{d:'M5.5 6h5M5.5 9h3'})),
    Msg:       () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinejoin:'round'},
      h('path',{d:'M2 2.5h12v9H9.5L6 14v-2.5H2V2.5Z'})),
    Merge:     () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('path',{d:'M3 3v4l5 3 5-3V3M8 10v3'})),
    ChevRight: () => h('svg',{viewBox:'0 0 16 16',width:12,height:12,fill:'none',stroke:'currentColor',strokeWidth:'1.5',strokeLinecap:'round'},
      h('path',{d:'m6 3 4 5-4 5'})),
    ChevLeft:  () => h('svg',{viewBox:'0 0 16 16',width:12,height:12,fill:'none',stroke:'currentColor',strokeWidth:'1.5',strokeLinecap:'round'},
      h('path',{d:'m10 3-4 5 4 5'})),
    Check:     () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.6',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'m3 8 3.5 3.5L13 5'})),
    User:      () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('circle',{cx:'8',cy:'5.5',r:'2.5'}),h('path',{d:'M2.5 14c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5'})),
    List:      () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('path',{d:'M3 4h10M3 8h10M3 12h7'})),
    Cart:      () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('path',{d:'M1.5 1.5h2l2 8h7l1.5-5H5'}),h('circle',{cx:'6.5',cy:'13',r:'1'}),h('circle',{cx:'12',cy:'13',r:'1'})),
    Dollar:    () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('path',{d:'M8 1v14M5 11.5c0 1 1.3 2 3 2s3-1 3-2-1.3-2-3-2-3-1-3-2 1.3-2 3-2 3 1 3 2'})),
    Archive:   () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('rect',{x:'1.5',y:'2',width:'13',height:'3.5'}),h('path',{d:'M2.5 5.5v8h11v-8M6.5 8.5h3'})),
    Save:      () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'M2.5 2.5h9l2 2v9h-11v-11Z'}),h('path',{d:'M5.5 2.5v3.5h5V2.5M4.5 9.5h7'})),
    CreditCard:() => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('rect',{x:'1.5',y:'3.5',width:'13',height:'9'}),h('path',{d:'M1.5 7h13'})),
  };

  /* ── Atoms ── */
  function Badge({ kind, children }) {
    return h('span', { className: 'badge ' + kind },
      h('span', { className: 'dot' }), children);
  }

  const STATUS_LABELS = { open: 'Open', inprogress: 'In Progress', ready: 'Ready', booked: 'Booked', closed: 'Closed' };
  const STATUS_KINDS  = { open: 'open', inprogress: 'inprogress', ready: 'ready', booked: 'booked', closed: 'inprogress' };

  function WoBadge({ status }) {
    return h(Badge, { kind: STATUS_KINDS[status] || 'open' }, STATUS_LABELS[status] || status);
  }

  const TAG_COLORS = {
    VIP:       { bg: 'rgba(200,57,44,0.14)',  color: '#e87066', border: 'rgba(200,57,44,0.3)' },
    Staff:     { bg: 'rgba(77,143,214,0.14)', color: '#6ba9e0', border: 'rgba(77,143,214,0.3)' },
    Wholesale: { bg: 'rgba(47,158,91,0.14)',  color: '#4db87a', border: 'rgba(47,158,91,0.3)' },
    Retail:    { bg: 'rgba(122,122,122,0.12)', color: '#9a9a9a', border: 'rgba(122,122,122,0.25)' },
  };

  function Tag({ label }) {
    const s = TAG_COLORS[label] || TAG_COLORS.Retail;
    return h('span', {
      style: {
        display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px',
        fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
        background: s.bg, color: s.color, border: '1px solid ' + s.border,
      }
    }, label);
  }

  function Avatar({ name, size = 44 }) {
    const color = avatarColor(name);
    return h('div', {
      style: {
        width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: color + '22', border: '1px solid ' + color + '55',
        color: color, fontFamily: 'var(--font-mono)', fontWeight: 600,
        fontSize: size * 0.35, flexShrink: 0, letterSpacing: '0.05em',
      }
    }, initials(name));
  }

  /* ── Section header used in details form ── */
  function SectionHeader({ children }) {
    return h('div', {
      style: {
        fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
        letterSpacing: '0.12em', color: 'var(--text-3)', paddingBottom: 6,
        borderBottom: '1px solid var(--line)', marginBottom: 10, marginTop: 18,
      }
    }, children);
  }

  /* ── Form field helper ── */
  function FormField({ label, children }) {
    return h('div', {
      style: { display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center', gap: 8, marginBottom: 6 }
    },
      h('label', {
        style: { fontSize: 12, color: 'var(--text-3)', textAlign: 'right', paddingRight: 4 }
      }, label),
      children
    );
  }

  /* ── Inline field row for read-only display ── */
  function DetailRow({ label, value, mono }) {
    return h('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
               padding: '6px 0', borderBottom: '1px solid var(--line)' }
    },
      h('span', { style: { fontSize: 12, color: 'var(--text-3)', minWidth: 100 } }, label),
      h('span', {
        style: { fontSize: 13, color: 'var(--text-1)', fontFamily: mono ? 'var(--font-mono)' : undefined }
      }, value || '-')
    );
  }

  /* ═══════════════════════════════════════════
     SMS MODAL
  ═══════════════════════════════════════════ */
  const SMS_TEMPLATES = [
    'Your bike is ready for pickup at ChainLine Cycle! Drop by at 1139 Ellis St, Kelowna.',
    'Your work order estimate is ready. Please call or reply to approve.',
    'Custom message',
  ];

  function SmsModal({ customer, onClose }) {
    const [sel, setSel] = useState(0);
    const [body, setBody] = useState(SMS_TEMPLATES[0]);
    const phone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
    const telLink = phone ? 'sms:' + (phone.length === 10 ? '+1' + phone : phone) + '?body=' + encodeURIComponent(body) : '#';

    function pickTemplate(i) {
      setSel(i);
      if (i < SMS_TEMPLATES.length - 1) setBody(SMS_TEMPLATES[i]);
      else setBody('');
    }

    return h('div', {
      style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
               display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 },
      onClick: e => { if (e.target === e.currentTarget) onClose(); },
    },
      h('div', { style: { background: 'var(--bg-1)', border: '1px solid var(--line-2)', width: 480, display: 'flex', flexDirection: 'column' } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--line)' } },
          h('span', { style: { fontSize: 14, fontWeight: 600 } }, 'SMS - ' + customer.firstName + ' ' + customer.lastName),
          h('button', { className: 'btn ghost', style: { padding: '0 6px', height: 24 }, onClick: onClose }, h(I.X))
        ),
        h('div', { style: { padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 } },
          h('div', null,
            h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } }, 'To'),
            h('input', { className: 'input mono', value: customer.phone || 'No phone on file', readOnly: true })
          ),
          h('div', null,
            h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } }, 'Template'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              SMS_TEMPLATES.map((t, i) =>
                h('button', {
                  key: i, onClick: () => pickTemplate(i),
                  style: {
                    textAlign: 'left', padding: '8px 12px', fontSize: 12,
                    background: sel === i ? 'var(--bg-3)' : 'var(--bg-2)',
                    border: '1px solid ' + (sel === i ? 'var(--line-3)' : 'var(--line)'),
                    color: sel === i ? 'var(--text)' : 'var(--text-2)',
                  }
                }, t)
              )
            )
          ),
          h('div', null,
            h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } }, 'Message'),
            h('textarea', {
              className: 'input', rows: 4,
              style: { resize: 'vertical', fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: '1.5' },
              value: body, onChange: e => setBody(e.target.value), placeholder: 'Type a message...',
            })
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
            h('button', { className: 'btn', onClick: onClose }, 'Cancel'),
            phone
              ? h('a', {
                  href: telLink,
                  style: {
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    height: 34, padding: '0 14px', background: 'var(--accent)',
                    color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    border: '1px solid var(--accent-dim)',
                  }
                }, h(I.Msg), ' Send SMS')
              : h('button', { className: 'btn', disabled: true, style: { opacity: 0.4 } }, 'No phone on file')
          )
        )
      )
    );
  }

  /* ═══════════════════════════════════════════
     MERGE MODAL
  ═══════════════════════════════════════════ */
  function MergeModal({ customer, allCustomers, onMerge, onClose }) {
    const [q, setQ] = useState('');
    const [target, setTarget] = useState(null);
    const [confirmed, setConfirmed] = useState(false);

    const filtered = allCustomers.filter(c =>
      c.id !== customer.id &&
      (c.firstName + ' ' + c.lastName + ' ' + c.phone + ' ' + c.email)
        .toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8);

    return h('div', {
      style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
               display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 },
      onClick: e => { if (e.target === e.currentTarget) onClose(); },
    },
      h('div', { style: { background: 'var(--bg-1)', border: '1px solid var(--line-2)', width: 480 } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--line)' } },
          h('span', { style: { fontSize: 14, fontWeight: 600 } }, 'Merge Customer'),
          h('button', { className: 'btn ghost', style: { padding: '0 6px', height: 24 }, onClick: onClose }, h(I.X))
        ),
        h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 12 } },
          h('p', { style: { fontSize: 13, color: 'var(--text-2)', margin: 0 } },
            'Merging will combine all bikes, WOs and purchase history into one record. This cannot be undone.'),
          h('div', { style: { background: 'var(--bg-3)', padding: '10px 12px', fontSize: 13 } },
            h('span', { style: { color: 'var(--text-3)' } }, 'Source: '),
            h('span', { style: { color: 'var(--text)', fontWeight: 600 } },
              customer.firstName + ' ' + customer.lastName + ' - ' + customer.phone)
          ),
          h('input', {
            className: 'input', placeholder: 'Search customer to merge into...',
            value: q, onChange: e => { setQ(e.target.value); setTarget(null); setConfirmed(false); }
          }),
          filtered.length > 0 && h('div', { style: { border: '1px solid var(--line)', maxHeight: 200, overflowY: 'auto' } },
            filtered.map(c =>
              h('div', {
                key: c.id, onClick: () => setTarget(c),
                style: {
                  padding: '9px 12px', cursor: 'pointer', fontSize: 13,
                  background: target?.id === c.id ? 'var(--bg-3)' : 'transparent',
                  borderBottom: '1px solid var(--line)',
                  color: target?.id === c.id ? 'var(--text)' : 'var(--text-1)',
                }
              },
                h('span', { style: { fontWeight: 600 } }, c.firstName + ' ' + c.lastName),
                h('span', { style: { color: 'var(--text-3)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 11 } }, c.phone)
              )
            )
          ),
          target && h('div', null,
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-1)', cursor: 'pointer' } },
              h('input', { type: 'checkbox', checked: confirmed, onChange: e => setConfirmed(e.target.checked) }),
              'I understand this merge cannot be undone'
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 } },
            h('button', { className: 'btn', onClick: onClose }, 'Cancel'),
            h('button', {
              className: 'btn',
              disabled: !target || !confirmed,
              style: {
                background: target && confirmed ? 'var(--accent)' : undefined,
                color: target && confirmed ? '#fff' : undefined,
                opacity: !target || !confirmed ? 0.4 : 1,
                borderColor: target && confirmed ? 'var(--accent-dim)' : undefined,
              },
              onClick: () => { onMerge(customer, target); onClose(); }
            }, 'Merge Records')
          )
        )
      )
    );
  }

  /* ═══════════════════════════════════════════
     NEW CUSTOMER FORM
  ═══════════════════════════════════════════ */
  function NewCustomerForm({ onSave, onCancel }) {
    const [form, setForm] = useState({
      firstName: '', lastName: '', phone: '', email: '',
      city: '', province: 'BC', type: 'Retail',
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); }

    function validate() {
      const e = {};
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim()) e.lastName = 'Required';
      if (!form.phone.trim()) e.phone = 'Required';
      return e;
    }

    async function handleSave() {
      const e = validate();
      if (Object.keys(e).length) { setErrors(e); return; }
      setSaving(true);
      const payload = {
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        phone: form.phone.trim(), email: form.email.trim(),
        address: { city: form.city.trim(), province: form.province },
        tags: form.type !== 'Retail' ? [form.type] : [],
      };
      const result = await apiPost('/api/customers', payload);
      setSaving(false);
      if (result?.customer) {
        window._posToast && window._posToast('Customer created', 'success');
      } else {
        window._posToast && window._posToast('Saved locally - will sync when connected', '');
      }
      const newCustomer = result?.customer || {
        id: Date.now(), ...payload,
        phone: payload.phone, email: payload.email,
        memberSince: new Date().toISOString().slice(0, 10),
        totalSpent: 0, visitCount: 0, bikesCount: 0, tags: payload.tags,
      };
      onSave(newCustomer);
    }

    const provinces = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
    const customerTypes = ['Retail','Wholesale','Staff','VIP'];
    const lbl = { display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' };

    return h('div', {
      style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900 },
      onClick: e => { if (e.target === e.currentTarget) onCancel(); },
    },
      h('div', { style: { background: 'var(--bg-1)', border: '1px solid var(--line-2)', width: 480, display: 'flex', flexDirection: 'column' } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--line)' } },
          h('span', { style: { fontSize: 14, fontWeight: 600 } }, 'New Customer'),
          h('button', { className: 'btn ghost', style: { padding: '0 6px', height: 24 }, onClick: onCancel }, h(I.X))
        ),
        h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 14 } },
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
            h('div', null,
              h('label', { style: lbl }, 'First Name ', h('span', { style: { color: 'var(--accent)' } }, '*')),
              h('input', {
                className: 'input' + (errors.firstName ? ' input-err' : ''),
                value: form.firstName, placeholder: 'First',
                onChange: e => set('firstName', e.target.value),
              }),
              errors.firstName && h('div', { style: { fontSize: 11, color: 'var(--accent)', marginTop: 3 } }, errors.firstName)
            ),
            h('div', null,
              h('label', { style: lbl }, 'Last Name ', h('span', { style: { color: 'var(--accent)' } }, '*')),
              h('input', {
                className: 'input' + (errors.lastName ? ' input-err' : ''),
                value: form.lastName, placeholder: 'Last',
                onChange: e => set('lastName', e.target.value),
              }),
              errors.lastName && h('div', { style: { fontSize: 11, color: 'var(--accent)', marginTop: 3 } }, errors.lastName)
            )
          ),
          h('div', null,
            h('label', { style: lbl }, 'Phone ', h('span', { style: { color: 'var(--accent)' } }, '*')),
            h('input', {
              className: 'input mono' + (errors.phone ? ' input-err' : ''),
              value: form.phone, placeholder: '250-555-0000',
              onChange: e => set('phone', fmtPhone(e.target.value)),
            }),
            errors.phone && h('div', { style: { fontSize: 11, color: 'var(--accent)', marginTop: 3 } }, errors.phone)
          ),
          h('div', null,
            h('label', { style: lbl }, 'Email'),
            h('input', { className: 'input', type: 'email', value: form.email, placeholder: 'email@example.com', onChange: e => set('email', e.target.value) })
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 } },
            h('div', null,
              h('label', { style: lbl }, 'City'),
              h('input', { className: 'input', value: form.city, placeholder: 'Kelowna', onChange: e => set('city', e.target.value) })
            ),
            h('div', null,
              h('label', { style: lbl }, 'Prov'),
              h('select', { className: 'input', style: { width: 80 }, value: form.province, onChange: e => set('province', e.target.value) },
                provinces.map(p => h('option', { key: p, value: p }, p))
              )
            )
          ),
          h('div', null,
            h('label', { style: { ...lbl, marginBottom: 6 } }, 'Customer Type'),
            h('div', { style: { display: 'flex', gap: 6 } },
              customerTypes.map(t =>
                h('button', {
                  key: t, onClick: () => set('type', t),
                  style: {
                    padding: '5px 12px', fontSize: 12, fontWeight: 500,
                    background: form.type === t ? 'var(--bg-3)' : 'var(--bg-2)',
                    border: '1px solid ' + (form.type === t ? 'var(--line-3)' : 'var(--line)'),
                    color: form.type === t ? 'var(--text)' : 'var(--text-2)',
                  }
                }, t)
              )
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 } },
            h('button', { className: 'btn', onClick: onCancel }, 'Cancel'),
            h('button', {
              className: 'btn primary', onClick: handleSave,
              disabled: saving, style: { opacity: saving ? 0.6 : 1 }
            }, saving ? 'Saving...' : 'Create Customer')
          )
        )
      )
    );
  }

  /* ═══════════════════════════════════════════
     CUSTOMER DETAIL VIEW — full-page LS layout
  ═══════════════════════════════════════════ */
  function CustomerDetailView({ customer: initialCustomer, allCustomers, customerIndex, totalCustomers, onClose, onUpdate, onNewSale, onNewWo, onPrev, onNext }) {
    const [customer, setCustomer] = useState(initialCustomer);
    const [leftNav, setLeftNav] = useState('details');
    const [form, setForm] = useState(null);  /* null = not editing; object = editing */
    const [saving, setSaving] = useState(false);
    const [showSms, setShowSms] = useState(false);
    const [showMerge, setShowMerge] = useState(false);
    const [bikes, setBikes] = useState(MOCK_BIKES[initialCustomer.id] || []);
    const [notes, setNotes] = useState(() => loadNotes(initialCustomer.id));
    const [noteInput, setNoteInput] = useState('');
    const [history, setHistory] = useState(MOCK_HISTORY[initialCustomer.id] || []);
    const [workOrders, setWorkOrders] = useState(MOCK_WORKORDERS[initialCustomer.id] || []);
    const [consent, setConsent] = useState(false);
    const [contactEmail, setContactEmail] = useState(false);
    const [contactMail, setContactMail] = useState(false);
    const [contactCall, setContactCall] = useState(false);

    /* Load full LS customer data when id is numeric */
    useEffect(() => {
      const id = initialCustomer.id;
      if (!id || !/^\d+$/.test(String(id))) return;
      apiFetch('/api/customer/' + id).then(result => {
        if (!result) return;
        const c = result.customer || result;
        if (c) {
          /* Map phone numbers by type */
          const phones = [].concat(c.Phones?.Phone || []);
          const getPhone = typeId => (phones.find(p => p.phoneNumberTypeID == typeId) || {}).number || '';
          const enriched = {
            ...initialCustomer,
            phone: getPhone(1) || getPhone(3) || phones[0]?.number || initialCustomer.phone || '',
            phoneHome:   getPhone(1),
            phoneWork:   getPhone(2),
            phoneMobile: getPhone(3),
            phonePager:  getPhone(4),
            phoneFax:    getPhone(5),
            email:    [].concat(c.Emails?.ContactEmail || [])[0]?.address || initialCustomer.email || '',
            email2:   [].concat(c.Emails?.ContactEmail || [])[1]?.address || '',
            memberSince: c.Customer?.createTime?.slice(0, 10) || initialCustomer.memberSince || '',
            totalSpent:  parseFloat(c.Customer?.totalSales || 0),
            visitCount:  parseInt(c.Customer?.noSaleCount || 0, 10),
            city:        c.Addresses?.ContactAddress?.city || initialCustomer.city || '',
            province:    c.Addresses?.ContactAddress?.state || initialCustomer.province || '',
            address:     c.Addresses?.ContactAddress?.address1 || '',
            address2:    c.Addresses?.ContactAddress?.address2 || '',
            postalCode:  c.Addresses?.ContactAddress?.zip || '',
            country:     c.Addresses?.ContactAddress?.country || 'CA',
            website:     c.Customer?.website || '',
            customerType: c.Customer?.customerTypeID === 2 ? 'Staff' : c.Customer?.customerTypeID === 3 ? 'Vendor' : 'Customer',
          };
          setCustomer(enriched);
          setForm(enriched);
        }
        if (result.sales && Array.isArray(result.sales)) {
          setHistory(result.sales.map(s => ({
            id: 'S-' + s.saleID,
            date: s.createTime?.slice(0, 10) || '',
            items: (s.SaleLines?.SaleLine || []).map(l => l.unitQuantity + 'x ' + (l.itemDescription || l.itemID)).join(', ') || 'Sale #' + s.saleID,
            total: parseFloat(s.total || 0),
            method: s.SalePayments?.SalePayment?.[0]?.PaymentType?.name || 'Card',
          })));
        }
      }).catch(() => {});

      /* Fetch workorders for this customer */
      const cname = initialCustomer.firstName + ' ' + initialCustomer.lastName;
      apiFetch('/api/workorders?q=' + encodeURIComponent(cname)).then(result => {
        if (result && result.workorders) {
          const mapped = result.workorders.map(w => ({
            id: 'WO-' + w.workorderID,
            bike: w.Serialized?.systemSku || w.description || 'Unknown bike',
            svc: w.note || w.description || '',
            due: w.timeIn ? fmtDate(w.timeIn) : '-',
            status: w.workorderStatusID === 1 ? 'open' : w.workorderStatusID === 2 ? 'inprogress' : w.workorderStatusID === 3 ? 'ready' : 'closed',
            total: parseFloat(w.total || 0),
          }));
          if (mapped.length > 0) setWorkOrders(mapped);
        }
      }).catch(() => {});
    }, [initialCustomer.id]);

    /* Sync form when customer loads */
    useEffect(() => {
      setForm({ ...customer });
    }, [customer]);

    const name = customer.firstName + ' ' + customer.lastName;

    function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

    async function handleSave() {
      if (!form) return;
      setSaving(true);
      const updated = { ...customer, ...form };
      /* Try to persist to API */
      const id = customer.id;
      if (id && /^\d+$/.test(String(id))) {
        const result = await apiPut('/api/customer/' + id, form);
        if (result) {
          window._posToast && window._posToast('Customer saved', 'success');
        } else {
          window._posToast && window._posToast('Saved locally (offline)', '');
        }
      } else {
        window._posToast && window._posToast('Saved locally', '');
      }
      setCustomer(updated);
      onUpdate && onUpdate(updated);
      setSaving(false);
    }

    function addNote() {
      if (!noteInput.trim()) return;
      const updated = saveNote(customer.id, noteInput.trim());
      setNotes(updated);
      setNoteInput('');
    }

    /* Counts for top tab badges */
    const itemsCount = (window.CustomerItems && window.CustomerItems.get(customer.id) || []).length;
    const salesCount = (customer.salesCount != null ? customer.salesCount : history.length);
    const woCount    = (customer.woCount != null ? customer.woCount : workOrders.length);

    const TOP_TABS = [
      { id: 'details',       label: 'Details',    icon: I.User },
      { id: 'items',         label: 'Items',      icon: I.List,   count: itemsCount },
      { id: 'sales',         label: 'Sales',      icon: I.Cart,   count: salesCount },
      { id: 'workorders',    label: 'Workorders', icon: I.Wrench, count: woCount },
      { id: 'account',       label: 'Account',    icon: I.Dollar },
      { id: 'merge',         label: 'Merge',      icon: I.Merge },
    ];

    const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
    const COUNTRIES = [{ v:'CA', l:'Canada' },{ v:'US', l:'United States' },{ v:'GB', l:'United Kingdom' },{ v:'AU', l:'Australia' }];

    /* Shared input style */
    const inp = { height: 30, fontSize: 13 };

    return h(Fragment, null,
      showSms && h(SmsModal, { customer, onClose: () => setShowSms(false) }),
      showMerge && h(MergeModal, {
        customer, allCustomers,
        onMerge: (src, tgt) => {
          window._posToast && window._posToast('Merged ' + src.firstName + ' into ' + tgt.firstName, 'success');
          onClose();
        },
        onClose: () => setShowMerge(false),
      }),

      /* Full-page wrapper */
      h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-0)' } },

        /* ── TOP ACTION BAR ── */
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 20px', borderBottom: '1px solid var(--line)',
            background: 'var(--bg-1)', flexShrink: 0,
          }
        },
          /* Breadcrumb */
          h('div', {
            style: { flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)', minWidth: 0 }
          },
            h('span', { style: { cursor: 'pointer', color: 'var(--text-2)' }, onClick: onClose }, 'Customers'),
            h('span', null, '>'),
            h('span', null, 'Customer:'),
            h('span', { style: { color: 'var(--text)', fontWeight: 600 } }, name)
          ),

          /* Left action buttons */
          h('button', {
            className: 'btn',
            style: { display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', opacity: saving ? 0.6 : 1 },
            onClick: handleSave, disabled: saving,
          }, h(I.Save), saving ? 'Saving...' : 'Save Changes'),

          h('button', {
            className: 'btn primary',
            style: { display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px' },
            onClick: () => { onNewSale && onNewSale(customer); onClose(); },
          }, h(I.Receipt), 'Checkout'),

          h('div', { style: { width: 1, height: 20, background: 'var(--line-2)', margin: '0 4px' } }),

          h('button', {
            className: 'btn',
            style: { display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px',
                     color: '#e87066', borderColor: 'rgba(200,57,44,0.35)', background: 'rgba(200,57,44,0.08)' },
            onClick: () => window._posToast && window._posToast('Customer archived', ''),
          }, h(I.Archive), 'Archive'),

          h('div', { style: { width: 1, height: 20, background: 'var(--line-2)', margin: '0 4px' } }),

          /* Prev / Next navigation */
          h('div', {
            style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }
          },
            h('span', null, (customerIndex + 1) + ' of ' + totalCustomers),
            h('button', {
              className: 'btn ghost', style: { padding: '0 6px', height: 28 },
              onClick: onPrev, disabled: customerIndex <= 0,
            }, h(I.ChevLeft)),
            h('button', {
              className: 'btn ghost', style: { padding: '0 6px', height: 28 },
              onClick: onNext, disabled: customerIndex >= totalCustomers - 1,
            }, h(I.ChevRight))
          ),

          /* Close */
          h('button', {
            className: 'btn ghost', style: { padding: '0 8px', height: 30 },
            onClick: onClose,
          }, h(I.X))
        ),

        /* ── BODY (left sidebar + main content + right sidebar) ── */
        h('div', { style: { display: 'flex', flex: 1, minHeight: 0 } },

          /* LEFT SIDEBAR — avatar + quick actions only (tabs moved up top) */
          h('div', {
            style: {
              width: 160, flexShrink: 0, borderRight: '1px solid var(--line)',
              background: 'var(--bg-1)', display: 'flex', flexDirection: 'column',
              paddingTop: 8,
            }
          },
            /* Customer avatar + name */
            h('div', {
              style: { padding: '12px 16px 14px', borderBottom: '1px solid var(--line)', marginBottom: 6 }
            },
              h(Avatar, { name, size: 40 }),
              h('div', { style: { marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: '1.3' } }, name),
              h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--font-mono)' } },
                customer.customerType || 'Customer')
            ),

            /* Quick-action buttons */
            h('div', { style: { padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 6 } },
              h('button', {
                className: 'btn ghost',
                style: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '0 8px', height: 28, width: '100%', justifyContent: 'flex-start' },
                onClick: () => setShowSms(true),
              }, h(I.Msg), 'SMS'),
              onNewWo && h('button', {
                className: 'btn ghost',
                style: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '0 8px', height: 28, width: '100%', justifyContent: 'flex-start' },
                onClick: () => { onNewWo(customer); onClose(); },
              }, h(I.Wrench), 'New WO'),
              h('button', {
                className: 'btn ghost',
                style: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '0 8px', height: 28, width: '100%', justifyContent: 'flex-start' },
                onClick: () => setShowMerge(true),
              }, h(I.Merge), 'Merge')
            )
          ),

          /* MAIN CONTENT AREA — with top tabs */
          h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } },

            /* ── TOP TABS ── */
            h('div', { className: 'detail-top-tabs' },
              TOP_TABS.map(t =>
                h('button', {
                  key: t.id,
                  className: 'detail-top-tab' + (leftNav === t.id ? ' active' : ''),
                  onClick: () => setLeftNav(t.id),
                },
                  t.label,
                  t.count != null && h('span', { className: 'detail-top-tab-count' }, t.count)
                )
              )
            ),

            /* ── TAB CONTENT (scrollable) ── */
            h('div', { style: { flex: 1, overflowY: 'auto', minWidth: 0 } },

            /* ── DETAILS TAB ── */
            leftNav === 'details' && form && h('div', {
              style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, alignItems: 'start' }
            },
              /* Column 1 */
              h('div', { style: { padding: '20px 24px', borderRight: '1px solid var(--line)' } },
                /* Type / Created / Discount / Tax */
                h(FormField, { label: 'Type' },
                  h('select', { className: 'input', style: inp, value: form.customerType || 'Customer', onChange: e => setF('customerType', e.target.value) },
                    ['Customer','Staff','Vendor'].map(t => h('option', { key: t, value: t }, t))
                  )
                ),
                h(FormField, { label: 'Created' },
                  h('div', { style: { fontSize: 13, color: 'var(--text-2)', paddingLeft: 2 } },
                    fmtDate(customer.memberSince))
                ),
                h(FormField, { label: 'Discount' },
                  h('select', { className: 'input', style: inp, value: form.discount || 'Default', onChange: e => setF('discount', e.target.value) },
                    ['Default','None','5%','10%','15%','20%'].map(d => h('option', { key: d, value: d }, d))
                  )
                ),
                h(FormField, { label: 'Sales Tax' },
                  h('select', { className: 'input', style: inp, value: form.salesTax || 'Default', onChange: e => setF('salesTax', e.target.value) },
                    ['Default','None','Exempt'].map(d => h('option', { key: d, value: d }, d))
                  )
                ),

                h(SectionHeader, null, 'Biographical'),
                h(FormField, { label: 'First Name' },
                  h('input', { className: 'input', style: inp, value: form.firstName || '', onChange: e => setF('firstName', e.target.value) })
                ),
                h(FormField, { label: 'Last Name' },
                  h('input', { className: 'input', style: inp, value: form.lastName || '', onChange: e => setF('lastName', e.target.value) })
                ),
                h(FormField, { label: 'Title' },
                  h('input', { className: 'input', style: inp, value: form.title || '', placeholder: 'Mr / Ms / Dr', onChange: e => setF('title', e.target.value) })
                ),
                h(FormField, { label: 'Company' },
                  h('input', { className: 'input', style: inp, value: form.company || '', onChange: e => setF('company', e.target.value) })
                ),
                h(FormField, { label: 'Birth Date' },
                  h('input', { className: 'input', style: inp, type: 'date', value: form.birthDate || '', onChange: e => setF('birthDate', e.target.value) })
                ),
                h(FormField, { label: 'Seat Height' },
                  h('input', { className: 'input', style: inp, value: form.seatHeight || '', placeholder: '75cm', onChange: e => setF('seatHeight', e.target.value) })
                ),

                h(SectionHeader, null, 'Phones (numeric only)'),
                ['Home','Work','Mobile','Pager','Fax'].map(label =>
                  h(FormField, { key: label, label },
                    h('input', {
                      className: 'input mono', style: inp,
                      value: form['phone' + label] || '',
                      placeholder: '250-555-0000',
                      onChange: e => setF('phone' + label, fmtPhone(e.target.value)),
                    })
                  )
                )
              ),

              /* Column 2 */
              h('div', { style: { padding: '20px 24px' } },
                h(SectionHeader, { }, 'Address'),
                h(FormField, { label: 'Country' },
                  h('select', { className: 'input', style: inp, value: form.country || 'CA', onChange: e => setF('country', e.target.value) },
                    COUNTRIES.map(c => h('option', { key: c.v, value: c.v }, c.l))
                  )
                ),
                h(FormField, { label: 'Address' },
                  h('input', { className: 'input', style: inp, value: form.address || '', onChange: e => setF('address', e.target.value) })
                ),
                h(FormField, { label: 'Address 2' },
                  h('input', { className: 'input', style: inp, value: form.address2 || '', onChange: e => setF('address2', e.target.value) })
                ),
                h(FormField, { label: 'City' },
                  h('input', { className: 'input', style: inp, value: form.city || '', onChange: e => setF('city', e.target.value) })
                ),
                h(FormField, { label: 'Province' },
                  h('select', { className: 'input', style: inp, value: form.province || 'BC', onChange: e => setF('province', e.target.value) },
                    PROVINCES.map(p => h('option', { key: p, value: p }, p))
                  )
                ),
                h(FormField, { label: 'Postal Code' },
                  h('input', { className: 'input mono', style: inp, value: form.postalCode || '', placeholder: 'V1Y 0A1', onChange: e => setF('postalCode', e.target.value) })
                ),

                h(SectionHeader, null, 'Other'),
                h(FormField, { label: 'Website' },
                  h('input', { className: 'input', style: inp, type: 'url', value: form.website || '', placeholder: 'https://', onChange: e => setF('website', e.target.value) })
                ),
                h(FormField, { label: 'Email 1' },
                  h('input', { className: 'input', style: inp, type: 'email', value: form.email || '', onChange: e => setF('email', e.target.value) })
                ),
                h(FormField, { label: 'Email 2' },
                  h('input', { className: 'input', style: inp, type: 'email', value: form.email2 || '', onChange: e => setF('email2', e.target.value) })
                ),
                h(FormField, { label: 'Custom' },
                  h('input', { className: 'input', style: inp, value: form.custom || '', onChange: e => setF('custom', e.target.value) })
                ),

                h(SectionHeader, null, 'Tags'),
                h('div', { style: { marginBottom: 10 } },
                  h('input', {
                    className: 'input', style: { ...inp, width: '100%' },
                    value: form.tags ? form.tags.join(', ') : '',
                    placeholder: 'VIP, Staff, Wholesale...',
                    onChange: e => setF('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean)),
                  })
                ),

                h(SectionHeader, null, 'Saved Payment Methods'),
                h('div', {
                  style: { background: 'var(--bg-2)', border: '1px solid var(--line)', padding: '10px 12px', marginBottom: 8 }
                },
                  h('div', { style: { fontSize: 12, color: 'var(--text-3)', marginBottom: 6 } }, 'No saved cards'),
                  h('button', {
                    className: 'btn',
                    style: { display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', fontSize: 12 },
                    onClick: () => window._posToast && window._posToast('Add card - coming soon', ''),
                  }, h(I.Plus), '+ Add')
                )
              )
            ),

            /* ── WORKORDERS TAB ── */
            leftNav === 'workorders' && h('div', { style: { padding: '20px 24px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
                h('div', { style: { fontSize: 14, fontWeight: 600 } }, 'Work Orders'),
                onNewWo && h('button', {
                  className: 'btn primary',
                  style: { display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', fontSize: 12 },
                  onClick: () => { onNewWo(customer); onClose(); },
                }, h(I.Plus), 'New WO')
              ),
              workOrders.length === 0
                ? h('div', { style: { padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 } }, 'No work orders for this customer')
                : h('div', { style: { border: '1px solid var(--line)', overflowX: 'auto' } },
                    h('table', { className: 'tbl' },
                      h('thead', null,
                        h('tr', null,
                          h('th', null, 'WO #'),
                          h('th', null, 'Status'),
                          h('th', null, 'Service'),
                          h('th', null, 'Bike'),
                          h('th', null, 'Due'),
                          h('th', { style: { textAlign: 'right' } }, 'Total'),
                        )
                      ),
                      h('tbody', null,
                        workOrders.map(wo =>
                          h('tr', { key: wo.id },
                            h('td', { className: 'num', style: { fontWeight: 600, fontSize: 12 } }, wo.id),
                            h('td', null, h(WoBadge, { status: wo.status })),
                            h('td', { style: { fontSize: 13 } }, wo.svc),
                            h('td', { style: { fontSize: 12, color: 'var(--text-2)' } }, wo.bike),
                            h('td', { style: { fontSize: 12, color: 'var(--text-2)' } }, wo.due),
                            h('td', { className: 'num', style: { textAlign: 'right', fontWeight: 600 } },
                              wo.total > 0 ? fmt$(wo.total) : '-')
                          )
                        )
                      )
                    )
                  )
            ),

            /* ── SALES TAB ── */
            leftNav === 'sales' && h('div', { style: { padding: '20px 24px' } },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
                h('div', { style: { fontSize: 14, fontWeight: 600 } }, 'Sales History'),
                h('div', {
                  style: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }
                }, 'Lifetime: ', h('span', { style: { color: 'var(--text)', fontWeight: 700 } }, fmt$(customer.totalSpent || 0)))
              ),
              history.length === 0
                ? h('div', { style: { padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 } }, 'No sales history')
                : h('div', { style: { border: '1px solid var(--line)', overflowX: 'auto' } },
                    h('table', { className: 'tbl' },
                      h('thead', null,
                        h('tr', null,
                          h('th', null, 'Sale #'),
                          h('th', null, 'Date'),
                          h('th', null, 'Items'),
                          h('th', null, 'Method'),
                          h('th', { style: { textAlign: 'right' } }, 'Total'),
                          h('th', null, '')
                        )
                      ),
                      h('tbody', null,
                        history.map(sale =>
                          h('tr', { key: sale.id },
                            h('td', { className: 'num', style: { fontWeight: 600, fontSize: 12 } }, sale.id),
                            h('td', { style: { fontSize: 12, color: 'var(--text-2)' } }, fmtDate(sale.date)),
                            h('td', { style: { fontSize: 12, maxWidth: 280 } }, sale.items),
                            h('td', { style: { fontSize: 11, fontFamily: 'var(--font-mono)' } }, sale.method),
                            h('td', { className: 'num', style: { textAlign: 'right', fontWeight: 600 } }, fmt$(sale.total)),
                            h('td', null,
                              h('button', {
                                className: 'btn ghost',
                                style: { height: 24, padding: '0 8px', fontSize: 11 },
                                onClick: () => window._posToast && window._posToast('Reprinting ' + sale.id, 'success'),
                              }, 'Reprint')
                            )
                          )
                        )
                      )
                    )
                  )
            ),

            /* ── ITEMS TAB — serialized items on file (CustomerItemsTab) ── */
            leftNav === 'items' && h('div', { style: { padding: '20px 24px' } },
              window.CustomerItemsTab
                ? h(window.CustomerItemsTab, { customerId: customer.id })
                : h('div', { style: { padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 } },
                    'Items module not loaded')
            ),

            /* ── ACCOUNT TAB ── */
            leftNav === 'account' && h('div', { style: { padding: '20px 24px' } },
              h('div', { style: { fontSize: 14, fontWeight: 600, marginBottom: 14 } }, 'Account Summary'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 } },
                [
                  { label: 'Lifetime Spend', value: fmt$(customer.totalSpent || 0), mono: true },
                  { label: 'Visits', value: String(customer.visitCount || 0), mono: true },
                  { label: 'Member Since', value: fmtDate(customer.memberSince), mono: false },
                ].map(stat =>
                  h('div', {
                    key: stat.label,
                    style: { background: 'var(--bg-2)', border: '1px solid var(--line)', padding: '14px 16px', textAlign: 'center' }
                  },
                    h('div', { style: { fontSize: 18, fontWeight: 700, fontFamily: stat.mono ? 'var(--font-mono)' : undefined, color: 'var(--text)' } }, stat.value),
                    h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' } }, stat.label)
                  )
                )
              ),
              /* Notes section */
              h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 8 } }, 'Notes'),
              h('div', { style: { display: 'flex', gap: 8, marginBottom: 12 } },
                h('textarea', {
                  className: 'input',
                  rows: 3,
                  style: { flex: 1, resize: 'vertical', fontSize: 13, lineHeight: '1.5' },
                  placeholder: 'Add a note...',
                  value: noteInput,
                  onChange: e => setNoteInput(e.target.value),
                  onKeyDown: e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); },
                }),
                h('button', {
                  className: 'btn primary',
                  disabled: !noteInput.trim(),
                  style: { alignSelf: 'flex-end', opacity: noteInput.trim() ? 1 : 0.4 },
                  onClick: addNote,
                }, 'Save')
              ),
              notes.length === 0
                ? h('div', { style: { padding: '16px 0', color: 'var(--text-3)', fontSize: 13 } }, 'No notes yet')
                : notes.map((n, i) =>
                    h('div', {
                      key: i,
                      style: { padding: '10px 12px', marginBottom: 6, background: 'var(--bg-2)', border: '1px solid var(--line)' }
                    },
                      h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontFamily: 'var(--font-mono)' } },
                        new Date(n.ts).toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      ),
                      h('div', { style: { fontSize: 13, color: 'var(--text-1)', lineHeight: '1.5', whiteSpace: 'pre-wrap' } }, n.text)
                    )
                  )
            ),

            /* ── MERGE TAB ── */
            leftNav === 'merge' && h('div', { style: { padding: '20px 24px' } },
              h('div', { style: { fontSize: 14, fontWeight: 600, marginBottom: 8 } }, 'Merge Customer Records'),
              h('p', { style: { fontSize: 13, color: 'var(--text-2)', marginBottom: 16 } },
                'Combine this customer with another record. All bikes, work orders and purchase history will be merged. This action cannot be undone.'),
              h('button', {
                className: 'btn',
                style: { display: 'flex', alignItems: 'center', gap: 5, height: 32 },
                onClick: () => setShowMerge(true),
              }, h(I.Merge), 'Select Customer to Merge Into')
            )
            ) /* end scrollable tab content */
          ),

          /* RIGHT SIDEBAR — Contact Preferences */
          h('div', {
            style: {
              width: 180, flexShrink: 0, borderLeft: '1px solid var(--line)',
              background: 'var(--bg-1)', padding: '16px 14px',
            }
          },
            h('div', {
              style: { fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-3)', marginBottom: 12 }
            }, 'Contact'),
            h('label', {
              style: { display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', lineHeight: '1.4', marginBottom: 14 }
            },
              h('input', { type: 'checkbox', checked: consent, onChange: e => setConsent(e.target.checked), style: { marginTop: 2 } }),
              'Yes, I have consent from my customer.'
            ),
            h('div', {
              style: { fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 8 }
            }, 'Contact Via'),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', marginBottom: 6 } },
              h('input', { type: 'checkbox', checked: contactEmail, onChange: e => setContactEmail(e.target.checked) }),
              'Email'
            ),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', marginBottom: 6 } },
              h('input', { type: 'checkbox', checked: contactMail, onChange: e => setContactMail(e.target.checked) }),
              'Mail'
            ),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', marginBottom: 6 } },
              h('input', { type: 'checkbox', checked: contactCall, onChange: e => setContactCall(e.target.checked) }),
              'Call'
            ),

            /* Quick stats */
            h('div', {
              style: { marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--line)' }
            },
              h('div', { style: { fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 10 } }, 'Quick Stats'),
              h('div', { style: { fontSize: 12, color: 'var(--text-3)', marginBottom: 3 } }, 'Lifetime'),
              h('div', { style: { fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)', marginBottom: 10 } }, fmt$(customer.totalSpent || 0)),
              h('div', { style: { fontSize: 12, color: 'var(--text-3)', marginBottom: 3 } }, 'Visits'),
              h('div', { style: { fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)', marginBottom: 10 } }, String(customer.visitCount || 0)),
              h('div', { style: { fontSize: 12, color: 'var(--text-3)', marginBottom: 3 } }, 'Member'),
              h('div', { style: { fontSize: 13, fontWeight: 600, color: 'var(--text)' } }, fmtMemberSince(customer.memberSince))
            )
          )
        )
      )
    );
  }

  /* ═══════════════════════════════════════════
     CUSTOMERS SCREEN (main list + detail routing)
  ═══════════════════════════════════════════ */
  function CustomersScreen({ setScreen, onNewSale, onNewWo }) {
    const [q, setQ] = useState('');
    const [customers, setCustomers] = useState(MOCK_CUSTOMERS_FULL);
    const [selectedIndex, setSelectedIndex] = useState(null);  /* index into customers array */
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    /* Expose toast hook */
    useEffect(() => {
      window._posToast = (msg, type) => {
        if (window._toastSetter) window._toastSetter(p => [...p, { message: msg, type: type || '' }]);
      };
    }, []);

    /* Debounced search */
    useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const trimmed = q.trim();
        if (trimmed.length < 2) { setCustomers(MOCK_CUSTOMERS_FULL); return; }
        setLoading(true);
        const result = await apiFetch('/api/customers?q=' + encodeURIComponent(trimmed));
        setLoading(false);
        const mapped = (result && result.customers && result.customers.length > 0)
          ? result.customers.map(c => ({
              id: c.customerID,
              firstName: c.firstName || '',
              lastName: c.lastName || '',
              phone: c.Phones?.Phone?.[0]?.number || c.Phones?.Phone?.number || '',
              email: c.Emails?.ContactEmail?.[0]?.address || '',
              memberSince: c.Customer?.createTime?.slice(0, 10) || '2024-01-01',
              bikesCount: 0, totalSpent: 0, visitCount: 0,
              tags: c.Customer?.noSale ? ['No Sale'] : [],
              customerType: 'Customer',
              phoneHome: '', phoneWork: '', phoneMobile: '', phonePager: '', phoneFax: '',
              discount: 'Default', salesTax: 'Default',
              address: '', address2: '', city: '', province: 'BC', postalCode: '', country: 'CA',
              email2: '', website: '', custom: '', seatHeight: '', birthDate: '', title: '', company: '',
            }))
          : null;
        if (mapped) setCustomers(mapped);
        else setCustomers(MOCK_CUSTOMERS_FULL);
      }, 250);
      return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [q]);

    function handleNewCustomer(c) {
      const full = {
        ...c,
        firstName: c.firstName || (c.name || '').split(' ')[0] || '',
        lastName: c.lastName || (c.name || '').split(' ').slice(1).join(' ') || '',
        customerType: 'Customer', discount: 'Default', salesTax: 'Default',
        phoneHome: c.phone || '', phoneWork: '', phoneMobile: '', phonePager: '', phoneFax: '',
        address: '', address2: '', postalCode: '', country: 'CA',
        email2: '', website: '', custom: '', seatHeight: '', birthDate: '', title: '', company: '',
      };
      const next = [full, ...customers];
      setCustomers(next);
      setShowNew(false);
      setSelectedIndex(0);
    }

    function handleUpdate(updated) {
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
    }

    /* If a customer is selected, show the full-page detail view */
    if (selectedIndex !== null && customers[selectedIndex]) {
      return h(CustomerDetailView, {
        customer: customers[selectedIndex],
        allCustomers: customers,
        customerIndex: selectedIndex,
        totalCustomers: customers.length,
        onClose: () => setSelectedIndex(null),
        onUpdate: handleUpdate,
        onNewSale: onNewSale,
        onNewWo: onNewWo,
        onPrev: () => setSelectedIndex(i => Math.max(0, i - 1)),
        onNext: () => setSelectedIndex(i => Math.min(customers.length - 1, i + 1)),
      });
    }

    /* List view */
    return h(Fragment, null,
      showNew && h(NewCustomerForm, { onSave: handleNewCustomer, onCancel: () => setShowNew(false) }),

      /* Page header */
      h('div', { className: 'page-head' },
        h('div', null,
          h('div', { className: 'page-sub' }, 'CRM'),
          h('div', { className: 'page-title' }, 'Customers')
        ),
        h('div', { className: 'page-head-actions' },
          h('button', {
            className: 'btn primary',
            style: { display: 'flex', alignItems: 'center', gap: 5 },
            onClick: () => setShowNew(true),
          }, h(I.Plus), ' New Customer')
        )
      ),

      /* Search bar */
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 14px' } },
        h('div', {
          style: {
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-2)', border: '1px solid var(--line-2)',
            padding: '0 12px', height: 36,
          }
        },
          h('span', { style: { color: 'var(--text-3)', display: 'flex', alignItems: 'center' } }, h(I.Search)),
          h('input', {
            style: { flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-ui)' },
            placeholder: 'Search by name, phone or email...',
            value: q, onChange: e => setQ(e.target.value),
          })
        ),
        loading && h('span', { style: { fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' } }, 'SEARCHING...')
      ),

      /* Customer table */
      h('div', { style: { border: '1px solid var(--line)', overflowX: 'auto' } },
        h('table', { className: 'tbl' },
          h('thead', null,
            h('tr', null,
              h('th', null, 'Customer'),
              h('th', null, 'Phone'),
              h('th', null, 'Email'),
              h('th', { style: { textAlign: 'center' } }, 'Bikes'),
              h('th', null, 'Last Visit'),
              h('th', { style: { textAlign: 'right' } }, 'Total Spent'),
              h('th', null, 'Member Since'),
            )
          ),
          h('tbody', null,
            customers.length === 0 && h('tr', null,
              h('td', { colSpan: 7, style: { textAlign: 'center', color: 'var(--text-3)', padding: '32px 0' } },
                q ? 'No customers match "' + q + '"' : 'No customers found')
            ),
            customers.map((c, idx) => {
              const name = c.firstName + ' ' + c.lastName;
              const hist = MOCK_HISTORY[c.id] || [];
              const lastVisit = hist.length ? hist[0].date : null;
              return h('tr', {
                key: c.id,
                style: { cursor: 'pointer' },
                onClick: () => setSelectedIndex(idx),
              },
                h('td', null,
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                    h(Avatar, { name, size: 32 }),
                    h('div', null,
                      h('div', { style: { fontWeight: 600, fontSize: 13 } }, name),
                      (c.tags || []).length > 0 && h('div', { style: { display: 'flex', gap: 4, marginTop: 3 } },
                        (c.tags || []).map(t => h(Tag, { key: t, label: t }))
                      )
                    )
                  )
                ),
                h('td', { className: 'num', style: { fontSize: 12 } }, c.phone || '-'),
                h('td', { style: { fontSize: 12, color: 'var(--text-2)' } }, c.email || '-'),
                h('td', { style: { textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 } }, c.bikesCount || 0),
                h('td', { style: { fontSize: 12, color: 'var(--text-2)' } }, lastVisit ? fmtDate(lastVisit) : '-'),
                h('td', { className: 'num', style: { textAlign: 'right', fontWeight: 600 } }, fmt$(c.totalSpent || 0)),
                h('td', { style: { fontSize: 12, color: 'var(--text-2)' } }, fmtMemberSince(c.memberSince))
              );
            })
          )
        )
      )
    );
  }

  /* ── Export ── */
  window.CustomersScreen = CustomersScreen;

})();
