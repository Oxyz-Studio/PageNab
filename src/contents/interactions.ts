// Persistent content script for tracking user interactions.
// Plasmo bundles this automatically from src/contents/.
// The script checks a flag in chrome.storage.local before tracking.

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
  all_frames: false,
}

interface InteractionEvent {
  type: "click" | "scroll" | "input" | "change"
  target?: string
  text?: string
  coordinates?: { x: number; y: number }
  direction?: string
  distance?: number
  inputType?: string
  value?: string
  timestamp: string
}

const MAX_EVENTS = 50
const events: InteractionEvent[] = []
let trackingEnabled = false

// Check storage flag to decide whether to track
chrome.storage.local.get("pagenab_interactions_enabled").then((result) => {
  trackingEnabled = result.pagenab_interactions_enabled === true
})

// Listen for flag changes at runtime
chrome.storage.onChanged.addListener((changes) => {
  if (changes.pagenab_interactions_enabled) {
    trackingEnabled = changes.pagenab_interactions_enabled.newValue === true
  }
})

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ""
  const classes =
    el.className && typeof el.className === "string"
      ? `.${el.className.trim().split(/\s+/).join(".")}`
      : ""
  return `${tag}${id}${classes}`.slice(0, 100)
}

function pushEvent(event: InteractionEvent) {
  if (!trackingEnabled) return
  if (events.length >= MAX_EVENTS) {
    events.shift()
  }
  events.push(event)
}

// Click handler
document.addEventListener(
  "click",
  (e) => {
    const target = e.target instanceof Element ? describeElement(e.target) : undefined
    const text =
      e.target instanceof HTMLElement
        ? (e.target.textContent ?? "").trim().slice(0, 50) || undefined
        : undefined
    pushEvent({
      type: "click",
      target,
      text,
      coordinates: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
      timestamp: new Date().toISOString(),
    })
  },
  true,
)

// Scroll handler (debounced)
let scrollTimeout: ReturnType<typeof setTimeout> | null = null
let lastScrollY = window.scrollY

document.addEventListener(
  "scroll",
  () => {
    if (!trackingEnabled) return
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      const currentY = window.scrollY
      const distance = Math.abs(currentY - lastScrollY)
      if (distance > 50) {
        pushEvent({
          type: "scroll",
          direction: currentY > lastScrollY ? "down" : "up",
          distance: Math.round(distance),
          timestamp: new Date().toISOString(),
        })
      }
      lastScrollY = currentY
    }, 200)
  },
  true,
)

// Input handler (debounced per element)
const inputTimers = new WeakMap<Element, ReturnType<typeof setTimeout>>()

document.addEventListener(
  "input",
  (e) => {
    if (!(e.target instanceof HTMLElement)) return

    const el = e.target

    const existing = inputTimers.get(el)
    if (existing) clearTimeout(existing)

    inputTimers.set(
      el,
      setTimeout(() => {
        pushEvent({
          type: "input",
          target: describeElement(el),
          inputType: el instanceof HTMLInputElement ? el.type : "text",
          value: "***", // Always masked
          timestamp: new Date().toISOString(),
        })
        inputTimers.delete(el)
      }, 300),
    )
  },
  true,
)

// Change handler
document.addEventListener(
  "change",
  (e) => {
    if (!(e.target instanceof Element)) return
    pushEvent({
      type: "change",
      target: describeElement(e.target),
      value: "***", // Always masked
      timestamp: new Date().toISOString(),
    })
  },
  true,
)

// Message handler: background requests the buffer
chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    const msg = message as { type: string }
    if (msg.type === "GET_INTERACTIONS") {
      let clicks = 0
      let scrolls = 0
      let inputs = 0
      for (const e of events) {
        if (e.type === "click") clicks++
        else if (e.type === "scroll") scrolls++
        else inputs++
      }

      sendResponse({
        summary: { total: events.length, clicks, scrolls, inputs },
        events: [...events],
      })
    }
  },
)
