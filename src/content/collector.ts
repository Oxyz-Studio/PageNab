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
  consoleFilter: "errors-warnings" | "all"
  networkFilter: "failed" | "failed-slow" | "all"
}

export interface CollectorResult {
  metadata: {
    viewport: { width: number; height: number }
    language: string
    colorScheme: "light" | "dark"
  }
  console?: {
    summary: { errors: number; warnings: number; logs: number; info: number }
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
      status: number
      statusText: string
      type: string
      duration: number
      timestamp: string
      requestHeaders: Record<string, string>
      responseHeaders: Record<string, string>
      initiator?: string
    }>
    slow: Array<{
      url: string
      status: number
      statusText: string
      type: string
      duration: number
      timestamp: string
      requestHeaders: Record<string, string>
      responseHeaders: Record<string, string>
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
  if (options.console) {
    type LogEntry = NonNullable<CollectorResult["console"]>["logs"][number]
    const logs: LogEntry[] = []
    const summary = { errors: 0, warnings: 0, logs: 0, info: 0 }

    const origError = console.error
    const origWarn = console.warn
    const origLog = console.log
    const origInfo = console.info

    function formatArgs(args: unknown[]): string {
      return args
        .map((a) => {
          if (typeof a === "string") return a
          try {
            return JSON.stringify(a)
          } catch {
            return String(a)
          }
        })
        .join(" ")
    }

    function pushLog(level: string, args: unknown[]) {
      if (logs.length >= 100) return
      logs.push({ level, message: formatArgs(args), timestamp: new Date().toISOString() })
      switch (level) {
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

    console.error = (...args: unknown[]) => {
      pushLog("error", args)
      origError.apply(console, args)
    }
    console.warn = (...args: unknown[]) => {
      pushLog("warning", args)
      origWarn.apply(console, args)
    }
    if (options.consoleFilter === "all") {
      console.log = (...args: unknown[]) => {
        pushLog("log", args)
        origLog.apply(console, args)
      }
      console.info = (...args: unknown[]) => {
        pushLog("info", args)
        origInfo.apply(console, args)
      }
    }

    const errorHandler = (e: ErrorEvent) => {
      if (logs.length >= 100) return
      logs.push({
        level: "error",
        message: e.message || String(e.error),
        source: e.filename,
        line: e.lineno,
        column: e.colno,
        stack: e.error?.stack,
        timestamp: new Date().toISOString(),
      })
      summary.errors++
    }
    const rejectionHandler = (e: PromiseRejectionEvent) => {
      if (logs.length >= 100) return
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason)
      const stack = e.reason instanceof Error ? e.reason.stack : undefined
      logs.push({
        level: "error",
        message: `Unhandled rejection: ${msg}`,
        stack,
        timestamp: new Date().toISOString(),
      })
      summary.errors++
    }

    window.addEventListener("error", errorHandler)
    window.addEventListener("unhandledrejection", rejectionHandler)

    const filteredLogs =
      options.consoleFilter === "errors-warnings"
        ? logs.filter((l) => l.level === "error" || l.level === "warning")
        : logs

    // Recompute summary from the filtered logs so counts match content
    const filteredSummary = { errors: 0, warnings: 0, logs: 0, info: 0 }
    for (const l of filteredLogs) {
      switch (l.level) {
        case "error":
          filteredSummary.errors++
          break
        case "warning":
          filteredSummary.warnings++
          break
        case "log":
          filteredSummary.logs++
          break
        case "info":
          filteredSummary.info++
          break
      }
    }

    result.console = { summary: filteredSummary, logs: filteredLogs }

    console.error = origError
    console.warn = origWarn
    console.log = origLog
    console.info = origInfo
    window.removeEventListener("error", errorHandler)
    window.removeEventListener("unhandledrejection", rejectionHandler)
  }

  // === Network ===
  if (options.network) {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[]

    interface NetEntry {
      url: string
      status: number
      statusText: string
      type: string
      duration: number
      timestamp: string
      requestHeaders: Record<string, string>
      responseHeaders: Record<string, string>
      initiator?: string
    }

    const failed: NetEntry[] = []
    const slow: NetEntry[] = []
    const all: NetEntry[] = []
    const total = entries.length

    for (const entry of entries) {
      const status =
        "responseStatus" in entry
          ? (entry as PerformanceResourceTiming & { responseStatus: number }).responseStatus
          : 0
      const duration = Math.round(entry.duration)
      const ts = new Date(performance.timeOrigin + entry.startTime).toISOString()

      const isFailed = status >= 400
      const isSlow = !isFailed && duration > 3000 && status > 0

      const netEntry: NetEntry = {
        url: entry.name,
        status,
        statusText: `HTTP ${status}`,
        type: entry.initiatorType,
        duration,
        timestamp: ts,
        requestHeaders: {},
        responseHeaders: {},
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
