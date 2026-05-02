# SENTINEL ID

> The better MFA solution — a Firefox browser extension that replaces Duo Security's authentication interface with a customizable, student-chosen login experience.

**Live site:** [getsentinelid.today](https://getsentinelid.today)  
**Firefox Add-on:** [Add-ons Marketplace listing]([LINK])  
**Course:** MGIS 360 — Web Business Development  

---

## What Is This

Sentinel ID is a two-part product:

1. **Firefox Extension** — Detects Duo Security authentication pages and overlays a Sentinel ID interface, letting students authenticate via one-tap approval, PIN, passphrase, touch pattern, or biometric confirmation. No phone required.

2. **Marketing Website** — A static single-page application at getsentinelid.today with product information, two pricing tiers (AaaS and SaaS), Stripe-powered checkout, and an investor interest form.

---

## Repository Structure

```
Sentinel-ID/
├── sentinel-ext/               # Firefox browser extension
│   ├── manifest.json           # Extension manifest (MV2)
│   ├── content/
│   │   ├── content.js          # Content script — injected on Duo pages
│   │   └── sentinel.css        # Overlay styles
│   ├── popup/
│   │   ├── popup.html          # Toolbar popup UI
│   │   ├── popup.js            # Popup logic — style selection, toggles
│   │   └── popup.css           # Popup styles
│   └── icons/
│       ├── icon48.png
│       └── icon96.png
├── website/                    # Marketing site
│   ├── index.html              # Single-page application
│   ├── style.css               # All site styles
│   ├── site.js                 # Page navigation logic
│   └── invest.js               # Stripe + MailerLite integrations
├── docs/                       # Course milestone documentation
└── README.md
```

---

## Extension — How It Works

The extension injects a content script on any page matching `*.duosecurity.com` or `*.rit.edu`. When a Duo authentication frame is detected, it overlays the Sentinel ID UI on top of the existing page.

**Authentication modes:**

| Mode | Description |
|------|-------------|
| `minimal` | Single tap-to-approve button |
| `pin` | 6-digit PIN entry with numpad |
| `passphrase` | Free-text secret phrase input |
| `pattern` | 3x3 grid node-tap sequence |
| `biometric` | Simulated biometric scan with animation |

The user's preferred mode is saved via `browser.storage.local` and persists across sessions. The toolbar popup allows style switching, preview on any page, and a demo mode toggle.

---

## Extension — Local Development

### Prerequisites
- Firefox (any recent version)
- No build step required — vanilla JS

### Loading in Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click **This Firefox** in the left sidebar
3. Click **Load Temporary Add-on**
4. Navigate to `sentinel-ext/` and select `manifest.json`

The extension will load and remain active until Firefox is closed. Reload it after any code changes.

### Testing on Duo Pages

The extension auto-injects on `*.duosecurity.com` and `*.rit.edu` pages. To test without a real Duo page, enable **Demo Mode** in the toolbar popup — this triggers the overlay on any active tab.

---

## Website — How It Works

The site is a static SPA (single HTML file) with vanilla JS page navigation. There is no backend — all dynamic functionality is handled client-side:

- **Stripe.js** — Checkout sessions for AaaS ($499/mo) and SaaS ($4,999 one-time) plans
- **MailerLite** — Interest registration form for investor/partner outreach
- **Google Tag Manager** — Analytics

### Running Locally

No build step or server required for basic viewing:

```bash
# Option 1 — open directly
open website/index.html

# Option 2 — local server (avoids some browser security restrictions)
cd website
python3 -m http.server 8000
# then visit http://localhost:8000
```

> **Note:** Stripe checkout requires a live or test-mode publishable key. The current key in `invest.js` is a test key — no real charges will occur.

---

## Website — Deployment

The site is hosted on GitHub Pages with Cloudflare for DNS and SSL.

**Deploy process:**
```bash
git add .
git commit -m "your message"
git push origin main
```

GitHub Pages serves directly from the `main` branch. Cloudflare handles SSL termination and CDN caching. Changes are live within ~60 seconds of push.

---

## Extension — Publishing to Firefox AMO

The extension is published at: [LINK TO AMO LISTING]

To submit an update:

1. Increment the `version` field in `manifest.json`
2. Zip the contents of `sentinel-ext/`:
   ```bash
   cd sentinel-ext
   zip -r ../sentinel-id-v[VERSION].zip .
   ```
3. Upload the zip at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
4. Mozilla's review process typically takes 1–7 days

---

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Extension | Vanilla JS, CSS, Firefox WebExtensions API | No build step, MV2 manifest |
| Website | Vanilla HTML/CSS/JS | Static SPA, no framework |
| Hosting | GitHub Pages + Cloudflare | Free tier, SSL via Cloudflare |
| Payments | Stripe | Test mode active |
| Email capture | MailerLite | Embedded form API |
| Analytics | Google Tag Manager | GTM-TQZ5HTH3 |
| Extension distribution | Firefox AMO | Published |

---

## Pricing

| Plan | Type | Price |
|------|------|-------|
| AaaS — Authentication as a Service | Monthly subscription | $499/mo |
| SaaS — Software License | One-time | $4,999 |

Stripe is in test mode. Use card number `4242 4242 4242 4242` with any future expiry and CVC to test checkout.

---

## Course Context

This repository was built as part of MGIS 360 (Web Business Development). It represents the full development journey of Sentinel ID from initial concept through a live, payment-ready web business.

Milestone documentation is in `/docs`.

---

## Author

**Leah Kvares**  
Cybersecurity student, RIT  
[getsentinelid.today](https://getsentinelid.today)
