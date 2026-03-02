import type { CaptureResponse, CustomOptions, Preset } from "../lib/types"
import { startAreaSelection } from "../content/area-selector"
import type { AreaRect } from "../content/area-selector"
import { capturePage } from "./capture"

export async function startAreaCapture(
  preset: Preset,
  customOptions?: CustomOptions,
): Promise<CaptureResponse> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: "No active tab found" }
    }

    // Small delay so the popup has time to close before the overlay appears.
    // Without this, the popup may still be visible and steal focus.
    await new Promise((r) => setTimeout(r, 150))

    // Inject the area selector into the page
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: startAreaSelection,
      world: "MAIN" as chrome.scripting.ExecutionWorld,
    })

    const rect = injectionResults[0]?.result as AreaRect | null
    if (!rect) {
      return { success: false, error: "Area selection cancelled" }
    }

    // Proceed with full capture, passing the area rect
    // skipDownloads=true so the download bubble doesn't block openPopup
    const response = await capturePage(preset, "area", customOptions, rect, false, true)

    // Store result so the popup can show success view when reopened
    if (response.success) {
      try {
        await chrome.storage.session.set({
          pagenab_area_result: { data: response.data, timestamp: Date.now() },
        })
      } catch {
        // session storage not available — notification is the fallback
      }
      // Try to reopen popup to show success view (Chrome 127+)
      try {
        await (chrome.action as unknown as { openPopup?: () => Promise<void> }).openPopup?.()
      } catch {
        // openPopup not available — user can click the icon manually
      }
      // Now trigger downloads — the popup is already open so the download bubble
      // won't interfere with it
      try {
        const dlPromises: Promise<unknown>[] = [
          chrome.downloads.download({
            url: response.data.fullScreenshot ?? response.data.screenshot,
            filename: response.data.screenshotPath,
            saveAs: false,
          }),
        ]
        if (response.data.areaScreenshotPath) {
          dlPromises.push(
            chrome.downloads.download({
              url: response.data.screenshot,
              filename: response.data.areaScreenshotPath,
              saveAs: false,
            }),
          )
        }
        await Promise.all(dlPromises)
      } catch {
        // Download failure is non-critical
      }
    }

    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : "Area capture failed"
    return { success: false, error: message }
  }
}
