// MAIN world content script that captures console output from page load.
// Runs directly in the page's JS context (world: "MAIN"), bypassing CSP restrictions.
// Stores output in window.__pagenab_console_buffer, read by collector.ts.
// NOTE: No access to chrome.* APIs in MAIN world — only window/console/DOM globals.

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  all_frames: false,
  world: "MAIN",
}

const win = window as unknown as Record<string, unknown>

// Idempotence guard — don't patch twice
if (!win.__pagenab_console_buffer) {
  const MAX = 200

  interface ConsoleEntry {
    level: string
    message: string
    timestamp: string
    source?: string
    line?: number
    column?: number
    stack?: string
  }

  const buffer: ConsoleEntry[] = []

  function fmt(args: ArrayLike<unknown>): string {
    return Array.prototype.slice.call(args).map((x: unknown) => {
      if (typeof x === "string") return x
      try {
        return JSON.stringify(x)
      } catch {
        return String(x)
      }
    }).join(" ")
  }

  function push(entry: ConsoleEntry): void {
    if (buffer.length >= MAX) buffer.shift()
    buffer.push(entry)
  }

  const origError = console.error
  const origWarn = console.warn
  const origLog = console.log
  const origInfo = console.info

  console.error = function (...args: unknown[]) {
    push({ level: "error", message: fmt(args), timestamp: new Date().toISOString() })
    origError.apply(console, args)
  }
  console.warn = function (...args: unknown[]) {
    push({ level: "warning", message: fmt(args), timestamp: new Date().toISOString() })
    origWarn.apply(console, args)
  }
  console.log = function (...args: unknown[]) {
    push({ level: "log", message: fmt(args), timestamp: new Date().toISOString() })
    origLog.apply(console, args)
  }
  console.info = function (...args: unknown[]) {
    push({ level: "info", message: fmt(args), timestamp: new Date().toISOString() })
    origInfo.apply(console, args)
  }

  window.addEventListener("error", (e: ErrorEvent) => {
    push({
      level: "error",
      message: e.message || String(e.error),
      source: e.filename,
      line: e.lineno,
      column: e.colno,
      stack: e.error?.stack,
      timestamp: new Date().toISOString(),
    })
  })

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason)
    const stack = e.reason instanceof Error ? e.reason.stack : undefined
    push({
      level: "error",
      message: "Unhandled rejection: " + msg,
      stack,
      timestamp: new Date().toISOString(),
    })
  })

  win.__pagenab_console_buffer = buffer
}
