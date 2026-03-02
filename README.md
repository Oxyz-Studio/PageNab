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
- **Console logs** — Errors, warnings, and all log levels with stack traces
- **Network requests** — Failed (4xx/5xx) and slow requests with details
- **DOM snapshot** — Clean HTML with inline scripts removed
- **Cookies & storage** — localStorage, sessionStorage, cookies (sanitized)
- **User interactions** — Recent clicks, scrolls, and input events
- **Performance metrics** — Core Web Vitals, load times, memory usage
- **Page metadata** — URL, title, viewport, user agent, timestamp
- **Three presets** — Light (minimal), Full (everything), Custom (your choice)
- **Capture history** — Browse, re-copy, view details, or delete past captures
- **Keyboard shortcut** — `Ctrl+Shift+N` / `Cmd+Shift+N` (customizable)
- **Sensitive data sanitized** — Passwords, tokens, auth headers automatically stripped
- **Zero configuration** — Install and start capturing

## How It Works

```
1. Browse any web page
2. Click the PageNab icon (or Ctrl+Shift+N)
3. Choose a preset: Light, Full, or Custom
4. PageNab captures the page → saves screenshot to Downloads → copies to clipboard
5. Paste into Claude Code, Cursor, or any AI assistant
6. The AI gets the screenshot image + structured text data in one paste
```

## What Gets Copied to Clipboard

PageNab copies **two formats simultaneously**:

- **`image/png`** — The screenshot (full page or area)
- **`text/plain`** — Structured text data:

```
=== PageNab Capture ===
URL: https://app.example.com/dashboard
Title: Dashboard — MyApp
Captured: 2026-03-01T14:23:45.000Z
Viewport: 1920x1080 | UA: Chrome/134

--- Console (3 errors, 1 warning) ---
[ERROR] TypeError: Cannot read property 'map' of undefined — Dashboard.tsx:47
[ERROR] GET /api/users 500 (Internal Server Error)
[WARNING] Deprecated API usage detected

--- Network (2 failed) ---
[FAIL] GET /api/users → 500
[FAIL] GET /api/stats → 403

--- Screenshots ---
Full page: PageNab_app.example.com_2026-03-01.png (saved to Downloads)
```

When you paste, the AI gets both the image and the text — full context in one action.

## Capture Presets

| Preset | What's captured | Typical size |
|--------|----------------|--------------|
| **Light** (default) | Screenshot + metadata + console errors/warnings + failed network | ~200-500 tokens + image |
| **Full** | Everything: screenshot, console (all), network, DOM, cookies, storage, interactions, performance | ~1.5K-150K tokens + image |
| **Custom** | You choose via checkboxes (console & network on by default) | Varies |

Screenshot and metadata are **always** captured regardless of preset.

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
- [x] Keyboard shortcut (Ctrl+Shift+N / Cmd+Shift+N)

### V2 (planned)
- [ ] Element selector with visual highlight
- [ ] MCP server for Claude Code / Cursor
- [ ] Firefox support
- [ ] Safari support

## License

MIT — see [LICENSE](LICENSE)

---

Built by [Oxyz Studio](https://oxyz.fr)
