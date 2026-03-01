import { useEffect, useState } from "react"

import type { StoredCapture } from "../lib/types"

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const DATA_BADGES: Record<string, string> = {
  console: "Console",
  network: "Network",
  dom: "DOM",
  cookies: "Cookies",
  storage: "Storage",
  interactions: "Interactions",
  performance: "Perf",
}

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [captures, setCaptures] = useState<StoredCapture[]>([])
  const [storageUsage, setStorageUsage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const caps = (await chrome.runtime.sendMessage({
      type: "GET_CAPTURES",
    })) as StoredCapture[]
    setCaptures(caps)

    const usage = (await chrome.runtime.sendMessage({
      type: "GET_STORAGE_USAGE",
    })) as { bytes: number }
    setStorageUsage(usage.bytes)
  }

  async function handleDelete(id: string) {
    await chrome.runtime.sendMessage({ type: "DELETE_CAPTURE", id })
    await loadData()
  }

  async function handleCopy(capture: StoredCapture) {
    // Re-generate text content and copy to clipboard
    // This uses the stored data — we send the full capture back to background for clipboard write
    try {
      await chrome.runtime.sendMessage({
        type: "CAPTURE_PAGE",
        preset: capture.preset,
        mode: capture.captureMode,
      })
    } catch {
      // Best effort
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 pb-2 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
        <span className="text-base font-bold text-neutral-900">History</span>
      </div>

      {/* Captures list */}
      <div className="max-h-[400px] overflow-y-auto px-4 py-2">
        {captures.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">No captures yet</p>
        ) : (
          captures.map((capture) => (
            <div key={capture.id} className="border-b border-neutral-50 py-2.5 last:border-0">
              {/* Card */}
              <div className="flex gap-2.5">
                <img
                  src={capture.screenshotThumbnail}
                  alt=""
                  className="h-14 w-20 flex-shrink-0 rounded border border-neutral-200 object-cover object-top"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">{capture.domain}</p>
                  <p className="text-xs text-neutral-400">
                    {formatTimeAgo(capture.timestamp)} · {capture.preset}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {capture.capturedData.map((type) => (
                      <span
                        key={type}
                        className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500"
                      >
                        {DATA_BADGES[type] ?? type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(capture)}
                  className="text-xs text-neutral-500 hover:text-neutral-700"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === capture.id ? null : capture.id)}
                  className="text-xs text-neutral-500 hover:text-neutral-700"
                >
                  {expandedId === capture.id ? "Hide" : "Details"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(capture.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>

              {/* Expanded details */}
              {expandedId === capture.id && <CaptureDetails capture={capture} />}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-100 px-4 py-2 text-center text-xs text-neutral-400">
        {captures.length} capture{captures.length !== 1 ? "s" : ""} · {formatBytes(storageUsage)}{" "}
        used
      </div>
    </div>
  )
}

function CaptureDetails({ capture }: { capture: StoredCapture }) {
  return (
    <div className="mt-2 space-y-2 rounded-lg bg-neutral-50 p-2.5 text-xs">
      {/* URL */}
      <div>
        <span className="font-medium text-neutral-500">URL: </span>
        <span className="break-all text-neutral-700">{capture.url}</span>
      </div>

      {/* Console */}
      {capture.console && (
        <div>
          <span className="font-medium text-neutral-500">Console: </span>
          <span className="text-neutral-700">
            {capture.console.summary.errors} errors, {capture.console.summary.warnings} warnings
          </span>
        </div>
      )}

      {/* Network */}
      {capture.network && (
        <div>
          <span className="font-medium text-neutral-500">Network: </span>
          <span className="text-neutral-700">
            {capture.network.summary.total} total, {capture.network.summary.failed} failed
          </span>
        </div>
      )}

      {/* DOM */}
      {capture.dom && (
        <div>
          <span className="font-medium text-neutral-500">DOM: </span>
          <span className="text-neutral-700">{formatBytes(new Blob([capture.dom]).size)}</span>
        </div>
      )}

      {/* Cookies */}
      {capture.cookies && (
        <div>
          <span className="font-medium text-neutral-500">Cookies: </span>
          <span className="text-neutral-700">{capture.cookies.summary.total} cookies</span>
        </div>
      )}

      {/* Storage */}
      {capture.storage && (
        <div>
          <span className="font-medium text-neutral-500">Storage: </span>
          <span className="text-neutral-700">
            {capture.storage.localStorage.summary.keys} local,{" "}
            {capture.storage.sessionStorage.summary.keys} session
          </span>
        </div>
      )}

      {/* Performance */}
      {capture.performance && (
        <div>
          <span className="font-medium text-neutral-500">Performance: </span>
          <span className="text-neutral-700">
            LCP {capture.performance.largestContentfulPaint}ms · CLS{" "}
            {capture.performance.cumulativeLayoutShift}
          </span>
        </div>
      )}

      {/* Interactions */}
      {capture.interactions && (
        <div>
          <span className="font-medium text-neutral-500">Interactions: </span>
          <span className="text-neutral-700">{capture.interactions.summary.total} events</span>
        </div>
      )}
    </div>
  )
}
