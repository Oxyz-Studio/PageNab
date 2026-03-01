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
    .map((l) => `  ${l.trim()}`)
    .join("\n")
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
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

export function generateTextContent(input: FormatInput): string {
  const lines: string[] = []
  const m = input.metadata
  const captured = new Set(m.capturedData)

  // Header
  lines.push("# Web page capture")
  lines.push("")
  lines.push(`**URL:** ${m.url}`)
  if (m.title) {
    lines.push(`**Title:** ${m.title}`)
  }
  lines.push(`**Time:** ${formatDate(m.timestamp)}`)
  lines.push(`**Viewport:** ${m.viewport.width}x${m.viewport.height}`)
  lines.push(`**Language:** ${m.language}`)

  // Console
  if (captured.has("console") && input.console) {
    lines.push("")
    lines.push("## Console")
    lines.push("")

    const s = input.console.summary
    const parts: string[] = []
    if (s.errors > 0) parts.push(`${s.errors} error${s.errors !== 1 ? "s" : ""}`)
    if (s.warnings > 0) parts.push(`${s.warnings} warning${s.warnings !== 1 ? "s" : ""}`)
    if (s.logs > 0) parts.push(`${s.logs} log${s.logs !== 1 ? "s" : ""}`)

    if (parts.length === 0) {
      lines.push("No errors or warnings.")
    } else {
      lines.push(parts.join(", "))
      lines.push("")

      const errors = input.console.logs.filter((l) => l.level === "error").slice(0, 5)
      for (const log of errors) {
        const location =
          log.source || log.line
            ? ` — \`${extractFile(log.source)}${log.line ? `:${log.line}` : ""}\``
            : ""
        lines.push(`- **ERROR** ${truncate(log.message, 200)}${location}`)
        if (log.stack) {
          lines.push(formatStack(log.stack, 3))
        }
      }

      const warnings = input.console.logs.filter((l) => l.level === "warning").slice(0, 3)
      for (const warn of warnings) {
        lines.push(`- **WARN** ${truncate(warn.message, 200)}`)
      }
    }
  }

  // Network
  if (captured.has("network") && input.network) {
    lines.push("")
    lines.push("## Network")
    lines.push("")

    const s = input.network.summary
    const hasFailed = s.failed > 0
    const hasSlow = s.slow > 0

    if (!hasFailed && !hasSlow) {
      lines.push("No failed requests.")
    } else {
      const parts: string[] = []
      if (s.total > 0) parts.push(`${s.total} requests`)
      if (hasFailed) parts.push(`${s.failed} failed`)
      if (hasSlow) parts.push(`${s.slow} slow`)
      lines.push(parts.join(", "))
      lines.push("")

      for (const req of input.network.failed.slice(0, 5)) {
        const path = extractPath(req.url)
        lines.push(`- **FAIL** \`${path}\` → ${req.status} ${req.statusText} (${req.type})`)
      }

      for (const req of input.network.slow.slice(0, 3)) {
        const path = extractPath(req.url)
        lines.push(`- **SLOW** \`${path}\` → ${req.status} (${req.duration}ms, ${req.type})`)
      }
    }
  }

  // Cookies
  if (captured.has("cookies") && input.cookies) {
    lines.push("")
    lines.push("## Cookies")
    lines.push("")
    lines.push(`${input.cookies.summary.total} cookies`)
    lines.push("")
    for (const c of input.cookies.cookies) {
      lines.push(`- ${c.name}: \`${c.value}\``)
    }
  }

  // Storage
  if (captured.has("storage") && input.storage) {
    lines.push("")
    lines.push("## Storage")
    lines.push("")
    const ls = input.storage.localStorage
    const ss = input.storage.sessionStorage
    lines.push(`${ls.summary.keys} localStorage, ${ss.summary.keys} sessionStorage`)
    lines.push("")
    for (const entry of ls.entries.slice(0, 3)) {
      lines.push(`- [local] ${entry.key}: \`${truncate(entry.value, 100)}\``)
    }
    for (const entry of ss.entries.slice(0, 3)) {
      lines.push(`- [session] ${entry.key}: \`${truncate(entry.value, 100)}\``)
    }
  }

  // Performance
  if (captured.has("performance") && input.performance) {
    lines.push("")
    lines.push("## Performance")
    lines.push("")
    const p = input.performance
    lines.push(`- Load: ${p.loadTime}ms | DOMContentLoaded: ${p.domContentLoaded}ms`)
    lines.push(
      `- LCP: ${p.largestContentfulPaint}ms | CLS: ${p.cumulativeLayoutShift} | FID: ${p.firstInputDelay}ms`,
    )
    if (p.memoryUsed && p.memoryLimit) {
      lines.push(`- Memory: ${formatBytes(p.memoryUsed)} / ${formatBytes(p.memoryLimit)}`)
    }
  }

  // Interactions
  if (captured.has("interactions") && input.interactions) {
    lines.push("")
    const recentEvents = input.interactions.events.slice(-5)
    lines.push("## Interactions")
    lines.push("")
    lines.push(`${input.interactions.summary.total} events (last ${recentEvents.length})`)
    lines.push("")
    for (const event of recentEvents) {
      lines.push(`- [${event.type}] ${formatInteraction(event)}`)
    }
  }

  // Screenshots
  lines.push("")
  lines.push("## Screenshots")
  lines.push("")
  if (m.captureMode === "area" && input.areaScreenshotPath) {
    lines.push(`- Full page: \`~/Downloads/${input.screenshotPath}\``)
    lines.push(`- Area: \`~/Downloads/${input.areaScreenshotPath}\``)
  } else {
    lines.push(`\`~/Downloads/${input.screenshotPath}\``)
  }

  // DOM (always last)
  if (captured.has("dom") && input.dom) {
    lines.push("")
    lines.push("## DOM")
    lines.push("")
    lines.push("```html")
    lines.push(input.dom)
    lines.push("```")
  }

  return lines.join("\n")
}
