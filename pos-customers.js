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

  /* Derive avatar color from name — stable across renders */
  const AV_COLORS = ['#c8392c','#4d8fd6','#2f9e5b','#d29a3a','#8b5cf6','#06b6d4','#f97316','#ec4899'];
  function avatarColor(name) {
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return AV_COLORS[h % AV_COLORS.length];
  }
  function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /* localStorage helpers for notes */
  function loadNotes(customerId) {
    try {
      return JSON.parse(localStorage.getItem('cl-pos-notes-' + customerId) || '[]');
    } catch { return []; }
  }
  function saveNote(customerId, text) {
    const notes = loadNotes(customerId);
    notes.unshift({ text, ts: new Date().toISOString() });
    try { localStorage.setItem('cl-pos-notes-' + customerId, JSON.stringify(notes)); } catch {}
    return notes;
  }

  /* ── Mock data (used when API returns null) ── */
  const MOCK_CUSTOMERS_FULL = [
    {
      id: 1, firstName: 'Hannah', lastName: 'Riise', email: 'hannah.riise@email.com',
      phone: '250-555-0142', city: 'Kelowna', province: 'BC', memberSince: '2021-03-14',
      totalSpent: 4812.50, visitCount: 18, tags: ['VIP'], bikesCount: 3,
    },
    {
      id: 2, firstName: 'Devon', lastName: 'Tran', email: 'devon.tran@email.com',
      phone: '250-555-0188', city: 'Kelowna', province: 'BC', memberSince: '2020-07-22',
      totalSpent: 2390.00, visitCount: 11, tags: [], bikesCount: 2,
    },
    {
      id: 3, firstName: 'Marc', lastName: 'Lefebvre', email: 'marc.l@email.com',
      phone: '250-555-0119', city: 'West Kelowna', province: 'BC', memberSince: '2019-01-08',
      totalSpent: 1820.00, visitCount: 9, tags: ['Wholesale'], bikesCount: 1,
    },
    {
      id: 4, firstName: 'Hannah', lastName: 'Kowalski', email: 'hkowalski@email.com',
      phone: '250-555-0319', city: 'Kelowna', province: 'BC', memberSince: '2024-04-11',
      totalSpent: 340.00, visitCount: 2, tags: [], bikesCount: 1,
    },
    {
      id: 5, firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@email.com',
      phone: '778-555-0207', city: 'Penticton', province: 'BC', memberSince: '2022-09-30',
      totalSpent: 1655.00, visitCount: 7, tags: ['Staff'], bikesCount: 2,
    },
    {
      id: 6, firstName: 'Eli', lastName: 'Constantine', email: 'eli.c@email.com',
      phone: '604-555-0152', city: 'Kelowna', province: 'BC', memberSince: '2023-06-15',
      totalSpent: 920.00, visitCount: 5, tags: [], bikesCount: 1,
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
    3: [
      { id: 'b6', year: 2022, make: 'Trek', model: 'Fuel EX 8', color: 'Lithium Grey', serial: 'TRK-22-50188', lastServiced: '2026-03-28' },
    ],
    4: [
      { id: 'b7', year: 2024, make: 'Marin', model: 'Pine Mountain 1', color: 'Gloss Teal', serial: 'MAR-24-10091', lastServiced: '2026-04-01' },
    ],
    5: [
      { id: 'b8', year: 2023, make: 'Specialized', model: 'Stumpjumper Comp', color: 'Cool Grey', serial: 'SPZ-23-66720', lastServiced: '2026-05-01' },
      { id: 'b9', year: 2021, make: 'Giant', model: 'Trance X 29 2', color: 'Panther Black', serial: 'GNT-21-44100', lastServiced: '2025-12-09' },
    ],
    6: [
      { id: 'b10', year: 2024, make: 'Yeti', model: 'SB140 LR', color: 'Cobalt', serial: 'YET-24-00312', lastServiced: '2026-05-15' },
    ],
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
    3: [
      { id: 'S-8901', date: '2026-03-28', items: 'Full tune + brake bleed', total: 185.00, method: 'Card' },
    ],
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
    2: [
      { id: 'WO-2391', bike: 'Norco Sight C2 2023', svc: 'Drivetrain replace', due: 'May 20', status: 'ready', total: 312.50 },
    ],
    3: [
      { id: 'WO-2382', bike: 'Trek Fuel EX 8', svc: 'Full tune + brake bleed', due: 'May 18', status: 'open', total: 185.00 },
    ],
    4: [],
    5: [
      { id: 'WO-2402', bike: 'Specialized Stumpjumper Comp', svc: 'Pre-season tune', due: 'May 22', status: 'booked', total: 0 },
    ],
    6: [
      { id: 'WO-2399', bike: 'Yeti SB140 LR', svc: 'Shock service Float X', due: 'May 21', status: 'inprogress', total: 145.00 },
    ],
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

  /* ── Icons ── */
  const I = {
    Search: () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.4',strokeLinecap:'round'},
      h('circle',{cx:'7',cy:'7',r:'4.5'}),h('path',{d:'m10.5 10.5 3 3'})),
    Plus: () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.4',strokeLinecap:'round'},
      h('path',{d:'M8 3v10M3 8h10'})),
    X: () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.5',strokeLinecap:'round'},
      h('path',{d:'m4 4 8 8M12 4l-8 8'})),
    Edit: () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'M11 2.5 13.5 5 5.5 13 2.5 13.5 3 10.5Z'})),
    Bike: () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('circle',{cx:'3.5',cy:'11',r:'2'}),h('circle',{cx:'12.5',cy:'11',r:'2'}),
      h('path',{d:'M3.5 11 6 6h4l2 2.5M10 6l.5 2.5M8 11l-2-5'})),
    Receipt: () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('path',{d:'M3 1.5v13l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5V1.5L13 3l-2-1.5-2 1.5-2-1.5-2 1.5L3 1.5Z'}),
      h('path',{d:'M5.5 6h5M5.5 9h3.5'})),
    Wrench: () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'M10.5 2.5a3 3 0 0 0-3.7 3.7l-4.5 4.5 1.5 1.5 4.5-4.5a3 3 0 0 0 3.7-3.7l-1.7 1.7-1.5-1.5 1.7-1.7Z'})),
    Note: () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2'},
      h('rect',{x:'2.5',y:'2',width:'11',height:'12'}),h('path',{d:'M5.5 6h5M5.5 9h3'})),
    Msg: () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinejoin:'round'},
      h('path',{d:'M2 2.5h12v9H9.5L6 14v-2.5H2V2.5Z'})),
    Merge: () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.2',strokeLinecap:'round'},
      h('path',{d:'M3 3v4l5 3 5-3V3M8 10v3'})),
    ChevRight: () => h('svg',{viewBox:'0 0 16 16',width:12,height:12,fill:'none',stroke:'currentColor',strokeWidth:'1.5',strokeLinecap:'round'},
      h('path',{d:'m6 3 4 5-4 5'})),
    ChevLeft: () => h('svg',{viewBox:'0 0 16 16',width:12,height:12,fill:'none',stroke:'currentColor',strokeWidth:'1.5',strokeLinecap:'round'},
      h('path',{d:'m10 3-4 5 4 5'})),
    Check: () => h('svg',{viewBox:'0 0 16 16',width:14,height:14,fill:'none',stroke:'currentColor',strokeWidth:'1.6',strokeLinecap:'round',strokeLinejoin:'round'},
      h('path',{d:'m3 8 3.5 3.5L13 5'})),
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
        display: 'inline-flex', alignItems: 'center', height: 20,
        padding: '0 8px', fontSize: 11, fontFamily: 'var(--font-mono)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
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

  /* ── Inline field row for detail panel ── */
  function DetailRow({ label, value, mono }) {
    return h('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
               padding: '6px 0', borderBottom: '1px solid var(--line)' }
    },
      h('span', { style: { fontSize: 12, color: 'var(--text-3)', minWidth: 100 } }, label),
      h('span', {
        style: {
          fontSize: 13, color: 'var(--text-1)',
          fontFamily: mono ? 'var(--font-mono)' : undefined,
        }
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
      style: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900,
      },
      onClick: e => { if (e.target === e.currentTarget) onClose(); },
    },
      h('div', {
        style: {
          background: 'var(--bg-1)', border: '1px solid var(--line-2)',
          width: 480, display: 'flex', flexDirection: 'column',
        }
      },
        /* Head */
        h('div', {
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                   padding: '14px 18px', borderBottom: '1px solid var(--line)' }
        },
          h('span', { style: { fontSize: 14, fontWeight: 600 } }, 'SMS - ' + customer.firstName + ' ' + customer.lastName),
          h('button', { className: 'btn ghost', style: { padding: '0 6px', height: 24 }, onClick: onClose },
            h(I.X))
        ),
        h('div', { style: { padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 } },
          /* Phone */
          h('div', null,
            h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } }, 'To'),
            h('input', { className: 'input mono', value: customer.phone || 'No phone on file', readOnly: true })
          ),
          /* Templates */
          h('div', null,
            h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } }, 'Template'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              SMS_TEMPLATES.map((t, i) =>
                h('button', {
                  key: i,
                  onClick: () => pickTemplate(i),
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
          /* Message body */
          h('div', null,
            h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } }, 'Message'),
            h('textarea', {
              className: 'input', rows: 4,
              style: { resize: 'vertical', fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: '1.5' },
              value: body, onChange: e => setBody(e.target.value),
              placeholder: 'Type a message...',
            })
          ),
          /* Actions */
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
                },
                  h(I.Msg), ' Send SMS')
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
      h('div', {
        style: { background: 'var(--bg-1)', border: '1px solid var(--line-2)', width: 480 }
      },
        h('div', {
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                   padding: '14px 18px', borderBottom: '1px solid var(--line)' }
        },
          h('span', { style: { fontSize: 14, fontWeight: 600 } }, 'Merge Customer'),
          h('button', { className: 'btn ghost', style: { padding: '0 6px', height: 24 }, onClick: onClose }, h(I.X))
        ),
        h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 12 } },
          h('p', { style: { fontSize: 13, color: 'var(--text-2)', margin: 0 } },
            'Merging will combine all bikes, WOs, and purchase history into one record. This cannot be undone.'),
          h('div', { style: { background: 'var(--bg-3)', padding: '10px 12px', fontSize: 13 } },
            h('span', { style: { color: 'var(--text-3)' } }, 'Source: '),
            h('span', { style: { color: 'var(--text)', fontWeight: 600 } },
              customer.firstName + ' ' + customer.lastName + ' - ' + customer.phone)
          ),
          h('input', {
            className: 'input', placeholder: 'Search customer to merge into...',
            value: q, onChange: e => { setQ(e.target.value); setTarget(null); setConfirmed(false); }
          }),
          filtered.length > 0 && h('div', {
            style: { border: '1px solid var(--line)', maxHeight: 200, overflowY: 'auto' }
          },
            filtered.map(c =>
              h('div', {
                key: c.id,
                onClick: () => setTarget(c),
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
              style: { background: target && confirmed ? 'var(--accent)' : undefined,
                       color: target && confirmed ? '#fff' : undefined,
                       opacity: !target || !confirmed ? 0.4 : 1,
                       borderColor: target && confirmed ? 'var(--accent-dim)' : undefined },
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

    function set(k, v) {
      setForm(f => ({ ...f, [k]: v }));
      setErrors(e => ({ ...e, [k]: '' }));
    }

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
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: { city: form.city.trim(), province: form.province },
        tags: form.type !== 'Retail' ? [form.type] : [],
      };

      const result = await apiPost('/api/pos-customer-create', payload);
      setSaving(false);

      const newCustomer = result?.customer || {
        id: Date.now(),
        ...payload,
        memberSince: new Date().toISOString().slice(0, 10),
        totalSpent: 0,
        visitCount: 0,
        bikesCount: 0,
        tags: payload.tags,
      };
      onSave(newCustomer);
    }

    const provinces = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'];
    const customerTypes = ['Retail','Wholesale','Staff','VIP'];

    return h('div', {
      style: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900,
      },
      onClick: e => { if (e.target === e.currentTarget) onCancel(); },
    },
      h('div', {
        style: {
          background: 'var(--bg-1)', border: '1px solid var(--line-2)',
          width: 480, display: 'flex', flexDirection: 'column',
        }
      },
        h('div', {
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                   padding: '14px 18px', borderBottom: '1px solid var(--line)' }
        },
          h('span', { style: { fontSize: 14, fontWeight: 600 } }, 'New Customer'),
          h('button', { className: 'btn ghost', style: { padding: '0 6px', height: 24 }, onClick: onCancel }, h(I.X))
        ),
        h('div', { style: { padding: 18, display: 'flex', flexDirection: 'column', gap: 14 } },
          /* Name row */
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
            h('div', null,
              h('label', { style: { display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } },
                'First Name ', h('span', { style: { color: 'var(--accent)' } }, '*')),
              h('input', {
                className: 'input' + (errors.firstName ? ' input-err' : ''),
                value: form.firstName, placeholder: 'First',
                onChange: e => set('firstName', e.target.value),
              }),
              errors.firstName && h('div', { style: { fontSize: 11, color: 'var(--accent)', marginTop: 3 } }, errors.firstName)
            ),
            h('div', null,
              h('label', { style: { display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } },
                'Last Name ', h('span', { style: { color: 'var(--accent)' } }, '*')),
              h('input', {
                className: 'input' + (errors.lastName ? ' input-err' : ''),
                value: form.lastName, placeholder: 'Last',
                onChange: e => set('lastName', e.target.value),
              }),
              errors.lastName && h('div', { style: { fontSize: 11, color: 'var(--accent)', marginTop: 3 } }, errors.lastName)
            )
          ),
          /* Phone */
          h('div', null,
            h('label', { style: { display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } },
              'Phone ', h('span', { style: { color: 'var(--accent)' } }, '*')),
            h('input', {
              className: 'input mono' + (errors.phone ? ' input-err' : ''),
              value: form.phone, placeholder: '250-555-0000',
              onChange: e => set('phone', fmtPhone(e.target.value)),
            }),
            errors.phone && h('div', { style: { fontSize: 11, color: 'var(--accent)', marginTop: 3 } }, errors.phone)
          ),
          /* Email */
          h('div', null,
            h('label', { style: { display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } }, 'Email'),
            h('input', {
              className: 'input', type: 'email', value: form.email, placeholder: 'email@example.com',
              onChange: e => set('email', e.target.value),
            })
          ),
          /* City + Province */
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 } },
            h('div', null,
              h('label', { style: { display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } }, 'City'),
              h('input', {
                className: 'input', value: form.city, placeholder: 'Kelowna',
                onChange: e => set('city', e.target.value),
              })
            ),
            h('div', null,
              h('label', { style: { display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } }, 'Prov'),
              h('select', {
                className: 'input', style: { width: 80 }, value: form.province,
                onChange: e => set('province', e.target.value),
              },
                provinces.map(p => h('option', { key: p, value: p }, p))
              )
            )
          ),
          /* Customer type */
          h('div', null,
            h('label', { style: { display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' } }, 'Customer Type'),
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
          /* Actions */
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 } },
            h('button', { className: 'btn', onClick: onCancel }, 'Cancel'),
            h('button', {
              className: 'btn primary', onClick: handleSave,
              disabled: saving,
              style: { opacity: saving ? 0.6 : 1 }
            }, saving ? 'Saving...' : 'Create Customer')
          )
        )
      )
    );
  }

  /* ═══════════════════════════════════════════
     ADD BIKE FORM
  ═══════════════════════════════════════════ */
  function AddBikeForm({ onSave, onCancel }) {
    const [form, setForm] = useState({ year: new Date().getFullYear(), make: '', model: '', color: '', serial: '' });
    function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

    return h('div', { style: { padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--line)', marginTop: 8 } },
      h('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 2 } }, 'Add Bike'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 8 } },
        h('div', null,
          h('label', { style: { display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Year'),
          h('input', {
            className: 'input mono', type: 'number', value: form.year,
            onChange: e => set('year', e.target.value),
          })
        ),
        h('div', null,
          h('label', { style: { display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Make'),
          h('input', { className: 'input', value: form.make, placeholder: 'Norco', onChange: e => set('make', e.target.value) })
        ),
        h('div', null,
          h('label', { style: { display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Model'),
          h('input', { className: 'input', value: form.model, placeholder: 'Sight C2', onChange: e => set('model', e.target.value) })
        )
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
        h('div', null,
          h('label', { style: { display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Color'),
          h('input', { className: 'input', value: form.color, placeholder: 'Forest Green', onChange: e => set('color', e.target.value) })
        ),
        h('div', null,
          h('label', { style: { display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Serial #'),
          h('input', { className: 'input mono', value: form.serial, placeholder: 'NRC-23-00000', onChange: e => set('serial', e.target.value) })
        )
      ),
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
        h('button', { className: 'btn', onClick: onCancel }, 'Cancel'),
        h('button', {
          className: 'btn primary',
          disabled: !form.make.trim() || !form.model.trim(),
          style: { opacity: (!form.make.trim() || !form.model.trim()) ? 0.4 : 1 },
          onClick: () => onSave({ id: 'b' + Date.now(), ...form, lastServiced: null }),
        }, 'Add Bike')
      )
    );
  }

  /* ═══════════════════════════════════════════
     CUSTOMER DETAIL PANEL
  ═══════════════════════════════════════════ */
  function CustomerDetailPanel({ customer: initialCustomer, allCustomers, onClose, onUpdate }) {
    const [customer, setCustomer] = useState(initialCustomer);
    const [tab, setTab] = useState('bikes');
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [showSms, setShowSms] = useState(false);
    const [showMerge, setShowMerge] = useState(false);
    const [bikes, setBikes] = useState(MOCK_BIKES[customer.id] || []);
    const [showAddBike, setShowAddBike] = useState(false);
    const [selectedBike, setSelectedBike] = useState(null);
    const [notes, setNotes] = useState(() => loadNotes(customer.id));
    const [noteInput, setNoteInput] = useState('');
    const [saving, setSaving] = useState(false);

    const name = customer.firstName + ' ' + customer.lastName;
    const history = MOCK_HISTORY[customer.id] || [];
    const workOrders = MOCK_WORKORDERS[customer.id] || [];

    function startEdit() {
      setEditForm({ ...customer });
      setEditing(true);
    }
    function cancelEdit() { setEditing(false); setEditForm(null); }
    async function saveEdit() {
      setSaving(true);
      const updated = { ...customer, ...editForm };
      setCustomer(updated);
      onUpdate && onUpdate(updated);
      setSaving(false);
      setEditing(false);
      setEditForm(null);
    }

    function addNote() {
      if (!noteInput.trim()) return;
      const updated = saveNote(customer.id, noteInput.trim());
      setNotes(updated);
      setNoteInput('');
    }

    function addBike(bike) {
      setBikes(b => [bike, ...b]);
      setShowAddBike(false);
    }

    const TABS = [
      { id: 'bikes', label: 'Bikes on File', count: bikes.length },
      { id: 'history', label: 'Purchases', count: history.length },
      { id: 'wos', label: 'Work Orders', count: workOrders.length },
      { id: 'notes', label: 'Notes', count: notes.length },
    ];

    return h(Fragment, null,
      showSms && h(SmsModal, { customer, onClose: () => setShowSms(false) }),
      showMerge && h(MergeModal, {
        customer, allCustomers,
        onMerge: (src, tgt) => {
          /* In production, call API. For now, just toast. */
          window._posToast && window._posToast('Merged ' + src.firstName + ' into ' + tgt.firstName, 'success');
          onClose();
        },
        onClose: () => setShowMerge(false),
      }),

      /* Overlay + panel */
      h('div', {
        style: {
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200,
          display: 'flex', justifyContent: 'flex-end',
        },
        onClick: e => { if (e.target === e.currentTarget) onClose(); },
      },
        h('div', {
          className: 'slide-panel',
          style: {
            width: 520, maxWidth: '100vw', height: '100%', display: 'flex', flexDirection: 'column',
            background: 'var(--bg-1)', borderLeft: '1px solid var(--line-2)',
            transform: 'translateX(0)', transition: 'transform 200ms ease',
            overflowY: 'auto',
          },
          onClick: e => e.stopPropagation(),
        },
          /* Panel header */
          h('div', {
            style: { display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
                     borderBottom: '1px solid var(--line)', flexShrink: 0, position: 'sticky', top: 0,
                     background: 'var(--bg-1)', zIndex: 1 }
          },
            h(Avatar, { name }),
            h('div', { style: { flex: 1, minWidth: 0 } },
              editing
                ? h('div', { style: { display: 'flex', gap: 8 } },
                    h('input', {
                      className: 'input', value: editForm.firstName, placeholder: 'First',
                      style: { width: 120 },
                      onChange: e => setEditForm(f => ({ ...f, firstName: e.target.value })),
                    }),
                    h('input', {
                      className: 'input', value: editForm.lastName, placeholder: 'Last',
                      style: { flex: 1 },
                      onChange: e => setEditForm(f => ({ ...f, lastName: e.target.value })),
                    })
                  )
                : h('div', { style: { fontSize: 17, fontWeight: 700 } }, name),
              h('div', { style: { display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' } },
                (customer.tags || []).map(t => h(Tag, { key: t, label: t }))
              )
            ),
            /* Header actions */
            h('div', { style: { display: 'flex', gap: 6, flexShrink: 0 } },
              editing
                ? h(Fragment, null,
                    h('button', { className: 'btn', onClick: cancelEdit }, 'Cancel'),
                    h('button', {
                      className: 'btn primary', onClick: saveEdit,
                      disabled: saving, style: { opacity: saving ? 0.6 : 1 }
                    }, saving ? 'Saving...' : 'Save'),
                  )
                : h(Fragment, null,
                    h('button', {
                      className: 'btn ghost',
                      style: { height: 28, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 5 },
                      onClick: () => setShowSms(true),
                    }, h(I.Msg), ' SMS'),
                    h('button', {
                      className: 'btn ghost',
                      style: { height: 28, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 5 },
                      onClick: startEdit,
                    }, h(I.Edit), ' Edit'),
                    h('button', {
                      className: 'btn ghost',
                      style: { height: 28, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 5 },
                      onClick: () => setShowMerge(true),
                    }, h(I.Merge), ' Merge'),
                    h('button', {
                      className: 'btn ghost', style: { height: 28, padding: '0 8px' },
                      onClick: onClose
                    }, h(I.X))
                  )
            )
          ),

          /* Stats row */
          h('div', {
            style: {
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              borderBottom: '1px solid var(--line)', flexShrink: 0,
            }
          },
            h('div', {
              style: { padding: '14px 20px', borderRight: '1px solid var(--line)', textAlign: 'center' }
            },
              h('div', { style: { fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)' } },
                fmt$(customer.totalSpent || 0)),
              h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' } }, 'Lifetime Spend')
            ),
            h('div', {
              style: { padding: '14px 20px', borderRight: '1px solid var(--line)', textAlign: 'center' }
            },
              h('div', { style: { fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' } },
                customer.visitCount || 0),
              h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' } }, 'Visits')
            ),
            h('div', {
              style: { padding: '14px 20px', textAlign: 'center' }
            },
              h('div', { style: { fontSize: 15, fontWeight: 600, color: 'var(--text-1)' } },
                fmtMemberSince(customer.memberSince)),
              h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' } }, 'Member')
            )
          ),

          /* Contact details */
          h('div', { style: { padding: '14px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 } },
            editing
              ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                  h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
                    h('div', null,
                      h('label', { style: { display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' } }, 'Phone'),
                      h('input', {
                        className: 'input mono', value: editForm.phone || '',
                        onChange: e => setEditForm(f => ({ ...f, phone: fmtPhone(e.target.value) })),
                      })
                    ),
                    h('div', null,
                      h('label', { style: { display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' } }, 'Email'),
                      h('input', {
                        className: 'input', type: 'email', value: editForm.email || '',
                        onChange: e => setEditForm(f => ({ ...f, email: e.target.value })),
                      })
                    )
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8 } },
                    h('div', null,
                      h('label', { style: { display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' } }, 'City'),
                      h('input', {
                        className: 'input', value: editForm.city || '',
                        onChange: e => setEditForm(f => ({ ...f, city: e.target.value })),
                      })
                    ),
                    h('div', null,
                      h('label', { style: { display: 'block', fontSize: 10, color: 'var(--text-3)', marginBottom: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' } }, 'Prov'),
                      h('input', { className: 'input', value: editForm.province || '', onChange: e => setEditForm(f => ({ ...f, province: e.target.value })) })
                    )
                  )
                )
              : h(Fragment, null,
                  h(DetailRow, { label: 'Phone', value: customer.phone, mono: true }),
                  h(DetailRow, { label: 'Email', value: customer.email }),
                  h(DetailRow, { label: 'Location', value: [customer.city, customer.province].filter(Boolean).join(', ') }),
                  h(DetailRow, { label: 'Member since', value: customer.memberSince ? fmtDate(customer.memberSince) : '-' }),
                )
          ),

          /* Tabs */
          h('div', { className: 'sub-tabs', style: { margin: 0, padding: '0 20px', flexShrink: 0 } },
            TABS.map(t =>
              h('button', {
                key: t.id,
                className: 'sub-tab' + (tab === t.id ? ' active' : ''),
                onClick: () => setTab(t.id),
              },
                t.label,
                t.count > 0 && h('span', { className: 'count' }, t.count)
              )
            )
          ),

          /* Tab content */
          h('div', { style: { flex: 1, padding: '16px 20px', overflowY: 'auto' } },

            /* BIKES TAB */
            tab === 'bikes' && h('div', null,
              h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 10 } },
                !showAddBike && h('button', {
                  className: 'btn',
                  style: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 },
                  onClick: () => setShowAddBike(true),
                }, h(I.Plus), ' Add Bike')
              ),
              showAddBike && h(AddBikeForm, { onSave: addBike, onCancel: () => setShowAddBike(false) }),
              bikes.length === 0 && !showAddBike && h('div', {
                style: { padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }
              }, 'No bikes on file'),
              bikes.map(bike =>
                h('div', {
                  key: bike.id,
                  onClick: () => setSelectedBike(selectedBike?.id === bike.id ? null : bike),
                  style: {
                    padding: '12px 14px', marginBottom: 6, cursor: 'pointer',
                    background: selectedBike?.id === bike.id ? 'var(--bg-3)' : 'var(--bg-2)',
                    border: '1px solid ' + (selectedBike?.id === bike.id ? 'var(--line-3)' : 'var(--line)'),
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { style: { color: 'var(--text-3)' } }, h(I.Bike)),
                      h('div', null,
                        h('div', { style: { fontSize: 13, fontWeight: 600, color: 'var(--text)' } },
                          bike.year + ' ' + bike.make + ' ' + bike.model),
                        h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginTop: 2 } },
                          bike.color + (bike.serial ? ' - S/N: ' + bike.serial : ''))
                      )
                    ),
                    h('span', { style: { color: 'var(--text-3)' } }, h(I.ChevRight))
                  ),
                  selectedBike?.id === bike.id && h('div', {
                    style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)', fontSize: 12 }
                  },
                    h(DetailRow, { label: 'Last serviced', value: bike.lastServiced ? fmtDate(bike.lastServiced) : 'Never', mono: false }),
                    h('div', { style: { marginTop: 10 } },
                      h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Work orders for this bike'),
                      (workOrders.filter(w => w.bike.toLowerCase().includes(bike.make.toLowerCase()))).length === 0
                        ? h('div', { style: { color: 'var(--text-3)', fontSize: 12 } }, 'No work orders')
                        : workOrders
                            .filter(w => w.bike.toLowerCase().includes(bike.make.toLowerCase()))
                            .map(wo =>
                              h('div', {
                                key: wo.id,
                                style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                         padding: '6px 0', borderBottom: '1px solid var(--line)' }
                              },
                                h('div', null,
                                  h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' } }, wo.id + ' '),
                                  h('span', { style: { fontSize: 12 } }, wo.svc)
                                ),
                                h(WoBadge, { status: wo.status })
                              )
                            )
                    )
                  )
                )
              )
            ),

            /* PURCHASE HISTORY TAB */
            tab === 'history' && h('div', null,
              history.length === 0 && h('div', {
                style: { padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }
              }, 'No purchase history'),
              history.map(sale =>
                h('div', {
                  key: sale.id,
                  style: { padding: '12px 14px', marginBottom: 6, background: 'var(--bg-2)', border: '1px solid var(--line)' }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
                    h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' } }, sale.id),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { style: { fontSize: 11, color: 'var(--text-3)' } }, fmtDate(sale.date)),
                      h('span', { style: { fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 } }, fmt$(sale.total))
                    )
                  ),
                  h('div', { style: { fontSize: 12, color: 'var(--text-2)', marginBottom: 8 } }, sale.items),
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
                    h('span', { style: { fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 8px', fontFamily: 'var(--font-mono)' } }, sale.method),
                    h('button', {
                      className: 'btn ghost',
                      style: { height: 24, padding: '0 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 },
                      onClick: () => window._posToast && window._posToast('Reprinting receipt ' + sale.id, 'success'),
                    }, h(I.Receipt), ' Reprint')
                  )
                )
              )
            ),

            /* WORK ORDERS TAB */
            tab === 'wos' && h('div', null,
              workOrders.length === 0 && h('div', {
                style: { padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }
              }, 'No work orders'),
              workOrders.map(wo =>
                h('div', {
                  key: wo.id,
                  style: { padding: '12px 14px', marginBottom: 6, background: 'var(--bg-2)', border: '1px solid var(--line)' }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 } }, wo.id),
                      h(WoBadge, { status: wo.status })
                    ),
                    wo.total > 0 && h('span', { style: { fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 } }, fmt$(wo.total))
                  ),
                  h('div', { style: { fontSize: 12, color: 'var(--text-1)', marginBottom: 2 } }, wo.svc),
                  h('div', { style: { fontSize: 11, color: 'var(--text-3)' } }, wo.bike + ' - Due ' + wo.due),
                )
              )
            ),

            /* NOTES TAB */
            tab === 'notes' && h('div', null,
              h('div', { style: { display: 'flex', gap: 8, marginBottom: 14 } },
                h('textarea', {
                  className: 'input',
                  rows: 3,
                  style: { flex: 1, resize: 'vertical', fontSize: 13, lineHeight: '1.5' },
                  placeholder: 'Add a note...',
                  value: noteInput,
                  onChange: e => setNoteInput(e.target.value),
                  onKeyDown: e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote();
                  },
                }),
                h('button', {
                  className: 'btn primary',
                  disabled: !noteInput.trim(),
                  style: { alignSelf: 'flex-end', opacity: noteInput.trim() ? 1 : 0.4 },
                  onClick: addNote,
                }, 'Save')
              ),
              notes.length === 0 && h('div', {
                style: { padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }
              }, 'No notes yet'),
              notes.map((n, i) =>
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
            )
          )
        )
      )
    );
  }

  /* ═══════════════════════════════════════════
     CUSTOMERS SCREEN (main list)
  ═══════════════════════════════════════════ */
  function CustomersScreen() {
    const [q, setQ] = useState('');
    const [customers, setCustomers] = useState(MOCK_CUSTOMERS_FULL);
    const [selected, setSelected] = useState(null);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    /* Expose toast hook (pos-app.js defines it globally as _toastSetter) */
    useEffect(() => {
      window._posToast = (msg, type) => {
        if (window._toastSetter) window._toastSetter(p => [...p, { message: msg, type: type || '' }]);
      };
    }, []);

    /* Debounced search */
    useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (!q.trim()) {
          setCustomers(MOCK_CUSTOMERS_FULL);
          return;
        }
        setLoading(true);
        const result = await apiFetch('/api/pos-customers?q=' + encodeURIComponent(q));
        setLoading(false);
        if (result && result.customers) {
          setCustomers(result.customers);
        } else {
          /* Fallback: filter mock data */
          const ql = q.toLowerCase();
          setCustomers(MOCK_CUSTOMERS_FULL.filter(c =>
            (c.firstName + ' ' + c.lastName).toLowerCase().includes(ql) ||
            (c.phone || '').includes(ql) ||
            (c.email || '').toLowerCase().includes(ql)
          ));
        }
      }, 200);
      return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [q]);

    function handleNewCustomer(c) {
      const full = {
        ...c,
        firstName: c.firstName || (c.name || '').split(' ')[0] || '',
        lastName: c.lastName || (c.name || '').split(' ').slice(1).join(' ') || '',
      };
      setCustomers(prev => [full, ...prev]);
      setShowNew(false);
      setSelected(full);
    }

    function handleUpdate(updated) {
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelected(updated);
    }

    return h(Fragment, null,

      /* New customer form */
      showNew && h(NewCustomerForm, {
        onSave: handleNewCustomer,
        onCancel: () => setShowNew(false),
      }),

      /* Detail panel */
      selected && h(CustomerDetailPanel, {
        customer: selected,
        allCustomers: customers,
        onClose: () => setSelected(null),
        onUpdate: handleUpdate,
      }),

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
      h('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 0 14px', marginBottom: 0,
        }
      },
        h('div', {
          style: {
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-2)', border: '1px solid var(--line-2)',
            padding: '0 12px', height: 36,
          }
        },
          h('span', { style: { color: 'var(--text-3)', display: 'flex', alignItems: 'center' } }, h(I.Search)),
          h('input', {
            style: {
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-ui)',
            },
            placeholder: 'Search by name, phone or email...',
            value: q,
            onChange: e => setQ(e.target.value),
          })
        ),
        loading && h('span', {
          style: { fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }
        }, 'SEARCHING...')
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
                q ? 'No customers match "' + q + '"' : 'No customers found'
              )
            ),
            customers.map(c => {
              const name = c.firstName + ' ' + c.lastName;
              const history = MOCK_HISTORY[c.id] || [];
              const lastVisit = history.length ? history[0].date : null;
              return h('tr', {
                key: c.id,
                style: { cursor: 'pointer' },
                onClick: () => setSelected(c),
              },
                /* Name + avatar + tags */
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
