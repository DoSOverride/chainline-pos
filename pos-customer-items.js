/* ChainLine POS — Customer Items tab (serialized bike tracking)
 *
 * Each customer has a list of serialized items (bikes) on file.
 * Auto-populated when they buy a serialized SKU; manually addable too.
 * Powers the New WO bike dropdown for that customer.
 *
 * Beats Lightspeed §4.
 *
 * Load: <script defer src="/pos-customer-items.js?v=1"></script>
 * Use:  inside the Customers screen detail, render <CustomerItemsTab customerId=... />
 */

(function() {
  'use strict';

  function init() {
    if (!window.React) return setTimeout(init, 50);
    const { createElement: h, useState, useEffect, Fragment } = React;

    function loadItems(customerId) {
      try { return JSON.parse(localStorage.getItem('pos-cust-items-' + customerId) || '[]'); }
      catch { return []; }
    }
    function saveItems(customerId, list) {
      try { localStorage.setItem('pos-cust-items-' + customerId, JSON.stringify(list)); } catch {}
      // Notify listeners (e.g. New WO form watching this customer's items)
      window.dispatchEvent(new CustomEvent('pos-cust-items-changed', { detail: { customerId: customerId } }));
    }

    // Public API for other modules to push items in (e.g. when a sale closes)
    window.CustomerItems = {
      get: loadItems,
      set: saveItems,
      add: function(customerId, item) {
        const list = loadItems(customerId);
        list.push(Object.assign({ id: Date.now() + Math.random(), addedAt: new Date().toISOString() }, item));
        saveItems(customerId, list);
      },
      remove: function(customerId, itemId) {
        saveItems(customerId, loadItems(customerId).filter(function(it) { return it.id !== itemId; }));
      },
    };

    function CustomerItemsTab(props) {
      const customerId = props.customerId;
      const [items, setItems] = useState(function() { return loadItems(customerId); });
      const [adding, setAdding] = useState(false);
      const [draft, setDraft] = useState({ description: '', size: '', color: '', serial: '', notes: '' });

      useEffect(function() {
        function on(e) { if (e.detail.customerId === customerId) setItems(loadItems(customerId)); }
        window.addEventListener('pos-cust-items-changed', on);
        return function() { window.removeEventListener('pos-cust-items-changed', on); };
      }, [customerId]);

      function commit() {
        if (!draft.description.trim()) {
          window.toast && window.toast('Description required', 'error');
          return;
        }
        const list = items.concat([Object.assign({
          id: Date.now() + Math.random(),
          addedAt: new Date().toISOString(),
          source: 'manual',
        }, draft)]);
        saveItems(customerId, list);
        setItems(list);
        setDraft({ description: '', size: '', color: '', serial: '', notes: '' });
        setAdding(false);
        window.toast && window.toast('Added to customer items', 'success');
      }

      function del(id) {
        if (!confirm('Remove this item from the customer\'s file?')) return;
        const next = items.filter(function(it) { return it.id !== id; });
        saveItems(customerId, next);
        setItems(next);
      }

      const Ico = window.Ico || {};

      return h(Fragment, null,
        h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: 12 } },
          h('div', { className: 'panel-section-head', style: { marginBottom: 0, flex: 1 } },
            'Items on File · ' + items.length
          ),
          h('button', {
            className: 'btn primary',
            onClick: function() { setAdding(true); }
          }, '+ Add Serial / Item')
        ),

        adding && h('div', {
          style: {
            padding: 14, border: '1px solid var(--line2)',
            background: 'var(--bg2)', marginBottom: 14,
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: 10
          }
        },
          h('input', { className: 'input', placeholder: 'Description (make/model/year)',
            value: draft.description, onChange: function(e) { setDraft(Object.assign({}, draft, { description: e.target.value })); },
            style: { gridColumn: '1/-1' }, autoFocus: true
          }),
          h('input', { className: 'input', placeholder: 'Size', value: draft.size,
            onChange: function(e) { setDraft(Object.assign({}, draft, { size: e.target.value })); }
          }),
          h('input', { className: 'input', placeholder: 'Color', value: draft.color,
            onChange: function(e) { setDraft(Object.assign({}, draft, { color: e.target.value })); }
          }),
          h('input', { className: 'input mono', placeholder: 'Serial #', value: draft.serial,
            onChange: function(e) { setDraft(Object.assign({}, draft, { serial: e.target.value.toUpperCase() })); }
          }),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', { className: 'btn primary', onClick: commit }, 'Save'),
            h('button', { className: 'btn ghost', onClick: function() { setAdding(false); } }, 'Cancel')
          ),
          h('input', { className: 'input', placeholder: 'Notes (optional)',
            value: draft.notes, onChange: function(e) { setDraft(Object.assign({}, draft, { notes: e.target.value })); },
            style: { gridColumn: '1/-1' }
          })
        ),

        items.length === 0
          ? h('div', { className: 'queue-empty' },
              h('div', { className: 'glyph' }, 'No items on file'),
              'Items added here can be picked from the bike dropdown when starting a new work order.'
            )
          : h('div', { className: 'card' },
              h('table', { className: 'tbl customer-items-tbl' },
                h('thead', null,
                  h('tr', null,
                    h('th', null, 'Item'),
                    h('th', { style: { width: 80 } }, 'Size'),
                    h('th', { style: { width: 100 } }, 'Color'),
                    h('th', { style: { width: 140 } }, 'Serial'),
                    h('th', null, 'Notes'),
                    h('th', { style: { width: 100 } }, 'Added'),
                    h('th', { style: { width: 80 } }, 'Source'),
                    h('th', { style: { width: 32 } })
                  )
                ),
                h('tbody', null,
                  items.map(function(it) {
                    return h('tr', { key: it.id },
                      h('td', null, it.description),
                      h('td', { className: 'muted' }, it.size || '—'),
                      h('td', { className: 'muted' }, it.color || '—'),
                      h('td', { className: 'serial' }, it.serial || '—'),
                      h('td', { className: 'muted', style: { fontSize: 11 } }, it.notes || ''),
                      h('td', { className: 'num muted', style: { fontSize: 11 } },
                        it.addedAt ? new Date(it.addedAt).toLocaleDateString('en-CA') : '—'
                      ),
                      h('td', { className: 'muted', style: { fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' } },
                        it.saleId
                          ? h('span', { style: { color: 'var(--green-fg)' } }, 'sold #' + it.saleId)
                          : it.source || 'manual'
                      ),
                      h('td', null,
                        h('button', {
                          className: 'icon-btn', onClick: function() { del(it.id); }, title: 'Remove'
                        }, Ico.Trash ? h(Ico.Trash, { size: 12 }) : '\u00d7')
                      )
                    );
                  })
                )
              )
            )
      );
    }

    window.CustomerItemsTab = CustomerItemsTab;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
