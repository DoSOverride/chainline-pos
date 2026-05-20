/* ChainLine POS — Workorder extras: timer, photos, RA workflow, customer chips
 *
 * Single module bundling the small augments that all live INSIDE WorkOrderDetail.
 * Each export is a React component you mount in WorkOrderDetail (see MEGA_PATCH.md).
 *
 *   window.WoTimer({ woId, onLogTime })         — start/stop live timer per WO
 *   window.WoPhotos({ woId })                    — drag-drop photo gallery
 *   window.WoRaCallout({ wo, onUpdate })         — RA! workflow UI
 *   window.CustomerTypeChip({ type })            — STAFF/WHOLESALE/etc chip
 *
 * Beats Lightspeed §16c, §16f, §16h, §10.
 *
 * Load: <script defer src="/pos-wo-extras.js?v=1"></script>
 */

(function() {
  'use strict';

  function init() {
    if (!window.React) return setTimeout(init, 50);
    const { createElement: h, useState, useEffect, useRef, useCallback, Fragment } = React;

    // ─── WO Timer ────────────────────────────────────────────────
    function WoTimer(props) {
      const woId = props.woId;
      const storageKey = 'pos-wo-timer-' + woId;
      const accumKey = 'pos-wo-accum-' + woId;

      const [running, setRunning] = useState(function() {
        try { return !!localStorage.getItem(storageKey); } catch { return false; }
      });
      const [startedAt, setStartedAt] = useState(function() {
        try {
          const v = localStorage.getItem(storageKey);
          return v ? parseInt(v, 10) : null;
        } catch { return null; }
      });
      const [accum, setAccum] = useState(function() {
        try { return parseInt(localStorage.getItem(accumKey) || '0', 10); } catch { return 0; }
      });
      const [_, setTick] = useState(0);

      // Ticker
      useEffect(function() {
        if (!running) return;
        const id = setInterval(function() { setTick(function(t) { return t + 1; }); }, 1000);
        return function() { clearInterval(id); };
      }, [running]);

      function fmt(ms) {
        const s = Math.floor(ms / 1000);
        const hh = String(Math.floor(s / 3600)).padStart(2, '0');
        const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        return hh + ':' + mm + ':' + ss;
      }

      const elapsed = accum + (running && startedAt ? (Date.now() - startedAt) : 0);

      function start() {
        const now = Date.now();
        setStartedAt(now);
        setRunning(true);
        try { localStorage.setItem(storageKey, String(now)); } catch {}
      }

      function stop() {
        const delta = startedAt ? (Date.now() - startedAt) : 0;
        const next = accum + delta;
        setAccum(next);
        setRunning(false);
        setStartedAt(null);
        try {
          localStorage.removeItem(storageKey);
          localStorage.setItem(accumKey, String(next));
        } catch {}
        if (props.onLogTime) props.onLogTime(next);
        if (window.toast) window.toast('Logged ' + fmt(delta) + ' to ' + woId, 'success');
      }

      function reset() {
        if (!confirm('Reset timer? Existing logged time will be lost.')) return;
        setAccum(0); setRunning(false); setStartedAt(null);
        try { localStorage.removeItem(storageKey); localStorage.removeItem(accumKey); } catch {}
      }

      return h('div', { className: 'wo-timer' + (running ? ' is-running' : '') },
        h('span', { className: 'wo-timer-dot' }),
        h('span', { className: 'wo-timer-elapsed' }, fmt(elapsed)),
        running
          ? h('button', { className: 'wo-timer-btn is-stop', onClick: stop }, 'Stop')
          : h('button', { className: 'wo-timer-btn', onClick: start }, accum > 0 ? 'Resume' : 'Start'),
        accum > 0 && !running
          ? h('button', {
              className: 'wo-timer-btn',
              onClick: reset,
              style: { color: 'var(--text3)' },
              title: 'Reset'
            }, 'Reset')
          : null
      );
    }

    // ─── WO Photos ───────────────────────────────────────────────
    // Stores photos in localStorage as data URLs (good for demo). In production
    // swap the saveLocal/loadLocal calls for a POST to the worker → R2 endpoint.
    function WoPhotos(props) {
      const woId = props.woId;
      const storageKey = 'pos-wo-photos-' + woId;
      const fileInputRef = useRef(null);

      const [photos, setPhotos] = useState(function() {
        try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
      });

      function persist(next) {
        setPhotos(next);
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch (e) {
          if (window.toast) window.toast('Storage full — wire R2 upload', 'error');
        }
      }

      function handleFiles(files) {
        if (!files || !files.length) return;
        Array.from(files).slice(0, 12).forEach(function(file) {
          if (!file.type.startsWith('image/')) return;
          // In production: POST to worker /api/wo/{woId}/photo -> R2.
          // For now: downsize to 720px and store as data URL.
          const reader = new FileReader();
          reader.onload = function(ev) {
            const img = new Image();
            img.onload = function() {
              const maxW = 720;
              const scale = img.width > maxW ? maxW / img.width : 1;
              const cw = Math.round(img.width * scale);
              const ch = Math.round(img.height * scale);
              const c = document.createElement('canvas');
              c.width = cw; c.height = ch;
              c.getContext('2d').drawImage(img, 0, 0, cw, ch);
              const dataUrl = c.toDataURL('image/jpeg', 0.78);
              persist(photos.concat([{ id: Date.now() + Math.random(), url: dataUrl, ts: Date.now() }]));
            };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(file);
        });
      }

      function del(id) {
        persist(photos.filter(function(p) { return p.id !== id; }));
      }

      function openLightbox(url) {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write('<html><body style="background:#000;margin:0;display:flex;align-items:center;justify-content:center;height:100vh"><img src="' + url + '" style="max-width:100%;max-height:100%"></body></html>');
      }

      return h('div', null,
        h('div', {
          className: 'panel-section-head',
          style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
        },
          h('span', null, 'Photos · ' + photos.length),
          h('button', {
            className: 'btn ghost',
            style: { height: 24, padding: '0 8px', fontSize: 11 },
            onClick: function() { fileInputRef.current && fileInputRef.current.click(); }
          }, '+ Add')
        ),
        h('input', {
          ref: fileInputRef,
          type: 'file',
          accept: 'image/*',
          multiple: true,
          style: { display: 'none' },
          onChange: function(e) { handleFiles(e.target.files); e.target.value = ''; }
        }),
        h('div', { className: 'wo-photos' },
          photos.map(function(p) {
            return h('div', { key: p.id, className: 'wo-photo' },
              h('img', { src: p.url, alt: '', onClick: function() { openLightbox(p.url); } }),
              h('button', {
                className: 'wo-photo-del',
                onClick: function(e) { e.stopPropagation(); del(p.id); },
                title: 'Delete'
              }, '\u00d7')
            );
          }),
          h('div', {
            className: 'wo-photo-add wo-photo',
            onClick: function() { fileInputRef.current && fileInputRef.current.click(); },
            onDragOver: function(e) { e.preventDefault(); },
            onDrop: function(e) { e.preventDefault(); handleFiles(e.dataTransfer.files); }
          },
            h('span', null, '+ Drop photos')
          )
        )
      );
    }

    // ─── RA! Workflow callout ─────────────────────────────────────
    // Shows when wo.status === 'RA' or similar. Captures vendor + RMA number +
    // tracking + a "Generate RMA letter" button that opens a print dialog.
    function WoRaCallout(props) {
      const wo = props.wo || {};
      const [vendor, setVendor]     = useState(wo.raVendor || '');
      const [rmaNumber, setRma]     = useState(wo.rmaNumber || '');
      const [tracking, setTracking] = useState(wo.raTracking || '');
      const [step, setStep]         = useState(wo.raStep || 'submit');  // submit | shipped | received | resolved

      function update() {
        const next = { raVendor: vendor, rmaNumber: rmaNumber, raTracking: tracking, raStep: step };
        if (props.onUpdate) props.onUpdate(next);
        try { localStorage.setItem('pos-ra-' + wo.id, JSON.stringify(next)); } catch {}
        if (window.toast) window.toast('RA updated', 'success');
      }

      function printRma() {
        const shop = (function() {
          try { return JSON.parse(localStorage.getItem('pos-settings') || '{}'); } catch { return {}; }
        })();
        const w = window.open('', '_blank', 'width=800,height=1000');
        if (!w) return;
        const html = `
          <html><head><title>RMA · ${wo.id}</title>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 60px; color: #000; max-width: 720px; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .sub { color: #666; font-size: 12px; margin-bottom: 32px; }
            .field { margin: 14px 0; font-size: 13px; }
            .field b { display: inline-block; min-width: 140px; color: #888; font-weight: 500; }
            .box { border: 1px solid #999; padding: 16px; margin: 24px 0; }
            table { width: 100%; border-collapse: collapse; margin: 18px 0; }
            th, td { border-bottom: 1px solid #eee; padding: 8px 4px; text-align: left; font-size: 12px; }
            footer { margin-top: 60px; font-size: 11px; color: #888; }
          </style>
          </head><body>
            <h1>Return Material Authorization</h1>
            <div class="sub">${shop.shopName || 'ChainLine Cycle'} · ${wo.id} · ${new Date().toLocaleDateString('en-CA')}</div>
            <div class="box">
              <div class="field"><b>RMA Number</b> ${rmaNumber || '— pending —'}</div>
              <div class="field"><b>Vendor</b> ${vendor || '—'}</div>
              <div class="field"><b>Customer</b> ${wo.cust || '—'}</div>
              <div class="field"><b>Item</b> ${wo.bike || '—'}</div>
              <div class="field"><b>Serial</b> ${wo.serial || '—'}</div>
              <div class="field"><b>Tracking</b> ${tracking || '—'}</div>
            </div>
            <h3>Failure description</h3>
            <p>${(wo.internalNote || wo.notes || 'See attached photos').replace(/\\n/g, '<br>')}</p>
            <footer>
              ${shop.address || ''}<br>
              ${shop.phone || ''} · ${shop.email || ''}<br>
              Submitted by ${shop.shopName || 'ChainLine'} on ${new Date().toLocaleString('en-CA')}
            </footer>
            <script>window.onload=function(){window.print();}</` + 'script>' + `
          </body></html>`;
        w.document.write(html);
        w.document.close();
      }

      const STEPS = [
        { id: 'submit',   label: 'Submitted to vendor' },
        { id: 'shipped',  label: 'Part shipped from vendor' },
        { id: 'received', label: 'Part received in shop' },
        { id: 'resolved', label: 'Resolved' },
      ];

      return h('div', { className: 'ra-callout' },
        h('div', { className: 'ra-callout-head' }, 'RA · Warranty Return'),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '8px 0' } },
          h('input', {
            className: 'input', placeholder: 'Vendor (e.g. SRAM, Shimano)',
            value: vendor, onChange: function(e) { setVendor(e.target.value); }
          }),
          h('input', {
            className: 'input mono', placeholder: 'RMA #',
            value: rmaNumber, onChange: function(e) { setRma(e.target.value); }
          }),
          h('input', {
            className: 'input mono', placeholder: 'Outbound tracking',
            value: tracking, onChange: function(e) { setTracking(e.target.value); },
            style: { gridColumn: '1/-1' }
          })
        ),

        // Step progress
        h('div', {
          style: { display: 'flex', gap: 4, margin: '10px 0', flexWrap: 'wrap' }
        },
          STEPS.map(function(s, i) {
            const done = STEPS.findIndex(function(x) { return x.id === step; }) >= i;
            return h('button', {
              key: s.id,
              onClick: function() { setStep(s.id); },
              style: {
                flex: 1, minWidth: 130,
                padding: '6px 8px',
                background: done ? 'var(--accent)' : 'var(--bg2)',
                color: done ? '#fff' : 'var(--text2)',
                border: '1px solid ' + (done ? 'var(--accent)' : 'var(--line2)'),
                fontFamily: 'var(--mono)', fontSize: 10,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer'
              }
            }, s.label);
          })
        ),

        h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
          h('button', { className: 'btn primary', onClick: update }, 'Save'),
          h('button', { className: 'btn', onClick: printRma }, 'Generate RMA letter')
        )
      );
    }

    // ─── Customer Type Chip ──────────────────────────────────────
    function CustomerTypeChip(props) {
      const type = (props.type || '').toLowerCase();
      if (!type || type === 'default' || type === 'retail' || type === 'none') return null;
      const map = { staff: 'staff', wholesale: 'wholesale', friends: 'friends', vip: 'vip' };
      const cls = map[type] || '';
      return h('span', {
        className: 'customer-chip' + (cls ? ' customer-chip-' + cls : ''),
        title: 'Customer type: ' + props.type
      }, props.type.toUpperCase());
    }

    Object.assign(window, { WoTimer: WoTimer, WoPhotos: WoPhotos, WoRaCallout: WoRaCallout, CustomerTypeChip: CustomerTypeChip });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
