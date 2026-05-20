// pos-auth.js — ChainLine POS V2 Auth Module
// PIN-based staff auth with sessionStorage persistence

const STAFF = [
  {
    name: "Jason",
    role: "mechanic",
    pin: "1234",
    initials: "JA",
    color: "#c8392c",
    emoji: "🔧",
  },
  {
    name: "Florian",
    role: "mechanic",
    pin: "5678",
    initials: "FL",
    color: "#2c6ec8",
    emoji: "🛠",
  },
  {
    name: "Darrin",
    role: "manager",
    pin: "9999",
    initials: "DA",
    color: "#2ca87a",
    emoji: "📋",
  },
];

const AUTH_KEY = "cl_pos_staff";

// ─── useAuth ──────────────────────────────────────────────────────────────────

function useAuth() {
  function getStaff() {
    try {
      const raw = sessionStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function login(staffObj) {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(staffObj));
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
  }

  function isLoggedIn() {
    return !!getStaff();
  }

  return { staff: getStaff(), login, logout, isLoggedIn };
}

// ─── AuthScreen ───────────────────────────────────────────────────────────────

function AuthScreen(onLogin) {
  const container = document.createElement("div");
  container.id = "cl-auth-screen";
  container.style.cssText = `
    position: fixed;
    inset: 0;
    background: #0a0a0a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  let selectedStaff = null;
  let pinBuffer = "";
  let pinError = "";

  function render() {
    container.innerHTML = `
      <style>
        #cl-auth-screen * { box-sizing: border-box; }
        .auth-logo {
          font-size: 28px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
        }
        .auth-logo span { color: #c8392c; }
        .auth-subtitle {
          font-size: 13px;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 48px;
        }
        .staff-grid {
          display: flex;
          gap: 20px;
          margin-bottom: 40px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .staff-card {
          background: #141414;
          border: 2px solid #2a2a2a;
          border-radius: 16px;
          padding: 20px 28px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s;
          min-width: 130px;
        }
        .staff-card:hover {
          border-color: #444;
          background: #1c1c1c;
          transform: translateY(-2px);
        }
        .staff-card.selected {
          border-color: var(--staff-color);
          background: #1c1c1c;
          box-shadow: 0 0 0 1px var(--staff-color);
        }
        .staff-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          margin: 0 auto 10px;
        }
        .staff-name {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 3px;
        }
        .staff-role {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pin-section {
          text-align: center;
          min-height: 160px;
        }
        .pin-prompt {
          font-size: 14px;
          color: #888;
          margin-bottom: 16px;
        }
        .pin-selected-name {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 20px;
        }
        .pin-dots {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 20px;
        }
        .pin-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #2a2a2a;
          border: 2px solid #444;
          transition: all 0.1s;
        }
        .pin-dot.filled {
          background: var(--current-staff-color, #c8392c);
          border-color: var(--current-staff-color, #c8392c);
        }
        .pin-keypad {
          display: grid;
          grid-template-columns: repeat(3, 64px);
          gap: 10px;
          justify-content: center;
          margin-bottom: 16px;
        }
        .pin-key {
          width: 64px;
          height: 64px;
          background: #1c1c1c;
          border: 1px solid #2a2a2a;
          color: #fff;
          font-size: 22px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.1s;
          user-select: none;
        }
        .pin-key:hover {
          background: #2a2a2a;
        }
        .pin-key:active {
          background: #333;
          transform: scale(0.96);
        }
        .pin-key.del {
          font-size: 18px;
          color: #888;
        }
        .pin-error {
          color: #e05555;
          font-size: 13px;
          min-height: 20px;
          margin-bottom: 8px;
        }
        .auth-back-btn {
          background: none;
          border: none;
          color: #555;
          font-size: 13px;
          cursor: pointer;
          padding: 6px 12px;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .auth-back-btn:hover { color: #888; }
      </style>

      <div class="auth-logo">Chain<span>Line</span> Cycle</div>
      <div class="auth-subtitle">Point of Sale — Staff Login</div>

      ${!selectedStaff ? `
        <div class="staff-grid">
          ${STAFF.map(s => `
            <div class="staff-card" data-name="${s.name}" style="--staff-color:${s.color}">
              <div class="staff-avatar" style="background:${s.color}20;border:2px solid ${s.color}40;color:${s.color}">
                ${s.initials}
              </div>
              <div class="staff-name">${s.name}</div>
              <div class="staff-role">${s.role}</div>
            </div>
          `).join("")}
        </div>
        <div class="pin-section" style="opacity:0.4">
          <div class="pin-prompt">Select your name to sign in</div>
        </div>
      ` : `
        <div class="staff-grid">
          ${STAFF.map(s => `
            <div class="staff-card ${s.name === selectedStaff.name ? "selected" : ""}" data-name="${s.name}" style="--staff-color:${s.color}">
              <div class="staff-avatar" style="background:${s.color}20;border:2px solid ${s.name === selectedStaff.name ? s.color : s.color + "40"};color:${s.color}">
                ${s.initials}
              </div>
              <div class="staff-name">${s.name}</div>
              <div class="staff-role">${s.role}</div>
            </div>
          `).join("")}
        </div>

        <div class="pin-section" style="--current-staff-color:${selectedStaff.color}">
          <div class="pin-prompt">Enter PIN for</div>
          <div class="pin-selected-name" style="color:${selectedStaff.color}">${selectedStaff.name}</div>
          <div class="pin-dots">
            ${[0,1,2,3].map(i => `<div class="pin-dot ${i < pinBuffer.length ? "filled" : ""}"></div>`).join("")}
          </div>
          <div class="pin-error">${pinError}</div>
          <div class="pin-keypad">
            ${["1","2","3","4","5","6","7","8","9","","0","⌫"].map(k => {
              if (k === "") return `<div></div>`;
              return `<button class="pin-key ${k === "⌫" ? "del" : ""}" data-key="${k}">${k}</button>`;
            }).join("")}
          </div>
          <button class="auth-back-btn" id="authBackBtn">← Different person</button>
        </div>
      `}
    `;

    // Staff card click
    container.querySelectorAll(".staff-card").forEach(card => {
      card.addEventListener("click", () => {
        const name = card.dataset.name;
        selectedStaff = STAFF.find(s => s.name === name) || null;
        pinBuffer = "";
        pinError = "";
        render();
      });
    });

    // PIN keys
    container.querySelectorAll(".pin-key").forEach(key => {
      key.addEventListener("click", () => {
        const k = key.dataset.key;
        if (k === "⌫") {
          pinBuffer = pinBuffer.slice(0, -1);
          pinError = "";
          render();
        } else if (pinBuffer.length < 4) {
          pinBuffer += k;
          if (pinBuffer.length === 4) {
            handlePINSubmit();
          } else {
            render();
          }
        }
      });
    });

    const backBtn = container.querySelector("#authBackBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        selectedStaff = null;
        pinBuffer = "";
        pinError = "";
        render();
      });
    }
  }

  function handlePINSubmit() {
    if (!selectedStaff) return;
    if (pinBuffer === selectedStaff.pin) {
      // Success
      const auth = useAuth();
      const staffObj = {
        name: selectedStaff.name,
        role: selectedStaff.role,
        initials: selectedStaff.initials,
        color: selectedStaff.color,
        loginTime: new Date().toISOString(),
      };
      auth.login(staffObj);
      container.style.opacity = "0";
      container.style.transition = "opacity 0.25s";
      setTimeout(() => {
        container.remove();
        onLogin(staffObj);
      }, 250);
    } else {
      pinError = "Incorrect PIN. Try again.";
      pinBuffer = "";
      render();
      // Shake animation
      setTimeout(() => {
        const dots = container.querySelector(".pin-dots");
        if (dots) {
          dots.style.animation = "shake 0.3s ease";
          setTimeout(() => { dots.style.animation = ""; }, 300);
        }
      }, 0);
    }
  }

  // Keyboard support
  document.addEventListener("keydown", function onKeyDown(e) {
    if (!container.isConnected) {
      document.removeEventListener("keydown", onKeyDown);
      return;
    }
    if (!selectedStaff) return;
    if (e.key >= "0" && e.key <= "9" && pinBuffer.length < 4) {
      pinBuffer += e.key;
      if (pinBuffer.length === 4) {
        render();
        handlePINSubmit();
      } else {
        render();
      }
    } else if (e.key === "Backspace") {
      pinBuffer = pinBuffer.slice(0, -1);
      pinError = "";
      render();
    }
  });

  // Inject shake keyframe
  if (!document.getElementById("cl-auth-styles")) {
    const style = document.createElement("style");
    style.id = "cl-auth-styles";
    style.textContent = `
      @keyframes shake {
        0%,100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }
    `;
    document.head.appendChild(style);
  }

  render();
  return container;
}

// ─── AuthGuard ────────────────────────────────────────────────────────────────

function AuthGuard(appFactory) {
  const wrapper = document.createElement("div");
  wrapper.id = "cl-auth-guard";
  wrapper.style.cssText = "width:100%;height:100%;";

  const auth = useAuth();

  if (auth.isLoggedIn()) {
    // Already logged in — mount app immediately
    const app = appFactory(auth.staff);
    if (app instanceof Node) {
      wrapper.appendChild(app);
    }
  } else {
    // Show login screen first
    const authScreen = AuthScreen((staffObj) => {
      // On successful login, mount the app
      wrapper.innerHTML = "";
      const app = appFactory(staffObj);
      if (app instanceof Node) {
        wrapper.appendChild(app);
      }
    });
    document.body.appendChild(authScreen);
  }

  return wrapper;
}

window.AuthScreen = AuthScreen;
window.useAuth = useAuth;
window.AuthGuard = AuthGuard;
window.POS_STAFF = STAFF;
