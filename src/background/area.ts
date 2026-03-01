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
    return capturePage(preset, "area", customOptions, rect)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Area capture failed"
    return { success: false, error: message }
  }
}
