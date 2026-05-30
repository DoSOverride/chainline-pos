/* pos-reports-v2.js — ChainLine POS Full Reports Suite
 * Pure React.createElement, no JSX, no external libs.
 * window.ReportsScreen — mount point for the app router.
 */

'use strict';

(function () {
  const { createElement: h, useState, useEffect, useRef, useCallback, Fragment } = React;

  /* ─── Formatters ─── */
  function fmt$(n) {
    return '$' + Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtPct(n) { return Number(n).toFixed(1) + '%'; }

  /* ─── Date helpers ─── */
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function daysAgoISO(n) {
    const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
  }
  function startOfMonthISO(offset) {
    const d = new Date(); d.setMonth(d.getMonth() + offset, 1);
    return d.toISOString().slice(0, 10);
  }
  function endOfLastMonthISO() {
    const d = new Date(); d.setDate(0);
    return d.toISOString().slice(0, 10);
  }
  function rangeFromPreset(preset) {
    const today = todayISO();
    switch (preset) {
      case 'today':       return { from: today, to: today };
      case 'this-week':   return { from: daysAgoISO(6), to: today };
      case 'this-month':  return { from: startOfMonthISO(0), to: today };
      case 'last-month':  return { from: startOfMonthISO(-1), to: endOfLastMonthISO() };
      default:            return null;
    }
  }

  /* ─── Mock data ─── */
  const MOCK_DAILY = (() => {
    const vals = [420, 0, 380, 510, 290, 640, 180, 0, 520, 490, 380, 420, 610, 205, 730, 315, 445, 520, 0, 680, 295, 460, 540, 310, 0, 615, 380, 445, 520, 610];
    const base = new Date(); base.setDate(base.getDate() - vals.length + 1);
    return vals.map((value, i) => {
      const d = new Date(base); d.setDate(base.getDate() + i);
      return { label: d.toISOString().slice(5, 10), value };
    });
  })();

  const MOCK_TOP_ITEMS = [
    { rank: 1, name: 'Brake Bleed Service',         sku: 'SVC-BRAKE-BLD',  qty: 18, revenue: 720.00,  avgPrice: 40.00  },
    { rank: 2, name: 'Maxxis Minion DHF 29 x 2.5',  sku: 'TIRE-MAXX-29-DH',qty: 15, revenue: 1259.85, avgPrice: 83.99  },
    { rank: 3, name: 'Full Tune-Up',                 sku: 'SVC-TUNE-F',     qty: 12, revenue: 1440.00, avgPrice: 120.00 },
    { rank: 4, name: 'Shimano XT Cassette 12-spd',  sku: 'SHIM-XT-CS-12',  qty: 11, revenue: 2079.00, avgPrice: 189.00 },
    { rank: 5, name: 'Shimano XT Chain 126L',        sku: 'CHAIN-XT-126L',  qty: 11, revenue: 682.00,  avgPrice: 62.00  },
    { rank: 6, name: 'SRAM Code Brake Pads',         sku: 'BRAKE-PAD-CODE', qty: 14, revenue: 532.00,  avgPrice: 38.00  },
    { rank: 7, name: 'ODI Elite Pro Lock-On Grips',  sku: 'GRIP-ODI-ELITE', qty: 9,  revenue: 288.00,  avgPrice: 32.00  },
    { rank: 8, name: 'Basic Tune-Up',                sku: 'SVC-TUNE-B',     qty: 9,  revenue: 675.00,  avgPrice: 75.00  },
    { rank: 9, name: '29" Tube Presta Valve',        sku: 'TUBE-29-PRES',   qty: 31, revenue: 341.00,  avgPrice: 11.00  },
    { rank:10, name: 'SlickHoney Suspension Grease', sku: 'GREASE-SLICK',   qty: 6,  revenue: 108.00,  avgPrice: 18.00  },
  ];

  const MOCK_MECHANICS = [
    { name: 'Phil',    initials: 'PH', tone: 'ph', completed: 22, partsRev: 2840.50, labourRev: 2200.00 },
    { name: 'Steve',   initials: 'ST', tone: 'st', completed: 19, partsRev: 2105.00, labourRev: 1900.00 },
    { name: 'Beckett', initials: 'BE', tone: 'be', completed: 15, partsRev: 1480.00, labourRev: 1500.00 },
    { name: 'Curren',  initials: 'CU', tone: 'cu', completed: 11, partsRev: 980.00,  labourRev: 1100.00 },
    { name: 'Danny',   initials: 'DN', tone: 'dn', completed: 8,  partsRev: 620.00,  labourRev: 800.00  },
    { name: 'Matt',    initials: 'MA', tone: 'ma', completed: 4,  partsRev: 320.00,  labourRev: 400.00  },
  ];

  const MOCK_CATEGORIES = [
    { dept: 'Labour / Service',  revenue: 8240.00, units: 89  },
    { dept: 'Drivetrain',        revenue: 4820.50, units: 47  },
    { dept: 'Tyres',             revenue: 3180.00, units: 38  },
    { dept: 'Suspension',        revenue: 2940.00, units: 22  },
    { dept: 'Accessories',       revenue: 1560.00, units: 83  },
    { dept: 'Brakes',            revenue: 1240.00, units: 34  },
    { dept: 'Tubes / Tubeless',  revenue: 760.00,  units: 69  },
    { dept: 'Other',             revenue: 420.00,  units: 18  },
  ];

  const MOCK_PAYMENT_METHODS = [
    { method: 'Credit / Debit',  amount: 14820.50 },
    { method: 'Cash',            amount: 4960.00  },
    { method: 'Gift Card',       amount: 1340.00  },
    { method: 'Interac e-Transfer', amount: 890.00 },
  ];

  const MOCK_WORKORDERS = [
    { id: 'WO-2391', cust: 'Devon Tran',        bike: 'Norco Sight C2 2023',          mech: 'Phil',    mechInit: 'PH', mechTone: 'ph', status: 'ready',       dateIn: '2026-05-14', dateOut: '2026-05-16', hours: 2.5,  total: 312.50 },
    { id: 'WO-2388', cust: 'Hannah Riise',       bike: 'Santa Cruz Bronson CC X01',    mech: 'Steve',   mechInit: 'ST', mechTone: 'st', status: 'inprogress',  dateIn: '2026-05-15', dateOut: null,         hours: 3.0,  total: 226.81 },
    { id: 'WO-2382', cust: 'Marc Lefebvre',      bike: 'Trek Fuel EX 8',               mech: 'Beckett', mechInit: 'BE', mechTone: 'be', status: 'overdue',     dateIn: '2026-05-12', dateOut: null,         hours: 1.5,  total: 185.00 },
    { id: 'WO-2402', cust: 'Priya Sharma',       bike: 'Specialized Stumpjumper Comp', mech: 'Matt',    mechInit: 'MA', mechTone: 'ma', status: 'booked',      dateIn: '2026-05-20', dateOut: null,         hours: 0,    total: 0      },
    { id: 'WO-2379', cust: 'Owen Bartholomew',   bike: 'Kona Process 134 2022',        mech: 'Phil',    mechInit: 'PH', mechTone: 'ph', status: 'overdue',     dateIn: '2026-05-11', dateOut: null,         hours: 4.0,  total: 275.00 },
    { id: 'WO-2399', cust: 'Eli Constantine',    bike: 'Yeti SB140 LR Cobalt',         mech: 'Steve',   mechInit: 'ST', mechTone: 'st', status: 'inprogress',  dateIn: '2026-05-16', dateOut: null,         hours: 1.5,  total: 145.00 },
    { id: 'WO-2375', cust: 'Jasper Quinn',       bike: 'Pivot Trail 429 Slate',        mech: 'Curren',  mechInit: 'CU', mechTone: 'cu', status: 'ready',       dateIn: '2026-05-13', dateOut: '2026-05-15', hours: 1.0,  total:  88.50 },
    { id: 'WO-2370', cust: 'Sienna Park',        bike: 'Devinci Marshall A29',         mech: 'Danny',   mechInit: 'DN', mechTone: 'dn', status: 'closed',      dateIn: '2026-05-08', dateOut: '2026-05-10', hours: 2.0,  total:  95.00 },
    { id: 'WO-2365', cust: 'Augustin Vega',      bike: 'Cervelo Aspero Champagne',     mech: 'Phil',    mechInit: 'PH', mechTone: 'ph', status: 'closed',      dateIn: '2026-05-06', dateOut: '2026-05-09', hours: 3.5,  total: 340.00 },
    { id: 'WO-2358', cust: 'Mei Ito',            bike: 'Rocky Mountain Altitude',      mech: 'Beckett', mechInit: 'BE', mechTone: 'be', status: 'closed',      dateIn: '2026-05-02', dateOut: '2026-05-05', hours: 2.0,  total: 165.00 },
    { id: 'WO-2351', cust: 'Liam Fontaine',      bike: 'Canyon Spectral CF 8',         mech: 'Curren',  mechInit: 'CU', mechTone: 'cu', status: 'closed',      dateIn: '2026-04-28', dateOut: '2026-05-01', hours: 4.0,  total: 495.00 },
    { id: 'WO-2404', cust: 'Zara Nkosi',         bike: 'Marin Pine Mountain 2',        mech: 'Danny',   mechInit: 'DN', mechTone: 'dn', status: 'open',        dateIn: '2026-05-17', dateOut: null,         hours: 0,    total:  75.00 },
  ];

  // Use live WOs from pos-app.js bootstrap if available; fall back to mock for Reports
  function getLiveWOs() {
    const live = window.lsWorkOrders;
    if (live && live.length > 0) {
      // Shape live WOs to match the MOCK_WORKORDERS schema Reports expects
      return live.map(function(w) {
        return {
          id:       w.id,
          cust:     w.cust || '',
          bike:     w.bike || '',
          mech:     w.mech || '',
          mechInit: w.mech || '',
          mechTone: w.tone || 'am',
          status:   w.status || 'open',
          dateIn:   w.dateIn || (w.due || '').slice(0, 10) || '',
          dateOut:  w.dateDue || null,
          hours:    0,
          total:    w.total || 0,
        };
      });
    }
    return MOCK_WORKORDERS;
  }

  /* ─── API with mock fallback ─── */
  const WORKER = typeof window !== 'undefined' && window.WORKER ? window.WORKER : 'https://still-term-f1ec.taocaruso77.workers.dev';

  async function fetchReport(endpoint, params) {
    try {
      const qs = new URLSearchParams(params).toString();
      const r = await fetch(WORKER + endpoint + (qs ? '?' + qs : ''), { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return { data: await r.json(), offline: false };
    } catch {
      return { data: null, offline: true };
    }
  }

  /* ─── SVG Bar Chart ─── */
  function BarChart({ data, height = 120, color = '#c8392c' }) {
    const [tip, setTip] = useState(null);
    if (!data || !data.length) return null;
    const max = Math.max(...data.map(d => d.value), 1);
    const count = data.length;
    const gap = 4;
    const barW = Math.max(8, Math.floor((520 - gap * (count + 1)) / count));
    const totalW = (barW + gap) * count + gap;
    const labelH = 18;
    const chartH = height;
    const svgH = chartH + labelH;

    return h('div', { style: { position: 'relative', overflowX: 'auto' } },
      h('svg', {
        width: totalW, height: svgH,
        style: { display: 'block', userSelect: 'none' },
      },
        /* gridlines */
        ...[0.25, 0.5, 0.75, 1].map(pct =>
          h('line', {
            key: pct,
            x1: 0, y1: chartH - pct * chartH,
            x2: totalW, y2: chartH - pct * chartH,
            stroke: '#2a2a2a', strokeWidth: 1,
          })
        ),
        /* bars */
        ...data.map((d, i) => {
          const barH = Math.max(2, (d.value / max) * chartH);
          const x = gap + i * (barW + gap);
          const y = chartH - barH;
          const isHov = tip && tip.index === i;
          return h(Fragment, { key: i },
            h('rect', {
              x, y, width: barW, height: barH,
              fill: isHov ? '#e54b3c' : color,
              rx: 2,
              style: { cursor: 'pointer', transition: 'fill 0.1s' },
              onMouseEnter: e => setTip({ index: i, x: e.clientX, y: e.clientY, ...d }),
              onMouseLeave: () => setTip(null),
            }),
            /* label every ~5 bars */
            i % Math.max(1, Math.floor(count / 8)) === 0 &&
              h('text', {
                x: x + barW / 2, y: svgH - 2,
                textAnchor: 'middle',
                fill: '#555', fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              }, d.label)
          );
        })
      ),
      /* tooltip */
      tip && h('div', {
        style: {
          position: 'fixed',
          left: tip.x + 12, top: tip.y - 32,
          background: '#1a1a1a', border: '1px solid #333',
          borderRadius: 6, padding: '5px 10px',
          fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
          color: '#ededed', pointerEvents: 'none', zIndex: 999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        },
      },
        h('div', { style: { color: '#888', fontSize: 10 } }, tip.label),
        h('div', { style: { color: '#ededed', fontWeight: 600 } }, fmt$(tip.value))
      )
    );
  }

  /* ─── Stat Card ─── */
  function StatCard({ label, value, sub }) {
    return h('div', {
      style: {
        background: '#111', border: '1px solid #222', borderRadius: 10,
        padding: '16px 20px', flex: '1 1 160px', minWidth: 0,
      },
    },
      h('div', { style: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 } }, label),
      h('div', { style: { fontSize: 24, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#ededed' } }, value),
      sub && h('div', { style: { fontSize: 11, color: '#555', marginTop: 4 } }, sub)
    );
  }

  /* ─── Date Range Picker ─── */
  function DateRangePicker({ preset, from, to, onChange }) {
    const presets = [
      { id: 'today',       label: 'Today' },
      { id: 'this-week',   label: 'This Week' },
      { id: 'this-month',  label: 'This Month' },
      { id: 'last-month',  label: 'Last Month' },
      { id: 'custom',      label: 'Custom' },
    ];
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' } },
      ...presets.map(p =>
        h('button', {
          key: p.id,
          onClick: () => onChange(p.id, null, null),
          style: {
            padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 500,
            background: preset === p.id ? '#c8392c' : '#1a1a1a',
            color: preset === p.id ? '#fff' : '#888',
            transition: 'background 0.15s',
          },
        }, p.label)
      ),
      preset === 'custom' && h(Fragment, null,
        h('input', {
          type: 'date', value: from || '', onChange: e => onChange('custom', e.target.value, to),
          style: customDateStyle,
        }),
        h('span', { style: { color: '#444' } }, '-'),
        h('input', {
          type: 'date', value: to || '', onChange: e => onChange('custom', from, e.target.value),
          style: customDateStyle,
        })
      )
    );
  }

  const customDateStyle = {
    padding: '4px 8px', borderRadius: 6, border: '1px solid #333',
    background: '#111', color: '#ededed', fontSize: 12,
    fontFamily: 'JetBrains Mono, monospace',
  };

  /* ─── Offline Banner ─── */
  function OfflineBanner() {
    return h('div', {
      style: {
        background: '#3a2a00', border: '1px solid #6b4b00', borderRadius: 8,
        padding: '8px 14px', marginBottom: 16, fontSize: 12, color: '#f0a000',
        display: 'flex', alignItems: 'center', gap: 8,
      },
    },
      h('span', null, '⚠️'),
      h('span', null, 'Using cached data - API unavailable')
    );
  }

  /* ─── Tab helpers ─── */
  const TAB_STYLE = (active) => ({
    padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 500,
    background: active ? '#1d1d1d' : 'transparent',
    color: active ? '#ededed' : '#666',
    borderBottom: active ? '2px solid #c8392c' : '2px solid transparent',
    transition: 'all 0.15s',
  });

  /* ═══════════════════════════════════════════
     TAB 1 — SALES OVERVIEW
  ═══════════════════════════════════════════ */
  function SalesOverviewTab() {
    const [preset, setPreset] = useState('this-month');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [offline, setOffline] = useState(false);
    const [loading, setLoading] = useState(false);
    const [liveRevenue, setLiveRevenue] = useState(null);
    const [liveSalesCount, setLiveSalesCount] = useState(null);
    const [liveTopItems, setLiveTopItems] = useState(null);
    const [liveMechanicStats, setLiveMechanicStats] = useState(null);
    const [liveDaily, setLiveDaily] = useState(null);

    function handleRangeChange(p, f, t) {
      setPreset(p);
      if (p !== 'custom') {
        const r = rangeFromPreset(p);
        setFrom(r.from); setTo(r.to);
      } else {
        if (f !== null) setFrom(f);
        if (t !== null) setTo(t);
      }
    }

    useEffect(() => { handleRangeChange('this-month', null, null); }, []);

    // Fetch live data when date range is set
    useEffect(() => {
      if (!from || !to) return;
      let cancelled = false;
      setLoading(true);
      fetchReport('/api/reports', { from, to }).then(({ data, offline: isOffline }) => {
        if (cancelled) return;
        setLoading(false);
        setOffline(isOffline);
        if (data && !isOffline) {
          setLiveRevenue(data.revenue != null ? data.revenue : null);
          setLiveSalesCount(data.salesCount != null ? data.salesCount : null);
          setLiveTopItems(Array.isArray(data.topItems) ? data.topItems : null);
          setLiveMechanicStats(Array.isArray(data.mechanicStats) ? data.mechanicStats : null);
          // Build daily chart data from response if provided, else null (falls back to mock)
          if (Array.isArray(data.daily) && data.daily.length) {
            setLiveDaily(data.daily.map(d => ({ label: d.date ? d.date.slice(5) : d.label, value: d.revenue || d.value || 0 })));
          } else {
            setLiveDaily(null);
          }
        } else {
          setLiveRevenue(null); setLiveSalesCount(null);
          setLiveTopItems(null); setLiveMechanicStats(null); setLiveDaily(null);
        }
      });
      return () => { cancelled = true; };
    }, [from, to]);

    // Filter MOCK_DAILY to the selected date range (used as fallback)
    const filteredMockDaily = (() => {
      if (!from || !to) return MOCK_DAILY;
      return MOCK_DAILY.filter(d => {
        const year = new Date().getFullYear();
        const fullDate = year + '-' + d.label;
        return fullDate >= from && fullDate <= to;
      });
    })();

    const filteredDaily = liveDaily || filteredMockDaily;
    const totalRevenue = liveRevenue != null ? liveRevenue : filteredDaily.reduce((s, d) => s + d.value, 0);
    const totalTax = totalRevenue * 0.05;
    const totalTx = liveSalesCount != null ? liveSalesCount : Math.max(1, Math.round(247 * filteredDaily.length / Math.max(1, MOCK_DAILY.length)));
    const avgSale = totalTx > 0 ? totalRevenue / totalTx : 0;
    const payTotal = MOCK_PAYMENT_METHODS.reduce((s, m) => s + m.amount, 0);

    // Expose live data for export (falls back to mock)
    const exportTopItems = liveTopItems || MOCK_TOP_ITEMS;
    const exportMechanicStats = liveMechanicStats || MOCK_MECHANICS.map(m => ({
      name: m.name, wosCompleted: m.completed, revenue: m.partsRev + m.labourRev,
    }));

    function exportSalesCSV() {
      const lines = [];

      // Revenue summary
      lines.push('REVENUE SUMMARY');
      lines.push('From,To,Total Revenue,GST (5%),# Transactions,Avg Sale');
      lines.push([from, to, totalRevenue.toFixed(2), totalTax.toFixed(2), totalTx, avgSale.toFixed(2)].join(','));
      lines.push('');

      // Daily breakdown
      lines.push('DAILY REVENUE');
      lines.push('Date,Revenue');
      filteredDaily.forEach(d => lines.push(d.label + ',' + d.value.toFixed(2)));
      lines.push('');

      // Top items
      lines.push('TOP ITEMS');
      lines.push('Rank,Item,SKU/Description,Qty,Revenue');
      exportTopItems.forEach((item, i) => {
        const desc = item.description || item.name || '';
        const sku = item.sku || '';
        const qty = item.qty != null ? item.qty : '';
        const rev = item.revenue != null ? Number(item.revenue).toFixed(2) : '';
        lines.push([i + 1, '"' + desc + '"', sku, qty, rev].join(','));
      });
      lines.push('');

      // Mechanic breakdown
      lines.push('MECHANIC BREAKDOWN');
      lines.push('Mechanic,WOs Completed,Revenue');
      exportMechanicStats.forEach(m => {
        lines.push(['"' + m.name + '"', m.wosCompleted != null ? m.wosCompleted : '', Number(m.revenue || 0).toFixed(2)].join(','));
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = 'chainline-sales-' + (from || todayISO()) + '-to-' + (to || todayISO()) + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    }

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 24 } },
      offline && h(OfflineBanner),

      /* Date picker + Export */
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
        h(DateRangePicker, { preset, from, to, onChange: handleRangeChange }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          loading && h('span', { style: { fontSize: 10, color: '#555', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' } }, 'Loading...'),
          !offline && !loading && liveRevenue != null && h('span', { style: { fontSize: 10, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' } }, 'Live'),
          h('button', {
            onClick: exportSalesCSV,
            style: {
              padding: '6px 14px', borderRadius: 6, border: '1px solid #333',
              background: '#1a1a1a', color: '#aaa', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
            },
          }, '↓ Export CSV')
        )
      ),

      /* Stat row */
      h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap' } },
        h(StatCard, { label: 'Total Revenue', value: fmt$(totalRevenue) }),
        h(StatCard, { label: '# Transactions', value: totalTx.toLocaleString() }),
        h(StatCard, { label: 'Avg Sale', value: fmt$(avgSale) }),
        h(StatCard, { label: 'Tax Collected', value: fmt$(totalTax), sub: 'GST 5%' }),
      ),

      /* Bar chart */
      h('div', { style: { background: '#111', border: '1px solid #222', borderRadius: 10, padding: '18px 20px' } },
        h('div', { style: { fontSize: 12, color: '#666', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' } },
          'Revenue by Day',
          filteredDaily.length < MOCK_DAILY.length && h('span', { style: { marginLeft: 8, color: '#444', fontSize: 10 } },
            '(' + filteredDaily.length + ' days)'
          )
        ),
        filteredDaily.length === 0
          ? h('div', { style: { padding: '24px 0', textAlign: 'center', color: '#555', fontSize: 12 } }, 'No data for selected range')
          : h(BarChart, { data: filteredDaily, height: 130 }),
      ),

      /* Payment method breakdown */
      h('div', { style: { background: '#111', border: '1px solid #222', borderRadius: 10, padding: '18px 20px' } },
        h('div', { style: { fontSize: 12, color: '#666', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Payment Method Breakdown'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          ...MOCK_PAYMENT_METHODS.map(m => {
            const pct = m.amount / payTotal * 100;
            return h('div', { key: m.method },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                h('span', { style: { fontSize: 12, color: '#aaa' } }, m.method),
                h('span', { style: { fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#ededed' } },
                  fmt$(m.amount), h('span', { style: { color: '#555', marginLeft: 8 } }, fmtPct(pct))
                )
              ),
              h('div', { style: { background: '#1a1a1a', borderRadius: 4, height: 6, overflow: 'hidden' } },
                h('div', { style: { width: fmtPct(pct), height: '100%', background: '#c8392c', borderRadius: 4, transition: 'width 0.4s' } })
              )
            );
          })
        )
      )
    );
  }

  /* ═══════════════════════════════════════════
     TAB 2 — TOP ITEMS
  ═══════════════════════════════════════════ */
  function TopItemsTab() {
    const [sortBy, setSortBy] = useState('revenue');
    const [preset, setPreset] = useState('this-month');

    const sorted = [...MOCK_TOP_ITEMS].sort((a, b) =>
      sortBy === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty
    ).map((item, i) => ({ ...item, rank: i + 1 }));

    function exportCSV() {
      const header = 'Rank,Item,SKU,Qty Sold,Revenue,Avg Price\n';
      const rows = sorted.map(r =>
        [r.rank, '"' + r.name + '"', r.sku, r.qty, r.revenue.toFixed(2), r.avgPrice.toFixed(2)].join(',')
      ).join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = 'chainline-top-items-' + todayISO() + '.csv'; a.click();
      URL.revokeObjectURL(url);
    }

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      /* Controls */
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
        h(DateRangePicker, { preset, onChange: (p) => setPreset(p) }),
        h('div', { style: { display: 'flex', gap: 8 } },
          h('label', { style: { fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', gap: 6 } },
            'Sort by',
            h('select', {
              value: sortBy, onChange: e => setSortBy(e.target.value),
              style: { ...customDateStyle, marginLeft: 4 },
            },
              h('option', { value: 'revenue' }, 'Revenue'),
              h('option', { value: 'qty' }, 'Qty Sold')
            )
          ),
          h('button', {
            onClick: exportCSV,
            style: {
              padding: '6px 14px', borderRadius: 6, border: '1px solid #333',
              background: '#1a1a1a', color: '#aaa', fontSize: 12, cursor: 'pointer',
            },
          }, '↓ Export CSV')
        )
      ),

      /* Table */
      h('div', { style: { overflowX: 'auto' } },
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
          h('thead', null,
            h('tr', null,
              ...['#', 'Item', 'SKU', 'Qty', 'Revenue', 'Avg Price'].map(col =>
                h('th', {
                  key: col,
                  style: { textAlign: col === '#' || col === 'Qty' || col === 'Revenue' || col === 'Avg Price' ? 'right' : 'left',
                    padding: '8px 12px', borderBottom: '1px solid #222', color: '#555',
                    textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, fontSize: 10 },
                }, col)
              )
            )
          ),
          h('tbody', null,
            ...sorted.map((item, i) =>
              h('tr', {
                key: item.sku,
                style: { background: i % 2 === 0 ? 'transparent' : '#0d0d0d' },
              },
                h('td', { style: { ...tdR, color: '#555', width: 32 } }, item.rank),
                h('td', { style: { padding: '9px 12px', color: '#ededed' } }, item.name),
                h('td', { style: { ...tdR, fontFamily: 'JetBrains Mono, monospace', color: '#666' } }, item.sku),
                h('td', { style: { ...tdR, fontFamily: 'JetBrains Mono, monospace' } }, item.qty),
                h('td', { style: { ...tdR, fontFamily: 'JetBrains Mono, monospace', color: '#c8392c' } }, fmt$(item.revenue)),
                h('td', { style: { ...tdR, fontFamily: 'JetBrains Mono, monospace', color: '#aaa' } }, fmt$(item.avgPrice))
              )
            )
          )
        )
      )
    );
  }

  const tdR = { padding: '9px 12px', textAlign: 'right', borderBottom: '1px solid #111' };
  const tdL = { padding: '9px 12px', textAlign: 'left', borderBottom: '1px solid #111' };

  /* ═══════════════════════════════════════════
     TAB 3 — BY MECHANIC
  ═══════════════════════════════════════════ */
  function MechanicTab() {
    const [filteredMech, setFilteredMech] = useState(null);

    const allWOs = getLiveWOs();
    const filtered = filteredMech
      ? allWOs.filter(w => w.mech === filteredMech)
      : null;

    if (filteredMech && filtered) {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
          h('button', {
            onClick: () => setFilteredMech(null),
            style: {
              padding: '5px 12px', borderRadius: 6, border: '1px solid #333',
              background: '#1a1a1a', color: '#aaa', fontSize: 12, cursor: 'pointer',
            },
          }, '← Back'),
          h('span', { style: { color: '#ededed', fontWeight: 600 } }, filteredMech + "'s Work Orders")
        ),
        h('div', { style: { overflowX: 'auto' } },
          h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
            h('thead', null,
              h('tr', null,
                ...['WO#', 'Customer', 'Bike', 'Status', 'Date In', 'Total'].map(col =>
                  h('th', { key: col, style: { ...thStyle, textAlign: col === 'Total' ? 'right' : 'left' } }, col)
                )
              )
            ),
            h('tbody', null,
              filtered.length === 0
                ? h('tr', null, h('td', { colSpan: 6, style: { ...tdL, color: '#555', textAlign: 'center', padding: 24 } }, 'No work orders'))
                : filtered.map((w, i) =>
                    h('tr', { key: w.id, style: { background: i % 2 === 0 ? 'transparent' : '#0d0d0d' } },
                      h('td', { style: { ...tdL, fontFamily: 'JetBrains Mono, monospace', color: '#c8392c' } }, w.id),
                      h('td', { style: tdL }, w.cust),
                      h('td', { style: { ...tdL, color: '#888' } }, w.bike),
                      h('td', { style: tdL }, h(StatusChip, { status: w.status })),
                      h('td', { style: { ...tdL, fontFamily: 'JetBrains Mono, monospace', color: '#666' } }, w.dateIn),
                      h('td', { style: { ...tdR, fontFamily: 'JetBrains Mono, monospace' } }, w.total ? fmt$(w.total) : '-')
                    )
                  )
            )
          )
        )
      );
    }

    return h('div', { style: { overflowX: 'auto' } },
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
        h('thead', null,
          h('tr', null,
            ...['Mechanic', 'WOs Completed', 'Parts Revenue', 'Labour Revenue', 'Total'].map(col =>
              h('th', { key: col, style: { ...thStyle, textAlign: col === 'Mechanic' ? 'left' : 'right' } }, col)
            )
          )
        ),
        h('tbody', null,
          ...MOCK_MECHANICS.map((m, i) => {
            const total = m.partsRev + m.labourRev;
            return h('tr', {
              key: m.name,
              style: { background: i % 2 === 0 ? 'transparent' : '#0d0d0d', cursor: 'pointer' },
              onClick: () => setFilteredMech(m.name),
              title: 'Click to view ' + m.name + "'s work orders",
            },
              h('td', { style: tdL },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                  h('span', {
                    style: {
                      width: 28, height: 28, borderRadius: '50%',
                      background: '#1d1d1d', border: '1px solid #333',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#aaa',
                      fontFamily: 'JetBrains Mono, monospace',
                    },
                  }, m.initials),
                  h('span', { style: { color: '#ededed', textDecoration: 'underline', textDecorationColor: '#333' } }, m.name)
                )
              ),
              h('td', { style: { ...tdR, fontFamily: 'JetBrains Mono, monospace' } }, m.completed),
              h('td', { style: { ...tdR, fontFamily: 'JetBrains Mono, monospace', color: '#aaa' } }, fmt$(m.partsRev)),
              h('td', { style: { ...tdR, fontFamily: 'JetBrains Mono, monospace', color: '#aaa' } }, fmt$(m.labourRev)),
              h('td', { style: { ...tdR, fontFamily: 'JetBrains Mono, monospace', color: '#c8392c', fontWeight: 600 } }, fmt$(total))
            );
          })
        )
      )
    );
  }

  /* ═══════════════════════════════════════════
     TAB 4 — BY CATEGORY
  ═══════════════════════════════════════════ */
  function CategoryTab() {
    const total = MOCK_CATEGORIES.reduce((s, c) => s + c.revenue, 0);
    const maxRev = Math.max(...MOCK_CATEGORIES.map(c => c.revenue));

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      ...MOCK_CATEGORIES.map(cat => {
        const pct = cat.revenue / total * 100;
        const barPct = cat.revenue / maxRev * 100;
        return h('div', { key: cat.dept, style: { background: '#111', border: '1px solid #222', borderRadius: 8, padding: '14px 16px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8 } },
            h('span', { style: { fontSize: 12, color: '#ededed', fontWeight: 500 } }, cat.dept),
            h('div', { style: { display: 'flex', gap: 16 } },
              h('span', { style: { fontSize: 11, color: '#555', fontFamily: 'JetBrains Mono, monospace' } }, cat.units + ' units'),
              h('span', { style: { fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#c8392c' } }, fmt$(cat.revenue)),
              h('span', { style: { fontSize: 11, color: '#555', minWidth: 42, textAlign: 'right' } }, fmtPct(pct))
            )
          ),
          h('div', { style: { background: '#1a1a1a', borderRadius: 4, height: 6, overflow: 'hidden' } },
            h('div', { style: { width: fmtPct(barPct), height: '100%', background: '#c8392c', borderRadius: 4, transition: 'width 0.5s' } })
          )
        );
      }),
      h('div', { style: { marginTop: 4, fontSize: 11, color: '#444', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' } },
        'Total: ' + fmt$(total)
      )
    );
  }

  /* ═══════════════════════════════════════════
     TAB 5 — END OF DAY
  ═══════════════════════════════════════════ */
  const DENOMS = [
    { label: '$100', value: 100 },
    { label: '$50',  value: 50  },
    { label: '$20',  value: 20  },
    { label: '$10',  value: 10  },
    { label: '$5',   value: 5   },
    { label: '$2',   value: 2   },
    { label: '$1',   value: 1   },
    { label: '25\xa2', value: 0.25 },
    { label: '10\xa2', value: 0.10 },
    { label: '5\xa2',  value: 0.05 },
  ];

  function EndOfDayTab() {
    const [counts, setCounts] = useState(() => Object.fromEntries(DENOMS.map(d => [d.value, ''])));
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [saved, setSaved] = useState(false);

    const totalCash = DENOMS.reduce((s, d) => s + (parseFloat(counts[d.value]) || 0) * d.value, 0);
    const FLOAT = 200;
    const CASH_SALES = 4960.00;
    const EXPECTED = FLOAT + CASH_SALES;
    const variance = totalCash - EXPECTED;

    const CARD_TOTAL  = 14820.50;
    const OTHER_TOTAL =  2230.00;
    const GRAND_TOTAL = CASH_SALES + CARD_TOTAL + OTHER_TOTAL;

    function closedDay() {
      const rec = {
        ts: new Date().toISOString(),
        date: todayISO(),
        cashCounted: totalCash,
        cashExpected: EXPECTED,
        variance,
        cardTotal: CARD_TOTAL,
        otherTotal: OTHER_TOTAL,
        grandTotal: GRAND_TOTAL,
        denomBreakdown: Object.fromEntries(DENOMS.map(d => [d.label, parseFloat(counts[d.value]) || 0])),
      };
      const prev = JSON.parse(localStorage.getItem('cl-pos-eod') || '[]');
      localStorage.setItem('cl-pos-eod', JSON.stringify([rec, ...prev].slice(0, 30)));
      setSaved(true);
      if (typeof window.toast === 'function') window.toast('End of day saved', 'success');
    }

    function printZ() {
      const lines = [
        '============================',
        '  CHAINLINE CYCLE POS',
        '  Z-REPORT - ' + todayISO(),
        '============================',
        '',
        'CASH SUMMARY',
        '  Opening Float:  ' + fmt$(FLOAT),
        '  Cash Sales:     ' + fmt$(CASH_SALES),
        '  Expected:       ' + fmt$(EXPECTED),
        '  Counted:        ' + fmt$(totalCash),
        '  Variance:       ' + (variance >= 0 ? '+' : '') + fmt$(variance),
        '',
        'PAYMENT TOTALS',
        '  Credit/Debit:   ' + fmt$(CARD_TOTAL),
        '  Cash:           ' + fmt$(CASH_SALES),
        '  Other:          ' + fmt$(OTHER_TOTAL),
        '  Grand Total:    ' + fmt$(GRAND_TOTAL),
        '',
        'DENOMINATION BREAKDOWN',
        ...DENOMS.map(d => '  ' + d.label.padEnd(6) + ' x' + (parseFloat(counts[d.value]) || 0) + ' = ' + fmt$((parseFloat(counts[d.value]) || 0) * d.value)),
        '',
        '============================',
        '  Printed: ' + new Date().toLocaleString('en-CA'),
        '============================',
      ].join('\n');
      const w = window.open('', '_blank', 'width=400,height=600');
      w.document.write('<pre style="font-family:monospace;font-size:13px;padding:20px">' + lines + '</pre>');
      w.print();
    }

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 } },
      /* Header + open drawer button */
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        h('h3', { style: { margin: 0, fontSize: 14, color: '#ededed' } }, 'End of Day Reconciliation'),
        !drawerOpen && h('button', {
          onClick: () => setDrawerOpen(true),
          style: {
            padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: '#c8392c', color: '#fff', fontSize: 12, fontWeight: 600,
          },
        }, 'Open Cash Drawer')
      ),

      /* Cash count drawer */
      drawerOpen && h('div', { style: { background: '#111', border: '1px solid #222', borderRadius: 10, padding: '18px 20px' } },
        h('div', { style: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 } }, 'Cash Count by Denomination'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 } },
          ...DENOMS.map(d =>
            h('div', { key: d.value },
              h('label', { style: { fontSize: 11, color: '#666', display: 'block', marginBottom: 4 } }, d.label + ' bills/coins'),
              h('input', {
                type: 'number', min: 0, placeholder: '0',
                value: counts[d.value],
                onChange: e => setCounts(prev => ({ ...prev, [d.value]: e.target.value })),
                style: {
                  width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #333',
                  background: '#0d0d0d', color: '#ededed', fontSize: 13,
                  fontFamily: 'JetBrains Mono, monospace', boxSizing: 'border-box',
                },
              })
            )
          )
        ),
        h('div', { style: { marginTop: 16, padding: '10px 0', borderTop: '1px solid #222', fontSize: 18, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: totalCash > 0 ? '#ededed' : '#444' } },
          'Counted Total: ', h('span', { style: { color: '#c8392c' } }, fmt$(totalCash))
        )
      ),

      /* Summary */
      h('div', { style: { background: '#111', border: '1px solid #222', borderRadius: 10, padding: '18px 20px' } },
        h('div', { style: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 } }, 'Day Summary'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          ...[
            { label: 'Opening Float',    val: fmt$(FLOAT),       color: '#aaa' },
            { label: 'Cash Sales',       val: fmt$(CASH_SALES),  color: '#aaa' },
            { label: 'Expected Cash',    val: fmt$(EXPECTED),    color: '#aaa' },
            { label: 'Counted Cash',     val: fmt$(totalCash),   color: drawerOpen ? '#ededed' : '#444' },
            { label: 'Variance',         val: (variance >= 0 ? '+' : '') + fmt$(variance), color: Math.abs(variance) < 0.01 ? '#22c55e' : variance > 0 ? '#22c55e' : '#ef4444' },
            null,
            { label: 'Credit / Debit',   val: fmt$(CARD_TOTAL),  color: '#aaa' },
            { label: 'Other',            val: fmt$(OTHER_TOTAL), color: '#aaa' },
            { label: 'Grand Total',      val: fmt$(GRAND_TOTAL), color: '#c8392c', bold: true },
          ].map((row, i) => row === null
            ? h('div', { key: i, style: { height: 1, background: '#222', margin: '4px 0' } })
            : h('div', { key: row.label, style: { display: 'flex', justifyContent: 'space-between' } },
                h('span', { style: { fontSize: 12, color: '#666' } }, row.label),
                h('span', { style: { fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: row.color, fontWeight: row.bold ? 700 : 400 } }, row.val)
              )
          )
        )
      ),

      /* Actions */
      h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
        h('button', {
          onClick: printZ,
          style: {
            padding: '8px 18px', borderRadius: 6, border: '1px solid #333',
            background: '#1a1a1a', color: '#aaa', fontSize: 12, cursor: 'pointer',
          },
        }, '\u{1F5A8}️ Print Z-Report'),
        !saved && h('button', {
          onClick: closedDay,
          style: {
            padding: '8px 18px', borderRadius: 6, border: 'none',
            background: '#c8392c', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          },
        }, 'Close Day'),
        saved && h('div', { style: { padding: '8px 18px', fontSize: 12, color: '#22c55e', fontFamily: 'JetBrains Mono, monospace' } },
          '✓ Day closed and saved'
        )
      )
    );
  }

  /* ═══════════════════════════════════════════
     TAB 6 — WORK ORDERS REPORT
  ═══════════════════════════════════════════ */
  function WorkOrdersReportTab() {
    const [statusFilter, setStatusFilter] = useState('all');
    const [mechFilter, setMechFilter] = useState('all');
    const [preset, setPreset] = useState('this-month');

    const allWOs = getLiveWOs();
    const statuses = ['all', 'open', 'inprogress', 'ready', 'overdue', 'closed', 'booked'];
    const mechs = ['all', ...Array.from(new Set(allWOs.map(w => w.mech))).sort()];

    const filtered = allWOs.filter(w => {
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (mechFilter !== 'all' && w.mech !== mechFilter) return false;
      return true;
    });

    /* Avg turnaround: closed WOs only */
    const closed = allWOs.filter(w => w.status === 'closed' && w.dateIn && w.dateOut);
    const avgTurnaround = closed.length
      ? closed.reduce((s, w) => s + (new Date(w.dateOut) - new Date(w.dateIn)) / 86400000, 0) / closed.length
      : 0;
    const overdue = allWOs.filter(w => w.status === 'overdue').length;

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      /* Stat chips */
      h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
        h(StatCard, { label: 'Total WOs', value: allWOs.length }),
        h(StatCard, { label: 'Overdue', value: overdue, sub: 'need attention' }),
        h(StatCard, { label: 'Avg Turnaround', value: avgTurnaround.toFixed(1) + 'd', sub: 'closed WOs' }),
        h(StatCard, { label: 'In Progress', value: allWOs.filter(w => w.status === 'inprogress').length }),
      ),

      /* Filters */
      h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' } },
        h(DateRangePicker, { preset, onChange: (p) => setPreset(p) }),
        h('select', {
          value: statusFilter, onChange: e => setStatusFilter(e.target.value),
          style: customDateStyle,
        },
          ...statuses.map(s => h('option', { key: s, value: s }, s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)))
        ),
        h('select', {
          value: mechFilter, onChange: e => setMechFilter(e.target.value),
          style: customDateStyle,
        },
          ...mechs.map(m => h('option', { key: m, value: m }, m === 'all' ? 'All Mechanics' : m))
        ),
      ),

      /* Table */
      h('div', { style: { overflowX: 'auto' } },
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
          h('thead', null,
            h('tr', null,
              ...['WO#', 'Customer', 'Bike', 'Mechanic', 'Status', 'Date In', 'Date Out', 'Hours', 'Total'].map(col =>
                h('th', { key: col, style: { ...thStyle, textAlign: ['Hours', 'Total'].includes(col) ? 'right' : 'left' } }, col)
              )
            )
          ),
          h('tbody', null,
            filtered.length === 0
              ? h('tr', null, h('td', { colSpan: 9, style: { ...tdL, color: '#555', textAlign: 'center', padding: 24 } }, 'No work orders match filters'))
              : filtered.map((w, i) =>
                  h('tr', { key: w.id, style: { background: i % 2 === 0 ? 'transparent' : '#0d0d0d' } },
                    h('td', { style: { ...tdL, fontFamily: 'JetBrains Mono, monospace', color: '#c8392c' } }, w.id),
                    h('td', { style: tdL }, w.cust),
                    h('td', { style: { ...tdL, color: '#888', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, w.bike),
                    h('td', { style: tdL },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                        h('span', {
                          style: {
                            width: 22, height: 22, borderRadius: '50%',
                            background: '#1d1d1d', border: '1px solid #333',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 8, fontWeight: 700, color: '#aaa',
                            fontFamily: 'JetBrains Mono, monospace',
                          },
                        }, w.mechInit),
                        w.mech
                      )
                    ),
                    h('td', { style: tdL }, h(StatusChip, { status: w.status })),
                    h('td', { style: { ...tdL, fontFamily: 'JetBrains Mono, monospace', color: '#666' } }, w.dateIn),
                    h('td', { style: { ...tdL, fontFamily: 'JetBrains Mono, monospace', color: '#666' } }, w.dateOut || '-'),
                    h('td', { style: { ...tdR, fontFamily: 'JetBrains Mono, monospace' } }, w.hours || '-'),
                    h('td', { style: { ...tdR, fontFamily: 'JetBrains Mono, monospace', color: w.total ? '#ededed' : '#444' } }, w.total ? fmt$(w.total) : '-')
                  )
                )
          )
        )
      )
    );
  }

  /* ─── StatusChip ─── */
  const STATUS_COLORS = {
    open:       { bg: '#0d1f3c', color: '#4da6ff' },
    inprogress: { bg: '#1a2a0d', color: '#6bcb3d' },
    ready:      { bg: '#1a2a0d', color: '#22c55e'  },
    overdue:    { bg: '#2a0d0d', color: '#ef4444'  },
    closed:     { bg: '#1a1a1a', color: '#555'     },
    booked:     { bg: '#1a1a2a', color: '#818cf8'  },
  };
  function StatusChip({ status }) {
    const c = STATUS_COLORS[status] || { bg: '#1a1a1a', color: '#aaa' };
    return h('span', {
      style: {
        display: 'inline-block', padding: '2px 8px', borderRadius: 12,
        background: c.bg, color: c.color, fontSize: 10, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      },
    }, status);
  }

  const thStyle = {
    padding: '8px 12px', borderBottom: '1px solid #222', color: '#555',
    textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, fontSize: 10,
    whiteSpace: 'nowrap',
  };

  /* ═══════════════════════════════════════════
     MAIN REPORTS SCREEN
  ═══════════════════════════════════════════ */
  const TABS = [
    { id: 'sales',      label: 'Sales Overview'  },
    { id: 'top-items',  label: 'Top Items'        },
    { id: 'mechanics',  label: 'By Mechanic'      },
    { id: 'categories', label: 'By Category'      },
    { id: 'eod',        label: 'End of Day'       },
    { id: 'workorders', label: 'Work Orders'      },
  ];

  function ReportsScreen() {
    const [tab, setTab] = useState('sales');

    function renderTab() {
      switch (tab) {
        case 'sales':      return h(SalesOverviewTab);
        case 'top-items':  return h(TopItemsTab);
        case 'mechanics':  return h(MechanicTab);
        case 'categories': return h(CategoryTab);
        case 'eod':        return h(EndOfDayTab);
        case 'workorders': return h(WorkOrdersReportTab);
        default:           return null;
      }
    }

    return h(Fragment, null,
      /* Page header */
      h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 } },
        h('div', null,
          h('div', { style: { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 } }, 'Analytics'),
          h('div', { style: { fontSize: 20, fontWeight: 700, color: '#ededed' } }, 'Reports')
        )
      ),

      /* Tab bar */
      h('div', {
        style: {
          display: 'flex', gap: 2, borderBottom: '1px solid #1d1d1d',
          marginBottom: 24, overflowX: 'auto', paddingBottom: 0,
        },
      },
        ...TABS.map(t =>
          h('button', {
            key: t.id,
            onClick: () => setTab(t.id),
            style: TAB_STYLE(tab === t.id),
          }, t.label)
        )
      ),

      /* Tab content */
      h('div', null, renderTab())
    );
  }

  window.ReportsScreen = ReportsScreen;

})();
