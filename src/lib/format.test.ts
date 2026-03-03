import { describe, expect, it } from "vitest"

import { extractSourcePath, generateTextContent, parseBrowserInfo, type FormatInput } from "./format"

function makeBaseInput(overrides: Partial<FormatInput> = {}): FormatInput {
  return {
    metadata: {
      version: "1.0.0",
      timestamp: "2026-03-01T14:23:45.123Z",
      url: "https://app.example.com/dashboard?tab=overview",
      title: "Dashboard - My App",
      domain: "app.example.com",
      path: "/dashboard",
      viewport: { width: 1920, height: 1080 },
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      language: "fr-FR",
      colorScheme: "light",
      captureMode: "fullpage",
      areaRect: null,
      elementRect: null,
      preset: "light",
      capturedData: [],
      captureVersion: "1.0.0",
      captureDuration: 500,
    },
    screenshotPath: "pagenab-app.example.com-2026-03-01_14-23-45.png",
    ...overrides,
  }
}

describe("parseBrowserInfo", () => {
  it("parses Chrome on macOS", () => {
    expect(parseBrowserInfo(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    )).toBe("Chrome 122 (macOS)")
  })

  it("parses Firefox on Windows", () => {
    expect(parseBrowserInfo(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123",
    )).toBe("Firefox 123 (Windows)")
  })

  it("parses Edge on Windows", () => {
    expect(parseBrowserInfo(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36 Edg/122",
    )).toBe("Edge 122 (Windows)")
  })

  it("returns Unknown for unrecognized user agent", () => {
    expect(parseBrowserInfo("Mozilla/5.0")).toBe("Unknown (Unknown)")
  })
})

describe("extractSourcePath", () => {
  it("extracts full pathname from URL", () => {
    expect(extractSourcePath("https://app.example.com/static/js/main.abc123.js")).toBe("/static/js/main.abc123.js")
  })

  it("preserves hash fragment", () => {
    expect(extractSourcePath("https://example.com/script.js#line42")).toBe("/script.js#line42")
  })

  it("returns source as-is for non-URL", () => {
    expect(extractSourcePath("inline-script")).toBe("inline-script")
  })

  it("returns empty string for undefined", () => {
    expect(extractSourcePath()).toBe("")
  })
})

describe("generateTextContent", () => {
  it("generates markdown header with URL, metadata, and provenance", () => {
    const text = generateTextContent(makeBaseInput())
    expect(text).toContain("# Web page capture")
    expect(text).toContain("**URL:** https://app.example.com/dashboard?tab=overview")
    expect(text).toContain("**Title:** Dashboard - My App")
    expect(text).toContain("**Time:** 2026-03-01")
    expect(text).toContain("**Viewport:** 1920x1080")
    expect(text).toContain("**Language:** fr-FR")
    expect(text).toContain("**Browser:** Chrome 122 (macOS)")
    expect(text).toContain("**Color scheme:** light")
    expect(text).toContain("**Capture mode:** fullpage | Preset: light")
    expect(text).toContain("**Includes:** screenshot")
    expect(text).toContain("**Excludes:**")
  })

  it("omits title when empty", () => {
    const input = makeBaseInput({
      metadata: { ...makeBaseInput().metadata, title: "" },
    })
    const text = generateTextContent(input)
    expect(text).not.toContain("**Title:**")
  })

  it("includes screenshot path in markdown", () => {
    const text = generateTextContent(makeBaseInput())
    expect(text).toContain("## Screenshots")
    expect(text).toContain(
      "`~/Downloads/pagenab-app.example.com-2026-03-01_14-23-45.png`",
    )
  })

  it("includes footer with version", () => {
    const text = generateTextContent(makeBaseInput())
    expect(text).toContain("---")
    expect(text).toContain("Captured by PageNab v1.0.0")
  })

  it("shows includes/excludes for light preset", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "light",
        capturedData: ["console", "network"],
      },
      console: {
        summary: { total: 0, errors: 0, warnings: 0, logs: 0, info: 0 },
        logs: [],
      },
      network: {
        summary: { total: 0, failed: 0, slow: 0 },
        failed: [],
        slow: [],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("**Includes:** screenshot, console (errors only), network (failed only)")
    expect(text).toContain("**Excludes:** dom, cookies, storage, performance, interactions")
  })

  it("omits Excludes line when all types are captured", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["console", "network", "dom", "cookies", "storage", "performance", "interactions"],
      },
      console: { summary: { total: 0, errors: 0, warnings: 0, logs: 0, info: 0 }, logs: [] },
      network: { summary: { total: 0, failed: 0, slow: 0 }, failed: [], slow: [] },
      dom: "<html></html>",
      cookies: { summary: { total: 0 }, cookies: [] },
      storage: {
        localStorage: { summary: { keys: 0, totalSize: "0 B" }, entries: [] },
        sessionStorage: { summary: { keys: 0, totalSize: "0 B" }, entries: [] },
      },
      performance: {
        loadTime: 0, domContentLoaded: 0, firstPaint: 0, firstContentfulPaint: 0,
        largestContentfulPaint: 0, cumulativeLayoutShift: 0, firstInputDelay: 0,
      },
      interactions: { summary: { total: 0, clicks: 0, scrolls: 0, inputs: 0 }, events: [] },
    })
    const text = generateTextContent(input)
    expect(text).not.toContain("**Excludes:**")
  })

  it("shows clean console message when no issues (light mode)", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "light",
        capturedData: ["console"],
      },
      console: {
        summary: { total: 0, errors: 0, warnings: 0, logs: 0, info: 0 },
        logs: [],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("## Console")
    expect(text).toContain("No console errors.")
  })

  it("shows 'No console errors.' in light mode when entries exist but no errors/warnings", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "light",
        capturedData: ["console"],
      },
      console: {
        summary: { total: 10, errors: 0, warnings: 0, logs: 8, info: 2 },
        logs: [],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("## Console")
    expect(text).toContain("No console errors.")
    expect(text).not.toContain("10 entries")
  })

  it("shows 'No console output.' in full mode when no entries", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["console"],
      },
      console: {
        summary: { total: 0, errors: 0, warnings: 0, logs: 0, info: 0 },
        logs: [],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("## Console")
    expect(text).toContain("No console output.")
  })

  it("includes console errors in light mode with full source path", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "light",
        capturedData: ["console"],
      },
      console: {
        summary: { total: 30, errors: 1, warnings: 5, logs: 20, info: 4 },
        logs: [
          {
            level: "error",
            message: "TypeError: Cannot read property 'map' of undefined",
            source: "https://app.example.com/static/js/main.js",
            line: 47,
            timestamp: "2026-03-01T14:23:40.100Z",
          },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("## Console")
    expect(text).toContain("30 entries, 1 error, 5 warnings")
    expect(text).toMatch(
      /\*\*ERROR\*\* \(\d{2}:\d{2}:\d{2}\) TypeError: Cannot read property 'map' of undefined/,
    )
    // extractSourcePath returns full path, not just filename
    expect(text).toContain("`/static/js/main.js:47`")
    // Light mode: no WARN entries displayed
    expect(text).not.toContain("**WARN**")
  })

  it("light mode: warnings counted in summary but not displayed as entries", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "light",
        capturedData: ["console"],
      },
      console: {
        summary: { total: 5, errors: 0, warnings: 2, logs: 3, info: 0 },
        logs: [],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("5 entries, 0 errors, 2 warnings")
    // No WARN entries displayed in light mode
    expect(text).not.toContain("**WARN**")
  })

  it("full mode: warnings displayed as entries", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["console"],
      },
      console: {
        summary: { total: 2, errors: 0, warnings: 2, logs: 0, info: 0 },
        logs: [
          {
            level: "warning",
            message: "Deprecation warning: use newMethod instead",
            timestamp: "2026-03-01T14:23:40.100Z",
          },
          {
            level: "warning",
            message: "Performance warning: slow render",
            timestamp: "2026-03-01T14:23:41.100Z",
          },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("2 warnings")
    expect(text).toMatch(/\*\*WARN\*\* \(\d{2}:\d{2}:\d{2}\) Deprecation warning: use newMethod instead/)
    expect(text).toMatch(/\*\*WARN\*\* \(\d{2}:\d{2}:\d{2}\) Performance warning: slow render/)
  })

  it("includes console logs and info in full mode", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["console"],
      },
      console: {
        summary: { total: 5, errors: 1, warnings: 1, logs: 2, info: 1 },
        logs: [
          {
            level: "error",
            message: "Something broke",
            timestamp: "2026-03-01T14:23:40.100Z",
          },
          {
            level: "warning",
            message: "Deprecation warning",
            timestamp: "2026-03-01T14:23:40.200Z",
          },
          {
            level: "log",
            message: "App initialized",
            timestamp: "2026-03-01T14:23:40.300Z",
          },
          {
            level: "log",
            message: "Fetching data...",
            timestamp: "2026-03-01T14:23:40.400Z",
          },
          {
            level: "info",
            message: "Version 2.1.0",
            timestamp: "2026-03-01T14:23:40.500Z",
          },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("1 error, 1 warning, 2 logs, 1 info")
    expect(text).toMatch(/\*\*ERROR\*\* \(\d{2}:\d{2}:\d{2}\) Something broke/)
    expect(text).toMatch(/\*\*WARN\*\* \(\d{2}:\d{2}:\d{2}\) Deprecation warning/)
    expect(text).toMatch(/\*\*LOG\*\* \(\d{2}:\d{2}:\d{2}\) App initialized/)
    expect(text).toMatch(/\*\*LOG\*\* \(\d{2}:\d{2}:\d{2}\) Fetching data\.\.\./)
    expect(text).toMatch(/\*\*INFO\*\* \(\d{2}:\d{2}:\d{2}\) Version 2\.1\.0/)
  })

  it("includes debug entries in full mode summary and list", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["console"],
      },
      console: {
        summary: { total: 2, errors: 0, warnings: 0, logs: 0, info: 0 },
        logs: [
          { level: "debug", message: "State updated", timestamp: "2026-03-01T14:23:40.100Z" },
          { level: "debug", message: "Render complete", timestamp: "2026-03-01T14:23:40.200Z" },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("2 debug")
    expect(text).toMatch(/\*\*DEBUG\*\* \(\d{2}:\d{2}:\d{2}\) State updated/)
    expect(text).toMatch(/\*\*DEBUG\*\* \(\d{2}:\d{2}:\d{2}\) Render complete/)
  })

  it("shows clean network message when no failures", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        capturedData: ["network"],
      },
      network: {
        summary: { total: 30, failed: 0, slow: 0 },
        failed: [],
        slow: [],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("## Network")
    expect(text).toContain("No failed requests.")
  })

  it("includes network failed requests with method and body preview", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        capturedData: ["network"],
      },
      network: {
        summary: { total: 45, failed: 1, slow: 0 },
        failed: [
          {
            url: "https://api.example.com/users",
            method: "POST",
            status: 500,
            statusText: "Internal Server Error",
            type: "fetch",
            duration: 234,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
            requestBodyPreview: '{"name":"test"}',
            responseBodyPreview: '{"error":"Database connection failed"}',
          },
        ],
        slow: [],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("## Network")
    expect(text).toContain("45 requests, 1 failed")
    expect(text).toContain("**FAIL** POST `/users`")
    expect(text).toContain("500 Internal Server Error")
    expect(text).toContain("(fetch, 234ms)")
    expect(text).toContain('Request: {"name":"test"}')
    expect(text).toContain('Response: {"error":"Database connection failed"}')
  })

  it("includes slow requests when present", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["network"],
      },
      network: {
        summary: { total: 20, failed: 0, slow: 1 },
        failed: [],
        slow: [
          {
            url: "https://api.example.com/heavy",
            method: "GET",
            status: 200,
            statusText: "OK",
            type: "xhr",
            duration: 3200,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
          },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("1 slow")
    expect(text).toContain("**SLOW** GET `/heavy`")
    expect(text).toContain("3200ms")
  })

  it("shows all network requests in full mode with methods and statusText on failures", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["network"],
      },
      network: {
        summary: { total: 4, failed: 1, slow: 1 },
        failed: [
          {
            url: "https://api.example.com/users",
            method: "POST",
            status: 500,
            statusText: "Internal Server Error",
            type: "fetch",
            duration: 234,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
          },
        ],
        slow: [
          {
            url: "https://api.example.com/heavy",
            method: "GET",
            status: 200,
            statusText: "OK",
            type: "xhr",
            duration: 3200,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
          },
        ],
        all: [
          {
            url: "https://api.example.com/users",
            method: "POST",
            status: 500,
            statusText: "Internal Server Error",
            type: "fetch",
            duration: 234,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
          },
          {
            url: "https://cdn.example.com/app.js",
            method: "GET",
            status: 200,
            statusText: "OK",
            type: "script",
            duration: 45,
            size: 125400,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
          },
          {
            url: "https://api.example.com/heavy",
            method: "GET",
            status: 200,
            statusText: "OK",
            type: "xhr",
            duration: 3200,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
          },
          {
            url: "https://cdn.example.com/style.css",
            method: "GET",
            status: 200,
            statusText: "OK",
            type: "link",
            duration: 30,
            size: 2048,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
          },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("4 requests, 1 failed, 1 slow")
    // Failed request shows statusText
    expect(text).toContain("**FAIL** POST `/users` → 500 Internal Server Error")
    expect(text).toContain("GET `/app.js` → 200 (45ms, 122.5 KB, script)")
    expect(text).toContain("**SLOW** GET `/heavy` → 200 (3200ms, xhr)")
    expect(text).toContain("GET `/style.css` → 200 (30ms, 2.0 KB, link)")
    // Should NOT show "No failed requests."
    expect(text).not.toContain("No failed requests.")
  })

  it("does not show statusText when it is a fallback HTTP XXX", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["network"],
      },
      network: {
        summary: { total: 1, failed: 1, slow: 0 },
        failed: [],
        slow: [],
        all: [
          {
            url: "https://cdn.example.com/logo.png",
            method: "GET",
            status: 404,
            statusText: "HTTP 404",
            type: "img",
            duration: 76,
            size: 275000,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
          },
        ],
      },
    })
    const text = generateTextContent(input)
    // Should NOT duplicate status as "404 HTTP 404"
    expect(text).toContain("→ 404 (76ms")
    expect(text).not.toContain("HTTP 404")
  })

  it("shows opaque count in full mode summary", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["network"],
      },
      network: {
        summary: { total: 15, failed: 1, slow: 0, opaque: 3 },
        failed: [],
        slow: [],
        all: [
          {
            url: "https://cdn.example.com/app.js",
            method: "GET",
            status: 200,
            statusText: "OK",
            type: "script",
            duration: 45,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
          },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("15 requests, 1 failed, 3 cross-origin excluded")
  })

  it("shows body preview for successful POST in full mode", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["network"],
      },
      network: {
        summary: { total: 1, failed: 0, slow: 0 },
        failed: [],
        slow: [],
        all: [
          {
            url: "https://api.example.com/users",
            method: "POST",
            status: 201,
            statusText: "Created",
            type: "fetch",
            duration: 120,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
            requestBodyPreview: '{"name":"Alice"}',
            responseBodyPreview: '{"id":42,"name":"Alice"}',
          },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("POST `/users` → 201")
    expect(text).toContain('Request: {"name":"Alice"}')
    expect(text).toContain('Response: {"id":42,"name":"Alice"}')
  })

  it("does not show body preview for successful GET in full mode", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["network"],
      },
      network: {
        summary: { total: 1, failed: 0, slow: 0 },
        failed: [],
        slow: [],
        all: [
          {
            url: "https://api.example.com/users",
            method: "GET",
            status: 200,
            statusText: "OK",
            type: "fetch",
            duration: 50,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
            responseBodyPreview: '{"users":[]}',
          },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("GET `/users` → 200")
    // GET success should NOT show body preview
    expect(text).not.toContain("Response:")
  })

  it("uses compact format for cookies when fewer than 10", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["cookies"],
      },
      cookies: {
        summary: { total: 2 },
        cookies: [
          { name: "theme", value: "dark", secure: false, sameSite: "Lax" },
          { name: "session_id", value: "***", secure: true, sameSite: "Lax" },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("## Cookies")
    expect(text).toContain("theme=dark | session_id=***")
    // Should NOT use list format
    expect(text).not.toContain("- theme:")
  })

  it("uses list format for cookies when 10 or more", () => {
    const cookies = Array.from({ length: 12 }, (_, i) => ({
      name: `cookie_${i}`, value: `val${i}`, secure: false, sameSite: "Lax",
    }))
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["cookies"],
      },
      cookies: { summary: { total: 12 }, cookies },
    })
    const text = generateTextContent(input)
    expect(text).toContain("12 cookies")
    expect(text).toContain("- cookie_0: `val0`")
  })

  it("includes storage when captured", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["storage"],
      },
      storage: {
        localStorage: {
          summary: { keys: 2, totalSize: "1.5 KB" },
          entries: [
            { key: "prefs", value: '{"dark":true}', size: "256 B" },
            { key: "auth_token", value: "***", size: "1.2 KB" },
          ],
        },
        sessionStorage: {
          summary: { keys: 1, totalSize: "512 B" },
          entries: [{ key: "draft", value: "hello", size: "512 B" }],
        },
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("## Storage")
    expect(text).toContain("2 localStorage, 1 sessionStorage")
    expect(text).toContain('[local] prefs: `{"dark":true}`')
    expect(text).toContain("[local] auth_token: `***`")
    expect(text).toContain("[session] draft: `hello`")
  })

  it("includes performance with FP, FCP, LCP, CLS, FID", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["performance"],
      },
      performance: {
        loadTime: 2100,
        domContentLoaded: 1200,
        firstPaint: 800,
        firstContentfulPaint: 950,
        largestContentfulPaint: 1200,
        cumulativeLayoutShift: 0.05,
        firstInputDelay: 45,
        memoryUsed: 47185920,
        memoryLimit: 4294967296,
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("## Performance")
    expect(text).toContain("FP: 800ms")
    expect(text).toContain("FCP: 950ms")
    expect(text).toContain("LCP: 1200ms")
    expect(text).toContain("Load: 2100ms")
    expect(text).toContain("DOMContentLoaded: 1200ms")
    expect(text).toContain("CLS: 0.05")
    expect(text).toContain("FID: 45ms")
    expect(text).toContain("Memory:")
  })

  it("includes interactions in reverse chronological order", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["interactions"],
      },
      interactions: {
        summary: { total: 3, clicks: 1, scrolls: 1, inputs: 1 },
        events: [
          {
            type: "input",
            target: "input#search",
            inputType: "text",
            value: "***",
            timestamp: "2026-03-01T14:29:50.000Z",
          },
          {
            type: "scroll",
            direction: "down",
            distance: 450,
            timestamp: "2026-03-01T14:29:55.000Z",
          },
          {
            type: "click",
            target: "button.submit",
            text: "Submit",
            coordinates: { x: 100, y: 200 },
            timestamp: "2026-03-01T14:29:58.000Z",
          },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("## Interactions")
    expect(text).toContain("3 events (most recent first)")
    expect(text).toContain('[click] button.submit "Submit"')
    expect(text).toContain("[scroll] down 450px")
    expect(text).toContain("[input] input#search ***")
    // Verify reverse order: click (most recent) before scroll, scroll before input
    const clickIdx = text.indexOf("[click]")
    const scrollIdx = text.indexOf("[scroll]")
    const inputIdx = text.indexOf("[input]")
    expect(clickIdx).toBeLessThan(scrollIdx)
    expect(scrollIdx).toBeLessThan(inputIdx)
  })

  it("includes DOM with size indicator", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["dom"],
      },
      dom: '<!DOCTYPE html>\n<html lang="fr"><body><p>Hello</p></body></html>',
    })
    const text = generateTextContent(input)
    expect(text).toMatch(/## DOM \(\d+(\.\d+)? (B|KB)\)/)
    expect(text).toContain("```html")
    expect(text).toContain("<p>Hello</p>")
    // DOM should be after Screenshots
    const domIndex = text.indexOf("## DOM")
    const screenshotIndex = text.indexOf("## Screenshots")
    expect(domIndex).toBeGreaterThan(screenshotIndex)
  })

  it("shows truncated indicator for large DOM", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["dom"],
      },
      dom: '<html>' + 'x'.repeat(1000) + '<!-- truncated by PageNab -->',
    })
    const text = generateTextContent(input)
    expect(text).toContain("truncated")
  })

  it("omits sections not in capturedData", () => {
    const text = generateTextContent(makeBaseInput())
    expect(text).not.toContain("## Console")
    expect(text).not.toContain("## Network")
    expect(text).not.toContain("## Cookies")
    expect(text).not.toContain("## Storage")
    expect(text).not.toContain("## Performance")
    expect(text).not.toContain("## Interactions")
    expect(text).not.toContain("## DOM")
  })

  it("includes element section with CSS one property per line", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        captureMode: "element",
        capturedData: ["element"],
        elementRect: { x: 100, y: 200, width: 120, height: 40 },
      },
      element: {
        selector: "body > main > form.login-form > button#submit.primary.lg",
        tag: "button",
        id: "submit",
        classes: ["primary", "lg"],
        attributes: { type: "submit", "aria-label": "Submit form" },
        boundingRect: { x: 100, y: 200, width: 120, height: 40 },
        outerHTML: '<button id="submit" class="primary lg" type="submit">Submit</button>',
        computedStyles: { display: "flex", width: "120px", height: "40px", color: "rgb(255, 255, 255)" },
        accessibility: { role: "button", ariaLabel: "Submit form", tabIndex: 0 },
        parentContext: '<form class="login-form"><!-- \u25B6 selected: button#submit.primary.lg --></form>',
      },
      elementScreenshotPath: "pagenab-app.example.com-2026-03-01_14-23-45-element.png",
    })
    const text = generateTextContent(input)
    expect(text).toContain("## Selected Element")
    expect(text).toContain("`button#submit.primary.lg`")
    expect(text).toContain("### HTML")
    expect(text).toContain('<button id="submit"')
    expect(text).toContain("### Styles")
    expect(text).toContain("```css")
    // One property per line
    expect(text).toContain("display: flex;")
    expect(text).toContain("width: 120px;")
    expect(text).toContain("height: 40px;")
    expect(text).toContain("color: rgb(255, 255, 255);")
    expect(text).toContain("### Parent")
    expect(text).toContain("login-form")
  })

  it("element section appears before Console", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        captureMode: "element",
        capturedData: ["element", "console"],
        elementRect: { x: 10, y: 20, width: 100, height: 50 },
      },
      element: {
        selector: "div.box",
        tag: "div",
        classes: ["box"],
        attributes: {},
        boundingRect: { x: 10, y: 20, width: 100, height: 50 },
        outerHTML: '<div class="box">Hello</div>',
        computedStyles: { display: "block" },
        accessibility: {},
      },
      console: {
        summary: { total: 0, errors: 0, warnings: 0, logs: 0, info: 0 },
        logs: [],
      },
    })
    const text = generateTextContent(input)
    const elementIndex = text.indexOf("## Selected Element")
    const consoleIndex = text.indexOf("## Console")
    expect(elementIndex).toBeGreaterThan(-1)
    expect(consoleIndex).toBeGreaterThan(-1)
    expect(elementIndex).toBeLessThan(consoleIndex)
  })

  it("shows element screenshot paths in element mode", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        captureMode: "element",
        capturedData: ["element"],
        elementRect: { x: 10, y: 20, width: 100, height: 50 },
      },
      element: {
        selector: "div.box",
        tag: "div",
        classes: ["box"],
        attributes: {},
        boundingRect: { x: 10, y: 20, width: 100, height: 50 },
        outerHTML: '<div class="box">Hello</div>',
        computedStyles: {},
        accessibility: {},
      },
      elementScreenshotPath: "pagenab-app.example.com-2026-03-01_14-23-45-element.png",
    })
    const text = generateTextContent(input)
    expect(text).toContain("Full page:")
    expect(text).toContain("Element:")
    expect(text).toContain("-element.png")
  })

  it("omits element section when not in capturedData", () => {
    const text = generateTextContent(makeBaseInput())
    expect(text).not.toContain("## Selected Element")
  })

  it("shows area screenshot paths when in area mode", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        captureMode: "area",
      },
      areaScreenshotPath: "pagenab-app.example.com-2026-03-01_14-23-45-area.png",
    })
    const text = generateTextContent(input)
    expect(text).toContain("Full page:")
    expect(text).toContain("Area:")
  })
})
