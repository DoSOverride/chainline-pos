/* pos-purchase-orders-v2.js — ChainLine POS Purchase Orders Module
 * Pure React.createElement — no JSX, no Babel.
 * Exports: window.PurchaseOrdersScreen
 */
'use strict';

(function () {
  const { createElement: h, useState, useEffect, useRef, useCallback, Fragment } = React;

  /* ── Constants ── */
  const WORKER = 'https://still-term-f1ec.taocaruso77.workers.dev';

  function fmt$(n) {
    return '$' + Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ── Vendor definitions ── */
  const VENDORS = [
    {
      id: 'hlc', name: 'HLC - Highland Cycle', short: 'HLC', type: 'Distributor',
      location: 'Burnaby, BC', phone: '1-800-663-1590', email: 'orders@hlccycle.com',
      account: 'HLC-5821', apiAvailable: true, notes: 'API available for live inventory. BC-based distributor.',
      initials: 'HLC', color: '#1a3a6b',
    },
    {
      id: 'ltp', name: 'LTP - Life To Play', short: 'LTP', type: 'Distributor',
      location: 'Montreal, QC', phone: '1-888-587-4444', email: 'orders@lifetoplay.ca',
      account: 'LTP-3041', apiAvailable: false, notes: 'Distributor. Apparel and accessories specialist.',
      initials: 'LTP', color: '#3a1a6b',
    },
    {
      id: 'oss', name: 'OSS - Orange Sports Supply', short: 'OSS', type: 'Distributor',
      location: 'Burnaby, BC', phone: '1-800-668-5467', email: 'orders@orangesports.ca',
      account: 'OSS-7712', apiAvailable: false, notes: 'Catalog available. Active dealer account.',
      initials: 'OSS', color: '#c85a00',
    },
    {
      id: 'ogc', name: 'OGC - Orange Cycle', short: 'OGC', type: 'Distributor',
      location: 'Burnaby, BC', phone: '1-800-668-5467', email: 'orders@pim.ogc.ca',
      account: 'OGC-1154', apiAvailable: true, notes: 'API integrated at pim.ogc.ca. 17k+ SKUs.',
      initials: 'OGC', color: '#c87000',
    },
    {
      id: 'shimano', name: 'Shimano Canada', short: 'Shimano', type: 'Direct Brand',
      location: 'Richmond, BC', phone: '1-877-577-0177', email: 'orders@shimano-canada.com',
      account: 'SHIM-4499', apiAvailable: false, notes: 'Direct account. Warranty claims via dealer portal.',
      initials: 'SH', color: '#1a6b3a',
    },
    {
      id: 'sram', name: 'SRAM Canada', short: 'SRAM', type: 'Direct Brand',
      location: 'Chicago, IL (Intl)', phone: '1-312-664-8800', email: 'csr@sram.com',
      account: 'SRAM-8821', apiAvailable: false, notes: 'Direct brand account. Orders via SRAM dealer portal.',
      initials: 'SR', color: '#c80000',
    },
    {
      id: 'marin', name: 'Marin Bikes', short: 'Marin', type: 'Direct Brand',
      location: 'San Rafael, CA', phone: '1-800-222-7582', email: 'dealers@marinbikes.com',
      account: 'MAR-2291', apiAvailable: false, notes: 'Direct. Pre-season ordering required.',
      initials: 'MB', color: '#3a5a1a',
    },
    {
      id: 'transition', name: 'Transition Bikes', short: 'Transition', type: 'Direct Brand',
      location: 'Bellingham, WA', phone: '1-360-527-5554', email: 'dealers@transitionbikes.com',
      account: 'TRN-0981', apiAvailable: false, notes: 'Direct dealer account.',
      initials: 'TB', color: '#1a4a6b',
    },
    {
      id: 'pivot', name: 'Pivot Cycles', short: 'Pivot', type: 'Direct Brand',
      location: 'Mesa, AZ', phone: '1-480-905-0580', email: 'dealers@pivotcycles.com',
      account: 'PIV-5512', apiAvailable: false, notes: 'Direct. Allocation-based ordering for popular models.',
      initials: 'PC', color: '#4a1a6b',
    },
    {
      id: 'surly', name: 'Surly', short: 'Surly', type: 'Direct Brand',
      location: 'Bloomington, MN', phone: '1-952-941-9391', email: 'dealers@surlybikes.com',
      account: 'SUR-3301', apiAvailable: false, notes: 'Via QBP or direct. Dark bg logo.',
      initials: 'SU', color: '#6b3a1a',
    },
    {
      id: 'salsa', name: 'Salsa Cycles', short: 'Salsa', type: 'Direct Brand',
      location: 'Bloomington, MN', phone: '1-800-783-7257', email: 'dealers@salsacycles.com',
      account: 'SAL-1109', apiAvailable: false, notes: 'Via QBP or direct.',
      initials: 'SC', color: '#6b1a3a',
    },
    {
      id: 'bianchi', name: 'Bianchi', short: 'Bianchi', type: 'Direct Brand',
      location: 'Treviglio, Italy', phone: '1-800-242-6244', email: 'dealers@bianchi.com',
      account: 'BIA-7743', apiAvailable: false, notes: 'Italian direct. Lead times 8-12 weeks.',
      initials: 'BI', color: '#007b7b',
    },
    {
      id: 'moots', name: 'Moots', short: 'Moots', type: 'Direct Brand',
      location: 'Steamboat Springs, CO', phone: '1-970-879-1676', email: 'info@moots.com',
      account: 'MOO-4412', apiAvailable: false, notes: 'Titanium frames. Long lead times. Dark bg logo.',
      initials: 'MO', color: '#4a4a4a',
    },
    {
      id: 'revel', name: 'Revel Bikes', short: 'Revel', type: 'Direct Brand',
      location: 'Carbondale, CO', phone: '1-970-963-3228', email: 'dealers@revelbikes.com',
      account: 'REV-2287', apiAvailable: false, notes: 'CBF carbon tech. Direct dealer account.',
      initials: 'RB', color: '#1a3a1a',
    },
    {
      id: 'other', name: 'Other / Custom', short: 'Other', type: 'Other',
      location: '', phone: '', email: '', account: '', apiAvailable: false, notes: '',
      initials: '?', color: '#444',
    },
  ];

  /* ── Mock PO data ── */
  const MOCK_POS = [
    {
      id: 'PO-2291', vendor: 'Shimano Canada', vendorId: 'shimano', ref: '12697255',
      status: 'Finished', created: '2026-05-10', expected: '2026-05-19', notes: '',
      lines: [
        { id: 1, sku: 'SH-BR-MT200',     name: 'Shimano MT200 Brake Pad',      qtyOrdered: 48, qtyReceived: 48, unitCost: 8.99  },
        { id: 2, sku: 'SH-SM-BH59-JK-L', name: 'Shimano Hose Kit 1000mm',      qtyOrdered: 24, qtyReceived: 24, unitCost: 12.40 },
        { id: 3, sku: 'SH-SMRT66',       name: 'Shimano RT66 Rotor 180mm',     qtyOrdered: 36, qtyReceived: 36, unitCost: 18.95 },
        { id: 4, sku: 'SH-CN-HG71',      name: 'Shimano HG71 Chain',           qtyOrdered: 48, qtyReceived: 48, unitCost: 7.14  },
      ],
    },
    {
      id: 'PO-2290', vendor: 'HLC - Highland Cycle', vendorId: 'hlc', ref: '26/37421',
      status: 'Receiving', created: '2026-05-14', expected: '2026-05-21', notes: 'Partial shipment expected first.',
      lines: [
        { id: 1, sku: 'MAV-CROSSMAX-29F', name: 'Mavic Crossmax 29 Front Wheel', qtyOrdered: 2, qtyReceived: 1, unitCost: 289.00 },
        { id: 2, sku: 'MAV-CROSSMAX-29R', name: 'Mavic Crossmax 29 Rear Wheel',  qtyOrdered: 2, qtyReceived: 0, unitCost: 319.00 },
        { id: 3, sku: 'FORK-LYRIK-B3',    name: 'RockShox Lyrik Select 130mm',   qtyOrdered: 3, qtyReceived: 1, unitCost: 649.00 },
      ],
    },
    {
      id: 'PO-2289', vendor: 'Marin Bikes', vendorId: 'marin', ref: '2612600802',
      status: 'Open', created: '2026-05-16', expected: '2026-06-05', notes: 'Spring pre-season order.',
      lines: [
        { id: 1, sku: 'MAR-PINE-MD-GRY',  name: 'Marin Pine Mountain 1 MD Grey',      qtyOrdered: 2, qtyReceived: 0, unitCost: 899.00  },
        { id: 2, sku: 'MAR-PINE-LG-GRY',  name: 'Marin Pine Mountain 1 LG Grey',      qtyOrdered: 1, qtyReceived: 0, unitCost: 899.00  },
        { id: 3, sku: 'MAR-DSX-MD-RED',   name: 'Marin DSX 2 MD Red',                 qtyOrdered: 1, qtyReceived: 0, unitCost: 1099.00 },
        { id: 4, sku: 'MAR-BOBCAT-MD-BLU',name: 'Marin Bobcat Trail 3 MD Blue',       qtyOrdered: 2, qtyReceived: 0, unitCost: 849.00  },
      ],
    },
    {
      id: 'PO-2288', vendor: 'OSS - Orange Sports Supply', vendorId: 'oss', ref: 'OSS-88321',
      status: 'Open', created: '2026-05-17', expected: '2026-05-24', notes: '',
      lines: [
        { id: 1, sku: 'TIRE-MAXX-DHF-29', name: 'Maxxis Minion DHF 29x2.5 3C',  qtyOrdered: 12, qtyReceived: 0, unitCost: 72.00 },
        { id: 2, sku: 'TIRE-MAXX-DHR-29', name: 'Maxxis Minion DHR2 29x2.4 3C', qtyOrdered: 12, qtyReceived: 0, unitCost: 70.00 },
        { id: 3, sku: 'TUBE-29-SV',       name: '29" Presta Tube 48mm',          qtyOrdered: 48, qtyReceived: 0, unitCost: 5.50  },
        { id: 4, sku: 'TUBE-27-SV',       name: '27.5" Presta Tube 48mm',        qtyOrdered: 24, qtyReceived: 0, unitCost: 5.25  },
      ],
    },
    {
      id: 'PO-2287', vendor: 'SRAM Canada', vendorId: 'sram', ref: 'SRAM-RMA-19231',
      status: 'Cancelled', created: '2026-05-01', expected: '2026-05-12', notes: 'Cancelled - item discontinued.',
      lines: [
        { id: 1, sku: 'SRAM-XX1-EAGLE-DER', name: 'SRAM XX1 Eagle Derailleur',    qtyOrdered: 2, qtyReceived: 0, unitCost: 399.00 },
      ],
    },
    {
      id: 'PO-2286', vendor: 'OGC - Orange Cycle', vendorId: 'ogc', ref: 'OGC-45112',
      status: 'Finished', created: '2026-05-05', expected: '2026-05-13', notes: '',
      lines: [
        { id: 1, sku: 'GIRO-MONTARO-MD',   name: 'Giro Montaro MIPS Helmet MD',  qtyOrdered: 3, qtyReceived: 3, unitCost: 149.99 },
        { id: 2, sku: 'GIRO-CHRONICLE-LG', name: 'Giro Chronicle MIPS Helmet LG',qtyOrdered: 3, qtyReceived: 3, unitCost: 119.99 },
        { id: 3, sku: 'KRYP-FAHGET-14',    name: 'Kryptonite Fahgettaboudit 14', qtyOrdered: 6, qtyReceived: 6, unitCost: 89.99  },
      ],
    },
  ];

  /* ── Mock inventory items for search ── */
  const MOCK_INVENTORY = [
    { sku: 'SHIM-XT-CS-12',   name: 'Shimano XT M8100 Cassette 12-spd',      cost: 145.00, price: 189.00 },
    { sku: 'TIRE-MAXX-29-DH', name: 'Maxxis Minion DHF 29x2.5 3C MaxxGrip',  cost: 65.00,  price: 84.00  },
    { sku: 'CHAIN-XT-126L',   name: 'Shimano XT Chain 126L',                  cost: 47.00,  price: 62.00  },
    { sku: 'BRAKE-PAD-CODE',  name: 'SRAM Code Brake Pads Metallic',          cost: 29.00,  price: 38.00  },
    { sku: 'GREASE-SLICK',    name: 'SlickHoney Suspension Grease 32g',       cost: 12.00,  price: 18.00  },
    { sku: 'GRIP-ODI-ELITE',  name: 'ODI Elite Pro Lock-On Grips',            cost: 24.00,  price: 32.00  },
    { sku: 'TUBE-29-PRES',    name: '29" Tube Presta Valve',                  cost: 5.50,   price: 11.00  },
    { sku: 'FORK-LYRIK-B4',   name: 'RockShox Lyrik Select+ 140mm',          cost: 649.00, price: 849.00 },
    { sku: 'TIRE-SCHWALBE-29',name: 'Schwalbe Magic Mary 29x2.4 Super Grav', cost: 68.00,  price: 88.00  },
    { sku: 'BRAKE-GUIDE-R',   name: 'SRAM Guide R Brakes',                   cost: 95.00,  price: 129.00 },
    { sku: 'CASS-NX-12',      name: 'SRAM NX Eagle Cassette 11-50T',         cost: 65.00,  price: 89.00  },
    { sku: 'CHAIN-NX-EAGLE',  name: 'SRAM NX Eagle Chain 126L',              cost: 29.00,  price: 42.00  },
  ];

  /* ── Helpers ── */
  function poTotal(po) {
    return po.lines.reduce((s, l) => s + l.qtyOrdered * l.unitCost, 0);
  }

  function poReceived(po) {
    return po.lines.reduce((s, l) => s + l.qtyReceived, 0);
  }

  function poOrdered(po) {
    return po.lines.reduce((s, l) => s + l.qtyOrdered, 0);
  }

  function statusBadge(status) {
    const map = {
      Open:       { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)'  },
      Receiving:  { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)'  },
      Finished:   { bg: 'rgba(34,197,94,0.15)',  color: '#4ade80', border: 'rgba(34,197,94,0.3)'   },
      Cancelled:  { bg: 'rgba(100,100,100,0.12)',color: '#888',    border: 'rgba(100,100,100,0.2)' },
    };
    const s = map[status] || map['Open'];
    return h('span', {
      style: {
        background: s.bg, color: s.color, border: '1px solid ' + s.border,
        padding: '2px 9px', borderRadius: 4, fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
      }
    }, status);
  }

  function VendorInitials({ vendor }) {
    const v = VENDORS.find(x => x.id === vendor?.vendorId || x.name === vendor?.name || x.name === vendor);
    const color = v ? v.color : '#444';
    const initials = v ? v.initials : (typeof vendor === 'string' ? vendor.slice(0, 2).toUpperCase() : '?');
    return h('span', {
      style: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 6,
        background: color, color: '#fff',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
        fontFamily: 'var(--font-mono)', flexShrink: 0,
      }
    }, initials);
  }

  /* ── PO List row ── */
  function PORow({ po, onSelect }) {
    const total = poTotal(po);
    const ordered = poOrdered(po);
    const received = poReceived(po);
    return h('tr', {
      style: { cursor: 'pointer' },
      onClick: () => onSelect(po),
      className: 'table-row-hover',
    },
      h('td', { style: { fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' } }, po.id),
      h('td', null,
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h(VendorInitials, { vendor: po }),
          h('span', null, po.vendor)
        )
      ),
      h('td', { style: { color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 12 } }, po.ref),
      h('td', null, statusBadge(po.status)),
      h('td', { style: { color: 'var(--text-2)', fontSize: 12 } }, po.created),
      h('td', { style: { color: 'var(--text-2)', fontSize: 12 } }, po.expected),
      h('td', { style: { textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 } }, ordered),
      h('td', { style: { textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 } }, received),
      h('td', { style: { textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' } }, fmt$(total))
    );
  }

  /* ── New PO Form ── */
  function NewPOForm({ onClose, onCreated }) {
    const [vendorId, setVendorId] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [ref, setRef] = useState('');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState([]);
    const [itemSearch, setItemSearch] = useState('');
    const [itemResults, setItemResults] = useState([]);
    const [saving, setSaving] = useState(false);

    const vendor = VENDORS.find(v => v.id === vendorId);

    useEffect(() => {
      if (itemSearch.length < 2) { setItemResults([]); return; }
      const q = itemSearch.toLowerCase();
      const results = MOCK_INVENTORY.filter(it =>
        it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q)
      ).slice(0, 8);
      // Real: fetch(WORKER + '/api/pos-inventory?q=' + encodeURIComponent(itemSearch))
      setItemResults(results);
    }, [itemSearch]);

    function addLine(item) {
      setLines(prev => {
        const existing = prev.find(l => l.sku === item.sku);
        if (existing) {
          return prev.map(l => l.sku === item.sku ? { ...l, qty: l.qty + 1 } : l);
        }
        return [...prev, { id: Date.now(), sku: item.sku, name: item.name, qty: 1, unitCost: item.cost }];
      });
      setItemSearch('');
      setItemResults([]);
    }

    function removeLine(id) {
      setLines(prev => prev.filter(l => l.id !== id));
    }

    function updateLine(id, field, value) {
      setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    }

    const runningTotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitCost) || 0), 0);

    async function createPO() {
      if (!vendorId) { alert('Select a vendor.'); return; }
      if (lines.length === 0) { alert('Add at least one line item.'); return; }
      setSaving(true);
      const body = {
        vendor: vendor.name, vendorId,
        ref, expectedDate, notes,
        lines: lines.map(l => ({ sku: l.sku, name: l.name, qtyOrdered: Number(l.qty), qtyReceived: 0, unitCost: Number(l.unitCost) })),
      };
      try {
        // Real: await fetch(WORKER + '/api/pos-purchase-order', { method: 'POST', ... })
        await new Promise(r => setTimeout(r, 600)); // mock delay
        onCreated({ ...body, id: 'PO-' + (2292 + Math.floor(Math.random() * 100)), status: 'Open', created: new Date().toISOString().slice(0, 10) });
      } finally {
        setSaving(false);
      }
    }

    return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
      /* header */
      h('div', { style: { padding: '18px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        h('div', null,
          h('div', { style: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 } }, 'Purchase Orders'),
          h('div', { style: { fontSize: 18, fontWeight: 700 } }, 'New Purchase Order')
        ),
        h('button', { className: 'btn', onClick: onClose, style: { height: 30 } }, 'Cancel')
      ),
      /* body */
      h('div', { style: { flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 } },
        /* Vendor + meta */
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
          h('div', { className: 'field' },
            h('label', { className: 'field-label' }, 'Vendor', h('span', { className: 'req' }, ' *')),
            h('select', {
              className: 'input',
              value: vendorId,
              onChange: e => setVendorId(e.target.value),
            },
              h('option', { value: '' }, '-- Select vendor --'),
              VENDORS.map(v => h('option', { key: v.id, value: v.id }, v.name))
            )
          ),
          h('div', { className: 'field' },
            h('label', { className: 'field-label' }, 'Vendor Reference # (optional)'),
            h('input', { className: 'input', value: ref, onChange: e => setRef(e.target.value), placeholder: 'Vendor order number' })
          ),
          h('div', { className: 'field' },
            h('label', { className: 'field-label' }, 'Expected Delivery Date'),
            h('input', { className: 'input', type: 'date', value: expectedDate, onChange: e => setExpectedDate(e.target.value) })
          ),
          h('div', { className: 'field', style: { gridColumn: '1/-1' } },
            h('label', { className: 'field-label' }, 'Notes'),
            h('textarea', { className: 'textarea', rows: 2, value: notes, onChange: e => setNotes(e.target.value), placeholder: 'Internal notes...' })
          )
        ),
        /* Line items */
        h('div', null,
          h('div', { style: { fontWeight: 600, marginBottom: 10 } }, 'Line Items'),
          /* Item search */
          h('div', { style: { position: 'relative', marginBottom: 12 } },
            h('input', {
              className: 'input',
              placeholder: 'Search items to add (name or SKU)...',
              value: itemSearch,
              onChange: e => setItemSearch(e.target.value),
            }),
            itemResults.length > 0 && h('div', {
              style: {
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                maxHeight: 280, overflowY: 'auto',
              }
            },
              itemResults.map(item =>
                h('div', {
                  key: item.sku,
                  onClick: () => addLine(item),
                  style: {
                    padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--line)', fontSize: 13,
                  },
                  onMouseEnter: e => e.currentTarget.style.background = 'var(--surface-2)',
                  onMouseLeave: e => e.currentTarget.style.background = '',
                },
                  h('div', null,
                    h('div', { style: { fontWeight: 500 } }, item.name),
                    h('div', { style: { fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' } }, item.sku)
                  ),
                  h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)', textAlign: 'right' } },
                    h('div', null, 'Cost: ' + fmt$(item.cost)),
                    h('div', { style: { color: 'var(--text-3)' } }, 'Price: ' + fmt$(item.price))
                  )
                )
              )
            )
          ),
          /* Lines table */
          lines.length > 0 && h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            h('thead', null,
              h('tr', { style: { borderBottom: '1px solid var(--line)', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' } },
                h('th', { style: { textAlign: 'left', padding: '6px 8px', fontWeight: 600 } }, 'Item'),
                h('th', { style: { textAlign: 'left', padding: '6px 8px', fontWeight: 600 } }, 'SKU'),
                h('th', { style: { textAlign: 'right', padding: '6px 8px', fontWeight: 600, width: 80 } }, 'Qty'),
                h('th', { style: { textAlign: 'right', padding: '6px 8px', fontWeight: 600, width: 110 } }, 'Unit Cost'),
                h('th', { style: { textAlign: 'right', padding: '6px 8px', fontWeight: 600, width: 110 } }, 'Total'),
                h('th', { style: { width: 32 } })
              )
            ),
            h('tbody', null,
              lines.map(l =>
                h('tr', { key: l.id, style: { borderBottom: '1px solid var(--line)' } },
                  h('td', { style: { padding: '6px 8px', fontSize: 13 } }, l.name),
                  h('td', { style: { padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' } }, l.sku),
                  h('td', { style: { padding: '6px 8px', textAlign: 'right' } },
                    h('input', {
                      className: 'input',
                      type: 'number', min: 1, value: l.qty,
                      onChange: e => updateLine(l.id, 'qty', e.target.value),
                      style: { width: 64, textAlign: 'right', padding: '3px 6px', fontFamily: 'var(--font-mono)' },
                    })
                  ),
                  h('td', { style: { padding: '6px 8px', textAlign: 'right' } },
                    h('input', {
                      className: 'input',
                      type: 'number', min: 0, step: 0.01, value: l.unitCost,
                      onChange: e => updateLine(l.id, 'unitCost', e.target.value),
                      style: { width: 88, textAlign: 'right', padding: '3px 6px', fontFamily: 'var(--font-mono)' },
                    })
                  ),
                  h('td', { style: { padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 } },
                    fmt$(Number(l.qty) * Number(l.unitCost))
                  ),
                  h('td', { style: { padding: '6px 8px' } },
                    h('button', {
                      className: 'btn ghost',
                      style: { height: 24, padding: '0 6px', color: 'var(--text-3)' },
                      onClick: () => removeLine(l.id),
                    }, '\xd7')
                  )
                )
              )
            )
          ),
          lines.length === 0 && h('div', { style: { textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 13 } },
            'Search above to add line items.'
          )
        )
      ),
      /* footer */
      h('div', { style: { borderTop: '1px solid var(--line)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 14 } },
          h('span', { style: { color: 'var(--text-3)', marginRight: 8 } }, 'Total:'),
          h('span', { style: { fontWeight: 700, fontSize: 16 } }, fmt$(runningTotal))
        ),
        h('button', {
          className: 'btn primary',
          disabled: saving || !vendorId || lines.length === 0,
          onClick: createPO,
          style: { minWidth: 120 },
        }, saving ? 'Creating...' : 'Create PO')
      )
    );
  }

  /* ── Receive Items modal ── */
  function ReceiveModal({ po, onClose, onSave }) {
    const [qtys, setQtys] = useState(() =>
      Object.fromEntries(po.lines.map(l => [l.id, l.qtyReceived]))
    );

    function autoReceiveAll() {
      setQtys(Object.fromEntries(po.lines.map(l => [l.id, l.qtyOrdered])));
    }

    function save() {
      const updated = {
        ...po,
        lines: po.lines.map(l => ({ ...l, qtyReceived: Number(qtys[l.id]) || 0 })),
      };
      const allReceived = updated.lines.every(l => l.qtyReceived >= l.qtyOrdered);
      const anyReceived = updated.lines.some(l => l.qtyReceived > 0);
      updated.status = allReceived ? 'Finished' : (anyReceived ? 'Receiving' : po.status);
      onSave(updated);
    }

    return h('div', {
      style: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
      },
      onClick: e => { if (e.target === e.currentTarget) onClose(); },
    },
      h('div', {
        style: {
          background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)',
          width: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }
      },
        h('div', { style: { padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          h('div', null,
            h('div', { style: { fontWeight: 700, fontSize: 16 } }, 'Receive Items - ' + po.id),
            h('div', { style: { fontSize: 12, color: 'var(--text-3)', marginTop: 2 } }, po.vendor)
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { className: 'btn', onClick: autoReceiveAll }, 'Auto-receive All'),
            h('button', { className: 'btn ghost', style: { height: 28, padding: '0 8px' }, onClick: onClose }, '\xd7')
          )
        ),
        h('div', { style: { flex: 1, overflowY: 'auto', padding: 20 } },
          h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            h('thead', null,
              h('tr', { style: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--line)' } },
                h('th', { style: { textAlign: 'left', padding: '6px 8px', fontWeight: 600 } }, 'Item'),
                h('th', { style: { textAlign: 'right', padding: '6px 8px', fontWeight: 600 } }, 'Ordered'),
                h('th', { style: { textAlign: 'right', padding: '6px 8px', fontWeight: 600 } }, 'Prev. Received'),
                h('th', { style: { textAlign: 'right', padding: '6px 8px', fontWeight: 600, width: 110 } }, 'Now Receiving'),
                h('th', { style: { textAlign: 'center', padding: '6px 8px', fontWeight: 600, width: 80 } }, 'Exact')
              )
            ),
            h('tbody', null,
              po.lines.map(l =>
                h('tr', { key: l.id, style: { borderBottom: '1px solid var(--line)' } },
                  h('td', { style: { padding: '8px 8px' } },
                    h('div', { style: { fontWeight: 500, fontSize: 13 } }, l.name),
                    h('div', { style: { fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' } }, l.sku)
                  ),
                  h('td', { style: { padding: '8px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' } }, l.qtyOrdered),
                  h('td', { style: { padding: '8px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' } }, l.qtyReceived),
                  h('td', { style: { padding: '8px 8px', textAlign: 'right' } },
                    h('input', {
                      className: 'input',
                      type: 'number', min: 0, max: l.qtyOrdered,
                      value: qtys[l.id] ?? l.qtyReceived,
                      onChange: e => setQtys(prev => ({ ...prev, [l.id]: e.target.value })),
                      style: { width: 72, textAlign: 'right', padding: '4px 8px', fontFamily: 'var(--font-mono)' },
                    })
                  ),
                  h('td', { style: { padding: '8px 8px', textAlign: 'center' } },
                    h('input', {
                      type: 'checkbox',
                      checked: Number(qtys[l.id]) >= l.qtyOrdered,
                      onChange: e => setQtys(prev => ({ ...prev, [l.id]: e.target.checked ? l.qtyOrdered : 0 })),
                      style: { cursor: 'pointer', width: 16, height: 16 },
                    })
                  )
                )
              )
            )
          )
        ),
        h('div', { style: { borderTop: '1px solid var(--line)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8 } },
          h('button', { className: 'btn', onClick: onClose }, 'Cancel'),
          h('button', { className: 'btn primary', onClick: save }, 'Save Receiving')
        )
      )
    );
  }

  /* ── PO Detail Panel ── */
  function PODetail({ po: initPO, onBack, onUpdate }) {
    const [po, setPO] = useState(initPO);
    const [receiving, setReceiving] = useState(false);
    const [confirmComplete, setConfirmComplete] = useState(false);

    function receiveAll() {
      const updated = {
        ...po,
        status: 'Receiving',
        lines: po.lines.map(l => ({ ...l, qtyReceived: l.qtyOrdered })),
      };
      setPO(updated);
      onUpdate(updated);
    }

    function completePO() {
      const updated = { ...po, status: 'Finished' };
      setPO(updated);
      onUpdate(updated);
      setConfirmComplete(false);
    }

    function handleReceiveSave(updated) {
      setPO(updated);
      onUpdate(updated);
      setReceiving(false);
    }

    function printPO() {
      window.print();
    }

    const total = poTotal(po);
    const ordered = poOrdered(po);
    const received = poReceived(po);
    const vendor = VENDORS.find(v => v.id === po.vendorId || v.name === po.vendor);

    return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
      /* header */
      h('div', { style: { padding: '14px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 } },
        h('button', {
          className: 'btn ghost',
          style: { height: 28, padding: '0 8px', fontSize: 18, lineHeight: 1 },
          onClick: onBack,
        }, '←'),
        h(VendorInitials, { vendor: po }),
        h('div', { style: { flex: 1 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('span', { style: { fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' } }, po.id),
            statusBadge(po.status),
            h('span', { style: { color: 'var(--text-2)', fontSize: 13 } }, po.vendor),
          ),
          h('div', { style: { fontSize: 11, color: 'var(--text-3)', marginTop: 2 } },
            'Created ' + po.created + ' \xb7 Expected ' + po.expected +
            (po.ref ? ' \xb7 Ref: ' + po.ref : '')
          )
        ),
        /* actions */
        po.status !== 'Finished' && po.status !== 'Cancelled' && h('button', {
          className: 'btn',
          onClick: () => setReceiving(true),
        }, 'Receive Items'),
        po.status !== 'Finished' && po.status !== 'Cancelled' && h('button', {
          className: 'btn',
          onClick: receiveAll,
          style: { marginLeft: 4 },
        }, 'Receive All'),
        po.status === 'Receiving' && h('button', {
          className: 'btn primary',
          onClick: () => setConfirmComplete(true),
          style: { marginLeft: 4 },
        }, 'Complete PO'),
        h('button', {
          className: 'btn ghost',
          onClick: printPO,
          style: { height: 32, padding: '0 10px', marginLeft: 4 },
        }, 'Print')
      ),
      /* body — two columns: PO lines (left) + vendor sheet sidebar (§16) */
      h('div', { style: { flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 24px' } },
        h('div', { style: { flex: 1, minWidth: 0 } },
        /* notes */
        po.notes && h('div', {
          style: {
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 6, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: 'var(--text-2)',
          }
        }, '⚠️ ', po.notes),
        /* line items table */
        h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
          h('thead', null,
            h('tr', { style: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--line)' } },
              h('th', { style: { textAlign: 'left', padding: '8px 10px', fontWeight: 600 } }, 'Item'),
              h('th', { style: { textAlign: 'left', padding: '8px 10px', fontWeight: 600 } }, 'SKU'),
              h('th', { style: { textAlign: 'right', padding: '8px 10px', fontWeight: 600 } }, 'Ordered'),
              h('th', { style: { textAlign: 'right', padding: '8px 10px', fontWeight: 600 } }, 'Received'),
              h('th', { style: { textAlign: 'right', padding: '8px 10px', fontWeight: 600 } }, 'Variance'),
              h('th', { style: { textAlign: 'right', padding: '8px 10px', fontWeight: 600 } }, 'Unit Cost'),
              h('th', { style: { textAlign: 'right', padding: '8px 10px', fontWeight: 600 } }, 'Total'),
              po.status !== 'Finished' && po.status !== 'Cancelled' &&
                h('th', { style: { width: 90 } })
            )
          ),
          h('tbody', null,
            po.lines.map(l => {
              const variance = l.qtyReceived - l.qtyOrdered;
              const [lineQty, setLineQty] = useState(l.qtyReceived);
              const [editing, setEditing] = useState(false);

              function saveLineReceive() {
                const updated = {
                  ...po,
                  lines: po.lines.map(x => x.id === l.id ? { ...x, qtyReceived: Number(lineQty) } : x),
                };
                const allDone = updated.lines.every(x => x.qtyReceived >= x.qtyOrdered);
                const anyDone = updated.lines.some(x => x.qtyReceived > 0);
                if (po.status === 'Open' && anyDone) updated.status = 'Receiving';
                setPO(updated);
                onUpdate(updated);
                setEditing(false);
              }

              return h('tr', { key: l.id, style: { borderBottom: '1px solid var(--line)' } },
                h('td', { style: { padding: '10px 10px', fontSize: 13 } }, l.name),
                h('td', { style: { padding: '10px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' } }, l.sku),
                h('td', { style: { padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' } }, l.qtyOrdered),
                h('td', { style: { padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: l.qtyReceived >= l.qtyOrdered ? '#4ade80' : 'var(--text-1)' } }, l.qtyReceived),
                h('td', { style: { padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: variance < 0 ? '#fbbf24' : variance > 0 ? '#60a5fa' : 'var(--text-3)' } },
                  variance === 0 ? '-' : (variance > 0 ? '+' : '') + variance
                ),
                h('td', { style: { padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' } }, fmt$(l.unitCost)),
                h('td', { style: { padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 } }, fmt$(l.qtyOrdered * l.unitCost)),
                po.status !== 'Finished' && po.status !== 'Cancelled' && h('td', { style: { padding: '10px 10px' } },
                  editing
                    ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
                        h('input', {
                          className: 'input',
                          type: 'number', min: 0, value: lineQty,
                          onChange: e => setLineQty(e.target.value),
                          style: { width: 52, padding: '3px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' },
                        }),
                        h('button', { className: 'btn primary', style: { height: 26, padding: '0 8px', fontSize: 11 }, onClick: saveLineReceive }, 'OK'),
                        h('button', { className: 'btn ghost', style: { height: 26, padding: '0 6px' }, onClick: () => setEditing(false) }, '\xd7')
                      )
                    : h('button', { className: 'btn', style: { height: 26, fontSize: 11 }, onClick: () => setEditing(true) }, 'Receive')
                )
              );
            })
          )
        ),
        /* totals */
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 16 } },
          h('div', { style: { minWidth: 240, fontSize: 13 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-2)' } },
              h('span', null, 'Items ordered:'), h('span', { style: { fontFamily: 'var(--font-mono)' } }, ordered)
            ),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-2)' } },
              h('span', null, 'Items received:'), h('span', { style: { fontFamily: 'var(--font-mono)' } }, received)
            ),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--line)', fontWeight: 700, fontSize: 15, marginTop: 4 } },
              h('span', null, 'PO Total:'), h('span', { style: { fontFamily: 'var(--font-mono)' } }, fmt$(total))
            )
          )
        )
        ), /* close left column */

        /* ── Right column: Vendor sheet sidebar (§16) ── */
        vendor && h('div', {
          className: 'aside-card po-vendor-sheet',
          style: { width: 280, flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--line)', alignSelf: 'flex-start' },
        },
          h('div', { className: 'card-head', style: { padding: '12px 16px', borderBottom: '1px solid var(--line)' } },
            h('span', { className: 'sub', style: { display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' } }, 'VENDOR'),
            h('h3', { style: { margin: '2px 0 0', fontSize: 14, fontWeight: 700 } }, vendor.name)
          ),
          h('div', { className: 'aside-row', style: { display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: 12, gap: 10 } },
            h('span', { className: 'k', style: { color: 'var(--text-3)' } }, 'Account #'),
            h('span', { className: 'v mono', style: { fontFamily: 'var(--font-mono)' } }, vendor.account || '—')
          ),
          h('div', { className: 'aside-row', style: { display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: 12, gap: 10 } },
            h('span', { className: 'k', style: { color: 'var(--text-3)' } }, 'Type'),
            h('span', { className: 'v' }, vendor.type || '—')
          ),
          h('div', { className: 'aside-row', style: { display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: 12, gap: 10 } },
            h('span', { className: 'k', style: { color: 'var(--text-3)' } }, 'Phone'),
            h('span', { className: 'v mono', style: { fontFamily: 'var(--font-mono)' } }, vendor.phone || '—')
          ),
          h('div', { className: 'aside-row', style: { display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: 12, gap: 10 } },
            h('span', { className: 'k', style: { color: 'var(--text-3)', flexShrink: 0 } }, 'Email'),
            h('span', { className: 'v mono', style: { fontFamily: 'var(--font-mono)', fontSize: 11, textAlign: 'right', wordBreak: 'break-all' } }, vendor.email || '—')
          ),
          h('div', { className: 'aside-row', style: { display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: 12, gap: 10 } },
            h('span', { className: 'k', style: { color: 'var(--text-3)' } }, 'Location'),
            h('span', { className: 'v', style: { textAlign: 'right' } }, vendor.location || '—')
          ),
          h('div', { className: 'aside-row', style: { display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: 12, gap: 10 } },
            h('span', { className: 'k', style: { color: 'var(--text-3)' } }, 'API'),
            h('span', { className: 'v', style: { color: vendor.apiAvailable ? '#4ade80' : 'var(--text-3)' } }, vendor.apiAvailable ? 'Available' : 'Not connected')
          ),
          vendor.notes && h('div', {
            style: { padding: '12px 16px', borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'pre-wrap', fontStyle: 'italic' },
          }, vendor.notes)
        )
      ),
      /* Receive Items modal */
      receiving && h(ReceiveModal, { po, onClose: () => setReceiving(false), onSave: handleReceiveSave }),
      /* Confirm complete */
      confirmComplete && h('div', {
        style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
        onClick: e => { if (e.target === e.currentTarget) setConfirmComplete(false); },
      },
        h('div', { style: { background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)', padding: 24, width: 360, boxShadow: '0 16px 48px rgba(0,0,0,0.5)' } },
          h('div', { style: { fontWeight: 700, fontSize: 15, marginBottom: 10 } }, 'Complete PO?'),
          h('div', { style: { fontSize: 13, color: 'var(--text-2)', marginBottom: 20 } }, 'This will mark the PO as Finished and update inventory quantities in Lightspeed.'),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
            h('button', { className: 'btn', onClick: () => setConfirmComplete(false) }, 'Cancel'),
            h('button', { className: 'btn primary', onClick: completePO }, 'Complete PO')
          )
        )
      )
    );
  }

  /* ── Vendor Directory ── */
  function VendorDirectory({ onNewPO }) {
    const [search, setSearch] = useState('');
    const filtered = VENDORS.filter(v =>
      !search || v.name.toLowerCase().includes(search.toLowerCase())
    ).filter(v => v.id !== 'other');

    return h('div', null,
      h('div', { style: { marginBottom: 16 } },
        h('input', {
          className: 'input',
          placeholder: 'Search vendors...',
          value: search,
          onChange: e => setSearch(e.target.value),
          style: { maxWidth: 320 },
        })
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 } },
        filtered.map(v =>
          h('div', {
            key: v.id,
            style: {
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 8, padding: 16,
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 } },
              h('span', {
                style: {
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 40, borderRadius: 8,
                  background: v.color, color: '#fff',
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
                  fontFamily: 'var(--font-mono)', flexShrink: 0,
                }
              }, v.initials),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontWeight: 700, fontSize: 14 } }, v.name),
                h('div', { style: { fontSize: 11, color: v.type === 'Distributor' ? '#60a5fa' : 'var(--text-3)', marginTop: 2 } },
                  v.type,
                  v.apiAvailable && h('span', {
                    style: { marginLeft: 6, background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)', padding: '1px 5px', borderRadius: 3, fontSize: 10 }
                  }, 'API')
                )
              )
            ),
            h('div', { style: { fontSize: 12, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 } },
              v.location && h('div', null, '📍 ', v.location),
              v.phone && h('div', null, '📞 ', v.phone),
              v.email && h('div', null, '✉️ ', v.email),
              v.account && h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' } }, 'Acct: ', v.account),
              v.notes && h('div', { style: { color: 'var(--text-3)', fontStyle: 'italic' } }, v.notes)
            ),
            h('button', {
              className: 'btn',
              style: { width: '100%', justifyContent: 'center' },
              onClick: () => onNewPO(v),
            }, '+ New PO')
          )
        )
      )
    );
  }

  /* ── PO List View ── */
  function POList({ pos, loading, onSelect, onNew }) {
    const [filter, setFilter] = useState('All');
    const [vendorFilter, setVendorFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'created', dir: 'desc' });

    const filters = ['All', 'Open', 'Receiving', 'Finished', 'Cancelled'];

    // Derive vendor list from active POs (only vendors that appear in the list)
    const activeVendors = ['All', ...Array.from(new Set(pos.map(p => p.vendorId || p.vendor))).sort()];
    const vendorLabel = (vid) => {
      const v = VENDORS.find(x => x.id === vid);
      return v ? v.short : vid;
    };

    let filtered = pos.filter(po => {
      if (filter !== 'All' && po.status !== filter) return false;
      if (vendorFilter !== 'All' && (po.vendorId || po.vendor) !== vendorFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return po.id.toLowerCase().includes(q) || po.vendor.toLowerCase().includes(q) || po.ref.toLowerCase().includes(q);
      }
      return true;
    });

    filtered = [...filtered].sort((a, b) => {
      let av, bv;
      if (sort.key === 'date' || sort.key === 'created') { av = a.created; bv = b.created; }
      else if (sort.key === 'vendor') { av = a.vendor; bv = b.vendor; }
      else if (sort.key === 'total') { av = poTotal(a); bv = poTotal(b); }
      else { av = a.created; bv = b.created; }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    function toggleSort(key) {
      setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
    }

    function SortTh({ label, sortKey, style: st }) {
      const active = sort.key === sortKey;
      return h('th', {
        style: { ...st, cursor: 'pointer', userSelect: 'none', fontWeight: active ? 700 : 600 },
        onClick: () => toggleSort(sortKey),
      },
        label,
        active && h('span', { style: { marginLeft: 4, opacity: 0.7 } }, sort.dir === 'asc' ? '↑' : '↓')
      );
    }

    const counts = {};
    filters.forEach(f => { counts[f] = f === 'All' ? pos.length : pos.filter(p => p.status === f).length; });

    return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
      /* toolbar */
      h('div', { style: { padding: '14px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
        /* status filters */
        h('div', { style: { display: 'flex', gap: 4 } },
          filters.map(f =>
            h('button', {
              key: f,
              className: 'btn' + (filter === f ? ' primary' : ' ghost'),
              style: { height: 28, padding: '0 10px', fontSize: 12 },
              onClick: () => setFilter(f),
            },
              f,
              h('span', { style: { marginLeft: 5, opacity: 0.65, fontFamily: 'var(--font-mono)', fontSize: 11 } }, counts[f])
            )
          )
        ),
        h('div', { style: { flex: 1 } }),
        h('input', {
          className: 'input',
          placeholder: 'Search PO#, vendor, ref...',
          value: search,
          onChange: e => setSearch(e.target.value),
          style: { width: 240 },
        }),
        h('button', { className: 'btn primary', onClick: onNew }, '+ New Purchase Order')
      ),
      /* Vendor filter pills */
      activeVendors.length > 2 && h('div', {
        style: {
          padding: '8px 24px', borderBottom: '1px solid var(--line)',
          display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center',
        }
      },
        h('span', { style: { fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Vendor:'),
        activeVendors.map(vid =>
          h('button', {
            key: vid,
            onClick: () => setVendorFilter(vid),
            style: {
              height: 24, padding: '0 10px', fontSize: 11, borderRadius: 12,
              border: '1px solid ' + (vendorFilter === vid ? 'var(--accent-dim, rgba(200,57,44,0.5))' : 'var(--line)'),
              background: vendorFilter === vid ? 'rgba(200,57,44,0.12)' : 'var(--bg-2)',
              color: vendorFilter === vid ? 'var(--accent, #c8392c)' : 'var(--text-2)',
              cursor: 'pointer', fontFamily: 'var(--font-mono)',
              transition: 'all 0.1s',
            },
          }, vid === 'All' ? 'All' : vendorLabel(vid))
        )
      ),
      /* table */
      h('div', { style: { flex: 1, overflowY: 'auto' } },
        h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
          h('thead', { style: { position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 } },
            h('tr', { style: { fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--line)' } },
              h('th', { style: { textAlign: 'left', padding: '10px 12px', fontWeight: 600 } }, 'PO#'),
              h(SortTh, { label: 'Vendor', sortKey: 'vendor', style: { textAlign: 'left', padding: '10px 12px' } }),
              h('th', { style: { textAlign: 'left', padding: '10px 12px', fontWeight: 600 } }, 'Ref#'),
              h('th', { style: { textAlign: 'left', padding: '10px 12px', fontWeight: 600 } }, 'Status'),
              h(SortTh, { label: 'Ordered', sortKey: 'date', style: { textAlign: 'left', padding: '10px 12px' } }),
              h('th', { style: { textAlign: 'left', padding: '10px 12px', fontWeight: 600 } }, 'Expected'),
              h('th', { style: { textAlign: 'right', padding: '10px 12px', fontWeight: 600 } }, '# Items'),
              h('th', { style: { textAlign: 'right', padding: '10px 12px', fontWeight: 600 } }, '# Rcvd'),
              h(SortTh, { label: 'Total', sortKey: 'total', style: { textAlign: 'right', padding: '10px 12px' } })
            )
          ),
          h('tbody', null,
            loading
              ? [1, 2, 3].map(i =>
                  h('tr', { key: i },
                    h('td', { colSpan: 9, style: { padding: 12 } },
                      h('div', { style: { height: 14, background: 'var(--bg3)', animation: 'pulse 1.5s infinite', borderRadius: 4 } })
                    )
                  )
                )
              : filtered.length === 0
                ? [h('tr', { key: 'empty' }, h('td', { colSpan: 9, style: { textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' } }, 'No purchase orders found.'))]
                : filtered.map(po => h(PORow, { key: po.id, po, onSelect }))
          )
        )
      )
    );
  }

  /* ── Main Screen ── */
  function PurchaseOrdersScreen() {
    const [tab, setTab] = useState('orders'); // 'orders' | 'vendors'
    const [pos, setPOs] = useState(MOCK_POS);
    const [loadingPOs, setLoadingPOs] = useState(true);
    const [selectedPO, setSelectedPO] = useState(null);
    const [newPO, setNewPO] = useState(false);
    const [newPOVendor, setNewPOVendor] = useState(null);

    useEffect(() => {
      let cancelled = false;
      setLoadingPOs(true);
      fetch(WORKER + '/api/purchase-orders')
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          const raw = data?.purchaseorders;
          if (!Array.isArray(raw) || raw.length === 0) return;
          const mapped = raw.map(po => ({
            id: 'PO-' + po.orderID,
            vendor: po.Vendor?.name || 'Unknown',
            vendorId: '',
            ref: po.vendorOrderNumber || '',
            date: po.orderDate?.slice(0, 10) || '',
            created: po.orderDate?.slice(0, 10) || '',
            expected: po.expectedDate?.slice(0, 10) || '',
            status: po.status === 'Open' ? 'Open' : po.status === 'Closed' ? 'Finished' : 'Open',
            total: parseFloat(po.total?.amount || 0),
            notes: po.notes || '',
            lines: [],
          }));
          setPOs(mapped);
        })
        .catch(() => { /* keep mock data on error */ })
        .finally(() => { if (!cancelled) setLoadingPOs(false); });
      return () => { cancelled = true; };
    }, []);

    function handleUpdate(updated) {
      setPOs(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (selectedPO?.id === updated.id) setSelectedPO(updated);
    }

    function handleCreated(po) {
      setPOs(prev => [po, ...prev]);
      setNewPO(false);
      setNewPOVendor(null);
      setSelectedPO(po);
      toast('PO ' + po.id + ' created', 'success');
    }

    function openNewPO(vendor) {
      setNewPOVendor(vendor || null);
      setNewPO(true);
      setTab('orders');
    }

    // Page header
    const pageHead = h('div', { className: 'page-head' },
      h('div', null,
        h('div', { className: 'page-sub' }, 'Purchasing'),
        h('div', { className: 'page-title' }, 'Purchase Orders')
      ),
      h('div', { className: 'page-head-actions' },
        /* tab switcher */
        h('div', { style: { display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 6, padding: 3 } },
          ['orders', 'vendors'].map(t =>
            h('button', {
              key: t,
              onClick: () => { setTab(t); setSelectedPO(null); setNewPO(false); },
              style: {
                height: 26, padding: '0 12px', fontSize: 12, border: 'none', borderRadius: 4,
                cursor: 'pointer', fontWeight: tab === t ? 600 : 400,
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-2)',
                transition: 'all 0.15s',
              }
            }, t === 'orders' ? 'Purchase Orders' : 'Vendor Directory')
          )
        )
      )
    );

    // New PO form overlay
    if (newPO) {
      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' } },
        pageHead,
        h('div', { style: { flex: 1, overflow: 'hidden' } },
          h(NewPOForm, {
            defaultVendor: newPOVendor,
            onClose: () => { setNewPO(false); setNewPOVendor(null); },
            onCreated: handleCreated,
          })
        )
      );
    }

    // PO detail
    if (selectedPO) {
      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' } },
        pageHead,
        h('div', { style: { flex: 1, overflow: 'hidden' } },
          h(PODetail, { po: selectedPO, onBack: () => setSelectedPO(null), onUpdate: handleUpdate })
        )
      );
    }

    // Main view
    return h(Fragment, null,
      pageHead,
      tab === 'orders'
        ? h(POList, { pos, loading: loadingPOs, onSelect: setSelectedPO, onNew: () => openNewPO(null) })
        : h('div', { style: { padding: '20px 24px' } },
            h(VendorDirectory, { onNewPO: openNewPO })
          )
    );
  }

  /* ── toast helper (uses global if available) ── */
  function toast(msg, type) {
    if (typeof window._posToast === 'function') { window._posToast(msg, type); return; }
    // fallback: attempt global toast
    if (typeof window.posToast === 'function') window.posToast(msg, type);
  }

  /* ── Export ── */
  window.PurchaseOrdersScreen = PurchaseOrdersScreen;
})();
