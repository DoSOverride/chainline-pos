'use strict';
// ChainLine POS — Inventory Screen
// Requires: React 18 CDN, pos-styles.css

(function () {
  const { createElement: h, useState, useEffect, useRef, useCallback, Fragment } = React;

  /* ── Constants ── */
  const WORKER = 'https://still-term-f1ec.taocaruso77.workers.dev';
  const PAGE_SIZE = 50;

  const DEPT_EMOJI = {
    'Cassette': '⚙️', 'Chains': '🔗', 'Brakes': '🛑',
    'Tires': '⚫', 'Helmet': '🪖', 'Clothing': '👕',
    'Tools': '🔧', 'Lights': '💡', 'Locks': '🔒',
    'Bags': '🎒', 'Shoes': '💟', 'Gloves': '🧤',
    'Tubes': '○', 'Fenders': '🛡️', 'Computers': '📶',
    'Handlebars': '🛤️', 'Saddles': '💆', 'Pedals': '🦵',
    'Wheels': '⭕', 'Suspension': '💨', 'Drivetrain': '⛓️',
  };

  const DEPTS = [
    'All Departments', 'Cassette', 'Chains', 'Brakes', 'Tires', 'Helmet',
    'Clothing', 'Tools', 'Lights', 'Locks', 'Bags', 'Shoes', 'Gloves',
    'Tubes', 'Fenders', 'Computers', 'Handlebars', 'Saddles', 'Pedals',
    'Wheels', 'Suspension', 'Drivetrain',
  ];

  const ADJUST_REASONS = [
    'Received from supplier', 'Damaged / write-off', 'Staff use',
    'Counted inventory', 'Transfer in', 'Transfer out', 'Return from customer',
    'Other',
  ];

  /* ── Mock data for offline/dev ── */
  const MOCK_ITEMS = [
    { id: 1, sku: 'SHIM-XT-CS-12', customSku: '', name: 'Shimano XT M8100 Cassette 12-spd', brand: 'Shimano', dept: 'Cassette', qty: 3, reorderPt: 2, reorderQty: 5, price: 189.00, cost: 98.00, lastReceived: 98.00, upc: '192790000001', description: 'XT-grade 12-speed cassette, 10-51T.', tags: ['shimano','xt','12spd'] },
    { id: 2, sku: 'TIRE-MAXX-29-DH', customSku: '', name: 'Maxxis Minion DHF 29x2.5 3C MaxxGrip', brand: 'Maxxis', dept: 'Tires', qty: 8, reorderPt: 3, reorderQty: 6, price: 84.00, cost: 44.00, lastReceived: 44.00, upc: '192790000002', description: 'Enduro/DH front tire.', tags: ['maxxis','29er'] },
    { id: 3, sku: 'CHAIN-XT-126L', customSku: '', name: 'Shimano XT Chain 126L', brand: 'Shimano', dept: 'Chains', qty: 5, reorderPt: 3, reorderQty: 10, price: 62.00, cost: 32.00, lastReceived: 32.00, upc: '192790000003', description: '12-speed XT chain.', tags: ['shimano','chain'] },
    { id: 4, sku: 'BRAKE-PAD-CODE', customSku: '', name: 'SRAM Code Brake Pads Metallic', brand: 'SRAM', dept: 'Brakes', qty: 14, reorderPt: 4, reorderQty: 8, price: 38.00, cost: 19.00, lastReceived: 19.00, upc: '192790000004', description: 'Metallic pads for Code brakes.', tags: ['sram','brakes'] },
    { id: 5, sku: 'GREASE-SLICK', customSku: '', name: 'SlickHoney Suspension Grease 32g', brand: 'Fox', dept: 'Tools', qty: 0, reorderPt: 2, reorderQty: 6, price: 18.00, cost: 9.00, lastReceived: 9.00, upc: '192790000005', description: 'Fox float fluid 32g syringe.', tags: ['fox','grease'] },
    { id: 6, sku: 'GRIP-ODI-ELITE', customSku: '', name: 'ODI Elite Pro Lock-On Grips', brand: 'ODI', dept: 'Handlebars', qty: 9, reorderPt: 2, reorderQty: 10, price: 32.00, cost: 16.00, lastReceived: 16.00, upc: '192790000006', description: 'Lock-on grips, 130mm.', tags: ['odi','grips'] },
    { id: 7, sku: 'TUBE-29-PRES', customSku: '', name: '29" Tube Presta Valve', brand: 'Bontrager', dept: 'Tubes', qty: 38, reorderPt: 10, reorderQty: 24, price: 11.00, cost: 5.00, lastReceived: 5.00, upc: '192790000007', description: '29" presta inner tube.', tags: ['tube','29er'] },
    { id: 8, sku: 'HELM-SMITH-FOREFRONT', customSku: '', name: 'Smith Forefront 2 MIPS Helmet', brand: 'Smith', dept: 'Helmet', qty: 2, reorderPt: 2, reorderQty: 4, price: 280.00, cost: 140.00, lastReceived: 140.00, upc: '192790000008', description: 'Trail/enduro full-coverage lid.', tags: ['smith','helmet','mips'] },
    { id: 9, sku: 'LOCK-KRYPTO-EVO', customSku: '', name: 'Kryptonite Evolution Mini-7 U-Lock', brand: 'Kryptonite', dept: 'Locks', qty: 4, reorderPt: 2, reorderQty: 6, price: 72.00, cost: 36.00, lastReceived: 36.00, upc: '192790000009', description: 'Security rating 7/10. 3.25" x 6.5".', tags: ['lock','kryptonite'] },
    { id: 10, sku: 'LIGHT-CYGOLITE-F', customSku: '', name: 'Cygolite Metro Pro 1100 Front Light', brand: 'Cygolite', dept: 'Lights', qty: 1, reorderPt: 2, reorderQty: 4, price: 89.00, cost: 44.00, lastReceived: 44.00, upc: '192790000010', description: '1100 lumen USB-C rechargeable.', tags: ['light','cygolite'] },
  ];

  const MOCK_SALES = [
    { date: '2026-05-18', qty: 1, customer: 'Hannah Riise', price: 189.00 },
    { date: '2026-05-15', qty: 2, customer: 'Devon Tran', price: 189.00 },
    { date: '2026-05-10', qty: 1, customer: 'Marc Lefebvre', price: 189.00 },
  ];

  /* ── Utilities ── */
  function fmt$(n) {
    return '$' + Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function margin(price, cost) {
    if (!cost || !price || price <= 0) return '--';
    return Math.round(((price - cost) / price) * 100) + '%';
  }
  function deptEmoji(dept) {
    return DEPT_EMOJI[dept] || '📦';
  }
  function qtyColor(qty) {
    if (qty === 0) return 'var(--red)';
    if (qty <= 4) return 'var(--amber)';
    return 'var(--green)';
  }
  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
  function exportCSV(items) {
    const cols = ['SKU', 'Name', 'Brand', 'Department', 'Qty', 'Price', 'Cost'];
    const rows = items.map(it => [
      it.sku, it.name, it.brand, it.dept, it.qty, it.price, it.cost,
    ].map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(','));
    const blob = new Blob([cols.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chainline-inventory-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function generateZPL(item) {
    return `^XA
^FO20,20^BCN,60,Y,N,N^FD${item.sku}^FS
^FO20,100^A0N,18,18^FD${item.name.slice(0, 40)}^FS
^FO20,124^A0N,16,16^FDPrice: ${fmt$(item.price)}^FS
^XZ`;
  }
  function printLabel(item) {
    const zpl = generateZPL(item);
    const win = window.open('', '_blank', 'width=600,height=400');
    win.document.write(`<html><head><title>Label: ${item.sku}</title></head><body>
      <h2>ZPL Label: ${item.sku}</h2>
      <p style="font-family:monospace;white-space:pre;background:#f5f5f5;padding:12px;font-size:12px">${zpl}</p>
      <p style="color:#888;font-size:12px">Send this ZPL to your Zebra printer via its IP address or USB.</p>
      <button onclick="window.print()">Print</button>
    </body></html>`);
    win.document.close();
  }

  /* ── Image resolution with IntersectionObserver lazy load ── */
  function ItemThumb({ item }) {
    const ref = useRef(null);
    const [src, setSrc] = useState(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const obs = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        // Resolution chain
        const idx = window.POS_IMG_INDEX || {};
        const imgUrl = idx[item.sku] || idx[item.customSku] || item.image || null;
        if (imgUrl) setSrc(imgUrl);
      }, { rootMargin: '200px' });
      obs.observe(el);
      return () => obs.disconnect();
    }, [item.sku, item.customSku, item.image]);

    if (!src) {
      return h('div', {
        ref,
        style: {
          width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, background: 'var(--bg-2)', border: '1px solid var(--line)',
          flexShrink: 0,
        },
      }, deptEmoji(item.dept));
    }

    return h('div', {
      ref,
      style: { width: 32, height: 32, flexShrink: 0, overflow: 'hidden', background: 'var(--bg-2)', border: '1px solid var(--line)', position: 'relative' },
    },
      !loaded && h('div', {
        style: {
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 14,
        },
      }, deptEmoji(item.dept)),
      h('img', {
        src,
        onLoad: () => setLoaded(true),
        onError: () => setSrc(null),
        style: { width: 32, height: 32, objectFit: 'contain', display: loaded ? 'block' : 'none' },
      })
    );
  }

  /* ── Options Menu ── */
  function OptionsMenu({ item, onEdit, onAdjust, onOrderMore, onArchive, onNewSale }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      if (!open) return;
      function onClickOut(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
      document.addEventListener('mousedown', onClickOut);
      return () => document.removeEventListener('mousedown', onClickOut);
    }, [open]);

    return h('div', { ref, style: { position: 'relative' } },
      h('button', {
        className: 'btn ghost',
        style: { padding: '3px 6px', fontSize: 14 },
        onClick: (e) => { e.stopPropagation(); setOpen(v => !v); },
        title: 'Options',
      }, '⋯'),
      open && h('div', {
        style: {
          position: 'absolute', right: 0, top: '100%', zIndex: 200,
          background: 'var(--bg-2)', border: '1px solid var(--line-2)',
          minWidth: 160, boxShadow: 'none',
        },
      },
        menuItem('Edit Price', () => { setOpen(false); onEdit(item); }),
        menuItem('Adjust Qty', () => { setOpen(false); onAdjust(item); }),
        menuItem('Print Label', () => { setOpen(false); printLabel(item); }),
        menuItem('Order More', () => { setOpen(false); onOrderMore(item); }),
        menuItem('New Sale', () => { setOpen(false); onNewSale(item); }),
        h('div', { style: { borderTop: '1px solid var(--line)', margin: '2px 0' } }),
        menuItem('Archive Item', () => { setOpen(false); onArchive(item); }, true),
      )
    );
  }

  function menuItem(label, onClick, danger) {
    return h('button', {
      key: label,
      style: {
        display: 'block', width: '100%', textAlign: 'left',
        padding: '8px 14px', background: 'none', border: 'none',
        color: danger ? 'var(--red)' : 'var(--text-1)',
        fontSize: 12, cursor: 'pointer',
      },
      onMouseEnter: e => e.currentTarget.style.background = 'var(--bg-3)',
      onMouseLeave: e => e.currentTarget.style.background = 'none',
      onClick,
    }, label);
  }

  /* ── Adjust Qty Modal ── */
  function AdjustQtyModal({ item, onClose, onSave }) {
    const [reason, setReason] = useState(ADJUST_REASONS[0]);
    const [delta, setDelta] = useState('');
    const [note, setNote] = useState('');
    const newQty = item.qty + (parseInt(delta, 10) || 0);

    function save() {
      const d = parseInt(delta, 10);
      if (!d) { return; }
      onSave({ itemId: item.id, delta: d, reason, note });
      onClose();
    }

    return h(InvModal, { title: 'Adjust Qty - ' + item.sku, onClose, width: 440 },
      h('div', { style: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' } },
          item.name, h('span', { style: { marginLeft: 8, color: 'var(--text-3)' } }, 'Current: ', item.qty)
        ),
        h('div', null,
          h('label', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', display: 'block', marginBottom: 5 } }, 'Reason'),
          h('select', {
            className: 'select', value: reason,
            onChange: e => setReason(e.target.value),
          }, ADJUST_REASONS.map(r => h('option', { key: r, value: r }, r)))
        ),
        h('div', null,
          h('label', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', display: 'block', marginBottom: 5 } }, 'Qty Change (+/-)'),
          h('input', {
            className: 'input mono', type: 'number', placeholder: '+5 or -2',
            value: delta, onChange: e => setDelta(e.target.value),
            autoFocus: true,
          })
        ),
        delta && !isNaN(parseInt(delta, 10)) && h('div', {
          style: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)', padding: '8px 10px', background: 'var(--bg-1)', borderLeft: '3px solid var(--line-3)' }
        }, item.qty, ' → ', h('strong', { style: { color: newQty < 0 ? 'var(--red)' : 'var(--text)' } }, newQty)),
        h('div', null,
          h('label', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', display: 'block', marginBottom: 5 } }, 'Note (optional)'),
          h('textarea', {
            className: 'textarea', placeholder: 'e.g. counted stock 2026-05-20',
            value: note, onChange: e => setNote(e.target.value), style: { minHeight: 60 },
          })
        ),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 } },
          h('button', { className: 'btn ghost', onClick: onClose }, 'Cancel'),
          h('button', { className: 'btn primary', onClick: save, disabled: !delta || isNaN(parseInt(delta, 10)) }, 'Save Adjustment'),
        )
      )
    );
  }

  /* ── Edit Price Modal ── */
  function EditPriceModal({ item, onClose, onSave }) {
    const [price, setPrice] = useState(String(item.price));
    const [cost, setCost] = useState(String(item.cost));

    function save() {
      const p = parseFloat(price), c = parseFloat(cost);
      if (isNaN(p) || p < 0) return;
      onSave({ itemId: item.id, price: p, cost: isNaN(c) ? item.cost : c });
      onClose();
    }

    return h(InvModal, { title: 'Edit Price - ' + item.sku, onClose, width: 380 },
      h('div', { style: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)', marginBottom: 4 } }, item.name),
        h('div', null,
          h('label', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', display: 'block', marginBottom: 5 } }, 'Sell Price'),
          h('input', { className: 'input mono', type: 'number', step: '0.01', value: price, onChange: e => setPrice(e.target.value), autoFocus: true })
        ),
        h('div', null,
          h('label', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', display: 'block', marginBottom: 5 } }, 'Cost'),
          h('input', { className: 'input mono', type: 'number', step: '0.01', value: cost, onChange: e => setCost(e.target.value) })
        ),
        price && cost && !isNaN(parseFloat(price)) && !isNaN(parseFloat(cost)) && h('div', {
          style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', padding: '6px 10px', background: 'var(--bg-1)' }
        }, 'Margin: ', h('strong', { style: { color: 'var(--green)' } }, margin(parseFloat(price), parseFloat(cost)))),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 } },
          h('button', { className: 'btn ghost', onClick: onClose }, 'Cancel'),
          h('button', { className: 'btn primary', onClick: save }, 'Save'),
        )
      )
    );
  }

  /* ── Bulk Price Adjust Modal ── */
  function BulkPriceModal({ count, onClose, onSave }) {
    const [pct, setPct] = useState('');
    function save() {
      const p = parseFloat(pct);
      if (isNaN(p)) return;
      onSave(p);
      onClose();
    }
    return h(InvModal, { title: 'Adjust All Prices', onClose, width: 360 },
      h('div', { style: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 } },
        h('div', { style: { color: 'var(--text-2)', fontSize: 12 } }, 'Applies to ', h('strong', null, count), ' selected items.'),
        h('div', null,
          h('label', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)', display: 'block', marginBottom: 5 } }, 'Percentage Change'),
          h('input', { className: 'input mono', type: 'number', step: '0.1', placeholder: '+10 or -5', value: pct, onChange: e => setPct(e.target.value), autoFocus: true })
        ),
        h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 } },
          h('button', { className: 'btn ghost', onClick: onClose }, 'Cancel'),
          h('button', { className: 'btn primary', onClick: save }, 'Apply'),
        )
      )
    );
  }

  /* ── Generic Modal wrapper ── */
  function InvModal({ title, onClose, width, children }) {
    useEffect(() => {
      function onKey(e) { if (e.key === 'Escape') onClose(); }
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return h('div', {
      style: {
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
      onClick: e => { if (e.target === e.currentTarget) onClose(); },
    },
      h('div', {
        style: {
          width: width || 480, background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
        },
      },
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid var(--line)',
          },
        },
          h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-2)' } }, title),
          h('button', {
            style: { background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18, lineHeight: 1, padding: '2px 4px', cursor: 'pointer' },
            onClick: onClose,
          }, '\xd7')
        ),
        children
      )
    );
  }

  /* ── Item Detail Panel ── */
  function ItemDetailPanel({ item, onClose, isManager, onEdit, onAdjust, onNewSale, onAddToPO }) {
    const [editing, setEditing] = useState(false);
    const [editPrice, setEditPrice] = useState(String(item.price));
    const [editCost, setEditCost] = useState(String(item.cost));
    const [editReorder, setEditReorder] = useState(String(item.reorderPt));

    // Resolve image
    const idx = window.POS_IMG_INDEX || {};
    const imgSrc = idx[item.sku] || idx[item.customSku] || item.image || null;

    function saveInline() {
      onEdit({
        itemId: item.id,
        price: parseFloat(editPrice) || item.price,
        cost: parseFloat(editCost) || item.cost,
        reorderPt: parseInt(editReorder, 10) || item.reorderPt,
      });
      setEditing(false);
    }

    const marg = margin(item.price, item.cost);

    return h('div', {
      style: {
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, zIndex: 300,
        background: 'var(--bg-1)', borderLeft: '1px solid var(--line-2)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      },
    },
      // Header
      h('div', {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--line)', flexShrink: 0 },
      },
        h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)' } }, 'Item Detail'),
        h('button', {
          style: { background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer', padding: '2px 4px' },
          onClick: onClose,
        }, '\xd7')
      ),

      // Image
      h('div', {
        style: { height: 200, flexShrink: 0, background: 'var(--bg-2)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
      },
        imgSrc
          ? h('img', { src: imgSrc, alt: item.name, style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } })
          : h('span', { style: { fontSize: 64 } }, deptEmoji(item.dept))
      ),

      // Core info
      h('div', { style: { padding: '16px 18px', borderBottom: '1px solid var(--line)' } },
        h('div', { style: { fontSize: 15, fontWeight: 600, marginBottom: 6 } }, item.name),
        h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 } },
          infoField('SKU', item.sku, true),
          item.customSku && infoField('Custom SKU', item.customSku, true),
          item.upc && infoField('UPC', item.upc, true),
        ),
        h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap' } },
          infoField('Brand', item.brand),
          infoField('Department', item.dept),
        )
      ),

      // Stock + pricing
      h('div', { style: { padding: '14px 18px', borderBottom: '1px solid var(--line)' } },
        h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 10 } }, 'Stock + Pricing'),
        editing
          ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
                h('div', null,
                  h('label', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)', display: 'block', marginBottom: 4 } }, 'Price'),
                  h('input', { className: 'input mono', type: 'number', step: '0.01', value: editPrice, onChange: e => setEditPrice(e.target.value) })
                ),
                isManager && h('div', null,
                  h('label', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)', display: 'block', marginBottom: 4 } }, 'Cost'),
                  h('input', { className: 'input mono', type: 'number', step: '0.01', value: editCost, onChange: e => setEditCost(e.target.value) })
                ),
                h('div', null,
                  h('label', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)', display: 'block', marginBottom: 4 } }, 'Reorder Point'),
                  h('input', { className: 'input mono', type: 'number', value: editReorder, onChange: e => setEditReorder(e.target.value) })
                ),
              ),
              h('div', { style: { display: 'flex', gap: 8 } },
                h('button', { className: 'btn primary', style: { flex: 1 }, onClick: saveInline }, 'Save'),
                h('button', { className: 'btn ghost', onClick: () => setEditing(false) }, 'Cancel'),
              )
            )
          : h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
              detailStat('Qty on Hand', h('span', { style: { color: qtyColor(item.qty), fontFamily: 'var(--font-mono)', fontWeight: 600 } }, item.qty)),
              detailStat('Reorder Point', h('span', { style: { fontFamily: 'var(--font-mono)' } }, item.reorderPt)),
              detailStat('Reorder Qty', h('span', { style: { fontFamily: 'var(--font-mono)' } }, item.reorderQty)),
              detailStat('Price', h('span', { style: { fontFamily: 'var(--font-mono)' } }, fmt$(item.price))),
              isManager && detailStat('Cost', h('span', { style: { fontFamily: 'var(--font-mono)' } }, fmt$(item.cost))),
              isManager && detailStat('Margin', h('span', { style: { fontFamily: 'var(--font-mono)', color: 'var(--green)' } }, marg)),
              isManager && item.lastReceived && detailStat('Last Rcv Price', h('span', { style: { fontFamily: 'var(--font-mono)' } }, fmt$(item.lastReceived))),
            )
      ),

      // Description + tags
      (item.description || (item.tags && item.tags.length > 0)) && h('div', { style: { padding: '14px 18px', borderBottom: '1px solid var(--line)' } },
        item.description && h('p', { style: { fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: item.tags?.length ? 10 : 0 } }, item.description),
        item.tags && item.tags.length > 0 && h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
          ...item.tags.map(tag => h('span', {
            key: tag,
            style: {
              fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 7px',
              background: 'var(--bg-3)', border: '1px solid var(--line-2)', color: 'var(--text-2)',
            },
          }, tag))
        )
      ),

      // Recent sales
      h('div', { style: { padding: '14px 18px', borderBottom: '1px solid var(--line)' } },
        h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: 8 } }, 'Recent Sales'),
        MOCK_SALES.length === 0
          ? h('div', { style: { fontSize: 12, color: 'var(--text-3)' } }, 'No recent sales.')
          : h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
              h('thead', null,
                h('tr', null,
                  ...['Date', 'Qty', 'Customer', 'Price'].map(col =>
                    h('th', { key: col, style: { fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', padding: '3px 0', textAlign: 'left', borderBottom: '1px solid var(--line)' } }, col)
                  )
                )
              ),
              h('tbody', null,
                ...MOCK_SALES.slice(0, 10).map((s, i) =>
                  h('tr', { key: i },
                    h('td', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', padding: '5px 0', borderBottom: '1px solid var(--line)' } }, s.date),
                    h('td', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)', padding: '5px 0', borderBottom: '1px solid var(--line)' } }, s.qty),
                    h('td', { style: { fontSize: 11, color: 'var(--text-1)', padding: '5px 8px', borderBottom: '1px solid var(--line)' } }, s.customer),
                    h('td', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)', padding: '5px 0', borderBottom: '1px solid var(--line)', textAlign: 'right' } }, fmt$(s.price)),
                  )
                )
              )
            )
      ),

      // Actions
      h('div', { style: { padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 } },
        h('div', { style: { display: 'flex', gap: 8 } },
          h('button', { className: 'btn primary', style: { flex: 1 }, onClick: () => { onNewSale(item); onClose(); } }, 'New Sale'),
          h('button', { className: 'btn', style: { flex: 1 }, onClick: () => { onAddToPO(item); onClose(); } }, 'Add to PO'),
        ),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('button', { className: 'btn ghost', style: { flex: 1 }, onClick: () => { onAdjust(item); } }, 'Adjust Qty'),
          h('button', { className: 'btn ghost', style: { flex: 1 }, onClick: () => setEditing(true) }, 'Edit'),
        ),
      )
    );
  }

  function infoField(label, value, mono) {
    return h('div', { key: label },
      h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)' } }, label),
      h('div', { style: { fontFamily: mono ? 'var(--font-mono)' : 'inherit', fontSize: 12, color: 'var(--text-1)', marginTop: 2 } }, value)
    );
  }

  function detailStat(label, valueNode) {
    if (!valueNode) return null;
    return h('div', { key: label, style: { display: 'flex', flexDirection: 'column', gap: 3 } },
      h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)' } }, label),
      h('div', { style: { fontSize: 13 } }, valueNode)
    );
  }

  /* ── Main InventoryScreen ── */
  function InventoryScreen({ staff, setScreen }) {
    const isManager = staff && (staff.role === 'Manager' || staff.role === 'Owner');

    const [items, setItems] = useState(MOCK_ITEMS);
    const [loading, setLoading] = useState(false);
    const [offline, setOffline] = useState(false);
    const [totalCount, setTotalCount] = useState(MOCK_ITEMS.length);

    // Filters
    const [query, setQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('All Departments');
    const [stockFilter, setStockFilter] = useState('All');
    const [sort, setSort] = useState('Name A-Z');

    // Pagination
    const [page, setPage] = useState(1);
    const [jumpInput, setJumpInput] = useState('');

    // Selection
    const [selected, setSelected] = useState(new Set());

    // Modals
    const [adjustItem, setAdjustItem] = useState(null);
    const [editPriceItem, setEditPriceItem] = useState(null);
    const [detailItem, setDetailItem] = useState(null);
    const [bulkPriceOpen, setBulkPriceOpen] = useState(false);

    // Image index fetch once
    useEffect(() => {
      if (window.POS_IMG_INDEX) return;
      fetch(WORKER + '/api/pos-item-image-index')
        .then(r => r.json())
        .then(d => { window.POS_IMG_INDEX = d; })
        .catch(() => { window.POS_IMG_INDEX = {}; });
    }, []);

    // Fetch inventory from API
    const fetchInventory = useCallback(async (q, dept, sf, s, pg) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (dept && dept !== 'All Departments') params.set('dept', dept);
        if (sf && sf !== 'All') params.set('stock', sf);
        if (s) params.set('sort', s);
        params.set('page', pg);
        const url = WORKER + '/api/pos-inventory?' + params.toString();
        const r = await fetch(url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const data = await r.json();
        if (data && data.items) {
          setItems(data.items);
          setTotalCount(data.total || data.items.length);
          setOffline(false);
          // cache
          try { localStorage.setItem('pos-inv-cache', JSON.stringify(data.items)); } catch {}
          return;
        }
      } catch {
        // offline fallback
        try {
          const cached = localStorage.getItem('pos-inv-cache');
          if (cached) { setItems(JSON.parse(cached)); setOffline(true); return; }
        } catch {}
      } finally {
        setLoading(false);
      }
      // fall through to mock
      setItems(MOCK_ITEMS);
      setTotalCount(MOCK_ITEMS.length);
      setOffline(true);
    }, []);

    // Debounced search trigger
    const debouncedFetch = useCallback(
      debounce((q, dept, sf, s, pg) => fetchInventory(q, dept, sf, s, pg), 200),
      [fetchInventory]
    );

    useEffect(() => {
      debouncedFetch(query, deptFilter, stockFilter, sort, page);
    }, [query, deptFilter, stockFilter, sort, page]);

    // Local filter + sort on mock/cached data
    const displayed = (() => {
      let list = [...items];
      if (query) {
        const q = query.toLowerCase();
        list = list.filter(it =>
          it.name.toLowerCase().includes(q) ||
          it.sku.toLowerCase().includes(q) ||
          (it.customSku || '').toLowerCase().includes(q) ||
          (it.upc || '').includes(q) ||
          (it.brand || '').toLowerCase().includes(q)
        );
      }
      if (deptFilter !== 'All Departments') list = list.filter(it => it.dept === deptFilter);
      if (stockFilter === 'In Stock') list = list.filter(it => it.qty > 0);
      if (stockFilter === 'Low Stock') list = list.filter(it => it.qty > 0 && it.qty <= 5);
      if (stockFilter === 'Out of Stock') list = list.filter(it => it.qty === 0);
      if (sort === 'Name A-Z') list.sort((a, b) => a.name.localeCompare(b.name));
      if (sort === 'Name Z-A') list.sort((a, b) => b.name.localeCompare(a.name));
      if (sort === 'Price ↑') list.sort((a, b) => a.price - b.price);
      if (sort === 'Price ↓') list.sort((a, b) => b.price - a.price);
      if (sort === 'Qty ↑') list.sort((a, b) => a.qty - b.qty);
      if (sort === 'Qty ↓') list.sort((a, b) => b.qty - a.qty);
      return list;
    })();

    const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
    const paginated = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function handleSelectAll(e) {
      if (e.target.checked) setSelected(new Set(paginated.map(it => it.id)));
      else setSelected(new Set());
    }
    function handleSelectOne(id) {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    }

    function handleAdjustSave({ itemId, delta, reason, note }) {
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, qty: Math.max(0, it.qty + delta) } : it));
      if (window.OfflineQueue) window.OfflineQueue.push({ type: 'adjust-qty', itemId, delta, reason, note });
      // fire-and-forget API
      fetch(WORKER + '/api/pos-adjust-qty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, delta, reason, note }),
      }).catch(() => {});
    }

    function handleEditSave({ itemId, price, cost, reorderPt }) {
      setItems(prev => prev.map(it => it.id === itemId ? { ...it, price, cost, reorderPt: reorderPt || it.reorderPt } : it));
      fetch(WORKER + '/api/pos-update-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, price, cost, reorderPt }),
      }).catch(() => {});
    }

    function handleArchive(item) {
      if (!window.confirm('Archive "' + item.name + '"? It will be hidden from inventory.')) return;
      setItems(prev => prev.filter(it => it.id !== item.id));
    }

    function handleOrderMore(item) {
      // Navigate to PO screen with item pre-filled
      if (setScreen) setScreen('purchase-orders');
    }

    function handleNewSale(item) {
      if (setScreen) setScreen('sales');
    }

    function handleAddToPO(item) {
      if (setScreen) setScreen('purchase-orders');
    }

    function handleBulkPriceSave(pct) {
      setItems(prev => prev.map(it =>
        selected.has(it.id)
          ? { ...it, price: Math.round(it.price * (1 + pct / 100) * 100) / 100 }
          : it
      ));
      setSelected(new Set());
    }

    // Overlay (panel or modal open) dims background
    const anyOverlay = !!detailItem || !!adjustItem || !!editPriceItem || bulkPriceOpen;

    return h(Fragment, null,
      // Page
      h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' } },

        // Page head
        h('div', { className: 'page-head' },
          h('div', null,
            h('div', { className: 'page-sub' }, 'Stock'),
            h('div', { className: 'page-title' }, 'Inventory',
              offline && h('span', { style: { marginLeft: 10, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em' } }, '(offline cache)')
            )
          ),
          h('div', { className: 'page-head-actions' },
            selected.size > 0 && h(Fragment, null,
              h('button', {
                className: 'btn ghost',
                onClick: () => {
                  const sel = items.filter(it => selected.has(it.id));
                  sel.forEach(it => printLabel(it));
                },
              }, 'Print Labels (', selected.size, ')'),
              h('button', {
                className: 'btn ghost',
                onClick: () => exportCSV(items.filter(it => selected.has(it.id))),
              }, 'Export CSV'),
              h('button', {
                className: 'btn ghost',
                onClick: () => setBulkPriceOpen(true),
              }, 'Adjust Prices'),
            ),
            h('button', {
              className: 'btn ghost',
              onClick: () => exportCSV(displayed),
              title: 'Export all filtered results',
            }, 'Export'),
            h('button', { className: 'btn primary', onClick: () => {} },
              h('svg', { viewBox: '0 0 16 16', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: '1.4', strokeLinecap: 'round', style: { marginRight: 5 } },
                h('path', { d: 'M8 3v10M3 8h10' })
              ),
              'Add Item'
            ),
          )
        ),

        // Filter bar
        h('div', { className: 'filters', style: { padding: '0 0 0 0', flexShrink: 0 } },
          // Search
          h('div', { className: 'search-field' },
            h('span', { className: 'ico' },
              h('svg', { viewBox: '0 0 16 16', width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: '1.4', strokeLinecap: 'round' },
                h('circle', { cx: '7', cy: '7', r: '4.5' }), h('path', { d: 'm10.5 10.5 3 3' })
              )
            ),
            h('input', {
              className: 'input',
              placeholder: 'Search name, SKU, UPC, brand…',
              value: query,
              onChange: e => { setQuery(e.target.value); setPage(1); },
              style: { flex: 1 },
            })
          ),

          // Dept
          h('div', { style: { position: 'relative', minWidth: 160 } },
            h('select', {
              className: 'select', value: deptFilter,
              onChange: e => { setDeptFilter(e.target.value); setPage(1); },
            }, DEPTS.map(d => h('option', { key: d, value: d }, d)))
          ),

          // Stock filter
          h('div', { style: { position: 'relative', minWidth: 130 } },
            h('select', {
              className: 'select', value: stockFilter,
              onChange: e => { setStockFilter(e.target.value); setPage(1); },
            },
              h('option', null, 'All'),
              h('option', null, 'In Stock'),
              h('option', null, 'Low Stock'),
              h('option', null, 'Out of Stock'),
            )
          ),

          // Sort
          h('div', { style: { position: 'relative', minWidth: 130 } },
            h('select', {
              className: 'select', value: sort,
              onChange: e => { setSort(e.target.value); setPage(1); },
            },
              h('option', null, 'Name A-Z'),
              h('option', null, 'Name Z-A'),
              h('option', null, 'Price ↑'),
              h('option', null, 'Price ↓'),
              h('option', null, 'Qty ↑'),
              h('option', null, 'Qty ↓'),
            )
          ),

          // Result count
          h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginLeft: 4, whiteSpace: 'nowrap' } },
            displayed.length, ' items'
          ),
        ),

        // Table container
        h('div', { style: { flex: 1, overflowY: 'auto' } },
          loading && h('div', { style: { padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 12 } }, 'Loading…'),
          !loading && h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            h('thead', null,
              h('tr', { style: { background: 'var(--bg-1)', borderBottom: '1px solid var(--line)' } },
                h('th', { style: thStyle() },
                  h('input', {
                    type: 'checkbox',
                    checked: paginated.length > 0 && paginated.every(it => selected.has(it.id)),
                    onChange: handleSelectAll,
                    style: { cursor: 'pointer' },
                  })
                ),
                h('th', { style: thStyle() }, ''), // thumb
                h('th', { style: thStyle(true) }, 'SKU'),
                h('th', { style: { ...thStyle(true), textAlign: 'left' } }, 'Name'),
                h('th', { style: thStyle(true) }, 'Brand'),
                h('th', { style: thStyle(true) }, 'Dept'),
                h('th', { style: { ...thStyle(true), textAlign: 'right' } }, 'Qty'),
                h('th', { style: { ...thStyle(true), textAlign: 'right' } }, 'Price'),
                isManager && h('th', { style: { ...thStyle(true), textAlign: 'right' } }, 'Cost'),
                isManager && h('th', { style: { ...thStyle(true), textAlign: 'right' } }, 'Margin'),
                h('th', { style: thStyle() }, ''),
              )
            ),
            h('tbody', null,
              paginated.length === 0
                ? h('tr', null, h('td', { colSpan: 20, style: { padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 12 } }, 'No items match.'))
                : paginated.map(item =>
                    h('tr', {
                      key: item.id,
                      style: {
                        borderBottom: '1px solid var(--line)',
                        background: selected.has(item.id) ? 'rgba(200,57,44,0.05)' : 'transparent',
                        cursor: 'default',
                      },
                      onMouseEnter: e => { if (!selected.has(item.id)) e.currentTarget.style.background = 'var(--hover)'; },
                      onMouseLeave: e => { e.currentTarget.style.background = selected.has(item.id) ? 'rgba(200,57,44,0.05)' : 'transparent'; },
                    },
                      // checkbox
                      h('td', { style: tdStyle(), onClick: e => { e.stopPropagation(); handleSelectOne(item.id); } },
                        h('input', {
                          type: 'checkbox',
                          checked: selected.has(item.id),
                          onChange: () => handleSelectOne(item.id),
                          style: { cursor: 'pointer' },
                        })
                      ),
                      // thumb
                      h('td', { style: { ...tdStyle(), padding: '6px 8px', width: 44 } },
                        h(ItemThumb, { item })
                      ),
                      // sku
                      h('td', { style: tdStyle() },
                        h('span', {
                          style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', cursor: 'pointer', whiteSpace: 'nowrap' },
                          onClick: () => setDetailItem(item),
                          title: 'View item detail',
                        }, item.sku)
                      ),
                      // name
                      h('td', { style: { ...tdStyle(), maxWidth: 260 } },
                        h('span', {
                          style: { fontSize: 13, color: 'var(--text)', cursor: 'pointer' },
                          onClick: () => setDetailItem(item),
                        }, item.name)
                      ),
                      // brand
                      h('td', { style: tdStyle() },
                        h('span', { style: { fontSize: 12, color: 'var(--text-2)' } }, item.brand)
                      ),
                      // dept
                      h('td', { style: tdStyle() },
                        h('span', { style: { fontSize: 12, color: 'var(--text-2)' } }, item.dept)
                      ),
                      // qty
                      h('td', { style: { ...tdStyle(), textAlign: 'right' } },
                        h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: qtyColor(item.qty) } }, item.qty)
                      ),
                      // price
                      h('td', { style: { ...tdStyle(), textAlign: 'right' } },
                        h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)' } }, fmt$(item.price))
                      ),
                      // cost (manager only)
                      isManager && h('td', { style: { ...tdStyle(), textAlign: 'right' } },
                        h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' } }, fmt$(item.cost))
                      ),
                      // margin (manager only)
                      isManager && h('td', { style: { ...tdStyle(), textAlign: 'right' } },
                        h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--green)' } }, margin(item.price, item.cost))
                      ),
                      // actions
                      h('td', { style: { ...tdStyle(), textAlign: 'right', padding: '4px 10px' } },
                        h(OptionsMenu, {
                          item,
                          onEdit: setEditPriceItem,
                          onAdjust: setAdjustItem,
                          onOrderMore: handleOrderMore,
                          onArchive: handleArchive,
                          onNewSale: handleNewSale,
                        })
                      ),
                    )
                  )
            )
          )
        ),

        // Pagination
        totalPages > 1 && h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
            borderTop: '1px solid var(--line)', flexShrink: 0,
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)',
          },
        },
          h('button', {
            className: 'btn ghost', style: { padding: '4px 10px' },
            disabled: page <= 1, onClick: () => setPage(p => p - 1),
          }, '← Prev'),
          h('span', null, 'Page ', page, ' / ', totalPages),
          h('button', {
            className: 'btn ghost', style: { padding: '4px 10px' },
            disabled: page >= totalPages, onClick: () => setPage(p => p + 1),
          }, 'Next →'),
          h('span', { style: { marginLeft: 8 } }, 'Jump:'),
          h('input', {
            style: { width: 48, fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 6px', background: 'var(--bg-2)', border: '1px solid var(--line-2)', color: 'var(--text)', outline: 'none' },
            type: 'number', min: 1, max: totalPages,
            value: jumpInput, onChange: e => setJumpInput(e.target.value),
            onKeyDown: e => {
              if (e.key === 'Enter') {
                const n = parseInt(jumpInput, 10);
                if (n >= 1 && n <= totalPages) { setPage(n); setJumpInput(''); }
              }
            },
            placeholder: '#',
          })
        ),
      ),

      // Detail panel
      detailItem && h(ItemDetailPanel, {
        item: detailItem,
        onClose: () => setDetailItem(null),
        isManager,
        onEdit: data => { handleEditSave(data); setDetailItem(it => it ? { ...it, ...data } : null); },
        onAdjust: item => { setAdjustItem(item); },
        onNewSale: handleNewSale,
        onAddToPO: handleAddToPO,
      }),

      // Adjust qty modal
      adjustItem && h(AdjustQtyModal, {
        item: adjustItem,
        onClose: () => setAdjustItem(null),
        onSave: handleAdjustSave,
      }),

      // Edit price modal
      editPriceItem && h(EditPriceModal, {
        item: editPriceItem,
        onClose: () => setEditPriceItem(null),
        onSave: handleEditSave,
      }),

      // Bulk price modal
      bulkPriceOpen && h(BulkPriceModal, {
        count: selected.size,
        onClose: () => setBulkPriceOpen(false),
        onSave: handleBulkPriceSave,
      }),
    );
  }

  function thStyle(mono) {
    return {
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-3)',
      padding: '6px 10px',
      textAlign: 'left',
      fontWeight: 500,
      whiteSpace: 'nowrap',
    };
  }
  function tdStyle() {
    return {
      padding: '8px 10px',
      verticalAlign: 'middle',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: 200,
    };
  }

  window.InventoryScreen = InventoryScreen;
})();
