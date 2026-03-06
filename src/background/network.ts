// Manages network capture state via chrome.storage flag.
// The content script (src/contents/network-capture.ts) is always loaded by Plasmo
// but intercepts fetch/XHR from document_start in MAIN world.
// The buffer is read by collector.ts during capture.

export async function enableNetworkCapture(): Promise<void> {
  await chrome.storage.local.set({ pagenab_network_capture_enabled: true })
}

export async function disableNetworkCapture(): Promise<void> {
  await chrome.storage.local.set({ pagenab_network_capture_enabled: false })
}

export async function fetchNetworkBuffer(tabId: number): Promise<NetworkBufferEntry[] | null> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const win = window as unknown as Record<string, unknown>
        return (win.__pagenab_network_buffer as unknown[]) ?? []
      },
      world: "MAIN" as chrome.scripting.ExecutionWorld,
    })
    return (results[0]?.result as NetworkBufferEntry[]) ?? null
  } catch {
    return null
  }
}

export interface NetworkBufferEntry {
  url: string
  method: string
  status: number
  statusText: string
  duration: number
  requestContentType?: string
  responseContentType?: string
  requestBodyPreview?: string
  responseBodyPreview?: string
  timestamp: string
}
