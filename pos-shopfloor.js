/* ChainLine POS — Shop Floor (live Kanban view of work orders)
 *
 * Features:
 *   - HTML5 drag-and-drop with touch support (iPad/mobile)
 *   - Color-coded column headers per status
 *   - WO cards: customer, bike, due date (red if overdue), mechanic avatar, task count
 *   - Column count badge
 *   - Quick actions (3-dot menu): mark ready, send SMS, add note
 *   - Mechanic assignment modal on drop to In Progress
 *   - Auto-refresh every 30 seconds
 *
 * Load:
 *   <script defer src="/pos-shopfloor.js?v=2"></script>
 * Wire in pos-app.js renderScreen():
 *   case 'floor': return h(window.ShopFloorScreen || PlaceholderScreen, { setScreen, onOpenWo });
 */

(function() {
  'use strict';

  function init() {
    if (!window.React || !window.apiGet) return setTimeout(init, 50);

    const { createElement: h, useState, useEffect, useRef, useMemo, Fragment } = React;

    // Column definitions: id, label, headerColor, borderColor
    const COLUMNS = [
      { id: 'booked',        label: 'Booked',         headerColor: '#7c3aed', borderColor: 'rgba(124,58,237,0.5)',  dotColor: '#a78bfa' },
      { id: 'open',          label: 'Open',           headerColor: '#1d4ed8', borderColor: 'rgba(29,78,216,0.5)',   dotColor: '#60a5fa' },
      { id: 'parts-ordered', label: 'Assess & Order', headerColor: '#92400e', borderColor: 'rgba(146,64,14,0.5)',   dotColor: '#fbbf24' },
      { id: 'ready',         label: 'Ready',          headerColor: '#065f46', borderColor: 'rgba(6,95,70,0.5)',     dotColor: '#34d399' },
      { id: 'inprogress',    label: 'In Progress',    headerColor: '#1e3a5f', borderColor: 'rgba(30,58,95,0.5)',    dotColor: '#93c5fd' },
      { id: 'finished',      label: 'Finished',       headerColor: '#374151', borderColor: 'rgba(55,65,81,0.5)',    dotColor: '#9ca3af' },
    ];

    /* ── Touch drag state (module-level refs, not React state) ── */
    let touchDragWoId = null;
    let touchGhostEl  = null;
    let touchDropCb   = null; // function(woId, newStatus)

    function touchStart(e, woId, dropCb) {
      touchDragWoId = woId;
      touchDropCb   = dropCb;
      const src = e.currentTarget;
      const rect = src.getBoundingClientRect();
      const ghost = src.cloneNode(true);
      ghost.style.cssText = [
        'position:fixed',
        'left:' + rect.left + 'px',
        'top:' + rect.top + 'px',
        'width:' + rect.width + 'px',
        'opacity:0.8',
        'pointer-events:none',
        'z-index:9999',
        'transform:rotate(-1.5deg) scale(1.04)',
        'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
        'transition:none',
      ].join(';');
      document.body.appendChild(ghost);
      touchGhostEl = ghost;
      src.style.opacity = '0.35';
      document.body.classList.add('floor-dragging');
      e.preventDefault();
    }

    function touchMove(e) {
      if (!touchGhostEl) return;
      const touch = e.touches[0];
      const rect = touchGhostEl.getBoundingClientRect();
      touchGhostEl.style.left = (touch.clientX - rect.width / 2) + 'px';
      touchGhostEl.style.top  = (touch.clientY - 30) + 'px';
      // Highlight column under finger
      touchGhostEl.style.pointerEvents = 'none';
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      document.querySelectorAll('.floor-column.drop-target').forEach(function(c) {
        c.classList.remove('drop-target');
      });
      const col = el && el.closest('[data-status]');
      if (col) col.classList.add('drop-target');
      e.preventDefault();
    }

    function touchEnd(e, srcEl) {
      if (!touchGhostEl || !touchDragWoId) return;
      touchGhostEl.remove();
      touchGhostEl = null;
      document.body.classList.remove('floor-dragging');
      document.querySelectorAll('.floor-column.drop-target').forEach(function(c) {
        c.classList.remove('drop-target');
      });
      if (srcEl) srcEl.style.opacity = '';
      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const col = el && el.closest('[data-status]');
      if (col && touchDropCb) {
        touchDropCb(touchDragWoId, col.dataset.status);
      }
      touchDragWoId = null;
      touchDropCb   = null;
    }

    /* ── Quick-actions menu ── */
    function QuickMenu(props) {
      const [open, setOpen] = useState(false);
      const ref = useRef(null);

      useEffect(function() {
        if (!open) return;
        function outside(e) {
          if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', outside);
        document.addEventListener('touchstart', outside);
        return function() {
          document.removeEventListener('mousedown', outside);
          document.removeEventListener('touchstart', outside);
        };
      }, [open]);

      return h('div', {
        ref: ref,
        style: { position: 'relative' },
        onClick: function(e) { e.stopPropagation(); }
      },
        h('button', {
          className: 'floor-quick-btn',
          title: 'Quick actions',
          onClick: function(e) { e.stopPropagation(); setOpen(function(o) { return !o; }); }
        }, '⋯'),
        open && h('div', { className: 'floor-quick-menu' },
          props.items.map(function(item, i) {
            if (item === 'divider') return h('div', { key: 'div' + i, className: 'floor-quick-divider' });
            return h('button', {
              key: i,
              className: 'floor-quick-item' + (item.danger ? ' danger' : ''),
              onClick: function() { setOpen(false); item.onClick && item.onClick(); }
            }, item.label);
          })
        )
      );
    }

    /* ── WO card ── */
    function FloorCard(props) {
      const wo = props.wo;
      const isOverdue = wo.dueState === 'overdue';
      const colDef = COLUMNS.find(function(c) { return c.id === (wo.status || 'open'); }) || COLUMNS[1];
      const cardRef = useRef(null);

      const classes = [
        'floor-card',
        isOverdue ? 'is-overdue' : '',
        wo.prio ? 'is-prio' : '',
      ].filter(Boolean).join(' ');

      const taskCount = Array.isArray(wo.tasks) ? wo.tasks.length : 0;

      function quickMarkReady() {
        if (props.onDropWo) props.onDropWo(wo.id, 'ready');
      }
      function quickSendSMS() {
        if (window.toast) window.toast('SMS feature: configure RingCentral in Settings → Integrations', 'info');
      }
      function quickAddNote() {
        const note = window.prompt('Add note to ' + wo.id + ':');
        if (note && window.apiPost) {
          window.apiPost('/api/workorder/' + wo.id + '/note', { note: note })
            .then(function() { if (window.toast) window.toast('Note added', 'success'); })
            .catch(function() { if (window.toast) window.toast('Failed to add note', 'error'); });
        }
      }

      return h('div', {
        ref: cardRef,
        className: classes,
        draggable: true,
        style: { borderLeftColor: isOverdue ? 'var(--red-fg)' : (wo.prio ? 'var(--accent)' : colDef.dotColor) },

        // HTML5 drag
        onDragStart: function(e) {
          e.dataTransfer.setData('text/wo-id', wo.id);
          e.dataTransfer.setData('text/wo-status', wo.status || '');
          e.dataTransfer.effectAllowed = 'move';
          e.currentTarget.classList.add('is-dragging');
          document.body.classList.add('floor-dragging');
        },
        onDragEnd: function(e) {
          e.currentTarget.classList.remove('is-dragging');
          document.body.classList.remove('floor-dragging');
          document.querySelectorAll('.floor-column.drop-target').forEach(function(el) {
            el.classList.remove('drop-target');
          });
        },

        // Touch drag
        onTouchStart: function(e) { touchStart(e, wo.id, props.onDropWo); },
        onTouchMove:  touchMove,
        onTouchEnd:   function(e) { touchEnd(e, cardRef.current); },

        onClick: function() { props.onOpen && props.onOpen(wo); }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 } },
          h('span', { className: 'floor-card-id' }, wo.id),
          wo.prio && h('span', { style: { color: 'var(--accent)', fontSize: 9, fontWeight: 700 } }, '▲ PRIO'),
          h('div', { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 } },
            taskCount > 0 && h('span', {
              title: taskCount + ' task' + (taskCount !== 1 ? 's' : ''),
              style: {
                fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text3)',
                background: 'var(--bg)', border: '1px solid var(--line2)',
                padding: '1px 4px', letterSpacing: '0.04em'
              }
            }, taskCount + ' task' + (taskCount !== 1 ? 's' : '')),
            h(QuickMenu, {
              items: [
                { label: 'Open detail',    onClick: function() { props.onOpen && props.onOpen(wo); } },
                { label: 'Mark Ready',     onClick: quickMarkReady },
                'divider',
                { label: 'Send SMS',       onClick: quickSendSMS },
                { label: 'Add note',       onClick: quickAddNote },
              ]
            })
          )
        ),
        h('div', { className: 'floor-card-cust' }, wo.cust || 'Unknown'),
        wo.bike && h('div', { className: 'floor-card-bike' }, wo.bike),
        h('div', { className: 'floor-card-foot' },
          wo.hookOut || wo.hookIn
            ? h('span', { className: 'floor-card-hook' }, wo.hookOut || wo.hookIn)
            : null,
          h('span', { className: 'floor-card-due' + (isOverdue ? ' is-overdue' : '') },
            isOverdue ? (wo.overdueBy || 'OVERDUE') : ('Due ' + (wo.due || 'TBD'))
          ),
          h('span', { className: 'floor-card-mech' },
            window.AvInit
              ? h(window.AvInit, { initials: wo.mech || '?', tone: wo.tone || 'am' })
              : (wo.mech || '?')
          )
        )
      );
    }

    /* ── Column ── */
    function FloorColumn(props) {
      const col = props.col;

      return h('div', {
        className: 'floor-column',
        'data-status': col.id,
        onDragOver: function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          e.currentTarget.classList.add('drop-target');
        },
        onDragLeave: function(e) {
          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove('drop-target');
          }
        },
        onDrop: function(e) {
          e.preventDefault();
          e.currentTarget.classList.remove('drop-target');
          const woId = e.dataTransfer.getData('text/wo-id');
          const fromStatus = e.dataTransfer.getData('text/wo-status');
          if (!woId || fromStatus === col.id) return;
          if (props.onDropWo) props.onDropWo(woId, col.id);
        }
      },
        // Color-coded header
        h('div', {
          className: 'floor-column-head',
          style: {
            background: col.headerColor,
            borderBottom: '1px solid ' + col.borderColor,
          }
        },
          h('span', {
            style: { width: 6, height: 6, borderRadius: '50%', background: col.dotColor, flexShrink: 0 }
          }),
          h('span', {
            className: 'floor-column-title',
            style: { color: '#e2e8f0', letterSpacing: '0.12em' }
          }, col.label),
          h('span', {
            className: 'floor-column-count',
            style: { background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.15)', color: col.dotColor }
          }, props.wos.length)
        ),
        h('div', { className: 'floor-column-body' },
          props.wos.length === 0
            ? h('div', {
                style: {
                  padding: '24px 8px', textAlign: 'center',
                  color: 'var(--text3)', fontFamily: 'var(--mono)',
                  fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                  border: '2px dashed var(--line2)', margin: 8
                }
              }, 'Empty')
            : props.wos.map(function(wo) {
                return h(FloorCard, {
                  key: wo.id,
                  wo: wo,
                  onOpen: props.onOpen,
                  onDropWo: props.onDropWo,
                });
              })
        )
      );
    }

    /* ── Mechanic picker modal ── */
    function MechanicPicker(props) {
      const AvInit = window.AvInit;
      const list = (window.MECHANICS && window.MECHANICS.length)
        ? window.MECHANICS
        : [
            { initials: 'PH', name: 'Phil',    tone: 'ph' },
            { initials: 'ST', name: 'Steve',   tone: 'st' },
            { initials: 'MA', name: 'Matt',    tone: 'ma' },
            { initials: 'BE', name: 'Beckett', tone: 'be' },
            { initials: 'CU', name: 'Curren',  tone: 'cu' },
            { initials: 'DN', name: 'Danny',   tone: 'dn' },
          ];

      return h('div', {
        style: {
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000
        },
        onClick: function(e) { if (e.target === e.currentTarget) props.onCancel(); }
      },
        h('div', {
          style: {
            background: 'var(--surface, var(--bg2))', border: '1px solid var(--border, var(--line))',
            padding: 28, minWidth: 340, maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }
        },
          h('div', {
            style: {
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6
            }
          }, 'Assign mechanic'),
          h('div', { style: { fontSize: 18, fontWeight: 700, marginBottom: 18 } },
            'Who is starting ' + props.woId + '?'
          ),
          h('div', {
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 8 }
          },
            list.map(function(m) {
              return h('button', {
                key: m.initials,
                style: {
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', background: 'var(--bg2, var(--surface-2))',
                  border: '1px solid var(--line, var(--border))', cursor: 'pointer',
                  fontFamily: 'inherit', color: 'var(--text)', transition: 'background 100ms'
                },
                onClick: function() { props.onPick(m); }
              },
                AvInit ? h(AvInit, { initials: m.initials, tone: m.tone }) : m.initials,
                h('span', { style: { fontWeight: 500 } }, m.name || m.initials)
              );
            })
          ),
          h('div', { style: { marginTop: 18, textAlign: 'right' } },
            h('button', {
              style: {
                background: 'transparent', border: '1px solid var(--line)', color: 'var(--text2)',
                padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit'
              },
              onClick: props.onCancel
            }, 'Cancel')
          )
        )
      );
    }

    /* ── Main screen ── */
    function ShopFloorScreen(props) {
      const setScreen = props.setScreen;
      const onOpenWo  = props.onOpenWo;

      const [wos, setWos]             = useState(window.lsWorkOrders || window.MOCK_WO || []);
      const [mechFilter, setMechFilter] = useState('all');
      const [tick, setTick]           = useState(0);
      const [pendingAssign, setPendingAssign] = useState(null); // { woId, newStatus }
      const [lastRefresh, setLastRefresh]     = useState(null);

      // Auto-refresh every 30 s
      useEffect(function() {
        const interval = setInterval(function() { setTick(function(t) { return t + 1; }); }, 30000);
        return function() { clearInterval(interval); };
      }, []);

      // Pull WOs from API on each tick
      useEffect(function() {
        if (!window.apiGet) return;
        window.apiGet('/api/workorders').then(function(data) {
          if (data && Array.isArray(data.workorders) && data.workorders.length > 0) {
            setWos(data.workorders.map(function(w) {
              if (w.cust) return w;
              return {
                id:     w.workOrderID || w.id,
                cust:   [w.Contact && w.Contact.firstName, w.Contact && w.Contact.lastName].filter(Boolean).join(' ') || 'Unknown',
                bike:   w.itemDescription || w.bikeDescription || '',
                svc:    (w.note && w.note.split('\n')[0]) || 'Service',
                due:    w.timeIn ? new Date(w.timeIn).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : 'TBD',
                status: (w.workOrderStatus || 'open').toLowerCase().replace(/\s+/g, ''),
                mech:   ((w.Employee && w.Employee.firstName ? w.Employee.firstName[0] : '') +
                          (w.Employee && w.Employee.lastName  ? w.Employee.lastName[0]  : '')) || 'UN',
                tone:   'am',
                prio:   !!w.priority,
                hookIn: w.hookIn  || '',
                hookOut: w.hookOut || '',
                tasks:  Array.isArray(w.tasks) ? w.tasks : [],
              };
            }));
            setLastRefresh(new Date());
          }
        }).catch(function() {});
      }, [tick]);

      // Mechanic chips
      const mechs = useMemo(function() {
        const map = {};
        wos.forEach(function(w) { if (w.mech) map[w.mech] = w.tone || ''; });
        return Object.keys(map).map(function(k) { return { initials: k, tone: map[k] }; });
      }, [wos]);

      // Filter + group
      const filteredWos = mechFilter === 'all'
        ? wos
        : wos.filter(function(w) { return w.mech === mechFilter; });

      const wosByCol = useMemo(function() {
        const map = {};
        COLUMNS.forEach(function(c) { map[c.id] = []; });
        filteredWos.forEach(function(w) {
          let s = (w.status || 'open').toLowerCase().replace(/[\s_]/g, '');
          if (s === 'partsordered')                                             s = 'parts-ordered';
          if (s === 'soarrived' || s === 'soparts' || s === 'sopartsarrived')  s = 'ready';
          if (s === 'ra')                                                        s = 'parts-ordered';
          if (s === 'done' || s === 'donepaid' || s === 'closed')               s = 'finished';
          if (s === 'cancelled') return;
          if (map[s]) map[s].push(w);
          else         map['open'].push(w);
        });
        return map;
      }, [filteredWos]);

      const totals = useMemo(function() {
        return {
          total:   filteredWos.length,
          overdue: filteredWos.filter(function(w) { return w.dueState === 'overdue'; }).length,
          prio:    filteredWos.filter(function(w) { return w.prio; }).length,
        };
      }, [filteredWos]);

      const PageHead = window.PageHead;
      const AvInit   = window.AvInit;

      function handleDropWo(woId, newStatus) {
        if (newStatus === 'inprogress') {
          setPendingAssign({ woId: woId, newStatus: newStatus });
          return;
        }
        applyMove(woId, newStatus, null);
      }

      function applyMove(woId, newStatus, mech) {
        setWos(function(prev) {
          return prev.map(function(w) {
            if (w.id !== woId) return w;
            const patch = { status: newStatus };
            if (mech) { patch.mech = mech.initials; patch.tone = mech.tone || ''; }
            return Object.assign({}, w, patch);
          });
        });
        if (window.apiPost) {
          const body = { status: newStatus };
          if (mech) body.employee = mech.initials;
          window.apiPost('/api/workorder/' + woId + '/status', body)
            .then(function() {
              const label = mech ? (newStatus + ' → ' + mech.initials) : newStatus;
              if (window.toast) window.toast('Moved ' + woId + ' → ' + newStatus, 'success');
            })
            .catch(function() {
              if (window.toast) window.toast('Failed to update ' + woId, 'error');
              setTick(function(t) { return t + 1; });
            });
        }
      }

      const lastRefreshStr = lastRefresh
        ? lastRefresh.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
        : 'never';

      return h(Fragment, null,
        PageHead && h(PageHead, {
          title: 'Shop Floor',
          sub: 'Live kanban · last updated ' + lastRefreshStr,
          actions: [
            h('button', {
              key: 'refresh',
              className: 'btn',
              onClick: function() { setTick(function(t) { return t + 1; }); }
            }, '↻ Refresh'),
          ]
        }),

        // Stats strip
        h('div', { className: 'floor-filter-bar' },
          h('div', { style: { display: 'flex', gap: 20, alignItems: 'center', flex: 1, flexWrap: 'wrap' } },
            h('span', { style: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text2)' } },
              h('b', { style: { color: 'var(--text)' } }, totals.total), ' on floor'
            ),
            totals.overdue > 0 && h('span', { style: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--red-fg)' } },
              h('b', null, totals.overdue), ' overdue'
            ),
            totals.prio > 0 && h('span', { style: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)' } },
              h('b', null, totals.prio), ' priority'
            )
          )
        ),

        // Mechanic filter chips
        h('div', { className: 'floor-filter-bar' },
          h('span', { style: { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)' } }, 'Mechanic'),
          h('button', {
            className: 'floor-mech-pill' + (mechFilter === 'all' ? ' active' : ''),
            onClick: function() { setMechFilter('all'); }
          }, 'All'),
          mechs.map(function(m) {
            return h('button', {
              key: m.initials,
              className: 'floor-mech-pill' + (mechFilter === m.initials ? ' active' : ''),
              onClick: function() { setMechFilter(m.initials); }
            },
              AvInit ? h(AvInit, { initials: m.initials, tone: m.tone }) : m.initials,
              h('span', null, m.initials)
            );
          })
        ),

        // Kanban board
        h('div', { className: 'floor-board' },
          COLUMNS.map(function(col) {
            return h(FloorColumn, {
              key: col.id,
              col: col,
              wos: wosByCol[col.id] || [],
              onOpen: function(wo) {
                if (onOpenWo) onOpenWo(wo);
                else if (setScreen) setScreen('work-orders');
              },
              onDropWo: handleDropWo,
            });
          })
        ),

        // Mechanic picker modal
        pendingAssign && h(MechanicPicker, {
          woId:     pendingAssign.woId,
          onCancel: function() { setPendingAssign(null); },
          onPick:   function(mech) {
            const pa = pendingAssign;
            setPendingAssign(null);
            applyMove(pa.woId, pa.newStatus, mech);
          }
        })
      );
    }

    window.ShopFloorScreen = ShopFloorScreen;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
