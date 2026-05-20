/* pos-eod.js — ChainLine POS End of Day Standalone Module
 * Pure React.createElement, no JSX, no external libs.
 * window.EODModal — modal component for End of Day cash count + close day flow.
 * Saves EOD records to localStorage as 'cl-pos-eod' (JSON array, newest first, max 90 days).
 */

'use strict';

(function () {
  const { createElement: h, useState, useEffect, useRef, Fragment } = React;

  /* ─── Formatters ─── */
  function fmt$(n) {
    return '$' + Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }

  /* ─── Denominations ─── */
  const DENOMS = [
    { label: '$100', value: 100    },
    { label: '$50',  value: 50     },
    { label: '$20',  value: 20     },
    { label: '$10',  value: 10     },
    { label: '$5',   value: 5      },
    { label: '$2',   value: 2      },
    { label: '$1',   value: 1      },
    { label: '25\xa2', value: 0.25 },
    { label: '10\xa2', value: 0.10 },
    { label: '5\xa2',  value: 0.05 },
  ];

  /* ─── Steps ─── */
  const STEPS = ['count', 'summary', 'done'];

  /* ─── EOD Modal ─── */
  function EODModal({ onClose, cashSales = 4960.00, cardTotal = 14820.50, otherTotal = 2230.00, openingFloat = 200.00 }) {
    const [step, setStep] = useState('count');
    const [counts, setCounts] = useState(() => Object.fromEntries(DENOMS.map(d => [d.value, ''])));
    const firstRef = useRef(null);

    useEffect(() => {
      // Trap focus inside modal
      if (firstRef.current) firstRef.current.focus();
    }, [step]);

    useEffect(() => {
      function handleKey(e) {
        if (e.key === 'Escape') onClose && onClose();
      }
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const countedCash = DENOMS.reduce((s, d) => s + (parseFloat(counts[d.value]) || 0) * d.value, 0);
    const expectedCash = openingFloat + cashSales;
    const variance = countedCash - expectedCash;
    const grandTotal = cashSales + cardTotal + otherTotal;

    function buildRecord() {
      return {
        ts: new Date().toISOString(),
        date: todayISO(),
        cashCounted: countedCash,
        cashExpected: expectedCash,
        openingFloat,
        cashSales,
        variance,
        cardTotal,
        otherTotal,
        grandTotal,
        denomBreakdown: Object.fromEntries(
          DENOMS.map(d => [d.label, parseFloat(counts[d.value]) || 0])
        ),
      };
    }

    function saveAndClose() {
      const rec = buildRecord();
      try {
        const prev = JSON.parse(localStorage.getItem('cl-pos-eod') || '[]');
        localStorage.setItem('cl-pos-eod', JSON.stringify([rec, ...prev].slice(0, 90)));
      } catch (e) {
        console.error('EOD save failed', e);
      }
      setStep('done');
    }

    function printZ(rec) {
      const r = rec || buildRecord();
      const lines = [
        '================================',
        '      CHAINLINE CYCLE POS',
        '      Z-REPORT',
        '      ' + r.date,
        '================================',
        '',
        'CASH RECONCILIATION',
        '  Opening Float:    ' + fmt$(r.openingFloat),
        '  Cash Sales:       ' + fmt$(r.cashSales),
        '  Expected Cash:    ' + fmt$(r.cashExpected),
        '  Counted Cash:     ' + fmt$(r.cashCounted),
        '  Variance:         ' + (r.variance >= 0 ? '+' : '') + fmt$(r.variance),
        '',
        'PAYMENT TOTALS',
        '  Cash:             ' + fmt$(r.cashSales),
        '  Credit / Debit:   ' + fmt$(r.cardTotal),
        '  Other:            ' + fmt$(r.otherTotal),
        '  ─────────────────────────────',
        '  Grand Total:      ' + fmt$(r.grandTotal),
        '',
        'DENOMINATION BREAKDOWN',
        ...DENOMS.map(d => {
          const qty = r.denomBreakdown[d.label] || 0;
          const sub = qty * d.value;
          return '  ' + (d.label + '     ').slice(0, 6) + ' x ' + String(qty).padStart(3) + '  = ' + fmt$(sub);
        }),
        '',
        '================================',
        '  Printed: ' + new Date().toLocaleString('en-CA'),
        '================================',
      ].join('\n');
      const w = window.open('', '_blank', 'width=420,height=640');
      if (!w) { alert('Please allow pop-ups to print the Z-Report.'); return; }
      w.document.write(
        '<!doctype html><html><head><title>Z-Report ' + r.date + '</title>' +
        '<style>body{margin:24px;background:#fff;color:#000;}pre{font-family:"Courier New",monospace;font-size:13px;white-space:pre;}</style>' +
        '</head><body><pre>' + lines + '</pre></body></html>'
      );
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 400);
    }

    /* ─── Overlay ─── */
    return h('div', {
      style: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9000, padding: 16,
      },
      onClick: e => { if (e.target === e.currentTarget && step !== 'done') onClose && onClose(); },
    },
      h('div', {
        style: {
          background: '#0d0d0d', border: '1px solid #222', borderRadius: 14,
          width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
          padding: '24px 28px',
        },
        onClick: e => e.stopPropagation(),
      },
        /* Header */
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 } },
          h('div', null,
            h('div', { style: { fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 } }, 'End of Day'),
            h('div', { style: { fontSize: 18, fontWeight: 700, color: '#ededed' } },
              step === 'count'   ? 'Cash Count'     :
              step === 'summary' ? 'Day Summary'     : 'Day Closed'
            )
          ),
          step !== 'done' && h('button', {
            onClick: onClose,
            style: {
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: '#1a1a1a', color: '#666', cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            },
          }, '\xd7')
        ),

        /* Step indicator */
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 24 } },
          ...STEPS.map((s, i) => {
            const idx = STEPS.indexOf(step);
            const active = s === step;
            const done = i < idx;
            return h('div', { key: s, style: { display: 'flex', alignItems: 'center', gap: 6 } },
              h('div', {
                style: {
                  width: 20, height: 20, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#22c55e' : active ? '#c8392c' : '#1a1a1a',
                  color: done || active ? '#fff' : '#444',
                  border: active ? 'none' : '1px solid #333',
                },
              }, done ? '✓' : i + 1),
              i < STEPS.length - 1 && h('div', { style: { width: 24, height: 1, background: '#222' } })
            );
          })
        ),

        /* ── STEP 1: Cash Count ── */
        step === 'count' && h(Fragment, null,
          h('div', { style: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 } }, 'Enter quantity of each denomination'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 } },
            ...DENOMS.map((d, i) =>
              h('div', { key: d.value },
                h('label', { style: { fontSize: 11, color: '#666', display: 'block', marginBottom: 4 } }, d.label),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('input', {
                    ref: i === 0 ? firstRef : null,
                    type: 'number', min: 0, placeholder: '0',
                    value: counts[d.value],
                    onChange: e => setCounts(prev => ({ ...prev, [d.value]: e.target.value })),
                    onFocus: e => e.target.select(),
                    style: {
                      flex: 1, padding: '7px 10px', borderRadius: 6,
                      border: '1px solid #333', background: '#111',
                      color: '#ededed', fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace',
                    },
                  }),
                  h('span', {
                    style: { fontSize: 11, color: '#555', minWidth: 52, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' },
                  }, fmt$((parseFloat(counts[d.value]) || 0) * d.value))
                )
              )
            )
          ),
          h('div', {
            style: {
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderTop: '1px solid #222', marginBottom: 16,
            },
          },
            h('span', { style: { fontSize: 12, color: '#888' } }, 'Counted Total'),
            h('span', { style: { fontSize: 20, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#c8392c' } }, fmt$(countedCash))
          ),
          h('button', {
            onClick: () => setStep('summary'),
            style: {
              width: '100%', padding: '10px', borderRadius: 8, border: 'none',
              background: '#c8392c', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            },
          }, 'Review Summary →')
        ),

        /* ── STEP 2: Summary ── */
        step === 'summary' && h(Fragment, null,
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 } },
            ...[
              { label: 'Opening Float',    val: fmt$(openingFloat),      color: '#aaa' },
              { label: 'Cash Sales',       val: fmt$(cashSales),         color: '#aaa' },
              { label: 'Expected Cash',    val: fmt$(expectedCash),      color: '#aaa' },
              { label: 'Counted Cash',     val: fmt$(countedCash),       color: '#ededed' },
              null,
              { label: 'Variance',
                val: (variance >= 0 ? '+' : '') + fmt$(variance),
                color: Math.abs(variance) < 0.01 ? '#22c55e' : variance > 0 ? '#22c55e' : '#ef4444',
                bold: true,
              },
              null,
              { label: 'Credit / Debit',   val: fmt$(cardTotal),         color: '#aaa' },
              { label: 'Cash',             val: fmt$(cashSales),         color: '#aaa' },
              { label: 'Other',            val: fmt$(otherTotal),        color: '#aaa' },
              null,
              { label: 'Grand Total',      val: fmt$(grandTotal),        color: '#c8392c', bold: true, large: true },
            ].map((row, i) => row === null
              ? h('div', { key: 'sep' + i, style: { height: 1, background: '#1d1d1d', margin: '8px 0' } })
              : h('div', {
                  key: row.label,
                  style: {
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    padding: '6px 0', borderBottom: '1px solid #111',
                  },
                },
                  h('span', { style: { fontSize: 12, color: '#666' } }, row.label),
                  h('span', {
                    style: {
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: row.large ? 16 : 13,
                      color: row.color,
                      fontWeight: row.bold ? 700 : 400,
                    },
                  }, row.val)
                )
            )
          ),
          h('div', { style: { display: 'flex', gap: 10 } },
            h('button', {
              onClick: () => setStep('count'),
              style: {
                flex: 1, padding: '9px', borderRadius: 8,
                border: '1px solid #333', background: '#1a1a1a',
                color: '#aaa', fontSize: 12, cursor: 'pointer',
              },
            }, '← Back'),
            h('button', {
              onClick: () => printZ(),
              style: {
                flex: 1, padding: '9px', borderRadius: 8,
                border: '1px solid #333', background: '#1a1a1a',
                color: '#aaa', fontSize: 12, cursor: 'pointer',
              },
            }, 'Print Z-Report'),
            h('button', {
              onClick: saveAndClose,
              style: {
                flex: 2, padding: '9px', borderRadius: 8, border: 'none',
                background: '#c8392c', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              },
            }, 'Close Day')
          )
        ),

        /* ── STEP 3: Done ── */
        step === 'done' && h('div', { style: { textAlign: 'center', padding: '20px 0' } },
          h('div', { style: { fontSize: 40, marginBottom: 12 } }, '✓'),
          h('div', { style: { fontSize: 16, color: '#ededed', fontWeight: 600, marginBottom: 8 } }, 'Day Closed'),
          h('div', { style: { fontSize: 12, color: '#666', marginBottom: 24 } },
            'Saved to local records - ' + todayISO()
          ),
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
            h('button', {
              onClick: () => printZ(buildRecord()),
              style: {
                padding: '8px 18px', borderRadius: 8, border: '1px solid #333',
                background: '#1a1a1a', color: '#aaa', fontSize: 12, cursor: 'pointer',
              },
            }, 'Print Z-Report'),
            h('button', {
              onClick: onClose,
              style: {
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: '#c8392c', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              },
            }, 'Done')
          )
        )
      )
    );
  }

  /* ─── EODButton ─── */
  /* Helper: drop-in button that opens EODModal */
  function EODButton({ cashSales, cardTotal, otherTotal, openingFloat, children }) {
    const [open, setOpen] = useState(false);
    return h(Fragment, null,
      h('span', { onClick: () => setOpen(true), style: { display: 'contents' } }, children ||
        h('button', {
          style: {
            padding: '7px 14px', borderRadius: 6, border: '1px solid #333',
            background: '#1a1a1a', color: '#aaa', fontSize: 12, cursor: 'pointer',
          },
        }, 'End of Day')
      ),
      open && h(EODModal, {
        onClose: () => setOpen(false),
        cashSales, cardTotal, otherTotal, openingFloat,
      })
    );
  }

  /* ─── History viewer ─── */
  function EODHistory() {
    const [records, setRecords] = useState([]);
    useEffect(() => {
      try {
        setRecords(JSON.parse(localStorage.getItem('cl-pos-eod') || '[]'));
      } catch { setRecords([]); }
    }, []);

    if (!records.length) {
      return h('div', { style: { fontSize: 12, color: '#555', padding: 16 } }, 'No end of day records saved yet.');
    }

    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      h('div', { style: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 } }, 'EOD History'),
      ...records.map((r, i) =>
        h('div', {
          key: i,
          style: {
            background: '#111', border: '1px solid #1d1d1d', borderRadius: 8, padding: '12px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          },
        },
          h('div', null,
            h('div', { style: { fontSize: 12, color: '#ededed', fontWeight: 600 } }, r.date),
            h('div', { style: { fontSize: 11, color: '#555', marginTop: 2 } }, new Date(r.ts).toLocaleString('en-CA'))
          ),
          h('div', { style: { textAlign: 'right' } },
            h('div', { style: { fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#c8392c' } }, fmt$(r.grandTotal)),
            h('div', {
              style: {
                fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
                color: Math.abs(r.variance) < 0.01 ? '#22c55e' : r.variance > 0 ? '#22c55e' : '#ef4444',
              },
            }, 'VAR ' + (r.variance >= 0 ? '+' : '') + fmt$(r.variance))
          )
        )
      )
    );
  }

  /* ─── Exports ─── */
  window.EODModal   = EODModal;
  window.EODButton  = EODButton;
  window.EODHistory = EODHistory;

})();
