import type {
  CaptureMetadata,
  ConsoleData,
  CookiesData,
  InteractionsData,
  NetworkData,
  PerformanceData,
  StorageData,
} from "./types"
import { truncate } from "./sanitize"

export interface FormatInput {
  metadata: CaptureMetadata
  screenshotPath: string
  areaScreenshotPath?: string
  console?: ConsoleData
  network?: NetworkData
  dom?: string
  cookies?: CookiesData
  storage?: StorageData
  interactions?: InteractionsData
  performance?: PerformanceData
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}

function extractFile(source?: string): string {
  if (!source) return ""
  try {
    const url = new URL(source)
    return url.pathname.split("/").pop() ?? source
  } catch {
    return source
  }
}

function formatStack(stack: string, maxLines: number): string {
  return stack
    .split("\n")
    .slice(0, maxLines)
    .map((l) => l.trim())
    .join("\n                 ")
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function generateTextContent(input: FormatInput): string {
  const lines: string[] = []
  const m = input.metadata
  const captured = new Set(m.capturedData)

  // Header
  lines.push(`[PageNab] ${m.url}`)
  lines.push(
    `Captured: ${formatDate(m.timestamp)} | Viewport: ${m.viewport.width}x${m.viewport.height} | Lang: ${m.language} | Preset: ${m.preset.charAt(0).toUpperCase() + m.preset.slice(1)}`,
  )
  lines.push("")

  // Console
  if (captured.has("console") && input.console) {
    const s = input.console.summary
    const parts: string[] = []
    if (s.errors > 0) parts.push(`${s.errors} error${s.errors !== 1 ? "s" : ""}`)
    if (s.warnings > 0) parts.push(`${s.warnings} warning${s.warnings !== 1 ? "s" : ""}`)
    if (m.preset !== "light" && s.logs > 0) parts.push(`${s.logs} log${s.logs !== 1 ? "s" : ""}`)
    lines.push(`Console: ${parts.join(", ") || "clean"}`)

    const errors = input.console.logs.filter((l) => l.level === "error").slice(0, 5)
    for (const log of errors) {
      lines.push(`  [ERROR] ${truncate(log.message, 200)}`)
      if (log.source || log.line) {
        lines.push(`          ${extractFile(log.source)}${log.line ? `:${log.line}` : ""}`)
      }
      if (log.stack) {
        lines.push(`          Stack: ${formatStack(log.stack, 3)}`)
      }
    }

    const warnings = input.console.logs.filter((l) => l.level === "warning").slice(0, 3)
    for (const warn of warnings) {
      lines.push(`  [WARN]  ${truncate(warn.message, 200)}`)
    }
    lines.push("")
  }

  // Network
  if (captured.has("network") && input.network) {
    const s = input.network.summary
    const parts: string[] = []
    if (m.preset !== "light") parts.push(`${s.total} total`)
    parts.push(`${s.failed} failed`)
    if (m.preset !== "light" && s.slow > 0) parts.push(`${s.slow} slow`)
    lines.push(`Network: ${parts.join(", ")}`)

    for (const req of input.network.failed.slice(0, 5)) {
      const path = extractPath(req.url)
      lines.push(`  [FAIL] ${path} → ${req.status} ${req.statusText} (${req.type})`)
    }

    if (m.preset !== "light") {
      for (const req of input.network.slow.slice(0, 3)) {
        const path = extractPath(req.url)
        lines.push(`  [SLOW] ${path} → ${req.status} (${req.duration}ms, ${req.type})`)
      }
    }
    lines.push("")
  }

  // Cookies
  if (captured.has("cookies") && input.cookies) {
    lines.push(`Cookies: ${input.cookies.summary.total} cookies`)
    const cookieList = input.cookies.cookies.map((c) => `${c.name}: ${c.value}`).join(" | ")
    lines.push(`  ${truncate(cookieList, 200)}`)
    lines.push("")
  }

  // Storage
  if (captured.has("storage") && input.storage) {
    const ls = input.storage.localStorage
    const ss = input.storage.sessionStorage
    lines.push(
      `Storage: ${ls.summary.keys} localStorage keys, ${ss.summary.keys} sessionStorage keys`,
    )
    for (const entry of ls.entries.slice(0, 3)) {
      lines.push(`  [local] ${entry.key}: ${truncate(entry.value, 100)}`)
    }
    for (const entry of ss.entries.slice(0, 3)) {
      lines.push(`  [session] ${entry.key}: ${truncate(entry.value, 100)}`)
    }
    lines.push("")
  }

  // Performance
  if (captured.has("performance") && input.performance) {
    const p = input.performance
    lines.push("Performance:")
    lines.push(`  Load: ${p.loadTime}ms | DOMContentLoaded: ${p.domContentLoaded}ms`)
    lines.push(
      `  LCP: ${p.largestContentfulPaint}ms | CLS: ${p.cumulativeLayoutShift} | FID: ${p.firstInputDelay}ms`,
    )
    if (p.memoryUsed && p.memoryLimit) {
      lines.push(`  Memory: ${formatBytes(p.memoryUsed)} / ${formatBytes(p.memoryLimit)}`)
    }
    lines.push("")
  }

  // Interactions
  if (captured.has("interactions") && input.interactions) {
    const recentEvents = input.interactions.events.slice(-5)
    lines.push(
      `Interactions: ${input.interactions.summary.total} events (showing last ${recentEvents.length})`,
    )
    for (const event of recentEvents) {
      lines.push(`  [${event.type}] ${formatInteraction(event)}`)
    }
    lines.push("")
  }

  // Screenshot path(s)
  if (m.captureMode === "area" && input.areaScreenshotPath) {
    lines.push(`Screenshot (full page): ~/Downloads/${input.screenshotPath}`)
    lines.push(`Screenshot (area): ~/Downloads/${input.areaScreenshotPath}`)
  } else {
    lines.push(`Screenshot: ~/Downloads/${input.screenshotPath}`)
  }

  // DOM (always last)
  if (captured.has("dom") && input.dom) {
    lines.push("")
    lines.push("--- DOM Snapshot ---")
    lines.push(input.dom)
  }

  return lines.join("\n")
}

function extractPath(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url
  }
}

function formatInteraction(event: {
  type: string
  target?: string
  text?: string
  direction?: string
  distance?: number
  value?: string
  timestamp: string
}): string {
  switch (event.type) {
    case "click":
      return `${event.target ?? "unknown"} ${event.text ? `"${truncate(event.text, 30)}"` : ""} (${formatTime(event.timestamp)})`
    case "scroll":
      return `${event.direction ?? "?"} ${event.distance ?? 0}px (${formatTime(event.timestamp)})`
    case "input":
    case "change":
      return `${event.target ?? "unknown"} *** (${formatTime(event.timestamp)})`
    default:
      return `(${formatTime(event.timestamp)})`
  }
}
