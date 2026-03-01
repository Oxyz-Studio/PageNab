const SENSITIVE_HEADER_NAMES = /^(authorization|cookie|set-cookie|x-api-key|x-auth-token)$/i
const SENSITIVE_HEADER_CONTENT = /(token|key|secret|password)/i
const SENSITIVE_COOKIE_NAMES = /(token|session|auth|key|secret|password)/i
const SENSITIVE_STORAGE_KEYS = /(token|auth|secret|password|key)/i

export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_NAMES.test(key) || SENSITIVE_HEADER_CONTENT.test(key)) {
      cleaned[key] = "***"
    } else {
      cleaned[key] = value
    }
  }
  return cleaned
}

export function isSensitiveCookieName(name: string): boolean {
  return SENSITIVE_COOKIE_NAMES.test(name)
}

export function sanitizeCookieValue(name: string, value: string): string {
  if (isSensitiveCookieName(name)) return "***"
  if (value.length > 20) return value.slice(0, 20) + "***"
  return value
}

export function isSensitiveStorageKey(key: string): boolean {
  return SENSITIVE_STORAGE_KEYS.test(key)
}

export function sanitizeStorageValue(key: string, value: string, maxLen = 200): string {
  if (isSensitiveStorageKey(key)) return "***"
  if (value.length > maxLen) return value.slice(0, maxLen) + "..."
  return value
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + "..."
}
