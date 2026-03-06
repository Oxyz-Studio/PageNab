// Manages interactions tracking state via chrome.storage flag.
// The content script (src/contents/interactions.ts) is always loaded by Plasmo
// but only records events when the storage flag is enabled.

import type { InteractionsData } from "../lib/types"

export async function enableInteractionsTracking(): Promise<void> {
  await chrome.storage.local.set({ pagenab_interactions_enabled: true })
}

export async function disableInteractionsTracking(): Promise<void> {
  await chrome.storage.local.set({ pagenab_interactions_enabled: false })
}

export async function fetchInteractions(tabId: number): Promise<InteractionsData | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "GET_INTERACTIONS",
    })
    return response as InteractionsData
  } catch {
    // Content script not injected in this tab
    return null
  }
}
