# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-02

### Added
- Full page screenshot capture via `chrome.tabs.captureVisibleTab`
- Area selection mode with rectangle overlay (click + drag)
- Console log capture (errors, warnings, all levels with stack traces)
- Network request capture (failed 4xx/5xx, slow requests)
- DOM snapshot (clean HTML, inline scripts removed)
- Cookies capture via `document.cookie` (sanitized)
- localStorage and sessionStorage capture (sanitized)
- User interactions tracking (clicks, scrolls, inputs) via persistent content script
- Performance metrics (Core Web Vitals, load times, memory)
- Page metadata (URL, title, viewport, user agent, timestamp)
- Three capture presets: Light (default), Full, Custom
- Multi-format clipboard: `text/plain` + `image/png` copied simultaneously
- Screenshot saved to Downloads via `chrome.downloads` for persistence
- Capture history stored in `chrome.storage.local` (max 20 captures)
- History view with re-copy, detail view, and delete
- Keyboard shortcut `Ctrl+Shift+N` / `Cmd+Shift+N` (customizable)
- Sensitive data sanitization (auth headers, cookie values, password inputs, tokens)
- Popup UI with preset selection, capture controls, history, and settings
- Privacy-first: all data stays local, no analytics, no tracking, no telemetry
