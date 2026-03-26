// popup.js — Sentinel ID toolbar popup

const DEFAULT_STYLE = 'minimal';

// ── Load saved prefs and render state ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  browser.storage.local.get(['sentinelStyle', 'sentinelDemo', 'sentinelEnabled']).then(prefs => {
    const style   = prefs.sentinelStyle  || DEFAULT_STYLE;
    const demo    = prefs.sentinelDemo   || false;
    const enabled = prefs.sentinelEnabled !== undefined ? prefs.sentinelEnabled : true;

    selectStyle(style, false);

    document.getElementById('demo-toggle').checked    = demo;
    document.getElementById('overlay-toggle').checked = enabled;
    updateStatusDot(enabled, demo);
    updateOverlaySublabel(enabled);
    updateStyleListOpacity(enabled);
  });

  // Style button clicks
  document.getElementById('style-list').addEventListener('click', e => {
    const btn = e.target.closest('.style-btn');
    if (!btn) return;
    selectStyle(btn.dataset.style, true);
  });

  // ── Overlay on/off toggle ──
  document.getElementById('overlay-toggle').addEventListener('change', e => {
    const enabled = e.target.checked;
    browser.storage.local.set({ sentinelEnabled: enabled });
    updateOverlaySublabel(enabled);
    updateStyleListOpacity(enabled);

    // If turning off, also disable demo mode
    if (!enabled) {
      document.getElementById('demo-toggle').checked = false;
      browser.storage.local.set({ sentinelDemo: false });
    }

    updateStatusDot(enabled, document.getElementById('demo-toggle').checked);

    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) {
        browser.tabs.sendMessage(tabs[0].id, {
          type: 'SENTINEL_ENABLED_TOGGLE',
          enabled: enabled
        }).catch(() => {});
      }
    });
  });

  // ── Demo mode toggle ──
  document.getElementById('demo-toggle').addEventListener('change', e => {
    const demoEnabled = e.target.checked;

    // Can't enable demo if overlay is off
    if (demoEnabled && !document.getElementById('overlay-toggle').checked) {
      e.target.checked = false;
      return;
    }

    browser.storage.local.set({ sentinelDemo: demoEnabled });
    updateStatusDot(document.getElementById('overlay-toggle').checked, demoEnabled);

    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs[0]) {
        browser.tabs.sendMessage(tabs[0].id, {
          type: 'SENTINEL_DEMO_TOGGLE',
          enabled: demoEnabled
        }).catch(() => {});
      }
    });
  });

  // ── Preview button ──
  document.getElementById('preview-btn').addEventListener('click', () => {
    browser.storage.local.get(['sentinelStyle', 'sentinelEnabled']).then(prefs => {
      const enabled = prefs.sentinelEnabled !== undefined ? prefs.sentinelEnabled : true;
      if (!enabled) return;

      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]) {
          browser.tabs.sendMessage(tabs[0].id, {
            type: 'SENTINEL_PREVIEW',
            style: prefs.sentinelStyle || DEFAULT_STYLE
          }).catch(() => {
            browser.tabs.executeScript(tabs[0].id, { file: 'content/content.js' }).then(() => {
              browser.tabs.insertCSS(tabs[0].id, { file: 'content/sentinel.css' }).then(() => {
                browser.tabs.sendMessage(tabs[0].id, {
                  type: 'SENTINEL_PREVIEW',
                  style: prefs.sentinelStyle || DEFAULT_STYLE
                }).catch(() => {});
              });
            });
          });
        }
      });
    });
    window.close();
  });
});

function selectStyle(style, save) {
  document.querySelectorAll('.style-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.style === style);
  });
  if (save) {
    browser.storage.local.set({ sentinelStyle: style });
  }
}

// Green dot = overlay on + demo active; white dot = overlay on; dim = overlay off
function updateStatusDot(overlayOn, demoOn) {
  const dot = document.getElementById('status-dot');
  dot.classList.remove('active', 'standby');
  if (overlayOn && demoOn)  dot.classList.add('active');
  else if (overlayOn)       dot.classList.add('standby');
}

function updateOverlaySublabel(enabled) {
  const sub = document.getElementById('overlay-sublabel');
  if (!sub) return;
  sub.textContent = enabled ? 'Replaces Duo on auth pages' : 'Duo will show as normal';
  sub.style.color = enabled ? '' : '#c0392b';
}

function updateStyleListOpacity(enabled) {
  const list    = document.getElementById('style-list');
  const preview = document.getElementById('preview-btn');
  const demo    = document.getElementById('demo-toggle').closest('.demo-row');
  list.style.opacity          = enabled ? '1'     : '0.35';
  list.style.pointerEvents    = enabled ? 'auto'  : 'none';
  preview.style.opacity       = enabled ? '1'     : '0.35';
  preview.style.pointerEvents = enabled ? 'auto'  : 'none';
  if (demo) {
    demo.style.opacity       = enabled ? '1'    : '0.35';
    demo.style.pointerEvents = enabled ? 'auto' : 'none';
  }
}
