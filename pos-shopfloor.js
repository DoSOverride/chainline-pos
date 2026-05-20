/* ChainLine POS — Shop Floor (live Kanban view of work orders)
 *
 * New sidebar destination: "Floor" — read-only kanban grouped by status.
 * Designed to live on a tablet on the back wall of the shop.
 * Big text, status-color-coded cards, mechanic avatar, hook location chip.
 * Auto-refreshes every 30 seconds.
 *
 * Beats Lightspeed §16a — they have no equivalent view.
 *
 * Load:
 *   <script defer src="/pos-shopfloor.js?v=1"></script>
 * Wire in pos-app.js renderScreen():
 *   case 'floor': return h(window.ShopFloorScreen || PlaceholderScreen, { setScreen, onOpenWo });
 * Add to NAV_MAIN sidebar array:
 *   { id: 'floor', label: 'Floor', mobileLabel: 'Floor', Icon: 'Grid' }
 */

(function() {
  'use strict';

  function init() {
    if (!window.React || !window.MOCK_WO) return setTimeout(init, 50);

    const { createElement: h, useState, useEffect, useMemo, Fragment } = React;

    // Columns: status → label + bg accent
    const COLUMNS = [
      { id: 'booked',        label: 'Booked',        kind: 'amber'  },
      { id: 'open',          label: 'Open',          kind: 'blue'   },
      { id: 'inprogress',    label: 'In Progress',   kind: 'neutral'},
      { id: 'parts-ordered', label: 'Parts Ordered', kind: 'amber'  },
      { id: 'so-arrived',    label: 'SO Arrived',    kind: 'green'  },
      { id: 'ra',            label: 'RA!',           kind: 'red'    },
      { id: 'ready',         label: 'Ready',         kind: 'green'  },
    ];

    function FloorCard(props) {
      const wo = props.wo;
      const isOverdue = wo.dueState === 'overdue';
      const classes = [
        'floor-card',
        isOverdue ? 'is-overdue' : '',
        wo.prio ? 'is-prio' : '',
      ].filter(Boolean).join(' ');

      return h('div', {
        className: classes,
        draggable: true,
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
          // Clear any leftover drop-target classes (defensive)
          document.querySelectorAll('.floor-column.drop-target').forEach(function(el) {
            el.classList.remove('drop-target');
          });
        },
        onClick: function() { props.onOpen && props.onOpen(wo); }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('span', { className: 'floor-card-id' }, wo.id),
          wo.prio ? h('span', { style: { color: 'var(--accent)', fontSize: 10 } }, '\u25b2') : null
        ),
        h('div', { className: 'floor-card-cust' }, wo.cust),
        h('div', { className: 'floor-card-bike' }, wo.bike),
        h('div', { className: 'floor-card-foot' },
          wo.hookIn || wo.hookOut
            ? h('span', { className: 'floor-card-hook' }, wo.hookOut || wo.hookIn)
            : null,
          h('span', { className: 'floor-card-due' + (isOverdue ? ' is-overdue' : '') },
            isOverdue ? wo.overdueBy : ('Due ' + wo.due)
          ),
          h('span', { className: 'floor-card-mech' },
            window.AvInit ? h(window.AvInit, { initials: wo.mech, tone: wo.tone }) : wo.mech
          )
        )
      );
    }

    function FloorColumn(props) {
      return h('div', {
        className: 'floor-column',
        'data-status': props.statusId,
        onDragOver: function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          e.currentTarget.classList.add('drop-target');
        },
        onDragLeave: function(e) {
          // Only clear if leaving the column itself (not entering child)
          if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.classList.remove('drop-target');
          }
        },
        onDrop: function(e) {
          e.preventDefault();
          e.currentTarget.classList.remove('drop-target');
          const woId = e.dataTransfer.getData('text/wo-id');
          const fromStatus = e.dataTransfer.getData('text/wo-status');
          if (!woId || !props.statusId) return;
          if (fromStatus === props.statusId) return;
          if (props.onDropWo) props.onDropWo(woId, props.statusId);
        }
      },
        h('div', { className: 'floor-column-head' },
          h('span', { className: 'floor-column-title' }, props.label),
          h('span', { className: 'floor-column-count' }, props.wos.length)
        ),
        h('div', { className: 'floor-column-body' },
          props.wos.length === 0
            ? h('div', {
                style: {
                  padding: '20px 8px', textAlign: 'center',
                  color: 'var(--text3)', fontFamily: 'var(--mono)',
                  fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase'
                }
              }, '\u2014')
            : props.wos.map(function(wo) {
                return h(FloorCard, { key: wo.id, wo: wo, onOpen: props.onOpen });
              })
        )
      );
    }

    function ShopFloorScreen(props) {
      const setScreen = props.setScreen;
      const onOpenWo = props.onOpenWo;

      const [wos, setWos] = useState(window.MOCK_WO || []);
      const [mechFilter, setMechFilter] = useState('all');
      const [tick, setTick] = useState(0);

      // Auto-refresh every 30 seconds
      useEffect(function() {
        const interval = setInterval(function() { setTick(function(t) { return t + 1; }); }, 30000);
        return function() { clearInterval(interval); };
      }, []);

      // Try API refresh on each tick
      useEffect(function() {
        if (window.apiGet) {
          window.apiGet('/api/workorders').then(function(data) {
            if (data && Array.isArray(data.workorders) && data.workorders.length > 0) {
              setWos(data.workorders.map(function(w) {
                if (w.cust) return w;
                return {
                  id: w.workOrderID || w.id,
                  cust: [w.Contact && w.Contact.firstName, w.Contact && w.Contact.lastName].filter(Boolean).join(' ') || 'Unknown',
                  bike: w.itemDescription || w.bikeDescription || '',
                  svc: (w.note && w.note.split('\n')[0]) || 'Service',
                  due: w.timeIn ? new Date(w.timeIn).toLocaleDateString('en-CA', {month:'short', day:'numeric'}) : 'TBD',
                  status: (w.workOrderStatus || 'open').toLowerCase().replace(/\s+/g, ''),
                  mech: (w.Employee && w.Employee.firstName ? w.Employee.firstName[0] : '') + (w.Employee && w.Employee.lastName ? w.Employee.lastName[0] : '') || 'UN',
                  tone: 'am',
                  prio: !!w.priority,
                  hookIn: w.hookIn || '', hookOut: w.hookOut || '',
                };
              }));
            }
          }).catch(function() {});
        }
      }, [tick]);

      // Build mechanic list
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
          // Normalise some legacy status names
          let s = (w.status || 'open').toLowerCase().replace(/[\s_]/g, '');
          if (s === 'partsordered') s = 'parts-ordered';
          if (s === 'soarrived' || s === 'soparts' || s === 'soparts-arrived') s = 'so-arrived';
          if (map[s]) map[s].push(w);
          else if (s === 'overdue' || w.dueState === 'overdue') (map.open = map.open || []).push(w);
          // Skip 'done', 'donepaid', 'closed', 'cancelled' — those don't show on the floor
        });
        return map;
      }, [filteredWos]);

      const totals = useMemo(function() {
        return {
          total: filteredWos.length,
          overdue: filteredWos.filter(function(w) { return w.dueState === 'overdue'; }).length,
          today: filteredWos.filter(function(w) { return w.dueState === 'today'; }).length,
          prio: filteredWos.filter(function(w) { return w.prio; }).length,
        };
      }, [filteredWos]);

      // Mount fallback components
      const PageHead = window.PageHead;
      const AvInit = window.AvInit;
      const Ico = window.Ico || {};

      return h(Fragment, null,
        PageHead && h(PageHead, {
          title: 'Shop Floor',
          sub: 'Live · auto-refreshes every 30s',
          actions: [
            h('button', {
              key: 'refresh',
              className: 'btn',
              onClick: function() { setTick(function(t) { return t + 1; }); }
            }, '\u21bb Refresh'),
          ]
        }),

        // Top stats strip
        h('div', { className: 'floor-filter-bar' },
          h('div', { style: { display: 'flex', gap: 18, alignItems: 'center', flex: 1 } },
            h('span', { style: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text2)' } },
              h('b', { style: { color: 'var(--text)', fontWeight: 600, fontFamily: 'var(--mono)' } }, totals.total), ' on floor'
            ),
            h('span', {
              style: {
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: totals.overdue > 0 ? 'var(--red-fg)' : 'var(--text2)'
              }
            },
              h('b', { style: { fontWeight: 600, fontFamily: 'var(--mono)' } }, totals.overdue), ' overdue'
            ),
            h('span', { style: { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text2)' } },
              h('b', { style: { color: 'var(--text)', fontWeight: 600, fontFamily: 'var(--mono)' } }, totals.prio), ' priority'
            )
          )
        ),

        // Mechanic filter
        h('div', { className: 'floor-filter-bar' },
          h('span', {
            style: { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text3)' }
          }, 'Filter mechanic'),
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
              m.initials
            );
          })
        ),

        // Kanban board
        h('div', { className: 'floor-board' },
          COLUMNS.map(function(col) {
            return h(FloorColumn, {
              key: col.id,
              statusId: col.id,
              label: col.label,
              wos: wosByCol[col.id] || [],
              onOpen: function(wo) {
                if (onOpenWo) onOpenWo(wo);
                else if (setScreen) setScreen('work-orders');
              },
              onDropWo: handleDropWo
            });
          })
        )
      );

      function handleDropWo(woId, newStatus) {
        // Optimistic local update
        setWos(function(prev) {
          return prev.map(function(w) {
            return w.id === woId ? Object.assign({}, w, { status: newStatus }) : w;
          });
        });
        if (window.apiPost) {
          window.apiPost('/api/workorder/' + woId + '/status', { status: newStatus })
            .then(function() {
              if (window._posToast) window._posToast('Moved ' + woId + ' to ' + newStatus, 'success');
            })
            .catch(function() {
              if (window._posToast) window._posToast('Failed to update ' + woId, 'error');
              // Refresh on failure
              setTick(function(t) { return t + 1; });
            });
        }
      }
    }

    window.ShopFloorScreen = ShopFloorScreen;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
