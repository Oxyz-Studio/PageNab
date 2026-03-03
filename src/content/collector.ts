// Content script collector — injected into pages via chrome.scripting.executeScript.
// This function MUST be completely self-contained (no imports, no external references).
// It runs in the MAIN world to access page's performance, console, storage APIs.

export interface CollectorOptions {
  console: boolean
  network: boolean
  dom: boolean
  cookies: boolean
  storage: boolean
  performance: boolean
  consoleFilter: "errors" | "all"
  networkFilter: "failed" | "failed-slow" | "all"
}

export interface CollectorResult {
  metadata: {
    viewport: { width: number; height: number }
    language: string
    colorScheme: "light" | "dark"
  }
  console?: {
    summary: { total: number; errors: number; warnings: number; logs: number; info: number }
    logs: Array<{
      level: string
      message: string
      source?: string
      line?: number
      column?: number
      stack?: string
      timestamp: string
      count?: number
    }>
  }
  network?: {
    summary: { total: number; failed: number; slow: number }
    failed: Array<{
      url: string
      method?: string
      status: number
      statusText: string
      type: string
      duration: number
      size: number
      timestamp: string
      requestHeaders: Record<string, string>
      responseHeaders: Record<string, string>
      requestBodyPreview?: string
      responseBodyPreview?: string
      initiator?: string
    }>
    slow: Array<{
      url: string
      method?: string
      status: number
      statusText: string
      type: string
      duration: number
      size: number
      timestamp: string
      requestHeaders: Record<string, string>
      responseHeaders: Record<string, string>
      requestBodyPreview?: string
      responseBodyPreview?: string
      initiator?: string
    }>
    all?: Array<{
      url: string
      method?: string
      status: number
      statusText: string
      type: string
      duration: number
      size: number
      timestamp: string
      requestHeaders: Record<string, string>
      responseHeaders: Record<string, string>
      requestBodyPreview?: string
      responseBodyPreview?: string
      initiator?: string
    }>
  }
  dom?: string
  cookies?: {
    summary: { total: number }
    cookies: Array<{ name: string; value: string; secure: boolean; sameSite: string }>
  }
  storage?: {
    localStorage: {
      summary: { keys: number; totalSize: string }
      entries: Array<{ key: string; value: string; size: string }>
    }
    sessionStorage: {
      summary: { keys: number; totalSize: string }
      entries: Array<{ key: string; value: string; size: string }>
    }
  }
  performance?: {
    loadTime: number
    domContentLoaded: number
    firstPaint: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    cumulativeLayoutShift: number
    firstInputDelay: number
    memoryUsed?: number
    memoryLimit?: number
  }
}

// Self-contained function injected into page context via executeScript({ func }).
export function collectPageData(options: CollectorOptions): CollectorResult {
  const SENSITIVE_COOKIE_RE = /(token|session|auth|key|secret|password)/i
  const SENSITIVE_STORAGE_RE = /(token|auth|secret|password|key)/i
  const MAX_DOM_SIZE = 500 * 1024

  // === Metadata (always collected) ===
  const metadata = {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    language: document.documentElement.lang || navigator.language,
    colorScheme: (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") as
      | "light"
      | "dark",
  }

  const result: CollectorResult = { metadata }

  // === Console ===
  // Reads from the persistent console buffer set by src/contents/console-capture.ts
  // (MAIN world content script that patches console from document_start).
  if (options.console) {
    type LogEntry = NonNullable<CollectorResult["console"]>["logs"][number]

    const consoleBuffer = (
      window as unknown as Record<string, unknown>
    ).__pagenab_console_buffer as
      | Array<{
          level: string
          message: string
          source?: string
          line?: number
          column?: number
          stack?: string
          timestamp: string
        }>
      | undefined

    const rawLogs: LogEntry[] = (consoleBuffer ?? []).map((entry) => ({
      level: entry.level,
      message: entry.message,
      source: entry.source,
      line: entry.line,
      column: entry.column,
      stack: entry.stack,
      timestamp: entry.timestamp,
    }))

    const filteredLogs =
      options.consoleFilter === "errors"
        ? rawLogs.filter((l) => l.level === "error")
        : rawLogs

    const summary = { total: rawLogs.length, errors: 0, warnings: 0, logs: 0, info: 0 }
    for (const l of rawLogs) {
      switch (l.level) {
        case "error":
          summary.errors++
          break
        case "warning":
          summary.warnings++
          break
        case "log":
          summary.logs++
          break
        case "info":
          summary.info++
          break
      }
    }

    result.console = { summary, logs: filteredLogs }
  }

  // === Network ===
  if (options.network) {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[]

    // Read intercepted fetch/XHR buffer for method and body data
    const networkBuffer = (
      (window as unknown as Record<string, unknown>).__pagenab_network_buffer as
        | Array<{
            url: string
            method: string
            status: number
            statusText: string
            duration: number
            requestContentType?: string
            responseContentType?: string
            requestBodyPreview?: string
            responseBodyPreview?: string
            timestamp: string
          }>
        | undefined
    ) ?? []

    // Index buffer by URL for merging
    const bufferByUrl = new Map<string, typeof networkBuffer[number]>()
    for (const b of networkBuffer) {
      bufferByUrl.set(b.url, b)
    }

    interface NetEntry {
      url: string
      method?: string
      status: number
      statusText: string
      type: string
      duration: number
      size: number
      timestamp: string
      requestHeaders: Record<string, string>
      responseHeaders: Record<string, string>
      requestBodyPreview?: string
      responseBodyPreview?: string
      initiator?: string
    }

    const failed: NetEntry[] = []
    const slow: NetEntry[] = []
    const all: NetEntry[] = []
    let total = 0

    for (const entry of entries) {
      // Skip entries with empty or opaque URLs (cross-origin sub-resources like CSS background-images)
      if (!entry.name || entry.name === "about:blank") continue

      const status =
        "responseStatus" in entry
          ? (entry as PerformanceResourceTiming & { responseStatus: number }).responseStatus
          : 0

      // Skip entries with no status info (cross-origin opaque responses) for the all array
      // but still count them toward total
      total++
      if (status === 0 && options.networkFilter === "all") {
        // Only include in `all` if we have meaningful data
        // status 0 means opaque/cross-origin — skip from detailed list
        continue
      }

      const duration = Math.round(entry.duration)
      const size = Math.round(entry.transferSize || 0)
      const ts = new Date(performance.timeOrigin + entry.startTime).toISOString()

      const isFailed = status >= 400
      const isSlow = !isFailed && duration > 3000 && status > 0

      // Merge data from intercepted buffer (method, body previews)
      const bufferEntry = bufferByUrl.get(entry.name)

      const netEntry: NetEntry = {
        url: entry.name,
        method: bufferEntry?.method,
        status,
        statusText: bufferEntry?.statusText ?? `HTTP ${status}`,
        type: entry.initiatorType,
        duration,
        size,
        timestamp: ts,
        requestHeaders: {},
        responseHeaders: {},
        requestBodyPreview: bufferEntry?.requestBodyPreview,
        responseBodyPreview: bufferEntry?.responseBodyPreview,
        initiator: entry.initiatorType,
      }

      if (isFailed && failed.length < 50) {
        failed.push(netEntry)
      }

      if (isSlow && (options.networkFilter === "failed-slow" || options.networkFilter === "all") && slow.length < 10) {
        slow.push(netEntry)
      }

      if (options.networkFilter === "all" && all.length < 200) {
        all.push(netEntry)
      }
    }

    result.network = {
      summary: { total, failed: failed.length, slow: slow.length },
      failed,
      slow,
      ...(all.length > 0 ? { all } : {}),
    }
  }

  // === DOM ===
  if (options.dom) {
    try {
      const clone = document.documentElement.cloneNode(true) as HTMLElement

      // Remove scripts and noscript
      clone.querySelectorAll("script, noscript").forEach((el) => el.remove())

      // Mask password inputs
      clone.querySelectorAll('input[type="password"]').forEach((el) => {
        el.setAttribute("value", "***")
      })

      // Remove HTML comments
      const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT)
      const comments: Node[] = []
      while (walker.nextNode()) comments.push(walker.currentNode)
      for (const c of comments) c.parentNode?.removeChild(c)

      let html = `<!DOCTYPE html>\n${clone.outerHTML}`
      if (html.length > MAX_DOM_SIZE) {
        html = html.slice(0, MAX_DOM_SIZE) + "\n<!-- truncated by PageNab -->"
      }

      result.dom = html
    } catch {
      // DOM extraction failure is non-critical
    }
  }

  // === Cookies ===
  if (options.cookies) {
    try {
      const raw = document.cookie
      const cookieList = raw
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
          const eqIdx = c.indexOf("=")
          const name = eqIdx > -1 ? c.slice(0, eqIdx).trim() : c.trim()
          const rawValue = eqIdx > -1 ? c.slice(eqIdx + 1).trim() : ""
          const value = SENSITIVE_COOKIE_RE.test(name)
            ? "***"
            : rawValue.length > 20
              ? rawValue.slice(0, 20) + "***"
              : rawValue
          return { name, value, secure: location.protocol === "https:", sameSite: "Lax" }
        })

      result.cookies = {
        summary: { total: cookieList.length },
        cookies: cookieList,
      }
    } catch {
      // Cookie access failure is non-critical
    }
  }

  // === Storage ===
  if (options.storage) {
    function formatSize(bytes: number): string {
      if (bytes < 1024) return `${bytes} B`
      return `${(bytes / 1024).toFixed(1)} KB`
    }

    function collectStorage(store: Storage) {
      const entries: Array<{ key: string; value: string; size: string }> = []
      let totalBytes = 0

      for (let i = 0; i < store.length; i++) {
        const key = store.key(i)
        if (!key) continue
        const rawValue = store.getItem(key) ?? ""
        const size = new Blob([rawValue]).size
        totalBytes += size

        const value = SENSITIVE_STORAGE_RE.test(key)
          ? "***"
          : rawValue.length > 200
            ? rawValue.slice(0, 200) + "..."
            : rawValue

        entries.push({ key, value, size: formatSize(size) })
      }

      return {
        summary: { keys: store.length, totalSize: formatSize(totalBytes) },
        entries,
      }
    }

    try {
      result.storage = {
        localStorage: collectStorage(localStorage),
        sessionStorage: collectStorage(sessionStorage),
      }
    } catch {
      // Storage access may be blocked (e.g., sandboxed iframes)
    }
  }

  // === Performance ===
  if (options.performance) {
    try {
      const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
      const nav = navEntries[0]

      const paintEntries = performance.getEntriesByType("paint")
      const fp = paintEntries.find((e) => e.name === "first-paint")
      const fcp = paintEntries.find((e) => e.name === "first-contentful-paint")

      // LCP, CLS, FID — try to read buffered entries (Chrome buffers these automatically)
      const lcpEntries = performance.getEntriesByType("largest-contentful-paint")
      const lcpEntry = lcpEntries[lcpEntries.length - 1]

      const layoutShiftEntries = performance.getEntriesByType("layout-shift") as Array<
        PerformanceEntry & { value: number; hadRecentInput: boolean }
      >
      let cls = 0
      for (const entry of layoutShiftEntries) {
        if (!entry.hadRecentInput) cls += entry.value
      }

      const fidEntries = performance.getEntriesByType("first-input") as Array<
        PerformanceEntry & { processingStart: number }
      >
      const fidEntry = fidEntries[0]

      // Memory (Chrome-specific, may not exist)
      const mem = (
        performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }
      ).memory

      result.performance = {
        loadTime: nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0,
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0,
        firstPaint: fp ? Math.round(fp.startTime) : 0,
        firstContentfulPaint: fcp ? Math.round(fcp.startTime) : 0,
        largestContentfulPaint: lcpEntry ? Math.round(lcpEntry.startTime) : 0,
        cumulativeLayoutShift: Math.round(cls * 1000) / 1000,
        firstInputDelay: fidEntry ? Math.round(fidEntry.processingStart - fidEntry.startTime) : 0,
        memoryUsed: mem?.usedJSHeapSize,
        memoryLimit: mem?.jsHeapSizeLimit,
      }
    } catch {
      // Performance API failure is non-critical
    }
  }

  return result
}
