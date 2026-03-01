import { CAPTURE_VERSION, generateScreenshotFilename, parseDomain, parsePath } from "../lib/config"
import type {
  CaptureMetadata,
  CaptureMode,
  CaptureResponse,
  CaptureResult,
  CaptureStats,
  ConsoleData,
  CustomOptions,
  InteractionsData,
  Preset,
} from "../lib/types"
import { collectPageData } from "../content/collector"
import type { CollectorOptions, CollectorResult } from "../content/collector"
import { fetchInteractions } from "./interactions"
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
      networkFilter: preset === "light" ? "failed" : "failed-slow",
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
    const interactions: InteractionsData | null = wants("interactions")
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
    const downloadPromises: Promise<unknown>[] = [
      chrome.downloads.download({ url: screenshotDataUrl, filename, saveAs: false }),
    ]
    if (areaScreenshotDataUrl && areaFilename) {
      downloadPromises.push(
        chrome.downloads.download({
          url: areaScreenshotDataUrl,
          filename: areaFilename,
          saveAs: false,
        }),
      )
    }

    const parallelTasks: Promise<unknown>[] = [...downloadPromises]

    // Only write clipboard from background when not handled by caller (e.g. keyboard shortcut)
    if (!skipClipboard) {
      parallelTasks.push(
        writeToClipboard(textContent, clipboardImage).catch(() => {
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
          await chrome.notifications.create(`pagenab-${Date.now()}`, {
            type: "basic",
            iconUrl,
            title: "PageNab",
            message: `Captured! Paste in your AI assistant.\n${domain}`,
          })
        } catch {
          // Notification failure is non-critical
        }
      })(),
    ])

    const result: CaptureResult = {
      screenshot: areaScreenshotDataUrl ?? screenshotDataUrl,
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
