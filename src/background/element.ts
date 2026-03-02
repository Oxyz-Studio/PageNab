import type { CaptureResponse, CustomOptions, Preset } from "../lib/types"
import { startElementSelection } from "../content/element-selector"
import type { ElementSelectionResult } from "../content/element-selector"
import { capturePage } from "./capture"

export async function startElementCapture(
  preset: Preset,
  customOptions?: CustomOptions,
): Promise<CaptureResponse> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return { success: false, error: "No active tab found" }
    }

    // Small delay so the popup has time to close before the selector appears.
    await new Promise((r) => setTimeout(r, 150))

    // Inject the element selector into the page
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: startElementSelection,
      world: "MAIN" as chrome.scripting.ExecutionWorld,
    })

    const result = injectionResults[0]?.result as ElementSelectionResult | null
    if (!result) {
      return { success: false, error: "Element selection cancelled" }
    }

    // Proceed with capture, passing the element rect for cropping and element data
    // skipDownloads=true so the download bubble doesn't block openPopup
    const response = await capturePage(
      preset,
      "element",
      customOptions,
      result.rect,
      false,
      true,
      result.element,
    )

    // Store result so the popup can show success view when reopened
    if (response.success) {
      try {
        await chrome.storage.session.set({
          pagenab_element_result: { data: response.data, timestamp: Date.now() },
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
      // Trigger downloads after popup is open
      try {
        const dlPromises: Promise<unknown>[] = [
          chrome.downloads.download({
            url: response.data.fullScreenshot ?? response.data.screenshot,
            filename: response.data.screenshotPath,
            saveAs: false,
          }),
        ]
        if (response.data.elementScreenshotPath) {
          dlPromises.push(
            chrome.downloads.download({
              url: response.data.screenshot,
              filename: response.data.elementScreenshotPath,
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
    const message = err instanceof Error ? err.message : "Element capture failed"
    return { success: false, error: message }
  }
}
