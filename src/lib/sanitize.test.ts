import { describe, expect, it } from "vitest"

import {
  isSensitiveCookieName,
  isSensitiveStorageKey,
  sanitizeCookieValue,
  sanitizeHeaders,
  sanitizeStorageValue,
  truncate,
} from "./sanitize"

describe("sanitizeHeaders", () => {
  it("masks Authorization header", () => {
    const result = sanitizeHeaders({ Authorization: "Bearer abc123" })
    expect(result.Authorization).toBe("***")
  })

  it("masks Cookie header", () => {
    const result = sanitizeHeaders({ Cookie: "session=abc", "Content-Type": "text/html" })
    expect(result.Cookie).toBe("***")
    expect(result["Content-Type"]).toBe("text/html")
  })

  it("masks headers containing token/key/secret/password", () => {
    const result = sanitizeHeaders({
      "X-Custom-Token": "abc",
      "api-key": "xyz",
      "x-secret-value": "hidden",
      "x-password-hash": "sha256",
      "x-normal-header": "visible",
    })
    expect(result["X-Custom-Token"]).toBe("***")
    expect(result["api-key"]).toBe("***")
    expect(result["x-secret-value"]).toBe("***")
    expect(result["x-password-hash"]).toBe("***")
    expect(result["x-normal-header"]).toBe("visible")
  })

  it("preserves safe headers", () => {
    const result = sanitizeHeaders({ "Content-Type": "application/json", Accept: "text/html" })
    expect(result["Content-Type"]).toBe("application/json")
    expect(result.Accept).toBe("text/html")
  })
})

describe("isSensitiveCookieName", () => {
  it("detects session cookies", () => {
    expect(isSensitiveCookieName("session_id")).toBe(true)
    expect(isSensitiveCookieName("auth_token")).toBe(true)
    expect(isSensitiveCookieName("api_key")).toBe(true)
    expect(isSensitiveCookieName("secret_val")).toBe(true)
    expect(isSensitiveCookieName("password")).toBe(true)
  })

  it("allows safe cookie names", () => {
    expect(isSensitiveCookieName("theme")).toBe(false)
    expect(isSensitiveCookieName("lang")).toBe(false)
    expect(isSensitiveCookieName("_ga")).toBe(false)
  })
})

describe("sanitizeCookieValue", () => {
  it("masks sensitive cookie values entirely", () => {
    expect(sanitizeCookieValue("session_id", "abc123xyz")).toBe("***")
  })

  it("truncates long non-sensitive values", () => {
    const longValue = "a".repeat(30)
    expect(sanitizeCookieValue("theme", longValue)).toBe("a".repeat(20) + "***")
  })

  it("preserves short non-sensitive values", () => {
    expect(sanitizeCookieValue("theme", "dark")).toBe("dark")
  })
})

describe("isSensitiveStorageKey", () => {
  it("detects sensitive keys", () => {
    expect(isSensitiveStorageKey("auth_token")).toBe(true)
    expect(isSensitiveStorageKey("secret_key")).toBe(true)
  })

  it("allows safe keys", () => {
    expect(isSensitiveStorageKey("user_preferences")).toBe(false)
    expect(isSensitiveStorageKey("theme")).toBe(false)
  })
})

describe("sanitizeStorageValue", () => {
  it("masks sensitive key values", () => {
    expect(sanitizeStorageValue("auth_token", "some-long-token-value")).toBe("***")
  })

  it("truncates long values", () => {
    const longValue = "x".repeat(250)
    expect(sanitizeStorageValue("prefs", longValue)).toBe("x".repeat(200) + "...")
  })

  it("preserves short safe values", () => {
    expect(sanitizeStorageValue("theme", '{"dark":true}')).toBe('{"dark":true}')
  })
})

describe("truncate", () => {
  it("returns text unchanged if under limit", () => {
    expect(truncate("hello", 10)).toBe("hello")
  })

  it("truncates and adds ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hello...")
  })

  it("handles exact length", () => {
    expect(truncate("hello", 5)).toBe("hello")
  })
})
