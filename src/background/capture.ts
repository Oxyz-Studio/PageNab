import { CAPTURE_VERSION, DEFAULT_SETTINGS, generateScreenshotFilename, parseDomain, parsePath } from "../lib/config"
import type {
  CaptureMetadata,
  CaptureMode,
  CaptureResponse,
  CaptureResult,
  CaptureStats,
  ClipboardMode,
  ConsoleData,
  CustomOptions,
  InteractionsData,
  Preset,
  Settings,
} from "../lib/types"
import { collectPageData } from "../content/collector"
import type { CollectorOptions, CollectorResult } from "../content/collector"
import { enableInteractionsTracking, fetchInteractions } from "./interactions"
import { writeToClipboard } from "./clipboard"
import { cropScreenshot } from "./crop"
import { saveCapture } from "./history"
import { generateTextContent } from "../lib/format"

function shouldCapture(dataType: string, preset: Preset, customOptions?: CustomOptions): boolean {
  if (preset === "light") return dataType === "console" || dataType === "network"
  if (preset === "full") return true
  if (preset === "custom" && customOptions) {
    return customOptions[dataType as keyof CustomOptions] ?? false
  }
  return false
}

export async function capturePage(
  preset: Preset,
  mode: CaptureMode,
  customOptions?: CustomOptions,
  areaRect?: { x: number; y: number; width: number; height: number },
  /** When true, skip clipboard write (caller handles it — e.g. popup has user activation) */
  skipClipboard?: boolean,
  /** When true, skip downloads (caller handles them — e.g. area capture defers after openPopup) */
  skipDownloads?: boolean,
): Promise<CaptureResponse> {
  const startTime = Date.now()

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url) {
      return { success: false, error: "No active tab found" }
    }

    const restrictedPrefixes = [
      "chrome://",
      "chrome-extension://",
      "about:",
      "chrome:",
      "devtools://",
    ]
    if (restrictedPrefixes.some((prefix) => tab.url!.startsWith(prefix))) {
      return {
        success: false,
        error: "Cannot access this page (chrome:// pages are blocked)",
      }
    }

    // Determine what to capture based on preset
    const wants = (dataType: string) => shouldCapture(dataType, preset, customOptions)

    const collectorOptions: CollectorOptions = {
      console: wants("console"),
      network: wants("network"),
      dom: wants("dom"),
      cookies: wants("cookies"),
      storage: wants("storage"),
      performance: wants("performance"),
      consoleFilter: preset === "light" ? "errors-warnings" : "all",
      networkFilter: preset === "light" ? "failed" : "all",
    }

    // Ensure console patcher is installed (fallback for CSP-protected pages or stale tabs)
    if (collectorOptions.console) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: ensureConsolePatcher,
          world: "MAIN" as chrome.scripting.ExecutionWorld,
        })
      } catch {
        // Injection may fail on restricted pages — continue without console
      }
    }

    let collected: CollectorResult | null = null
    try {
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: collectPageData,
        args: [collectorOptions],
        world: "MAIN" as chrome.scripting.ExecutionWorld,
      })
      collected = injectionResults[0]?.result as CollectorResult | null
    } catch {
      // Content script injection may fail on some pages — continue with screenshot only
    }

    // Fetch interactions from persistent content script (if enabled)
    // Auto-enable tracking for future captures when preset requires interactions
    const wantsInteractions = wants("interactions")
    if (wantsInteractions) {
      await enableInteractionsTracking()
    }
    const interactions: InteractionsData | null = wantsInteractions
      ? await fetchInteractions(tab.id)
      : null

    // Capture screenshot
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
    })

    const domain = parseDomain(tab.url)
    const path = parsePath(tab.url)

    const dataTypes = ["console", "network", "dom", "cookies", "storage", "performance"] as const
    const capturedData = dataTypes.filter(
      (type) => collectorOptions[type] && collected?.[type],
    ) as string[]
    if (interactions) capturedData.push("interactions")

    const cssViewport = collected?.metadata.viewport ?? {
      width: tab.width ?? 0,
      height: tab.height ?? 0,
    }

    // Build metadata with page-accurate viewport/language/colorScheme
    const metadata: CaptureMetadata = {
      version: CAPTURE_VERSION,
      timestamp: new Date().toISOString(),
      url: tab.url,
      title: tab.title ?? "",
      domain,
      path,
      viewport: cssViewport,
      userAgent: navigator.userAgent,
      language: collected?.metadata.language ?? navigator.language,
      colorScheme: collected?.metadata.colorScheme ?? "light",
      captureMode: mode,
      areaRect: areaRect ?? null,
      preset,
      capturedData,
      captureVersion: CAPTURE_VERSION,
      captureDuration: 0,
    }

    // Crop area screenshot if needed
    let areaScreenshotDataUrl: string | undefined
    let areaFilename: string | undefined
    if (mode === "area" && areaRect) {
      areaScreenshotDataUrl = await cropScreenshot(screenshotDataUrl, areaRect, cssViewport)
      areaFilename = generateScreenshotFilename(domain, true)
    }

    const filename = generateScreenshotFilename(domain)

    metadata.captureDuration = Date.now() - startTime

    // Build stats for popup display
    const stats: CaptureStats = {}
    if (collected?.console) {
      stats.errors = collected.console.summary.errors
      stats.warnings = collected.console.summary.warnings
    }
    if (collected?.network) {
      stats.failedRequests = collected.network.summary.failed
      stats.totalRequests = collected.network.summary.total
    }
    if (collected?.dom) {
      stats.hasDom = true
    }
    if (collected?.cookies) {
      stats.cookiesCount = collected.cookies.summary.total
    }
    if (collected?.storage) {
      stats.storageKeys =
        collected.storage.localStorage.summary.keys + collected.storage.sessionStorage.summary.keys
    }
    if (collected?.performance) {
      stats.lcpTime = collected.performance.largestContentfulPaint
    }
    if (interactions) {
      stats.interactionsCount = interactions.summary.total
    }

    // Format text for clipboard
    // CollectorResult uses inline types (self-contained, no imports) — cast needed for
    // console (level: string vs ConsoleLevel union)
    const textContent = generateTextContent({
      metadata,
      screenshotPath: filename,
      areaScreenshotPath: areaFilename,
      console: collected?.console as ConsoleData | undefined,
      network: collected?.network,
      dom: collected?.dom,
      cookies: collected?.cookies,
      storage: collected?.storage,
      performance: collected?.performance,
      interactions: interactions ?? undefined,
    })
    const clipboardImage = areaScreenshotDataUrl ?? screenshotDataUrl

    // Run downloads, clipboard, history, and notification in parallel
    const parallelTasks: Promise<unknown>[] = []

    if (!skipDownloads) {
      parallelTasks.push(
        chrome.downloads.download({ url: screenshotDataUrl, filename, saveAs: false }),
      )
      if (areaScreenshotDataUrl && areaFilename) {
        parallelTasks.push(
          chrome.downloads.download({
            url: areaScreenshotDataUrl,
            filename: areaFilename,
            saveAs: false,
          }),
        )
      }
    }

    // Only write clipboard from background when not handled by caller (e.g. keyboard shortcut)
    if (!skipClipboard) {
      const settingsResult = await chrome.storage.local.get("pagenab_settings")
      const clipboardMode: ClipboardMode =
        (settingsResult.pagenab_settings as Settings | undefined)?.clipboardMode ??
        DEFAULT_SETTINGS.clipboardMode
      parallelTasks.push(
        writeToClipboard(textContent, clipboardImage, clipboardMode).catch(() => {
          // Clipboard write failure is non-critical
        }),
      )
    }

    await Promise.all([
      ...parallelTasks,
      saveCapture(
        screenshotDataUrl,
        metadata,
        filename,
        areaFilename,
        collected?.console as ConsoleData | undefined,
        collected?.network,
        collected?.dom,
        collected?.cookies,
        collected?.storage,
        interactions ?? undefined,
        collected?.performance,
      ).catch(() => {
        // History save failure is non-critical
      }),
      (async () => {
        try {
          const manifest = chrome.runtime.getManifest()
          const iconUrl = manifest.icons?.["128"] ?? manifest.icons?.["48"] ?? ""
          const notifSettingsResult = await chrome.storage.local.get("pagenab_settings")
          const notifClipMode =
            (notifSettingsResult.pagenab_settings as Settings | undefined)?.clipboardMode ??
            DEFAULT_SETTINGS.clipboardMode
          const clipMsg =
            notifClipMode === "text"
              ? "Text copied"
              : notifClipMode === "image"
                ? "Screenshot copied"
                : "Copied"
          await chrome.notifications.create(`pagenab-${Date.now()}`, {
            type: "basic",
            iconUrl,
            title: "PageNab",
            message: `Captured! ${clipMsg}. Paste in your AI assistant.\n${domain}`,
          })
        } catch {
          // Notification failure is non-critical
        }
      })(),
    ])

    const result: CaptureResult = {
      screenshot: areaScreenshotDataUrl ?? screenshotDataUrl,
      fullScreenshot: areaScreenshotDataUrl ? screenshotDataUrl : undefined,
      clipboardText: textContent,
      domain,
      url: tab.url,
      title: tab.title ?? "",
      screenshotPath: filename,
      areaScreenshotPath: areaFilename,
      capturedData,
      stats,
    }

    return { success: true, data: result }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown capture error"
    return { success: false, error: message }
  }
}

/**
 * Fallback console patcher — injected via executeScript({world: "MAIN"}) before collector.
 * Idempotent: no-op if __pagenab_console_buffer already exists (set by persistent content script).
 * Self-contained with zero imports (serialized for executeScript({func})).
 */
function ensureConsolePatcher(): void {
  if ((window as unknown as Record<string, unknown>).__pagenab_console_buffer) return
  const buffer: Array<Record<string, unknown>> = []
  const MAX = 200
  function fmt(args: ArrayLike<unknown>): string {
    return Array.prototype.slice
      .call(args)
      .map((x: unknown) => {
        if (typeof x === "string") return x
        try {
          return JSON.stringify(x)
        } catch {
          return String(x)
        }
      })
      .join(" ")
  }
  function push(e: Record<string, unknown>) {
    if (buffer.length >= MAX) buffer.shift()
    buffer.push(e)
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
  window.addEventListener("error", (e) => {
    push({
      level: "error",
      message: e.message || String(e.error),
      source: e.filename,
      line: e.lineno,
      column: e.colno,
      stack: (e.error as Error)?.stack,
      timestamp: new Date().toISOString(),
    })
  })
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason)
    const stack = e.reason instanceof Error ? e.reason.stack : undefined
    push({
      level: "error",
      message: `Unhandled rejection: ${msg}`,
      stack,
      timestamp: new Date().toISOString(),
    })
  })
  ;(window as unknown as Record<string, unknown>).__pagenab_console_buffer = buffer
}
