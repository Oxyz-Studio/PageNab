# PageNab

**Capture any web page for your AI assistant.**

PageNab is an open-source Chrome extension that captures the full context of any web page — screenshot, console logs, network errors, DOM, cookies, storage, performance — and copies it to your clipboard as structured text + image, ready to paste into any AI coding assistant.

One click. Full context. Paste and go.

## Why PageNab?

AI coding assistants are powerful, but they can't see your browser. When you need help with a web page, you end up:
- Taking a screenshot manually
- Copy-pasting console errors one by one
- Describing the DOM structure in words
- Losing context between the browser and your IDE

**PageNab captures everything in one click** and puts it in your clipboard — both the screenshot image and structured text data — so any AI assistant can understand the page immediately.

## Features

- **Full page screenshot** — Automatic capture, pastes as an image (like a native screenshot)
- **Area selection** — Draw a rectangle to capture a specific region
- **Element selection** — Click any element to capture it with its metadata
- **Console logs** — Errors, warnings, and all log levels with stack traces
- **Network requests** — Failed (4xx/5xx) and slow requests with HTTP methods and details
- **DOM snapshot** — Clean HTML with inline scripts removed
- **Cookies & storage** — localStorage, sessionStorage, cookies (sanitized)
- **User interactions** — Recent clicks, scrolls, and input events
- **Performance metrics** — Core Web Vitals, load times, memory usage
- **Page metadata** — URL, title, viewport, user agent, timestamp
- **Three presets** — Light (minimal), Full (everything), Custom (your choice)
- **Capture history** — Browse, re-copy, view details, or delete past captures
- **Keyboard shortcut** — `Ctrl+Shift+E` / `Cmd+Shift+E` (customizable)
- **Sensitive data sanitized** — Passwords, tokens, auth headers automatically stripped
- **Zero configuration** — Install and start capturing

## How It Works

```
1. Browse any web page
2. Click the PageNab icon (or Ctrl+Shift+E)
3. Choose a preset: Light, Full, or Custom
4. PageNab captures the page → saves screenshot to Downloads → copies to clipboard
5. Paste into Claude Code, Cursor, or any AI assistant
6. The AI gets the screenshot image + structured text data in one paste
```

## What Gets Copied to Clipboard

PageNab copies **two formats simultaneously**:

- **`image/png`** — The screenshot (full page or area)
- **`text/plain`** — Structured text data:

```markdown
# Web page capture

**URL:** https://app.example.com/dashboard
**Title:** Dashboard — MyApp
**Time:** 2026-03-01 14:23:45
**Viewport:** 1920x1080
**Language:** en-US
**Browser:** Chrome 134 (macOS)
**Capture mode:** fullpage | Preset: light
**Includes:** screenshot, console (errors only), network (failed only)
**Excludes:** dom, cookies, storage, performance, interactions

## Console

2 errors, 1 warning
- **ERROR** (14:23:42) TypeError: Cannot read property 'map' of undefined — `Dashboard.tsx:47`
- **ERROR** (14:23:43) GET /api/users 500 (Internal Server Error)

## Network

42 requests, 2 failed
- **FAIL** GET `/api/users` → 500 Internal Server Error (fetch, 220ms)
- **FAIL** GET `/api/stats` → 403 Forbidden (fetch, 45ms)

## Screenshots

`~/Downloads/PageNab_app.example.com_2026-03-01.png`

---
Captured by PageNab v1.0.0
```

When you paste, the AI gets both the image and the text — full context in one action.

## Capture Presets

| Preset | What's captured | Typical size |
|--------|----------------|--------------|
| **Light** (default) | Screenshot + metadata + console errors/warnings + failed network | ~200-500 tokens + image |
| **Full** | Everything: screenshot, console (all), network, DOM, cookies, storage, interactions, performance | ~1.5K-150K tokens + image |
| **Custom** | You choose via checkboxes (console & network on by default) | Varies |

Screenshot and metadata are **always** captured regardless of preset.

### Light Preset Example

The default preset. Captures what matters most for quick debugging — errors and failed requests.

<details>
<summary>📋 Clipboard text output (click to expand)</summary>

```markdown
# Web page capture

**URL:** https://app.example.com/dashboard
**Title:** Dashboard — MyApp
**Time:** 2026-03-01 14:23:45
**Viewport:** 1920x1080
**Language:** en-US
**Browser:** Chrome 134 (macOS)
**Color scheme:** light
**Capture mode:** fullpage | Preset: light
**Includes:** screenshot, console (errors only), network (failed only)
**Excludes:** dom, cookies, storage, performance, interactions

## Console

12 entries, 2 errors, 1 warning

- **ERROR** (14:23:42) TypeError: Cannot read property 'map' of undefined — `Dashboard.tsx:47`
  at Dashboard.render (Dashboard.tsx:47:12)
  at renderWithHooks (react-dom.js:1234:18)
- **ERROR** (14:23:43) GET /api/users 500 (Internal Server Error) — `users.ts:12`

## Network

42 requests, 2 failed

- **FAIL** GET `/api/users` → 500 Internal Server Error (fetch, 220ms)
- **FAIL** GET `/api/stats` → 403 Forbidden (fetch, 45ms)

## Screenshots

`~/Downloads/PageNab_app.example.com_2026-03-01.png`

---
Captured by PageNab v1.0.0
```

</details>

> ~200-500 tokens of text + the screenshot image attached. Covers most debugging scenarios.

### Full Preset Example

Everything captured. For complex bugs where you need maximum context.

<details>
<summary>📋 Clipboard text output (click to expand)</summary>

```markdown
# Web page capture

**URL:** https://app.example.com/dashboard
**Title:** Dashboard — MyApp
**Time:** 2026-03-01 14:23:45
**Viewport:** 1920x1080
**Language:** en-US
**Browser:** Chrome 134 (macOS)
**Color scheme:** light
**Capture mode:** fullpage | Preset: full
**Includes:** screenshot, console, network, dom, cookies, storage, performance, interactions

## Console

2 errors, 1 warning, 5 logs, 2 info, 1 debug

- **ERROR** (14:23:42) TypeError: Cannot read property 'map' of undefined — `Dashboard.tsx:47`
  at Dashboard.render (Dashboard.tsx:47:12)
  at renderWithHooks (react-dom.js:1234:18)
- **ERROR** (14:23:43) GET /api/users 500 (Internal Server Error) — `users.ts:12`
- **WARN** (14:23:40) Deprecated API usage: chrome.runtime.sendMessage without callback
- **LOG** (14:23:39) [Router] Navigating to /dashboard
- **LOG** (14:23:39) [Auth] Token refreshed successfully
- **LOG** (14:23:40) [API] Fetching user data...
- **LOG** (14:23:41) [Store] State updated: { loading: true }
- **LOG** (14:23:43) [Store] State updated: { loading: false, error: "500" }
- **INFO** (14:23:38) App initialized in 342ms
- **INFO** (14:23:39) Service worker registered
- **DEBUG** (14:23:38) [Cache] Hit ratio: 0.82

## Network

42 requests, 2 failed, 1 slow

- GET `/` → 200 (180ms, 14.2 KB, document)
- GET `/static/js/main.abc123.js` → 200 (95ms, 245.0 KB, script)
- GET `/static/css/app.def456.css` → 200 (42ms, 18.3 KB, stylesheet)
- **FAIL** GET `/api/users` → 500 Internal Server Error (220ms, 128 B, fetch)
  Response: {"error":"Internal Server Error"}
- **FAIL** GET `/api/stats` → 403 Forbidden (45ms, 64 B, fetch)
- **SLOW** GET `/api/analytics` → 200 (4200ms, 1.2 MB, fetch)
- POST `/api/events` → 201 (150ms, 64 B, fetch)
  Request: {"action":"page_view","page":"/dashboard"}
  Response: {"id":42,"status":"created"}
- GET `/api/config` → 200 (85ms, 2.1 KB, fetch)
- ... and 34 more

## Cookies

session_id=a1b2*** | theme=dark | locale=en-US | _ga=GA1.2***

## Storage

3 localStorage, 1 sessionStorage

- [local] theme: `dark`
- [local] user_prefs: `{"sidebar":"collapsed","notifications":true}`
- [local] last_visited: `2026-03-01T14:20:00.000Z`
- [session] cart_items: `[]`

## Performance

- FP: 320ms | FCP: 450ms | LCP: 1850ms
- Load: 1240ms | DOMContentLoaded: 680ms
- CLS: 0.04 | FID: 12ms
- Memory: 45.2 MB / 4.0 GB

## Interactions

3 events (most recent first)

- [click] button.btn-refresh "Refresh" (14:23:41)
- [scroll] down 340px (14:23:38)
- [click] a.nav-link "Dashboard" (14:23:35)

## Screenshots

`~/Downloads/PageNab_app.example.com_2026-03-01.png`

## DOM (47.2 KB)

```html
<main class="dashboard">
  <h1>Dashboard</h1>
  <div class="error-panel">…</div>
</main>
```

---
Captured by PageNab v1.0.0
```

</details>

> ~1.5K-150K tokens of text + screenshot. Use when you need the AI to see everything.

### Custom Preset Example

You pick exactly what to capture. Here's an example with Console + Performance enabled:

<details>
<summary>📋 Clipboard text output (click to expand)</summary>

```markdown
# Web page capture

**URL:** https://app.example.com/dashboard
**Title:** Dashboard — MyApp
**Time:** 2026-03-01 14:23:45
**Viewport:** 1920x1080
**Language:** en-US
**Browser:** Chrome 134 (macOS)
**Color scheme:** light
**Capture mode:** fullpage | Preset: custom
**Includes:** screenshot, console, performance

## Console

2 errors, 1 warning

- **ERROR** (14:23:42) TypeError: Cannot read property 'map' of undefined — `Dashboard.tsx:47`
  at Dashboard.render (Dashboard.tsx:47:12)
  at renderWithHooks (react-dom.js:1234:18)
- **ERROR** (14:23:43) GET /api/users 500 (Internal Server Error) — `users.ts:12`
- **WARN** (14:23:40) Deprecated API usage: chrome.runtime.sendMessage without callback

## Performance

- FP: 320ms | FCP: 450ms | LCP: 1850ms
- Load: 1240ms | DOMContentLoaded: 680ms
- CLS: 0.04 | FID: 12ms
- Memory: 45.2 MB / 4.0 GB

## Screenshots

`~/Downloads/PageNab_app.example.com_2026-03-01.png`

---
Captured by PageNab v1.0.0
```

</details>

> Only the data you selected — no noise. Screenshot + metadata are always included.

## Installation

### From Chrome Web Store
> Coming soon

### From Source
```bash
git clone https://github.com/Oxyz-Studio/PageNab.git
cd PageNab
npm install
npm run dev          # Development with hot reload
npm run build        # Production build
npm run zip          # Package for Chrome Web Store
```

Then load the unpacked extension from `build/chrome-mv3-dev` in `chrome://extensions` (enable Developer mode).

## Privacy

- **All data stays local.** Nothing is sent to any server.
- **No analytics, no tracking, no telemetry.**
- Screenshots are saved to your Downloads folder — you own them.
- Capture history is stored in local extension storage (chrome.storage.local).
- Sensitive data (Authorization headers, cookie values, password inputs, tokens) is automatically sanitized before capture.

> **Why does Chrome show "This extension may read and change site information"?**
> PageNab uses two lightweight content scripts that run on all pages to capture console logs and user interactions *before* you click capture. Without them, any errors or events that happened before the capture would be lost. These scripts are passive — they only buffer data locally and never modify page content or send anything over the network. The "run in the background" part refers to the service worker that orchestrates captures.

See the full [Privacy Policy](docs/PRIVACY.md).

## Tech Stack

- [Plasmo](https://www.plasmo.com/) — Chrome extension framework (Manifest V3)
- React 18 + TypeScript (strict)
- Tailwind CSS 3.4
- Vitest (unit tests)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## Roadmap

### V1 (current)
- [x] Full page screenshot capture
- [x] Area selection capture
- [x] Element selection capture
- [x] Console logs (errors, warnings, all levels)
- [x] Network requests (failed, slow)
- [x] DOM snapshot
- [x] Cookies & storage (sanitized)
- [x] User interactions tracking
- [x] Performance metrics (Core Web Vitals)
- [x] Three presets (Light, Full, Custom)
- [x] Multi-format clipboard (text + image)
- [x] Screenshot saved to Downloads
- [x] Capture history with re-copy/details/delete
- [x] Keyboard shortcut (Ctrl+Shift+E / Cmd+Shift+E)

### V2 (planned)
- [ ] MCP server for Claude Code / Cursor
- [ ] Firefox support
- [ ] Safari support

## License

MIT — see [LICENSE](LICENSE)

---

Built by [Oxyz Studio](https://oxyz.fr)
