import { capturePage } from "./capture"
import { startAreaCapture } from "./area"
import { startElementCapture } from "./element"
import { enableInteractionsTracking, disableInteractionsTracking } from "./interactions"
import { getCaptures, deleteCapture, getStorageUsage } from "./history"
import { DEFAULT_SETTINGS } from "../lib/config"
import type { PopupMessage, Settings } from "../lib/types"

const SETTINGS_KEY = "pagenab_settings"

// Auto-enable interactions tracking on startup if preset requires it
chrome.storage.local.get(SETTINGS_KEY).then((result) => {
  const settings = (result[SETTINGS_KEY] as Settings) ?? DEFAULT_SETTINGS
  const needsTracking =
    settings.preset === "light" ||
    settings.preset === "full" ||
    (settings.preset === "custom" && settings.customOptions?.interactions)
  if (needsTracking) {
    enableInteractionsTracking()
  }
})

// Keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "capture-page") {
    const result = await chrome.storage.local.get(SETTINGS_KEY)
    const settings = (result[SETTINGS_KEY] as Settings) ?? DEFAULT_SETTINGS
    const mode = settings.screenshotMode
    const preset = settings.preset
    const customOptions = preset === "custom" ? settings.customOptions : undefined

    if (mode === "area") {
      await startAreaCapture(preset, customOptions)
    } else if (mode === "element") {
      await startElementCapture(preset, customOptions)
    } else {
      await capturePage(preset, mode, customOptions)
    }
  }
})

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse: (response: unknown) => void) => {
    const msg = message as PopupMessage
    switch (msg.type) {
      case "CAPTURE_PAGE":
        capturePage(msg.preset, msg.mode, msg.customOptions, undefined, true).then(sendResponse)
        return true

      case "START_AREA_CAPTURE":
        startAreaCapture(msg.preset, msg.customOptions).then(sendResponse)
        return true

      case "START_ELEMENT_CAPTURE":
        startElementCapture(msg.preset, msg.customOptions).then(sendResponse)
        return true

      case "UPDATE_INTERACTIONS_TRACKING": {
        const toggle = msg.enabled ? enableInteractionsTracking : disableInteractionsTracking
        toggle().then(() => sendResponse({ success: true }))
        return true
      }

      case "GET_CAPTURES":
        getCaptures().then(sendResponse)
        return true

      case "DELETE_CAPTURE":
        deleteCapture(msg.id).then(() => sendResponse({ success: true }))
        return true

      case "GET_STORAGE_USAGE":
        getStorageUsage().then((bytes) => sendResponse({ bytes }))
        return true

      case "GET_SETTINGS":
        chrome.storage.local.get(SETTINGS_KEY).then((result) => {
          sendResponse(result[SETTINGS_KEY] ?? DEFAULT_SETTINGS)
        })
        return true

      case "SAVE_SETTINGS":
        chrome.storage.local
          .set({ [SETTINGS_KEY]: msg.settings })
          .then(() => sendResponse({ success: true }))
        return true
    }
  },
)
