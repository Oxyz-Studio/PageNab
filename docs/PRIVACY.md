# Privacy Policy

**Last updated: March 2026**

## Overview

PageNab is a Chrome extension that captures web page context (screenshots, console logs, network requests, DOM snapshots, cookies, storage, user interactions, performance metrics) and copies it to your clipboard for use with AI coding assistants. PageNab is designed with privacy as a core principle.

## Data Collection

**PageNab does not collect any data.**

- No personal information is collected
- No usage analytics or telemetry
- No tracking cookies or identifiers
- No data is sent to any server
- No third-party services are used

## Data Storage

All captured data stays **exclusively on your local machine**:

- **Clipboard**: Page context (text + screenshot image) is copied to your clipboard for immediate pasting
- **Downloads folder**: Screenshots are saved as PNG files for persistence
- **Extension local storage**: Capture history (thumbnails + text data) is stored locally within the extension

You have full control over this data:
- Clear your clipboard at any time
- Delete downloaded screenshots from your Downloads folder
- Delete captures from the extension's history via the popup

## Data Sharing

**PageNab never shares any data with anyone.**

- No data leaves your computer
- No server-side processing
- No cloud storage
- No analytics platforms
- No advertising networks

## Data Sanitization

PageNab automatically sanitizes sensitive information from captures:

- **Network requests**: Authorization headers, cookies, API keys, and tokens are stripped from captured network data
- **DOM snapshots**: Password field values are replaced with `***`
- **Cookies**: Values are truncated; cookies with sensitive names (containing "token", "session", "auth", "key", "secret", "password") have their values fully masked with `***`
- **Storage**: Keys containing sensitive terms have their values masked; all values are truncated to 200 characters
- **User interactions**: Input field values are ALWAYS masked with `***`; no individual keystrokes are captured

## Captured Data Types

PageNab can capture the following data types depending on the selected preset (Light, Full, or Custom):

| Data Type | Description | Sanitized |
|-----------|-------------|-----------|
| Screenshot | Visual capture of the page | No PII captured |
| Metadata | URL, title, viewport, user agent | Public page info only |
| Console logs | Browser console messages | No sanitization needed |
| Network requests | Failed/slow HTTP requests | Headers sanitized |
| DOM snapshot | Cleaned HTML of the page | Scripts removed, passwords masked |
| Cookies | Non-httpOnly cookies (via document.cookie) | Values truncated/masked |
| Storage | localStorage and sessionStorage contents | Sensitive keys masked |
| User interactions | Last 50 clicks, scrolls, inputs | All input values masked |
| Performance metrics | Load times, Core Web Vitals, memory | Technical metrics only |

**Important**: Cookies are read via `document.cookie` in the content script (non-httpOnly cookies only). PageNab does NOT use the `cookies` Chrome permission and cannot access httpOnly cookies.

## Permissions

| Permission | Why |
|------------|-----|
| `activeTab` | To capture the content of the page you're currently viewing, only when you click the extension |
| `clipboardWrite` | To copy page context (text + screenshot image) to your clipboard |
| `storage` | To save your preferences and capture history locally |
| `downloads` | To save screenshots to your Downloads folder for persistence |
| `notifications` | To confirm when a capture is complete |
| `scripting` | To inject the content script that collects page data (console, network, DOM, etc.) |

PageNab does **not** request:
- `<all_urls>` in permissions (the content script for interaction tracking uses `<all_urls>` in `content_scripts`, but this does not grant arbitrary access — it only runs the passive interaction tracker)
- `tabs` (no access to your tab list)
- `history` (no access to your browsing history)
- `cookies` (no access to httpOnly cookies via Chrome API)
- `webRequest` (no network interception)
- `nativeMessaging` (no external processes)

## Open Source

PageNab is fully open source under the MIT license:
https://github.com/Oxyz-Studio/PageNab

## Children's Privacy

PageNab does not knowingly collect any information from children under 13.

## Changes to This Policy

Changes will be reflected in the "Last updated" date and published in the GitHub repository.

## Contact

- GitHub Issues: https://github.com/Oxyz-Studio/PageNab/issues
- Email: contact@oxyz.fr
