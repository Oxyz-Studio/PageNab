# PageNab

**Nab any web page for your AI prompt.**

PageNab is an open-source Chrome extension that captures the full context of any web page — screenshot, DOM, console logs, network errors, Playwright locators — and formats it as a ready-to-paste prompt for any AI coding assistant (Claude Code, Cursor, Windsurf, Copilot, or any LLM).

One click. Full context. Paste and go.

## Why PageNab?

AI coding assistants are powerful, but they can't see your browser. When you need help with a web page, you end up:
- Taking a screenshot manually
- Copy-pasting console errors one by one
- Describing the DOM structure in words
- Losing context between the browser and your IDE

**PageNab captures everything in one click** and gives you a structured prompt that any AI assistant can understand immediately.

## Features

- **Full page screenshot** — Automatic capture on every nab
- **Element selection** — Click any element to capture it specifically (highlighted with rainbow animation)
- **Console logs** — Errors, warnings, and logs with stack traces
- **Network requests** — Failed requests (4xx/5xx) with payloads
- **DOM snapshot** — Clean HTML of the page or selected element
- **Playwright locators** — Auto-generated `getByRole`, `getByTestId`, `getByText` selectors
- **Page metadata** — URL, title, viewport, user agent, timestamp
- **Smart clipboard** — Copies a structured prompt with file paths + inline summary
- **Local storage** — Captures saved to `~/.pagenab/` with automatic rotation
- **Tool agnostic** — Works with any AI tool that accepts text prompts

## How It Works

```
1. Browse any web page
2. Click the PageNab icon (or Ctrl+Shift+N)
3. Optionally select a specific element
4. PageNab captures everything → saves locally → copies prompt to clipboard
5. Paste into Claude Code, Cursor, or any AI assistant
6. The AI reads the local files and has full context
```

## What Gets Copied to Clipboard

```
Web capture — https://app.example.com/dashboard
Captured: 2026-03-01 14:23:45 | Viewport: 1920x1080

Console: 3 errors (TypeError: Cannot read property 'map' of undefined — Dashboard.tsx:47)
Network: 2 failed (GET /api/users 500, GET /api/stats 403)
Selected element: div.dashboard-cards

Full capture: ~/.pagenab/latest/
├── screenshot.png        → Full page screenshot
├── element.png           → Selected element screenshot
├── console.json          → Console logs with stack traces
├── network.json          → Failed network requests with payloads
├── dom.html              → DOM snapshot
├── locators.json         → Playwright locators for interactions
└── metadata.json         → Page info, viewport, user agent
```

The AI reads the files it needs — screenshot first (visual context), then console/network (errors), then DOM only if deeper investigation is required. This is more token-efficient than pasting everything inline.

## Installation

### From Chrome Web Store (recommended)
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

Then load the unpacked extension from `dist/` in `chrome://extensions`.

## Configuration

PageNab works out of the box with zero configuration. Optional settings:

| Setting | Default | Description |
|---------|---------|-------------|
| Capture directory | `~/.pagenab/` | Where captures are saved |
| Max captures | 20 | Number of captures to keep |
| Max age (days) | 7 | Auto-delete captures older than this |
| Max storage (MB) | 500 | Total storage limit |
| Auto-screenshot | `true` | Capture full page screenshot automatically |
| Clipboard format | `hybrid` | `hybrid` (summary + paths), `paths-only`, or `full-inline` |

## Optional: MCP Server (Power Users)

For deeper integration with Claude Code or Cursor, PageNab includes an optional MCP server that exposes captures as tools:

```bash
# Add to your .mcp.json
{
  "pagenab": {
    "command": "npx",
    "args": ["pagenab-mcp"]
  }
}
```

This lets Claude Code call `mcp__pagenab__get_capture` directly instead of reading files manually.

## Storage Management

Captures are stored locally and managed automatically:

```
~/.pagenab/
├── captures/
│   ├── 2026-03-01_14-23-45_app.example.com/    (~500KB-2MB each)
│   ├── 2026-03-01_14-30-12_dashboard.example.com/
│   └── ...
├── latest -> captures/2026-03-01_14-30-12_...   (symlink to last capture)
└── config.json                                   (user settings)
```

**Rotation policy:**
- Keeps last 20 captures (configurable)
- Auto-deletes after 7 days (configurable)
- Hard limit at 500MB total (configurable)
- Average capture: ~1MB → 20 captures = ~20MB

## Privacy

- All data stays local. Nothing is sent to any server.
- No analytics, no tracking, no telemetry.
- Captures are plain files on your disk — you own them.
- Sensitive headers (Authorization, Cookie) are stripped from network captures by default.

## Tech Stack

- [Plasmo](https://www.plasmo.com/) — Chrome extension framework (Manifest V3)
- React 19 + TypeScript
- Tailwind CSS 4
- [rrweb](https://github.com/rrweb-io/rrweb) — DOM snapshot (optional session replay)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Roadmap

- [x] Core capture (screenshot, console, network, DOM, metadata)
- [ ] Element selection with visual highlight
- [ ] Playwright locator generation
- [ ] MCP server for Claude Code / Cursor
- [ ] Firefox support
- [ ] Safari support
- [ ] VS Code extension panel
- [ ] Session replay (rrweb recording)

## Related Projects

- [OSAIT](https://osait.fr) — AI-powered ticketing SaaS that fixes bugs automatically (by the same team)
- [BrowserTools MCP](https://github.com/AgentDeskAI/browser-tools-mcp) — Live browser monitoring for AI IDEs
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) — Chrome DevTools exposed via MCP

## License

MIT — see [LICENSE](LICENSE)

---

Built by [Oxyz Studio](https://oxyz.fr)
