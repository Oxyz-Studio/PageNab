// Clipboard multi-format: text/plain + image/png
// Uses chrome.scripting.executeScript to write to clipboard from the active tab's context,
// avoiding the need for an offscreen document.

export async function writeToClipboard(
  textContent: string,
  screenshotDataUrl: string,
): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) throw new Error("No active tab for clipboard write")

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: writeClipboardInPage,
    args: [textContent, screenshotDataUrl],
  })
}

// This function runs in the page context — must be self-contained
async function writeClipboardInPage(text: string, imageDataUrl: string): Promise<void> {
  const response = await fetch(imageDataUrl)
  const imageBlob = await response.blob()

  const clipboardItem = new ClipboardItem({
    "text/plain": new Blob([text], { type: "text/plain" }),
    "image/png": imageBlob,
  })

  await navigator.clipboard.write([clipboardItem])
}
