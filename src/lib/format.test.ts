import { describe, expect, it } from "vitest"

import { generateTextContent, type FormatInput } from "./format"

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
      userAgent: "Mozilla/5.0",
      language: "fr-FR",
      colorScheme: "light",
      captureMode: "fullpage",
      areaRect: null,
      preset: "light",
      capturedData: [],
      captureVersion: "1.0.0",
      captureDuration: 500,
    },
    screenshotPath: "pagenab-app.example.com-2026-03-01_14-23-45.png",
    ...overrides,
  }
}

describe("generateTextContent", () => {
  it("generates header with URL and metadata", () => {
    const text = generateTextContent(makeBaseInput())
    expect(text).toContain("[PageNab] https://app.example.com/dashboard?tab=overview")
    expect(text).toContain("Viewport: 1920x1080")
    expect(text).toContain("Lang: fr-FR")
    expect(text).toContain("Preset: Light")
  })

  it("includes screenshot path", () => {
    const text = generateTextContent(makeBaseInput())
    expect(text).toContain(
      "Screenshot: ~/Downloads/pagenab-app.example.com-2026-03-01_14-23-45.png",
    )
  })

  it("includes console errors when captured", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        capturedData: ["console"],
      },
      console: {
        summary: { errors: 1, warnings: 0, logs: 0, info: 0 },
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
    expect(text).toContain("Console: 1 error")
    expect(text).toContain("[ERROR] TypeError: Cannot read property 'map' of undefined")
    expect(text).toContain("main.js:47")
  })

  it("includes network failed requests when captured", () => {
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
            status: 500,
            statusText: "Internal Server Error",
            type: "fetch",
            duration: 234,
            timestamp: "2026-03-01T14:23:42.000Z",
            requestHeaders: {},
            responseHeaders: {},
          },
        ],
        slow: [],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("Network: 1 failed")
    expect(text).toContain("[FAIL] /users")
    expect(text).toContain("500 Internal Server Error")
    expect(text).toContain("(fetch)")
  })

  it("includes cookies when captured", () => {
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
    expect(text).toContain("Cookies: 2 cookies")
    expect(text).toContain("theme: dark")
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
    expect(text).toContain("Storage: 2 localStorage keys, 1 sessionStorage keys")
    expect(text).toContain('[local] prefs: {"dark":true}')
    expect(text).toContain("[local] auth_token: ***")
    expect(text).toContain("[session] draft: hello")
  })

  it("includes performance when captured", () => {
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
    expect(text).toContain("Performance:")
    expect(text).toContain("Load: 2100ms")
    expect(text).toContain("LCP: 1200ms")
    expect(text).toContain("CLS: 0.05")
    expect(text).toContain("FID: 45ms")
    expect(text).toContain("Memory:")
  })

  it("includes interactions when captured", () => {
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
            type: "click",
            target: "button.submit",
            text: "Submit",
            coordinates: { x: 100, y: 200 },
            timestamp: "2026-03-01T14:29:58.000Z",
          },
          {
            type: "scroll",
            direction: "down",
            distance: 450,
            timestamp: "2026-03-01T14:29:55.000Z",
          },
          {
            type: "input",
            target: "input#search",
            inputType: "text",
            value: "***",
            timestamp: "2026-03-01T14:29:50.000Z",
          },
        ],
      },
    })
    const text = generateTextContent(input)
    expect(text).toContain("Interactions: 3 events (showing last 3)")
    expect(text).toContain('[click] button.submit "Submit"')
    expect(text).toContain("[scroll] down 450px")
    expect(text).toContain("[input] input#search ***")
  })

  it("includes DOM at the end when captured", () => {
    const input = makeBaseInput({
      metadata: {
        ...makeBaseInput().metadata,
        preset: "full",
        capturedData: ["dom"],
      },
      dom: '<!DOCTYPE html>\n<html lang="fr"><body><p>Hello</p></body></html>',
    })
    const text = generateTextContent(input)
    expect(text).toContain("--- DOM Snapshot ---")
    expect(text).toContain("<p>Hello</p>")
    // DOM should be last
    const domIndex = text.indexOf("--- DOM Snapshot ---")
    const screenshotIndex = text.indexOf("Screenshot:")
    expect(domIndex).toBeGreaterThan(screenshotIndex)
  })

  it("omits sections not in capturedData", () => {
    const text = generateTextContent(makeBaseInput())
    expect(text).not.toContain("Console:")
    expect(text).not.toContain("Network:")
    expect(text).not.toContain("Cookies:")
    expect(text).not.toContain("Storage:")
    expect(text).not.toContain("Performance:")
    expect(text).not.toContain("Interactions:")
    expect(text).not.toContain("--- DOM Snapshot ---")
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
    expect(text).toContain("Screenshot (full page):")
    expect(text).toContain("Screenshot (area):")
  })
})
