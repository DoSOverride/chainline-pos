// pos-offline.js — ChainLine POS V2 Offline / Sync Module
// Pure vanilla JS, no frameworks

const QUEUE_KEY = "cl_pos_offline_queue";
const SYNC_EVENT = "cl-pos-sync";

// ─── OfflineQueue class ───────────────────────────────────────────────────────

class OfflineQueue {
  constructor() {
    this._listeners = [];
    this._retrying = false;
    this._boundOnline = this._onOnline.bind(this);
    window.addEventListener("online", this._boundOnline);
  }

  // ── Queue management ──────────────────────────────────────────────────────

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  _save(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    this._emit();
  }

  enqueue(request) {
    // request: { id, method, url, body, addedAt, attempts }
    const queue = this.getAll();
    const item = {
      id: request.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      method: request.method || "POST",
      url: request.url,
      body: request.body || null,
      headers: request.headers || { "Content-Type": "application/json" },
      addedAt: request.addedAt || new Date().toISOString(),
      attempts: request.attempts || 0,
      label: request.label || request.url,
    };
    queue.push(item);
    this._save(queue);
    console.log(`[OfflineQueue] Queued: ${item.method} ${item.url} (total: ${queue.length})`);
    return item.id;
  }

  remove(id) {
    const queue = this.getAll().filter(i => i.id !== id);
    this._save(queue);
  }

  clear() {
    this._save([]);
  }

  count() {
    return this.getAll().length;
  }

  // ── Retry logic ───────────────────────────────────────────────────────────

  async retryAll() {
    if (this._retrying) return;
    if (!navigator.onLine) return;
    const queue = this.getAll();
    if (!queue.length) return;

    this._retrying = true;
    console.log(`[OfflineQueue] Retrying ${queue.length} queued requests...`);

    for (const item of queue) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body ? JSON.stringify(item.body) : undefined,
        });

        if (res.ok) {
          this.remove(item.id);
          console.log(`[OfflineQueue] Synced: ${item.method} ${item.url}`);
        } else {
          this._incrementAttempts(item.id);
          console.warn(`[OfflineQueue] Failed (${res.status}): ${item.url}`);
        }
      } catch (err) {
        this._incrementAttempts(item.id);
        console.warn(`[OfflineQueue] Error: ${item.url}`, err.message);
      }
    }

    this._retrying = false;
    this._emit();
  }

  _incrementAttempts(id) {
    const queue = this.getAll();
    const item = queue.find(i => i.id === id);
    if (item) {
      item.attempts += 1;
      // Remove after 5 failed attempts to prevent indefinite buildup
      if (item.attempts >= 5) {
        console.warn(`[OfflineQueue] Dropping after 5 attempts: ${item.url}`);
        this._save(queue.filter(i => i.id !== id));
        return;
      }
      this._save(queue);
    }
  }

  _onOnline() {
    console.log("[OfflineQueue] Back online - attempting sync...");
    this.retryAll();
  }

  // ── Wrapped fetch ─────────────────────────────────────────────────────────

  async fetch(url, options = {}, label = "") {
    if (navigator.onLine) {
      try {
        const res = await fetch(url, options);
        if (res.ok) return res;
        throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        // Network error even though "online" — queue it
        console.warn(`[OfflineQueue] fetch failed (${err.message}), queuing...`);
      }
    }
    // Queue for later
    this.enqueue({
      method: options.method || "GET",
      url,
      body: options.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : null,
      headers: options.headers || {},
      label: label || url,
    });
    return null;
  }

  // ── Listeners ─────────────────────────────────────────────────────────────

  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  }

  _emit() {
    const count = this.count();
    this._listeners.forEach(fn => fn(count));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { count } }));
  }

  destroy() {
    window.removeEventListener("online", this._boundOnline);
    this._listeners = [];
  }
}

// ─── ConnectionStatus component ───────────────────────────────────────────────

function ConnectionStatus(queue) {
  const el = document.createElement("div");
  el.className = "cl-connection-status";

  function update() {
    const online = navigator.onLine;
    const pending = queue ? queue.count() : 0;
    const color = online ? (pending > 0 ? "#e0a060" : "#4caf50") : "#c8392c";
    const dotColor = online ? (pending > 0 ? "#e0a060" : "#4caf50") : "#c8392c";
    const label = online
      ? (pending > 0 ? `${pending} unsynced` : "Online")
      : "Offline";

    el.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: ${color};
      padding: 4px 10px;
      background: ${color}15;
      border: 1px solid ${color}30;
      border-radius: 20px;
      cursor: ${pending > 0 ? "pointer" : "default"};
      transition: all 0.3s;
      user-select: none;
    `;
    el.innerHTML = `
      <span style="
        width: 7px; height: 7px;
        border-radius: 50%;
        background: ${dotColor};
        display: inline-block;
        ${online && pending === 0 ? "animation: pulse-dot 2s infinite;" : ""}
      "></span>
      <span>${label}</span>
    `;

    // Tooltip
    el.title = online
      ? (pending > 0 ? `${pending} item(s) waiting to sync. Click to retry.` : "All data synced")
      : `No internet connection. ${pending} item(s) queued for sync.`;
  }

  // Inject pulse keyframe once
  if (!document.getElementById("cl-offline-styles")) {
    const style = document.createElement("style");
    style.id = "cl-offline-styles";
    style.textContent = `
      @keyframes pulse-dot {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    `;
    document.head.appendChild(style);
  }

  // Click to retry
  el.addEventListener("click", () => {
    if (queue && queue.count() > 0 && navigator.onLine) {
      queue.retryAll();
    }
  });

  update();

  // Listen for online/offline changes
  window.addEventListener("online", update);
  window.addEventListener("offline", update);

  // Listen for queue changes
  if (queue) {
    queue.onChange(() => update());
  }

  // Also update on SYNC_EVENT from other instances
  window.addEventListener(SYNC_EVENT, update);

  return el;
}

// ─── useSyncQueue hook ────────────────────────────────────────────────────────

function useSyncQueue() {
  // Singleton queue stored on window
  if (!window._clPosOfflineQueue) {
    window._clPosOfflineQueue = new OfflineQueue();
  }
  const queue = window._clPosOfflineQueue;

  // Expose reactive binding helpers for vanilla JS
  let _subscribers = [];

  function subscribe(fn) {
    _subscribers.push(fn);
    const unsub = queue.onChange(() => {
      const state = getState();
      _subscribers.forEach(s => s(state));
    });
    return () => {
      _subscribers = _subscribers.filter(s => s !== fn);
      unsub();
    };
  }

  function getState() {
    return {
      pendingCount: queue.count(),
      pending: queue.getAll(),
      isOnline: navigator.onLine,
      isRetrying: queue._retrying,
    };
  }

  function enqueue(request) {
    return queue.enqueue(request);
  }

  function retry() {
    return queue.retryAll();
  }

  function clear() {
    queue.clear();
  }

  return {
    queue,
    getState,
    enqueue,
    retry,
    clear,
    subscribe,
    // Convenience: get count reactively in the component lifecycle
    get pendingCount() { return queue.count(); },
    get isOnline() { return navigator.onLine; },
  };
}

// ─── SyncQueuePanel component (debug/admin view) ──────────────────────────────

function SyncQueuePanel() {
  const { queue, getState, retry, clear } = useSyncQueue();
  const container = document.createElement("div");

  function render() {
    const state = getState();
    const { pending, pendingCount, isOnline } = state;

    container.innerHTML = `
      <div style="background:#1c1c1c;border:1px solid #2a2a2a;border-radius:10px;padding:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-size:13px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.07em">Sync Queue</div>
          <div style="display:flex;gap:8px">
            <button id="retryAllBtn" style="background:#1a2a00;border:1px solid #2a4a00;color:#a0c832;padding:4px 12px;border-radius:5px;cursor:pointer;font-size:12px" ${!isOnline || pendingCount === 0 ? "disabled" : ""}>
              Retry All
            </button>
            <button id="clearQueueBtn" style="background:#2a1010;border:1px solid #4a1a1a;color:#c87070;padding:4px 12px;border-radius:5px;cursor:pointer;font-size:12px" ${pendingCount === 0 ? "disabled" : ""}>
              Clear
            </button>
          </div>
        </div>
        ${pendingCount === 0
          ? `<div style="color:#555;font-size:13px;text-align:center;padding:16px">Queue empty - all synced</div>`
          : `<div style="font-size:12px;color:#666;margin-bottom:8px">${pendingCount} item(s) pending</div>
             <div style="max-height:200px;overflow-y:auto">
               ${pending.map(item => `
                 <div style="background:#141414;border:1px solid #222;border-radius:6px;padding:8px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
                   <div>
                     <span style="background:#2a2a2a;color:#888;font-size:10px;padding:1px 6px;border-radius:3px;margin-right:6px">${item.method}</span>
                     <span style="color:#ccc;font-size:12px">${item.label || item.url}</span>
                   </div>
                   <div style="font-size:10px;color:#555">${item.attempts > 0 ? `${item.attempts} attempt(s)` : "pending"}</div>
                 </div>
               `).join("")}
             </div>`
        }
      </div>
    `;

    container.querySelector("#retryAllBtn")?.addEventListener("click", () => retry());
    container.querySelector("#clearQueueBtn")?.addEventListener("click", () => {
      if (confirm("Clear all queued sync items? This cannot be undone.")) {
        clear();
        render();
      }
    });
  }

  render();
  queue.onChange(() => render());

  return container;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

window.OfflineQueue = OfflineQueue;
window.ConnectionStatus = ConnectionStatus;
window.useSyncQueue = useSyncQueue;
window.SyncQueuePanel = SyncQueuePanel;
