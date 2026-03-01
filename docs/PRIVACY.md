# Privacy Policy

**Last updated: March 2026**

## Overview

PageNab is a Chrome extension that captures web page context (screenshots, console logs, network requests, DOM snapshots) and saves them locally on your computer. PageNab is designed with privacy as a core principle.

## Data Collection

**PageNab does not collect any data.**

- No personal information is collected
- No usage analytics or telemetry
- No tracking cookies or identifiers
- No data is sent to any server
- No third-party services are used

## Data Storage

All captured data is stored **exclusively on your local machine** in the `~/.pagenab/` directory:

- Screenshots (PNG files)
- Console logs (JSON files)
- Network request logs (JSON files)
- DOM snapshots (HTML files)
- Playwright locators (JSON files)
- Page metadata (JSON files)

You have full control over this data. You can view, modify, or delete it at any time.

## Data Sharing

**PageNab never shares any data with anyone.**

- No data leaves your computer
- No server-side processing
- No cloud storage
- No analytics platforms
- No advertising networks

## Data Sanitization

PageNab automatically sanitizes sensitive information from captures:

- **Network requests**: Authorization headers, cookies, API keys, and tokens are stripped before saving
- **DOM snapshots**: Password field values are replaced with `***`
- **No cookies captured**: Unlike some browser tools, PageNab does not capture or store browser cookies

## Permissions

PageNab requests the following Chrome permissions, each with a specific purpose:

| Permission | Why |
|------------|-----|
| `activeTab` | To capture the content of the page you're currently viewing, only when you click the extension |
| `clipboardWrite` | To copy the formatted prompt to your clipboard |
| `storage` | To save your extension preferences (capture settings) |
| `nativeMessaging` | To write capture files to your local disk |
| `notifications` | To confirm when a capture is complete |

PageNab does **not** request:
- `<all_urls>` (no access to all websites)
- `tabs` (no access to your tab list)
- `history` (no access to your browsing history)
- `cookies` (no access to your cookies)
- `webRequest` (no network interception)

## Open Source

PageNab is fully open source under the MIT license. You can review the complete source code at:
https://github.com/Oxyz-Studio/PageNab

## Children's Privacy

PageNab does not knowingly collect any information from children under 13.

## Changes to This Policy

If we make changes to this privacy policy, we will update the "Last updated" date at the top of this page and publish the updated policy in the GitHub repository.

## Contact

For questions about this privacy policy:
- GitHub Issues: https://github.com/Oxyz-Studio/PageNab/issues
- Email: contact@oxyz.fr
