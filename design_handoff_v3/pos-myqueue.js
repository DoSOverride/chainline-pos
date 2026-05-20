/* ChainLine POS — My Queue (per-mechanic work queue)
 *
 * Sidebar destination: "My Queue" — shows only WOs assigned to the logged-in user.
 * Sorted by priority (desc) then due date (asc). Overdue at top.
 * Beats Lightspeed §16g.
 *
 * Load: <script defer src="/pos-myqueue.js?v=1"></script>
 * Wire: add to NAV_MAIN sidebar near top, route 'my-queue' in renderScreen.
 */

(function() {
  'use strict';

  function init() {
    if (!window.React) return setTimeout(init, 50);
    const { createElement: h, useState, useEffect, useMemo, Fragment } = React;

    function MyQueueScreen(props) {
      const setScreen = props.setScreen;
      const staff = props.staff || (window.__currentStaff) || null;
      const myInitials = staff && staff.initials;

      const [wos, setWos] = useState(window.MOCK_WO || []);

      useEffect(function() {
        if (window.apiGet) {
          window.apiGet('/api/workorders').then(function(data) {
            if (data && Array.isArray(data.workorders) && data.workorders.length) setWos(data.workorders);
          }).catch(function() {});
        }
      }, []);

      const mine = useMemo(function() {
        if (!myInitials) return [];
        return wos
          .filter(function(w) { return w.mech === myInitials; })
          .filter(function(w) {
            const s = (w.status || '').toLowerCase();
            return s !== 'done' && s !== 'donepaid' && s !== 'closed' && s !== 'cancelled';
          })
          .sort(function(a, b) {
            // Priority first
            if ((a.prio ? 1 : 0) !== (b.prio ? 1 : 0)) return b.prio - a.prio;
            // Then overdue
            const ao = a.dueState === 'overdue' ? 1 : 0;
            const bo = b.dueState === 'overdue' ? 1 : 0;
            if (ao !== bo) return bo - ao;
            // Then due date string asc
            return (a.due || '').localeCompare(b.due || '');
          });
      }, [wos, myInitials]);

      const totals = {
        total: mine.length,
        overdue: mine.filter(function(w) { return w.dueState === 'overdue'; }).length,
        prio: mine.filter(function(w) { return w.prio; }).length,
        today: mine.filter(function(w) { return w.dueState === 'today'; }).length,
      };

      const PageHead = window.PageHead;
      const Badge = window.Badge;
      const AvInit = window.AvInit;
      const Ico = window.Ico || {};

      if (!myInitials) {
        return h('div', { className: 'queue-empty' },
          h('div', { className: 'glyph' }, 'Not logged in'),
          'Sign in to see your work queue.'
        );
      }

      return h(Fragment, null,
        PageHead && h(PageHead, {
          title: 'My Queue',
          sub: 'Assigned to ' + (staff.name || myInitials),
          actions: [
            h('button', { key: 'all', className: 'btn', onClick: function() { setScreen && setScreen('work-orders'); } },
              'See all work orders'
            )
          ]
        }),

        // Strip
        h('div', { style: {
          display: 'flex', gap: 18, padding: '10px 0', marginBottom: 14,
          borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase'
        }},
          h('span', null,
            h('b', { style: { color: 'var(--text)', fontFamily: 'var(--mono)', marginRight: 4 } }, totals.total),
            h('span', { style: { color: 'var(--text2)' } }, 'open')
          ),
          h('span', { style: { color: totals.overdue > 0 ? 'var(--red-fg)' : 'var(--text2)' } },
            h('b', { style: { fontFamily: 'var(--mono)', marginRight: 4 } }, totals.overdue),
            'overdue'
          ),
          h('span', null,
            h('b', { style: { color: 'var(--text)', fontFamily: 'var(--mono)', marginRight: 4 } }, totals.today),
            h('span', { style: { color: 'var(--text2)' } }, 'due today')
          ),
          h('span', null,
            h('b', { style: { color: 'var(--accent)', fontFamily: 'var(--mono)', marginRight: 4 } }, totals.prio),
            h('span', { style: { color: 'var(--text2)' } }, 'priority')
          )
        ),

        mine.length === 0
          ? h('div', { className: 'queue-empty' },
              h('div', { className: 'glyph' }, 'Inbox zero'),
              'No work orders assigned to you. Nice.'
            )
          : h('div', { className: 'card' },
              h('table', { className: 'tbl' },
                h('thead', null,
                  h('tr', null,
                    h('th', { style: { width: 96 } }, 'WO'),
                    h('th', null, 'Customer'),
                    h('th', null, 'Bike'),
                    h('th', null, 'Service'),
                    h('th', { style: { width: 90 } }, 'Hook'),
                    h('th', { style: { width: 130 } }, 'Status'),
                    h('th', { style: { width: 110 } }, 'Due'),
                    h('th', { style: { width: 32 } })
                  )
                ),
                h('tbody', null,
                  mine.map(function(w) {
                    return h('tr', {
                      key: w.id,
                      onClick: function() { props.onOpenWo && props.onOpenWo(w); },
                      style: { cursor: 'pointer' }
                    },
                      h('td', null,
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                          h('span', { className: 'num' }, w.id),
                          w.prio ? h('span', {
                            style: { color: 'var(--accent)', fontSize: 11, fontFamily: 'var(--mono)' },
                            title: 'Priority'
                          }, '\u25b2') : null
                        )
                      ),
                      h('td', null, w.cust),
                      h('td', { className: 'muted' }, w.bike),
                      h('td', null, w.svc),
                      h('td', null,
                        (w.hookIn || w.hookOut)
                          ? h('span', { className: 'cell-hook' }, w.hookOut || w.hookIn)
                          : h('span', { className: 'cell-hook empty' }, '\u2014')
                      ),
                      h('td', null, Badge ? renderBadge(w.status) : w.status),
                      h('td', null,
                        w.dueState === 'overdue'
                          ? h('span', { className: 'overdue-text' }, w.overdueBy || 'overdue')
                          : h('span', { className: 'num muted' }, w.due)
                      ),
                      h('td', null,
                        Ico.ChevronRight ? h(Ico.ChevronRight, { size: 11 }) : '>'
                      )
                    );
                  })
                )
              )
            )
      );

      function renderBadge(status) {
        const Badge = window.Badge;
        const map = {
          ready: 'ready',
          open: 'open',
          inprogress: 'inprogress',
          booked: 'booked',
          ra: 'ra',
          estimate: 'violet',
          waiting: 'violet',
          'parts-ordered': 'parts-ordered',
          partsordered: 'parts-ordered',
          'so-arrived': 'so-arrived',
        };
        const kind = map[(status || '').toLowerCase()] || 'open';
        return h(Badge, { kind: kind }, (status || 'open').replace(/[-_]/g, ' '));
      }
    }

    window.MyQueueScreen = MyQueueScreen;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
