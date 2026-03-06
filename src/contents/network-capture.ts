// MAIN world content script that intercepts fetch() and XMLHttpRequest
// to capture HTTP methods and request/response bodies.
// Runs directly in the page's JS context (world: "MAIN"), bypassing CSP restrictions.
// Stores output in window.__pagenab_network_buffer, read by collector.ts.
// NOTE: No access to chrome.* APIs in MAIN world — only window/DOM globals.
//
// Activation is controlled by a companion ISOLATED world script that
// listens for the storage flag `pagenab_network_capture_enabled`.
// When the flag is ON the companion dispatches a custom DOM event
// that this script listens for to start/stop intercepting.

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
  all_frames: false,
  world: "MAIN",
}

const win = window as unknown as Record<string, unknown>

// Idempotence guard
if (!win.__pagenab_network_buffer) {
  const MAX = 200
  const MAX_BODY_PREVIEW = 500

  interface NetworkEntry {
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

  const buffer: NetworkEntry[] = []

  function push(entry: NetworkEntry): void {
    if (buffer.length >= MAX) buffer.shift()
    buffer.push(entry)
  }

  function safePreview(body: unknown): string | undefined {
    if (body == null) return undefined
    try {
      const str = typeof body === "string" ? body : JSON.stringify(body)
      if (str.length <= MAX_BODY_PREVIEW) return str
      return str.slice(0, MAX_BODY_PREVIEW) + "..."
    } catch {
      return undefined
    }
  }

  // === Patch fetch ===
  const origFetch = window.fetch
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    const method = (init?.method ?? (typeof input !== "string" && !(input instanceof URL) ? input.method : undefined) ?? "GET").toUpperCase()
    const start = Date.now()
    const requestContentType = init?.headers
      ? (init.headers instanceof Headers
          ? init.headers.get("content-type")
          : Array.isArray(init.headers)
            ? init.headers.find(([k]) => k.toLowerCase() === "content-type")?.[1]
            : (init.headers as Record<string, string>)["content-type"] ?? (init.headers as Record<string, string>)["Content-Type"])
      : undefined

    const requestBody = safePreview(init?.body)

    return origFetch.apply(this, [input, init]).then(
      (response: Response) => {
        const entry: NetworkEntry = {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          duration: Date.now() - start,
          requestContentType: requestContentType ?? undefined,
          responseContentType: response.headers.get("content-type") ?? undefined,
          requestBodyPreview: requestBody,
          timestamp: new Date(start).toISOString(),
        }

        // Capture response body preview for failed requests and API mutations
        const isApiMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
        if (response.status >= 400 || isApiMutation) {
          response
            .clone()
            .text()
            .then((text) => {
              entry.responseBodyPreview = safePreview(text)
            })
            .catch(() => {})
        }

        push(entry)
        return response
      },
      (error: unknown) => {
        push({
          url,
          method,
          status: 0,
          statusText: "Network Error",
          duration: Date.now() - start,
          requestContentType: requestContentType ?? undefined,
          requestBodyPreview: requestBody,
          timestamp: new Date(start).toISOString(),
        })
        throw error
      },
    )
  }

  // === Patch XMLHttpRequest ===
  const origOpen = XMLHttpRequest.prototype.open
  const origSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    (this as unknown as Record<string, unknown>).__pagenab_method = method.toUpperCase()
    ;(this as unknown as Record<string, unknown>).__pagenab_url = typeof url === "string" ? url : url.toString()
    ;(this as unknown as Record<string, unknown>).__pagenab_start = Date.now()
    return origOpen.apply(this, [method, url, ...rest] as Parameters<typeof origOpen>)
  }

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const xhr = this as XMLHttpRequest & Record<string, unknown>
    const requestBody = safePreview(body)

    xhr.addEventListener("loadend", function () {
      const entry: NetworkEntry = {
        url: (xhr.__pagenab_url as string) ?? "",
        method: (xhr.__pagenab_method as string) ?? "GET",
        status: xhr.status,
        statusText: xhr.statusText,
        duration: Date.now() - ((xhr.__pagenab_start as number) ?? Date.now()),
        responseContentType: xhr.getResponseHeader("content-type") ?? undefined,
        requestBodyPreview: requestBody,
        timestamp: new Date((xhr.__pagenab_start as number) ?? Date.now()).toISOString(),
      }

      // Capture response body preview for failed requests and API mutations
      const isApiMutation = ["POST", "PUT", "PATCH", "DELETE"].includes((xhr.__pagenab_method as string) ?? "GET")
      if (xhr.status >= 400 || isApiMutation) {
        entry.responseBodyPreview = safePreview(xhr.responseText)
      }

      push(entry)
    })

    return origSend.apply(this, [body])
  }

  win.__pagenab_network_buffer = buffer
}
