// Clipboard write: text, image, or both
// Uses chrome.scripting.executeScript to write to clipboard from the active tab's context,
// avoiding the need for an offscreen document.

import type { ClipboardMode } from "../lib/types"

export async function writeToClipboard(
  textContent: string,
  screenshotDataUrl: string,
  mode: ClipboardMode = "text",
): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("No active tab for clipboard write")

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: writeClipboardInPage,
    args: [textContent, screenshotDataUrl, mode],
  })
}

// This function runs in the page context — must be self-contained
async function writeClipboardInPage(
  text: string,
  imageDataUrl: string,
  mode: "text" | "image" | "both",
): Promise<void> {
  const items: Record<string, Blob> = {}

  if (mode === "text" || mode === "both") {
    items["text/plain"] = new Blob([text], { type: "text/plain" })
  }

  if (mode === "image" || mode === "both") {
    const response = await fetch(imageDataUrl)
    items["image/png"] = await response.blob()
  }

  await navigator.clipboard.write([new ClipboardItem(items)])
}
