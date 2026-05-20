/* ChainLine POS — pos-payments.js
 * Payment flows: RequestPayment, Card (Stripe Terminal), Cash, Tip, Refund.
 * Vanilla JS, no JSX, no framework. Depends on React + ReactDOM already loaded.
 * All Stripe calls proxy through the worker at WORKER (defined in pos-app.js).
 */

'use strict';

/* ── Config ─────────────────────────────────────────────────────────────── */
window.POS_PAYMENT_CONFIG = {
  stripe: {
    publishableKey: 'pk_test_placeholder', // replace with real key
    terminalEnabled: false,                 // set true when BBPOS WisePOS E connected
  },
  shopify: {
    enabled: true,
    storeDomain: '4nie4h-ek.myshopify.com',
  },
  tax: { gst: 0.05, pst: 0.07 }, // BC rates
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const _WORKER = typeof WORKER !== 'undefined' ? WORKER : 'https://still-term-f1ec.taocaruso77.workers.dev';

async function _apiPost(path, body) {
  try {
    const r = await fetch(_WORKER + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch (e) {
    return { error: e.message };
  }
}

async function _apiGet(path) {
  try {
    const r = await fetch(_WORKER + path);
    return await r.json();
  } catch (e) {
    return { error: e.message };
  }
}

function _fmt$(n) { return '$' + Number(n).toFixed(2); }

function _isMockConfigured() {
  return !window.POS_PAYMENT_CONFIG.stripe.publishableKey ||
    window.POS_PAYMENT_CONFIG.stripe.publishableKey === 'pk_test_placeholder';
}

/* Short AudioContext beep — success sound */
function _playSuccessBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

/* Simple QR via qrserver.com — no npm required */
function _qrUrl(text, size) {
  size = size || 200;
  return 'https://api.qrserver.com/v1/create-qr-code/?size=' + size + 'x' + size + '&data=' + encodeURIComponent(text);
}

/* ── Modal base ──────────────────────────────────────────────────────────── */
const { createElement: _h, useState: _useState, useEffect: _useEffect, useRef: _useRef, useCallback: _useCallback } = React;

function _ModalBase({ title, onClose, children, width }) {
  // Close on Escape
  _useEffect(() => {
    function h(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return _h('div', {
    className: 'modal-overlay',
    onClick: e => e.target === e.currentTarget && onClose(),
  },
    _h('div', {
      style: {
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '28px 32px',
        width: width || 480,
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: 'calc(100vh - 80px)',
        overflowY: 'auto',
        position: 'relative',
      },
    },
      _h('div', {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
      },
        _h('div', { style: { fontSize: 17, fontWeight: 600 } }, title),
        _h('button', {
          onClick: onClose,
          style: {
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', fontSize: 20, padding: '2px 6px',
          },
        }, '×')
      ),
      children
    )
  );
}

/* ── Stripe-not-configured warning banner ─────────────────────────────────── */
function _StripeWarning() {
  if (!_isMockConfigured()) return null;
  return _h('div', {
    style: {
      background: 'rgba(202,138,4,0.1)',
      border: '1px solid var(--yellow)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
      color: 'var(--yellow)',
      marginBottom: 20,
    },
  }, 'Stripe not configured — running in mock mode. Set publishableKey in POS_PAYMENT_CONFIG.');
}

/* ── 1. RequestPaymentModal ──────────────────────────────────────────────── */
/**
 * RequestPaymentModal(sale, customer, onSuccess, onClose)
 *
 * Opens modal with two options:
 *   - Send Payment Link (SMS or email via worker)
 *   - Show QR Code for customer to scan
 *
 * Polls /api/stripe-payment-status every 3s.
 */
window.RequestPaymentModal = function RequestPaymentModal({ sale, customer, onSuccess, onClose }) {
  const [mode, setMode] = _useState('options');   // options | qr | sending | waiting | done | error
  const [payLink, setPayLink] = _useState(null);
  const [sendMethod, setSendMethod] = _useState(customer?.phone ? 'sms' : 'email');
  const [contact, setContact] = _useState(customer?.phone || customer?.email || '');
  const [statusMsg, setStatusMsg] = _useState('');
  const [errorMsg, setErrorMsg] = _useState('');
  const pollRef = _useRef(null);

  const totalCents = Math.round((sale.total || 0) * 100);
  const desc = (customer?.name || customer || 'POS Sale') + ' - ChainLine';

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  _useEffect(() => () => stopPolling(), []);

  async function generateLink() {
    setMode('sending');
    setStatusMsg('Generating payment link...');

    const body = {
      amount_cents: totalCents,
      description: desc,
      customer_email: sendMethod === 'email' ? contact : null,
      customer_phone: sendMethod === 'sms' ? contact : null,
      saleId: sale.id || ('pos-' + Date.now()),
    };

    const res = await _apiPost('/api/stripe-payment-link', body);

    if (res && res.url) {
      setPayLink(res);
      if (res.is_mock) {
        setStatusMsg('Mock link generated (Stripe not configured)');
      } else {
        setStatusMsg('Link created. Waiting for payment...');
      }
      setMode('waiting');
      // start polling
      pollRef.current = setInterval(async () => {
        const st = await _apiGet('/api/stripe-payment-status?id=' + res.id);
        if (st && st.paid) {
          stopPolling();
          _playSuccessBeep();
          setMode('done');
          setTimeout(() => onSuccess({ method: 'stripe-link', paymentLinkId: res.id, paidAt: st.paidAt }), 800);
        }
      }, 3000);
    } else {
      setErrorMsg(res?.error || 'Failed to create payment link');
      setMode('error');
    }
  }

  async function sendLink() {
    if (!payLink) { await generateLink(); return; }
    // Already have link, just send
    const body = {
      amount_cents: totalCents,
      description: desc,
      customer_email: sendMethod === 'email' ? contact : null,
      customer_phone: sendMethod === 'sms' ? contact : null,
      saleId: sale.id || ('pos-' + Date.now()),
    };
    setMode('sending');
    const res = await _apiPost('/api/stripe-payment-link', body);
    if (res && res.url) {
      setPayLink(res);
      setMode('waiting');
      startPolling(res.id);
    } else {
      setErrorMsg(res?.error || 'Failed');
      setMode('error');
    }
  }

  function startPolling(id) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const st = await _apiGet('/api/stripe-payment-status?id=' + id);
      if (st && st.paid) {
        stopPolling();
        _playSuccessBeep();
        setMode('done');
        setTimeout(() => onSuccess({ method: 'stripe-link', paymentLinkId: id, paidAt: st.paidAt }), 800);
      }
    }, 3000);
  }

  async function showQR() {
    if (!payLink) {
      // generate first
      setMode('sending');
      const body = {
        amount_cents: totalCents,
        description: desc,
        customer_email: null,
        customer_phone: null,
        saleId: sale.id || ('pos-' + Date.now()),
      };
      const res = await _apiPost('/api/stripe-payment-link', body);
      if (res && res.url) {
        setPayLink(res);
        setMode('qr');
        startPolling(res.id);
      } else {
        setErrorMsg(res?.error || 'Failed');
        setMode('error');
      }
    } else {
      setMode('qr');
      startPolling(payLink.id);
    }
  }

  return _h(_ModalBase, { title: 'Request Payment', onClose: () => { stopPolling(); onClose(); }, width: 500 },
    _h(_StripeWarning),

    // Amount summary
    _h('div', {
      style: {
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
    },
      _h('div', null,
        _h('div', { style: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 } }, 'Amount due'),
        _h('div', { style: { fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)' } }, _fmt$(sale.total || 0))
      ),
      customer
        ? _h('div', { style: { textAlign: 'right', fontSize: 13, color: 'var(--text-dim)' } },
            _h('div', null, customer.name || customer),
            customer.phone ? _h('div', { style: { fontSize: 12, color: 'var(--text-muted)' } }, customer.phone) : null
          )
        : null
    ),

    // Options
    mode === 'options' && _h('div', null,
      _h('div', { style: { display: 'flex', gap: 12, marginBottom: 20 } },
        _h('button', {
          className: 'btn btn-primary',
          style: { flex: 1, padding: '14px', fontSize: 14 },
          onClick: () => setMode('send-form'),
        },
          _h('div', { style: { fontSize: 20, marginBottom: 4 } }, '📨'),
          'Send Payment Link'
        ),
        _h('button', {
          className: 'btn btn-secondary',
          style: { flex: 1, padding: '14px', fontSize: 14 },
          onClick: showQR,
        },
          _h('div', { style: { fontSize: 20, marginBottom: 4 } }, '□'),
          'Show QR Code'
        )
      )
    ),

    // Send form
    mode === 'send-form' && _h('div', null,
      _h('div', { style: { marginBottom: 16 } },
        _h('label', { style: { fontSize: 13, color: 'var(--text-dim)', display: 'block', marginBottom: 8 } }, 'Send via'),
        _h('div', { style: { display: 'flex', gap: 8 } },
          ['sms', 'email'].map(m =>
            _h('button', {
              key: m,
              className: 'btn ' + (sendMethod === m ? 'btn-primary' : 'btn-secondary') + ' btn-sm',
              onClick: () => setSendMethod(m),
            }, m === 'sms' ? 'SMS' : 'Email')
          )
        )
      ),
      _h('div', { style: { marginBottom: 16 } },
        _h('label', { style: { fontSize: 13, color: 'var(--text-dim)', display: 'block', marginBottom: 6 } },
          sendMethod === 'sms' ? 'Phone number' : 'Email address'
        ),
        _h('input', {
          className: 'form-input',
          type: sendMethod === 'sms' ? 'tel' : 'email',
          placeholder: sendMethod === 'sms' ? '250-555-0100' : 'customer@example.com',
          value: contact,
          onChange: e => setContact(e.target.value),
        })
      ),
      _h('div', { style: { display: 'flex', gap: 8 } },
        _h('button', {
          className: 'btn btn-primary',
          style: { flex: 1 },
          onClick: sendLink,
          disabled: !contact.trim(),
        }, 'Send Link'),
        _h('button', { className: 'btn btn-ghost', onClick: () => setMode('options') }, 'Back')
      )
    ),

    // Sending spinner
    mode === 'sending' && _h('div', { style: { textAlign: 'center', padding: '24px 0' } },
      _h('span', { className: 'loading-spinner', style: { width: 32, height: 32 } }),
      _h('div', { style: { marginTop: 16, color: 'var(--text-dim)', fontSize: 14 } }, statusMsg || 'Processing...')
    ),

    // QR code
    mode === 'qr' && payLink && _h('div', { style: { textAlign: 'center' } },
      _h('img', {
        src: _qrUrl(payLink.url, 220),
        alt: 'QR code',
        style: { borderRadius: 8, border: '6px solid white', width: 220, height: 220 },
      }),
      _h('div', { style: { marginTop: 12, fontSize: 13, color: 'var(--text-dim)' } }, 'Customer scans to pay'),
      _h('div', { style: { marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all' } }, payLink.url),
      _h('div', { style: { marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 } },
        _h('span', { className: 'loading-spinner' }),
        'Waiting for payment...'
      )
    ),

    // Waiting (link sent)
    mode === 'waiting' && payLink && _h('div', { style: { textAlign: 'center', padding: '16px 0' } },
      _h('div', { style: { fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 } }, 'Link sent. Expires in 24 hours.'),
      _h('div', {
        style: {
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '10px 14px',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          wordBreak: 'break-all',
          marginBottom: 16,
          color: 'var(--text-muted)',
        },
      }, payLink.url),
      _h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 } },
        _h('span', { className: 'loading-spinner' }),
        'Waiting for payment...'
      ),
      _h('button', {
        className: 'btn btn-ghost btn-sm',
        style: { marginTop: 16 },
        onClick: () => { stopPolling(); setMode('qr'); startPolling(payLink.id); },
      }, 'Show QR instead')
    ),

    // Done
    mode === 'done' && _h('div', { style: { textAlign: 'center', padding: '24px 0' } },
      _h('div', { style: { fontSize: 48, marginBottom: 12 } }, '✓'),
      _h('div', { style: { fontSize: 18, fontWeight: 600, color: 'var(--green)', marginBottom: 8 } }, 'Payment received!'),
      _h('div', { style: { fontSize: 14, color: 'var(--text-dim)' } }, _fmt$(sale.total || 0) + ' via Stripe')
    ),

    // Error
    mode === 'error' && _h('div', { style: { textAlign: 'center', padding: '16px 0' } },
      _h('div', { style: { fontSize: 13, color: 'var(--red)', marginBottom: 16 } }, errorMsg),
      _h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
        _h('button', { className: 'btn btn-primary', onClick: () => setMode('options') }, 'Try Again'),
        _h('button', { className: 'btn btn-ghost', onClick: onClose }, 'Cancel')
      )
    )
  );
};

/* ── 2. CardPaymentModal ─────────────────────────────────────────────────── */
/**
 * CardPaymentModal(total, onSuccess, onClose)
 *
 * Physical Stripe Terminal or manual card entry fallback.
 */
window.CardPaymentModal = function CardPaymentModal({ total, onSuccess, onClose }) {
  const [mode, setMode] = _useState(
    window.POS_PAYMENT_CONFIG.stripe.terminalEnabled ? 'terminal' : 'manual'
  );
  const [status, setStatus] = _useState('idle'); // idle | processing | success | failed
  const [errorMsg, setErrorMsg] = _useState('');
  const [card, setCard] = _useState({ number: '', expiry: '', cvv: '', name: '' });

  async function chargeTerminal() {
    setStatus('processing');
    const res = await _apiPost('/api/stripe-terminal-charge', {
      amount_cents: Math.round(total * 100),
      description: 'ChainLine POS sale',
    });
    if (res && (res.clientSecret || res.is_mock)) {
      setStatus('success');
      _playSuccessBeep();
      setTimeout(() => onSuccess({ method: 'stripe-terminal', paymentIntentId: res.paymentIntentId || 'pi_mock' }), 800);
    } else {
      setStatus('failed');
      setErrorMsg(res?.error || 'Terminal charge failed');
    }
  }

  async function chargeManual() {
    if (!card.number || !card.expiry || !card.cvv) {
      setErrorMsg('All fields required');
      return;
    }
    setStatus('processing');
    // In production: use Stripe.js confirmPayment. Here: fallback through worker.
    const res = await _apiPost('/api/stripe-terminal-charge', {
      amount_cents: Math.round(total * 100),
      description: 'ChainLine POS sale (manual entry)',
      manual: true,
    });
    if (res && (res.clientSecret || res.is_mock)) {
      setStatus('success');
      _playSuccessBeep();
      setTimeout(() => onSuccess({ method: 'stripe-manual', paymentIntentId: res.paymentIntentId || 'pi_mock' }), 800);
    } else {
      setStatus('failed');
      setErrorMsg(res?.error || 'Card declined');
    }
  }

  function setC(k, v) { setCard(c => ({ ...c, [k]: v })); }

  function fmtExpiry(v) {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  }

  return _h(_ModalBase, { title: 'Card Payment', onClose, width: 440 },
    _h(_StripeWarning),

    _h('div', {
      style: {
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '14px 20px',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
    },
      _h('span', { style: { color: 'var(--text-dim)', fontSize: 13 } }, 'Charge'),
      _h('span', { style: { fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)' } }, _fmt$(total))
    ),

    // Mode toggle (terminal available)
    window.POS_PAYMENT_CONFIG.stripe.terminalEnabled
      ? _h('div', { style: { display: 'flex', gap: 8, marginBottom: 20 } },
          _h('button', {
            className: 'btn ' + (mode === 'terminal' ? 'btn-primary' : 'btn-secondary') + ' btn-sm',
            onClick: () => setMode('terminal'),
          }, 'Terminal Reader'),
          _h('button', {
            className: 'btn ' + (mode === 'manual' ? 'btn-primary' : 'btn-secondary') + ' btn-sm',
            onClick: () => setMode('manual'),
          }, 'Manual Entry')
        )
      : null,

    // Terminal mode
    mode === 'terminal' && status === 'idle' && _h('div', { style: { textAlign: 'center', padding: '20px 0' } },
      _h('div', { style: { fontSize: 40, marginBottom: 12 } }, '💳'),
      _h('div', { style: { fontSize: 16, fontWeight: 500, marginBottom: 8 } }, 'Tap, insert, or swipe on reader'),
      _h('div', { style: { fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 } }, 'Present card to the BBPOS WisePOS E'),
      _h('button', { className: 'btn btn-primary', style: { width: '100%' }, onClick: chargeTerminal }, 'Start Terminal Charge')
    ),

    // Manual card entry
    mode === 'manual' && status === 'idle' && _h('div', null,
      _h('div', { style: { fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 } }, 'Manual card entry'),
      _h('div', { className: 'form-group' },
        _h('label', { className: 'form-label' }, 'Cardholder Name'),
        _h('input', {
          className: 'form-input',
          placeholder: 'John Smith',
          value: card.name,
          onChange: e => setC('name', e.target.value),
        })
      ),
      _h('div', { className: 'form-group' },
        _h('label', { className: 'form-label' }, 'Card Number'),
        _h('input', {
          className: 'form-input',
          placeholder: '4242 4242 4242 4242',
          value: card.number,
          onChange: e => setC('number', e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()),
          inputMode: 'numeric',
        })
      ),
      _h('div', { style: { display: 'flex', gap: 12 } },
        _h('div', { className: 'form-group', style: { flex: 1 } },
          _h('label', { className: 'form-label' }, 'Expiry'),
          _h('input', {
            className: 'form-input',
            placeholder: 'MM/YY',
            value: card.expiry,
            onChange: e => setC('expiry', fmtExpiry(e.target.value)),
            inputMode: 'numeric',
            maxLength: 5,
          })
        ),
        _h('div', { className: 'form-group', style: { flex: 1 } },
          _h('label', { className: 'form-label' }, 'CVV'),
          _h('input', {
            className: 'form-input',
            placeholder: '123',
            value: card.cvv,
            onChange: e => setC('cvv', e.target.value.replace(/\D/g, '').slice(0, 4)),
            inputMode: 'numeric',
            maxLength: 4,
          })
        )
      ),
      errorMsg ? _h('div', { style: { color: 'var(--red)', fontSize: 13, marginBottom: 12 } }, errorMsg) : null,
      _h('button', {
        className: 'btn btn-primary',
        style: { width: '100%' },
        onClick: chargeManual,
      }, 'Charge ' + _fmt$(total))
    ),

    // Processing
    status === 'processing' && _h('div', { style: { textAlign: 'center', padding: '24px 0' } },
      _h('span', { className: 'loading-spinner', style: { width: 32, height: 32 } }),
      _h('div', { style: { marginTop: 16, color: 'var(--text-dim)', fontSize: 14 } }, 'Processing...')
    ),

    // Success
    status === 'success' && _h('div', { style: { textAlign: 'center', padding: '24px 0' } },
      _h('div', { style: { fontSize: 48, color: 'var(--green)' } }, '✓'),
      _h('div', { style: { fontSize: 16, fontWeight: 600, color: 'var(--green)', marginTop: 12 } }, 'Payment approved')
    ),

    // Failed
    status === 'failed' && _h('div', { style: { textAlign: 'center', padding: '16px 0' } },
      _h('div', { style: { fontSize: 13, color: 'var(--red)', marginBottom: 16 } }, errorMsg || 'Payment failed'),
      _h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
        _h('button', { className: 'btn btn-primary', onClick: () => { setStatus('idle'); setErrorMsg(''); } }, 'Retry'),
        _h('button', { className: 'btn btn-ghost', onClick: onClose }, 'Cancel')
      )
    )
  );
};

/* ── 3. CashModal ────────────────────────────────────────────────────────── */
/**
 * CashModal(total, onSuccess, onClose)
 *
 * Cash tendered input + change due display.
 */
window.CashModal = function CashModal({ total, onSuccess, onClose }) {
  const [tendered, setTendered] = _useState('');

  const tenderedNum = parseFloat(tendered) || 0;
  const change = tenderedNum - total;

  // §12 CAD denominations (bills + coins) — tap to add to tendered total
  const DENOMS = [100, 50, 20, 10, 5, 2, 1, 0.25, 0.10, 0.05];

  function addDenom(d) {
    setTendered(function(t) {
      const cur = parseFloat(t) || 0;
      return (Math.round((cur + d) * 100) / 100).toFixed(2);
    });
  }

  const quickAmounts = [
    { label: 'Exact', val: total.toFixed(2) },
    { label: '+$5',   val: (Math.ceil(total / 5) * 5).toFixed(2) },
    { label: '+$10',  val: (Math.ceil(total / 10) * 10).toFixed(2) },
    { label: '+$20',  val: (Math.ceil(total / 20) * 20).toFixed(2) },
  ];
  // Deduplicate quick amounts
  const seen = new Set();
  const filteredQuick = quickAmounts.filter(q => {
    if (seen.has(q.val)) return false;
    seen.add(q.val);
    return true;
  });

  function handleConfirm() {
    if (tenderedNum < total) return;
    _playSuccessBeep();
    onSuccess({ method: 'cash', tendered: tenderedNum, change: Math.max(0, change) });
  }

  return _h(_ModalBase, { title: 'Cash Payment', onClose, width: 400 },
    _h('div', {
      style: {
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '14px 20px',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
    },
      _h('span', { style: { color: 'var(--text-dim)', fontSize: 13 } }, 'Total due'),
      _h('span', { style: { fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)' } }, _fmt$(total))
    ),

    _h('div', { className: 'form-group' },
      _h('label', { className: 'form-label' }, 'Amount tendered'),
      _h('input', {
        className: 'form-input',
        type: 'number',
        step: '0.01',
        min: '0',
        placeholder: total.toFixed(2),
        value: tendered,
        onChange: e => setTendered(e.target.value),
        autoFocus: true,
        style: { fontSize: 22, textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '12px 16px' },
      })
    ),

    // §12 Denomination buttons — tap to add to tendered total
    _h('div', { className: 'cash-denom-grid' },
      DENOMS.map(d =>
        _h('button', {
          key: d,
          type: 'button',
          className: 'cash-denom-btn',
          onClick: () => addDenom(d),
        }, d >= 1 ? '$' + d : Math.round(d * 100) + '\xa2')
      )
    ),

    // §12 Round-up quick actions
    _h('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } },
      _h('button', {
        type: 'button',
        className: 'btn btn-secondary btn-sm',
        style: { flex: 1 },
        onClick: () => setTendered(total.toFixed(2)),
      }, 'Exact'),
      _h('button', {
        type: 'button',
        className: 'btn btn-secondary btn-sm',
        style: { flex: 1 },
        onClick: () => setTendered((Math.ceil(total / 5) * 5).toFixed(2)),
      }, 'Round up $5'),
      _h('button', {
        type: 'button',
        className: 'btn btn-secondary btn-sm',
        style: { flex: 1 },
        onClick: () => setTendered((Math.ceil(total / 10) * 10).toFixed(2)),
      }, 'Round up $10'),
      _h('button', {
        type: 'button',
        className: 'btn btn-ghost btn-sm',
        onClick: () => setTendered(''),
        title: 'Clear',
      }, 'Clear')
    ),

    // Quick amounts (legacy +$5/+$10/+$20)
    _h('div', { style: { display: 'flex', gap: 8, marginBottom: 20 } },
      filteredQuick.map(q =>
        _h('button', {
          key: q.val,
          type: 'button',
          className: 'btn btn-secondary btn-sm',
          style: { flex: 1 },
          onClick: () => setTendered(q.val),
        }, q.label + '\n' + _fmt$(parseFloat(q.val)))
      )
    ),

    // Change
    tenderedNum >= total
      ? _h('div', {
          style: {
            background: change > 0 ? 'rgba(22,163,74,0.1)' : 'var(--card)',
            border: '1px solid ' + (change > 0 ? 'var(--green)' : 'var(--border)'),
            borderRadius: 8,
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          },
        },
          _h('span', { style: { fontSize: 14, fontWeight: 500 } }, 'Change due'),
          _h('span', { style: { fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)' } }, _fmt$(Math.max(0, change)))
        )
      : tenderedNum > 0
        ? _h('div', {
            style: {
              color: 'var(--red)',
              fontSize: 13,
              textAlign: 'center',
              marginBottom: 20,
            },
          }, 'Short by ' + _fmt$(total - tenderedNum))
        : null,

    _h('button', {
      className: 'btn btn-primary',
      style: { width: '100%', padding: '14px' },
      onClick: handleConfirm,
      disabled: tenderedNum < total,
    }, 'Confirm Cash Payment')
  );
};

/* ── 4. TipModal ─────────────────────────────────────────────────────────── */
/**
 * TipModal(subtotal, onTipSelect)
 *
 * Shown after item selection, before payment.
 * onTipSelect({ amount, pct })
 */
window.TipModal = function TipModal({ subtotal, onTipSelect, onClose }) {
  const [custom, setCustom] = _useState('');
  const [showCustom, setShowCustom] = _useState(false);

  const presets = [
    { label: 'No tip', pct: 0 },
    { label: '15%',    pct: 0.15 },
    { label: '18%',    pct: 0.18 },
    { label: '20%',    pct: 0.20 },
  ];

  function selectPreset(pct) {
    const amount = Math.round(subtotal * pct * 100) / 100;
    _playSuccessBeep();
    onTipSelect({ amount, pct });
  }

  function confirmCustom() {
    const amount = parseFloat(custom) || 0;
    const pct = subtotal > 0 ? amount / subtotal : 0;
    _playSuccessBeep();
    onTipSelect({ amount, pct });
  }

  return _h(_ModalBase, { title: 'Add a Tip?', onClose, width: 420 },
    _h('div', { style: { textAlign: 'center', marginBottom: 8 } },
      _h('div', { style: { fontSize: 12, color: 'var(--text-muted)' } }, 'Tips go to the mechanic who worked on your bike')
    ),

    _h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 } },
      presets.map(p =>
        _h('button', {
          key: p.label,
          className: 'btn btn-secondary',
          style: { padding: '18px 12px', textAlign: 'center' },
          onClick: () => selectPreset(p.pct),
        },
          _h('div', { style: { fontSize: 18, fontWeight: 700, marginBottom: 4 } }, p.label),
          p.pct > 0
            ? _h('div', { style: { fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' } },
                _fmt$(Math.round(subtotal * p.pct * 100) / 100)
              )
            : null
        )
      )
    ),

    !showCustom
      ? _h('button', {
          className: 'btn btn-ghost',
          style: { width: '100%' },
          onClick: () => setShowCustom(true),
        }, 'Custom amount')
      : _h('div', { style: { display: 'flex', gap: 8 } },
          _h('input', {
            className: 'form-input',
            type: 'number',
            step: '0.01',
            min: '0',
            placeholder: '0.00',
            value: custom,
            onChange: e => setCustom(e.target.value),
            autoFocus: true,
            style: { flex: 1, fontFamily: 'var(--font-mono)', fontSize: 16, textAlign: 'right' },
          }),
          _h('button', { className: 'btn btn-primary', onClick: confirmCustom }, 'Add')
        )
  );
};

/* ── 5. RefundModal ──────────────────────────────────────────────────────── */
/**
 * RefundModal(originalSale, onSuccess, onClose)
 *
 * Select line items, full or partial refund, refund method.
 */
window.RefundModal = function RefundModal({ originalSale, onSuccess, onClose }) {
  const lines = originalSale.items || [];
  const [selected, setSelected] = _useState(() => new Set(lines.map(l => l.id)));
  const [refundMethod, setRefundMethod] = _useState('original');
  const [status, setStatus] = _useState('idle');
  const [errorMsg, setErrorMsg] = _useState('');

  function toggle(id) {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const refundLines = lines.filter(l => selected.has(l.id));
  const refundSubtotal = refundLines.reduce((s, l) => s + l.price * l.qty, 0);
  // BC tax on refund
  const taxRate = (window.POS_PAYMENT_CONFIG.tax.gst + window.POS_PAYMENT_CONFIG.tax.pst);
  const discPct = originalSale.discountPct || 0;
  const refundTotal = refundSubtotal * (1 - discPct / 100) * (1 + taxRate);

  async function handleRefund() {
    if (refundLines.length === 0) return;
    setStatus('processing');
    const body = {
      chargeId: originalSale.chargeId || originalSale.paymentIntentId || 'ch_mock',
      amount_cents: Math.round(refundTotal * 100),
      reason: 'requested_by_customer',
    };
    const res = await _apiPost('/api/stripe-refund', body);
    if (res && (res.id || res.is_mock)) {
      setStatus('success');
      _playSuccessBeep();
      setTimeout(() => onSuccess({ method: refundMethod, amount: refundTotal, refundId: res.id || 're_mock', lines: refundLines }), 800);
    } else {
      setStatus('failed');
      setErrorMsg(res?.error || 'Refund failed');
    }
  }

  return _h(_ModalBase, { title: 'Process Refund', onClose, width: 500 },
    _h(_StripeWarning),

    status === 'idle' && _h('div', null,
      _h('div', { className: 'form-label', style: { marginBottom: 8 } }, 'Select items to refund'),

      lines.length === 0
        ? _h('div', { style: { color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 } }, 'No line items on this sale.')
        : _h('div', { style: { marginBottom: 16 } },
            lines.map(line =>
              _h('div', {
                key: line.id,
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: selected.has(line.id) ? 'rgba(37,99,235,0.08)' : 'var(--card)',
                  border: '1px solid ' + (selected.has(line.id) ? 'var(--blue)' : 'var(--border)'),
                  borderRadius: 8,
                  marginBottom: 6,
                  cursor: 'pointer',
                },
                onClick: () => toggle(line.id),
              },
                _h('input', {
                  type: 'checkbox',
                  checked: selected.has(line.id),
                  onChange: () => toggle(line.id),
                  style: { width: 16, height: 16, accentColor: 'var(--blue)', cursor: 'pointer', flexShrink: 0 },
                }),
                _h('div', { style: { flex: 1 } },
                  _h('div', { style: { fontWeight: 500, fontSize: 14 } }, line.name),
                  _h('div', { style: { fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' } },
                    'qty: ' + line.qty + ' x ' + _fmt$(line.price)
                  )
                ),
                _h('div', { style: { fontFamily: 'var(--font-mono)', fontSize: 14 } }, _fmt$(line.price * line.qty))
              )
            )
          ),

      refundLines.length > 0 && _h('div', {
        style: {
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
        _h('div', { style: { fontSize: 13, color: 'var(--text-dim)' } },
          refundLines.length === lines.length ? 'Full refund (incl. tax)' : 'Partial refund (incl. tax)'
        ),
        _h('div', { style: { fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--red)' } },
          '-' + _fmt$(refundTotal)
        )
      ),

      _h('div', { className: 'form-group' },
        _h('label', { className: 'form-label' }, 'Refund to'),
        _h('div', { style: { display: 'flex', gap: 8 } },
          [
            { value: 'original', label: 'Original payment' },
            { value: 'credit',   label: 'Store credit'     },
          ].map(m =>
            _h('button', {
              key: m.value,
              className: 'btn ' + (refundMethod === m.value ? 'btn-primary' : 'btn-secondary') + ' btn-sm',
              style: { flex: 1 },
              onClick: () => setRefundMethod(m.value),
            }, m.label)
          )
        )
      ),

      _h('div', { style: { display: 'flex', gap: 8, marginTop: 20 } },
        _h('button', {
          className: 'btn btn-primary',
          style: { flex: 1, background: 'var(--red-dim)', borderColor: 'var(--red)' },
          onClick: handleRefund,
          disabled: refundLines.length === 0,
        }, 'Refund ' + _fmt$(refundTotal)),
        _h('button', { className: 'btn btn-ghost', onClick: onClose }, 'Cancel')
      )
    ),

    status === 'processing' && _h('div', { style: { textAlign: 'center', padding: '24px 0' } },
      _h('span', { className: 'loading-spinner', style: { width: 32, height: 32 } }),
      _h('div', { style: { marginTop: 16, color: 'var(--text-dim)' } }, 'Processing refund...')
    ),

    status === 'success' && _h('div', { style: { textAlign: 'center', padding: '24px 0' } },
      _h('div', { style: { fontSize: 48, color: 'var(--green)' } }, '✓'),
      _h('div', { style: { fontSize: 16, fontWeight: 600, color: 'var(--green)', marginTop: 12 } }, 'Refund processed'),
      _h('div', { style: { fontSize: 13, color: 'var(--text-dim)', marginTop: 8 } }, _fmt$(refundTotal) + ' returned to customer')
    ),

    status === 'failed' && _h('div', { style: { textAlign: 'center', padding: '16px 0' } },
      _h('div', { style: { color: 'var(--red)', fontSize: 13, marginBottom: 16 } }, errorMsg),
      _h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
        _h('button', { className: 'btn btn-primary', onClick: () => { setStatus('idle'); setErrorMsg(''); } }, 'Retry'),
        _h('button', { className: 'btn btn-ghost', onClick: onClose }, 'Cancel')
      )
    )
  );
};
