import type {
  CaptureMetadata,
  ConsoleData,
  CookiesData,
  ElementData,
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
  elementScreenshotPath?: string
  console?: ConsoleData
  network?: NetworkData
  dom?: string
  cookies?: CookiesData
  storage?: StorageData
  interactions?: InteractionsData
  performance?: PerformanceData
  element?: ElementData
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

export function extractSourcePath(source?: string): string {
  if (!source) return ""
  try {
    const url = new URL(source)
    return url.pathname + (url.hash || "")
  } catch {
    return source
  }
}

const ALL_DATA_TYPES = ["screenshot", "console", "network", "dom", "cookies", "storage", "performance", "interactions"]

export function parseBrowserInfo(userAgent: string): string {
  let browser = "Unknown"
  let os = "Unknown"

  if (/Edg\/(\d+)/.test(userAgent)) browser = `Edge ${RegExp.$1}`
  else if (/OPR\/(\d+)/.test(userAgent)) browser = `Opera ${RegExp.$1}`
  else if (/Chrome\/(\d+)/.test(userAgent)) browser = `Chrome ${RegExp.$1}`
  else if (/Firefox\/(\d+)/.test(userAgent)) browser = `Firefox ${RegExp.$1}`
  else if (/Safari\/(\d+)/.test(userAgent) && /Version\/(\d+)/.test(userAgent)) browser = `Safari ${RegExp.$1}`

  if (/Mac OS X/.test(userAgent)) os = "macOS"
  else if (/Windows/.test(userAgent)) os = "Windows"
  else if (/Linux/.test(userAgent)) os = "Linux"
  else if (/Android/.test(userAgent)) os = "Android"
  else if (/iOS|iPhone|iPad/.test(userAgent)) os = "iOS"

  return `${browser} (${os})`
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

export function extractPath(url: string): string {
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
  lines.push(`**Browser:** ${parseBrowserInfo(m.userAgent)}`)
  lines.push(`**Color scheme:** ${m.colorScheme}`)
  lines.push(`**Capture mode:** ${m.captureMode} | Preset: ${m.preset}`)

  // Build includes/excludes from capturedData
  const includes = ["screenshot", ...m.capturedData]
  if (m.preset === "light" && captured.has("console")) {
    includes[includes.indexOf("console")] = "console (errors only)"
  }
  if (m.preset === "light" && captured.has("network")) {
    includes[includes.indexOf("network")] = "network (failed only)"
  }
  const excludes = ALL_DATA_TYPES.filter((t) => t === "screenshot" ? false : !captured.has(t))
  lines.push(`**Includes:** ${includes.join(", ")}`)
  if (excludes.length > 0) {
    lines.push(`**Excludes:** ${excludes.join(", ")}`)
  }

  // Selected Element (before Console — primary data in element mode)
  if (captured.has("element") && input.element) {
    const el = input.element
    const tagDesc = `${el.tag}${el.id ? `#${el.id}` : ""}${el.classes.length > 0 ? `.${el.classes.join(".")}` : ""}`
    lines.push("")
    lines.push("## Selected Element")
    lines.push("")
    lines.push(`\`${tagDesc}\` in \`${el.selector}\``)

    const sizeParts = [`Size: ${el.boundingRect.width}x${el.boundingRect.height}px at (${el.boundingRect.x}, ${el.boundingRect.y})`]
    if (el.accessibility.role) sizeParts.push(`Role: ${el.accessibility.role}`)
    if (el.accessibility.ariaLabel) sizeParts.push(`Label: "${el.accessibility.ariaLabel}"`)
    lines.push(sizeParts.join(" | "))

    lines.push("")
    lines.push("### HTML")
    lines.push("```html")
    lines.push(el.outerHTML)
    lines.push("```")

    const styleEntries = Object.entries(el.computedStyles)
    if (styleEntries.length > 0) {
      lines.push("")
      lines.push("### Styles")
      lines.push("```css")
      for (const [prop, val] of styleEntries) {
        lines.push(`${prop}: ${val};`)
      }
      lines.push("```")
    }

    if (el.parentContext) {
      lines.push("")
      lines.push("### Parent")
      lines.push("```html")
      lines.push(el.parentContext)
      lines.push("```")
    }
  }

  // Console
  if (captured.has("console") && input.console) {
    lines.push("")
    lines.push("## Console")
    lines.push("")

    const s = input.console.summary
    const isLight = m.preset === "light"

    if (isLight) {
      // Light mode: summary with total + errors only (like network Light)
      if (s.errors === 0 && s.warnings === 0) {
        lines.push("No console errors.")
      } else {
        const parts: string[] = [`${s.total} entries`]
        parts.push(`${s.errors} error${s.errors !== 1 ? "s" : ""}`)
        parts.push(`${s.warnings} warning${s.warnings !== 1 ? "s" : ""}`)
        lines.push(parts.join(", "))
        lines.push("")

        const errors = input.console.logs.filter((l) => l.level === "error").slice(0, 5)
        for (const log of errors) {
          const location =
            log.source || log.line
              ? ` — \`${extractSourcePath(log.source)}${log.line ? `:${log.line}` : ""}\``
              : ""
          lines.push(`- **ERROR** (${formatTime(log.timestamp)}) ${truncate(log.message, 200)}${location}`)
          if (log.stack) {
            lines.push(formatStack(log.stack, 3))
          }
        }
      }
    } else {
      // Full/Custom mode: detailed summary + all entry types
      const parts: string[] = []
      if (s.errors > 0) parts.push(`${s.errors} error${s.errors !== 1 ? "s" : ""}`)
      if (s.warnings > 0) parts.push(`${s.warnings} warning${s.warnings !== 1 ? "s" : ""}`)
      if (s.logs > 0) parts.push(`${s.logs} log${s.logs !== 1 ? "s" : ""}`)
      if (s.info > 0) parts.push(`${s.info} info`)
      const debugCount = input.console.logs.filter((l) => l.level === "debug").length
      if (debugCount > 0) parts.push(`${debugCount} debug`)

      if (parts.length === 0) {
        lines.push("No console output.")
      } else {
        lines.push(parts.join(", "))
        lines.push("")

        const errors = input.console.logs.filter((l) => l.level === "error").slice(0, 5)
        for (const log of errors) {
          const location =
            log.source || log.line
              ? ` — \`${extractSourcePath(log.source)}${log.line ? `:${log.line}` : ""}\``
              : ""
          lines.push(`- **ERROR** (${formatTime(log.timestamp)}) ${truncate(log.message, 200)}${location}`)
          if (log.stack) {
            lines.push(formatStack(log.stack, 3))
          }
        }

        const warnings = input.console.logs.filter((l) => l.level === "warning").slice(0, 3)
        for (const warn of warnings) {
          lines.push(`- **WARN** (${formatTime(warn.timestamp)}) ${truncate(warn.message, 200)}`)
        }

        const logEntries = input.console.logs.filter((l) => l.level === "log").slice(0, 10)
        for (const log of logEntries) {
          lines.push(`- **LOG** (${formatTime(log.timestamp)}) ${truncate(log.message, 200)}`)
        }

        const infoEntries = input.console.logs.filter((l) => l.level === "info").slice(0, 5)
        for (const info of infoEntries) {
          lines.push(`- **INFO** (${formatTime(info.timestamp)}) ${truncate(info.message, 200)}`)
        }

        const debugEntries = input.console.logs.filter((l) => l.level === "debug").slice(0, 5)
        for (const dbg of debugEntries) {
          lines.push(`- **DEBUG** (${formatTime(dbg.timestamp)}) ${truncate(dbg.message, 200)}`)
        }
      }
    }
  }

  // Network
  if (captured.has("network") && input.network) {
    lines.push("")
    lines.push("## Network")
    lines.push("")

    const s = input.network.summary

    if (input.network.all && input.network.all.length > 0) {
      // Full mode: show all requests
      const parts: string[] = [`${s.total} requests`]
      if (s.failed > 0) parts.push(`${s.failed} failed`)
      if (s.slow > 0) parts.push(`${s.slow} slow`)
      lines.push(parts.join(", "))
      lines.push("")

      for (const req of input.network.all.slice(0, 50)) {
        const path = extractPath(req.url)
        const method = req.method ?? ""
        const isFailed = req.status >= 400
        const isSlow = !isFailed && req.duration > 3000
        const prefix = isFailed ? "**FAIL** " : isSlow ? "**SLOW** " : ""
        const methodStr = method ? `${method} ` : ""
        const sizeStr = req.size && req.size > 0 ? `, ${formatBytes(req.size)}` : ""
        lines.push(`- ${prefix}${methodStr}\`${path}\` → ${req.status} (${req.duration}ms${sizeStr}, ${req.type})`)
        if (isFailed) {
          if (req.requestBodyPreview) lines.push(`  Request: ${truncate(req.requestBodyPreview, 200)}`)
          if (req.responseBodyPreview) lines.push(`  Response: ${truncate(req.responseBodyPreview, 200)}`)
        }
      }
      if (input.network.all.length > 50) {
        lines.push(`- ... and ${input.network.all.length - 50} more`)
      }
    } else {
      // Light mode: only failed/slow
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
          const method = req.method ?? ""
          const methodStr = method ? `${method} ` : ""
          lines.push(`- **FAIL** ${methodStr}\`${path}\` → ${req.status} ${req.statusText} (${req.type}, ${req.duration}ms)`)
          if (req.requestBodyPreview) lines.push(`  Request: ${truncate(req.requestBodyPreview, 200)}`)
          if (req.responseBodyPreview) lines.push(`  Response: ${truncate(req.responseBodyPreview, 200)}`)
        }

        for (const req of input.network.slow.slice(0, 3)) {
          const path = extractPath(req.url)
          const method = req.method ?? ""
          const methodStr = method ? `${method} ` : ""
          lines.push(`- **SLOW** ${methodStr}\`${path}\` → ${req.status} (${req.duration}ms, ${req.type})`)
        }
      }
    }
  }

  // Cookies
  if (captured.has("cookies") && input.cookies) {
    lines.push("")
    lines.push("## Cookies")
    lines.push("")
    const cookies = input.cookies.cookies
    if (cookies.length === 0) {
      lines.push("No cookies.")
    } else if (cookies.length < 10) {
      lines.push(cookies.map((c) => `${c.name}=${c.value}`).join(" | "))
    } else {
      lines.push(`${input.cookies.summary.total} cookies`)
      lines.push("")
      for (const c of cookies) {
        lines.push(`- ${c.name}: \`${c.value}\``)
      }
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
    for (const entry of ls.entries) {
      lines.push(`- [local] ${entry.key}: \`${truncate(entry.value, 100)}\``)
    }
    for (const entry of ss.entries) {
      lines.push(`- [session] ${entry.key}: \`${truncate(entry.value, 100)}\``)
    }
  }

  // Performance
  if (captured.has("performance") && input.performance) {
    lines.push("")
    lines.push("## Performance")
    lines.push("")
    const p = input.performance
    lines.push(`- FP: ${p.firstPaint}ms | FCP: ${p.firstContentfulPaint}ms | LCP: ${p.largestContentfulPaint}ms`)
    lines.push(`- Load: ${p.loadTime}ms | DOMContentLoaded: ${p.domContentLoaded}ms`)
    lines.push(`- CLS: ${p.cumulativeLayoutShift} | FID: ${p.firstInputDelay}ms`)
    if (p.memoryUsed && p.memoryLimit) {
      lines.push(`- Memory: ${formatBytes(p.memoryUsed)} / ${formatBytes(p.memoryLimit)}`)
    }
  }

  // Interactions
  if (captured.has("interactions") && input.interactions) {
    lines.push("")
    lines.push("## Interactions")
    lines.push("")
    const allEvents = [...input.interactions.events].reverse()
    lines.push(`${input.interactions.summary.total} events (most recent first)`)
    lines.push("")
    for (const event of allEvents) {
      lines.push(`- [${event.type}] ${formatInteraction(event)}`)
    }
  }

  // Screenshots
  lines.push("")
  lines.push("## Screenshots")
  lines.push("")
  if (m.captureMode === "element" && input.elementScreenshotPath) {
    lines.push(`- Full page: \`~/Downloads/${input.screenshotPath}\``)
    lines.push(`- Element: \`~/Downloads/${input.elementScreenshotPath}\``)
  } else if (m.captureMode === "area" && input.areaScreenshotPath) {
    lines.push(`- Full page: \`~/Downloads/${input.screenshotPath}\``)
    lines.push(`- Area: \`~/Downloads/${input.areaScreenshotPath}\``)
  } else {
    lines.push(`\`~/Downloads/${input.screenshotPath}\``)
  }

  // DOM (always last)
  if (captured.has("dom") && input.dom) {
    const domSizeBytes = input.dom.length
    const domSizeStr = formatBytes(domSizeBytes)
    const isTruncated = input.dom.includes("<!-- truncated by PageNab -->")
    const sizeLabel = isTruncated ? `${domSizeStr}, truncated` : domSizeStr
    lines.push("")
    lines.push(`## DOM (${sizeLabel})`)
    lines.push("")
    lines.push("```html")
    lines.push(input.dom)
    lines.push("```")
  }

  // Footer
  lines.push("")
  lines.push("---")
  lines.push(`Captured by PageNab v${m.captureVersion}`)

  return lines.join("\n")
}
