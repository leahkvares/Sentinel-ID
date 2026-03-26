// content.js — Sentinel ID content script
// Injected on Duo pages (and any page in demo mode).
// Renders the chosen MFA style as an overlay.

(function () {
  'use strict';

  // ── Avoid double-injecting ──────────────────────────────────────────────
  if (window.__sentinelLoaded) return;
  window.__sentinelLoaded = true;

  const STYLES = ['minimal', 'pin', 'passphrase', 'pattern', 'biometric'];
  const STYLE_LABELS = {
    minimal:    'Tap',
    pin:        'PIN',
    passphrase: 'Phrase',
    pattern:    'Pattern',
    biometric:  'Bio',
  };

  let currentStyle = 'minimal';
  let overlayEl    = null;

  // ── Listen for messages from popup ─────────────────────────────────────
  browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SENTINEL_ENABLED_TOGGLE') {
      if (!msg.enabled) {
        removeOverlay();
      }
      // If re-enabled, auto-inject will fire next time a Duo page loads
    }
    if (msg.type === 'SENTINEL_PREVIEW') {
      currentStyle = msg.style || 'minimal';
      showOverlay(currentStyle);
    }
    if (msg.type === 'SENTINEL_DEMO_TOGGLE') {
      if (msg.enabled) {
        browser.storage.local.get('sentinelStyle').then(p => {
          showOverlay(p.sentinelStyle || 'minimal');
        });
      } else {
        removeOverlay();
      }
    }
  });

  // ── Auto-inject on real Duo pages ───────────────────────────────────────
  function isDuoPage() {
    return (
      location.hostname.includes('duosecurity.com') ||
      document.querySelector('#duo-frame, #login-form, .duo-frame') !== null
    );
  }

  function tryAutoInject() {
    browser.storage.local.get(['sentinelStyle', 'sentinelDemo', 'sentinelEnabled']).then(prefs => {
      const isEnabled = prefs.sentinelEnabled !== undefined ? prefs.sentinelEnabled : true;
      if (!isEnabled) return;
      if (isDuoPage() || prefs.sentinelDemo) {
        currentStyle = prefs.sentinelStyle || 'minimal';
        showOverlay(currentStyle);
      }
    });
  }

  // Wait for DOM then check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryAutoInject);
  } else {
    tryAutoInject();
  }

  // Also watch for Duo iframe being inserted dynamically
  const observer = new MutationObserver(() => {
    if (isDuoPage() && !overlayEl) tryAutoInject();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // ── Overlay lifecycle ───────────────────────────────────────────────────
  function showOverlay(style) {
    removeOverlay();
    document.body.classList.add('sentinel-active');

    overlayEl = document.createElement('div');
    overlayEl.id = 'sentinel-overlay';
    overlayEl.innerHTML = buildCard(style);
    document.body.appendChild(overlayEl);

    attachCardEvents(style);
  }

  function removeOverlay() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    document.body.classList.remove('sentinel-active');
  }

  // ── Card HTML builders ──────────────────────────────────────────────────
  function buildCard(style) {
    return `
      <div id="sentinel-card">
        <button class="s-dismiss" id="s-dismiss" title="Dismiss preview">✕</button>
        <div class="s-header">
          <div class="s-logo">SENTINEL <span>ID</span></div>
          <div class="s-context">// Verify Identity</div>
        </div>
        <div id="s-body">${buildBody(style)}</div>
        <div class="s-switcher">${buildSwitcher(style)}</div>
      </div>`;
  }

  function buildBody(style) {
    switch (style) {
      case 'minimal':    return buildMinimal();
      case 'pin':        return buildPin();
      case 'passphrase': return buildPassphrase();
      case 'pattern':    return buildPattern();
      case 'biometric':  return buildBiometric();
      default:           return buildMinimal();
    }
  }

  function buildSwitcher(activeStyle) {
    return STYLES.map(s =>
      `<button class="s-switch-btn${s === activeStyle ? ' active' : ''}"
               data-switch="${s}">${STYLE_LABELS[s]}</button>`
    ).join('');
  }

  // ── Individual style bodies ─────────────────────────────────────────────

  function buildMinimal() {
    return `
      <div class="s-prompt">// Authentication request</div>
      <div class="s-title">Tap to approve this login</div>
      <button class="s-one-tap-btn" id="s-approve">Approve →</button>
      <button class="s-submit" id="s-deny" style="background:transparent;color:#444;border:1px solid #1a1a1a;">Deny</button>`;
  }

  function buildPin() {
    const dots = Array(6).fill('<div class="s-dot"></div>').join('');
    const keys = [
      '1','2','3','4','5','6','7','8','9',
    ];
    const keyHtml = keys.map(k =>
      `<button class="s-key" data-key="${k}">${k}</button>`
    ).join('') +
    `<button class="s-key s-key-clear" data-key="clear">CLR</button>` +
    `<button class="s-key" data-key="0">0</button>` +
    `<button class="s-key s-key-del" data-key="del">⌫</button>`;

    return `
      <div class="s-prompt">// Enter your PIN</div>
      <div class="s-title">Your personal code</div>
      <div class="s-pin-dots" id="s-dots">${dots}</div>
      <div class="s-numpad">${keyHtml}</div>`;
  }

  function buildPassphrase() {
    return `
      <div class="s-prompt">// Enter your passphrase</div>
      <div class="s-title">Something only you know</div>
      <input class="s-input" id="s-phrase" type="password"
             placeholder="your secret phrase..." autocomplete="off"/>
      <button class="s-submit" id="s-phrase-submit">Verify →</button>`;
  }

  function buildPattern() {
    const nodes = Array(9).fill(null).map((_, i) =>
      `<div class="s-node" data-idx="${i}"></div>`
    ).join('');
    return `
      <div class="s-prompt">// Draw your unlock pattern</div>
      <div class="s-title">Connect the dots</div>
      <div class="s-pattern-grid" id="s-grid">${nodes}</div>
      <div class="s-pattern-hint" id="s-pattern-hint">tap nodes in sequence</div>
      <button class="s-submit" id="s-pattern-submit" disabled>Unlock →</button>`;
  }

  function buildBiometric() {
    return `
      <div class="s-prompt">// Biometric authentication</div>
      <div class="s-title">Confirm your identity</div>
      <div class="s-bio-ring" id="s-bio-ring">
        <span class="s-bio-icon">◑</span>
      </div>
      <div class="s-bio-label" id="s-bio-label">Touch to scan</div>
      <button class="s-submit" id="s-bio-submit">Authenticate →</button>`;
  }

  // ── Event wiring ────────────────────────────────────────────────────────
  function attachCardEvents(style) {
    // Dismiss
    document.getElementById('s-dismiss').addEventListener('click', () => {
      removeOverlay();
    });

    // Style switcher
    overlayEl.querySelectorAll('.s-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const newStyle = btn.dataset.switch;
        currentStyle = newStyle;
        // Save preference
        browser.storage.local.set({ sentinelStyle: newStyle });
        // Rebuild body + switcher in place
        document.getElementById('s-body').innerHTML = buildBody(newStyle);
        overlayEl.querySelector('.s-switcher').innerHTML = buildSwitcher(newStyle);
        attachBodyEvents(newStyle);
        overlayEl.querySelectorAll('.s-switch-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.switch === newStyle);
        });
        // Re-attach switcher events
        overlayEl.querySelectorAll('.s-switch-btn').forEach(b => {
          b.addEventListener('click', () => {
            const s = b.dataset.switch;
            currentStyle = s;
            browser.storage.local.set({ sentinelStyle: s });
            document.getElementById('s-body').innerHTML = buildBody(s);
            overlayEl.querySelector('.s-switcher').innerHTML = buildSwitcher(s);
            attachBodyEvents(s);
          });
        });
      });
    });

    attachBodyEvents(style);
  }

  function attachBodyEvents(style) {
    switch (style) {
      case 'minimal':    attachMinimalEvents();    break;
      case 'pin':        attachPinEvents();        break;
      case 'passphrase': attachPassphraseEvents(); break;
      case 'pattern':    attachPatternEvents();    break;
      case 'biometric':  attachBiometricEvents();  break;
    }
  }

  // ── Minimal ──
  function attachMinimalEvents() {
    document.getElementById('s-approve').addEventListener('click', () => {
      showResult(true, 'Identity Confirmed', 'Redirecting...');
    });
    document.getElementById('s-deny').addEventListener('click', () => {
      showResult(false, 'Request Denied', 'Login blocked.');
    });
  }

  // ── PIN ──
  function attachPinEvents() {
    let pin = '';
    const MAX = 6;

    function updateDots() {
      const dots = document.querySelectorAll('.s-dot');
      dots.forEach((d, i) => d.classList.toggle('filled', i < pin.length));
    }

    document.getElementById('sentinel-card').addEventListener('click', e => {
      const key = e.target.closest('.s-key');
      if (!key) return;

      const k = key.dataset.key;
      if (k === 'clear') {
        pin = '';
      } else if (k === 'del') {
        pin = pin.slice(0, -1);
      } else if (pin.length < MAX) {
        pin += k;
      }

      updateDots();

      if (pin.length === MAX) {
        setTimeout(() => showResult(true, 'PIN Accepted', 'Identity verified.'), 300);
      }
    });
  }

  // ── Passphrase ──
  function attachPassphraseEvents() {
    const input  = document.getElementById('s-phrase');
    const submit = document.getElementById('s-phrase-submit');

    if (input) input.focus();

    function trySubmit() {
      const val = input ? input.value.trim() : '';
      if (val.length < 3) {
        input.style.borderColor = '#4a1a1a';
        setTimeout(() => { input.style.borderColor = ''; }, 800);
        return;
      }
      showResult(true, 'Passphrase Accepted', 'Identity verified.');
    }

    if (submit) submit.addEventListener('click', trySubmit);
    if (input)  input.addEventListener('keydown', e => {
      if (e.key === 'Enter') trySubmit();
    });
  }

  // ── Pattern ──
  function attachPatternEvents() {
    const nodes   = document.querySelectorAll('.s-node');
    const hint    = document.getElementById('s-pattern-hint');
    const submit  = document.getElementById('s-pattern-submit');
    let sequence  = [];

    nodes.forEach((node, idx) => {
      node.addEventListener('click', () => {
        if (sequence.includes(idx)) return;
        sequence.push(idx);
        node.classList.add('lit');
        setTimeout(() => node.classList.add('active'), 50);

        hint.textContent = `${sequence.length} node${sequence.length > 1 ? 's' : ''} selected`;

        if (sequence.length >= 3) {
          submit.disabled = false;
        }
      });
    });

    if (submit) submit.addEventListener('click', () => {
      if (sequence.length < 3) return;
      showResult(true, 'Pattern Accepted', 'Identity verified.');
    });
  }

  // ── Biometric ──
  function attachBiometricEvents() {
    const ring   = document.getElementById('s-bio-ring');
    const label  = document.getElementById('s-bio-label');
    const submit = document.getElementById('s-bio-submit');

    function startScan() {
      ring.classList.add('scanning');
      label.textContent = 'Scanning...';
      submit.disabled = true;
      setTimeout(() => {
        ring.classList.remove('scanning');
        showResult(true, 'Biometric Verified', 'Identity confirmed.');
      }, 1800);
    }

    if (ring)   ring.addEventListener('click', startScan);
    if (submit) submit.addEventListener('click', startScan);
  }

  // ── Shared result state ─────────────────────────────────────────────────
  function showResult(success, title, sub) {
    const body = document.getElementById('s-body');
    if (!body) return;
    const icon = success ? '✓' : '✕';
    const iconStyle = success
      ? 'color:#4ade80;font-size:2.5rem;margin-bottom:.75rem'
      : 'color:#f87171;font-size:2.5rem;margin-bottom:.75rem';

    body.innerHTML = `
      <div class="s-result">
        <div style="${iconStyle}">${icon}</div>
        <div class="s-result-text">${title}</div>
        <div class="s-result-sub">${sub}</div>
      </div>`;

    if (success) {
      setTimeout(() => removeOverlay(), 1800);
    } else {
      // Show a "try again" link on denial
      setTimeout(() => {
        const result = body.querySelector('.s-result');
        if (result) {
          const retry = document.createElement('button');
          retry.textContent = 'Try Again';
          retry.className = 's-submit';
          retry.style.marginTop = '1.5rem';
          retry.addEventListener('click', () => {
            body.innerHTML = buildBody(currentStyle);
            attachBodyEvents(currentStyle);
          });
          result.appendChild(retry);
        }
      }, 600);
    }
  }

})();
