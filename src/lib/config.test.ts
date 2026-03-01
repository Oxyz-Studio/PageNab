import { describe, expect, it } from "vitest"

import {
  CAPTURE_VERSION,
  DEFAULT_CUSTOM_OPTIONS,
  DEFAULT_SETTINGS,
  generateScreenshotFilename,
  parseDomain,
  parsePath,
} from "./config"

describe("config defaults", () => {
  it("has correct default preset", () => {
    expect(DEFAULT_SETTINGS.preset).toBe("light")
  })

  it("has correct default screenshot mode", () => {
    expect(DEFAULT_SETTINGS.screenshotMode).toBe("fullpage")
  })

  it("has notifications enabled by default", () => {
    expect(DEFAULT_SETTINGS.notifications).toBe(true)
  })

  it("has maxCaptures set to 20", () => {
    expect(DEFAULT_SETTINGS.maxCaptures).toBe(20)
  })

  it("has console and network enabled by default in custom options", () => {
    expect(DEFAULT_CUSTOM_OPTIONS.console).toBe(true)
    expect(DEFAULT_CUSTOM_OPTIONS.network).toBe(true)
  })

  it("has other custom options disabled by default", () => {
    expect(DEFAULT_CUSTOM_OPTIONS.dom).toBe(false)
    expect(DEFAULT_CUSTOM_OPTIONS.cookies).toBe(false)
    expect(DEFAULT_CUSTOM_OPTIONS.storage).toBe(false)
    expect(DEFAULT_CUSTOM_OPTIONS.interactions).toBe(false)
    expect(DEFAULT_CUSTOM_OPTIONS.performance).toBe(false)
  })

  it("has a valid capture version", () => {
    expect(CAPTURE_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe("parseDomain", () => {
  it("extracts hostname from a full URL", () => {
    expect(parseDomain("https://app.example.com/dashboard?tab=overview")).toBe("app.example.com")
  })

  it("handles URL with port", () => {
    expect(parseDomain("http://localhost:3000/page")).toBe("localhost")
  })

  it("returns 'unknown' for invalid URLs", () => {
    expect(parseDomain("not-a-url")).toBe("unknown")
  })

  it("handles empty string", () => {
    expect(parseDomain("")).toBe("unknown")
  })
})

describe("parsePath", () => {
  it("extracts pathname from URL", () => {
    expect(parsePath("https://example.com/dashboard/settings")).toBe("/dashboard/settings")
  })

  it("returns root for base URL", () => {
    expect(parsePath("https://example.com")).toBe("/")
  })

  it("returns '/' for invalid URLs", () => {
    expect(parsePath("invalid")).toBe("/")
  })
})

describe("generateScreenshotFilename", () => {
  it("generates correct format for full page", () => {
    const filename = generateScreenshotFilename("example.com")
    expect(filename).toMatch(/^pagenab-example\.com-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.png$/)
  })

  it("appends -area suffix for area screenshots", () => {
    const filename = generateScreenshotFilename("example.com", true)
    expect(filename).toMatch(/^pagenab-example\.com-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-area\.png$/)
  })

  it("includes the domain in the filename", () => {
    const filename = generateScreenshotFilename("my-app.dev")
    expect(filename).toContain("my-app.dev")
  })
})
