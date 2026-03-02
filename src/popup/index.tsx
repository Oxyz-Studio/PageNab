import { useEffect, useState } from "react"

import { DEFAULT_SETTINGS } from "../lib/config"
import type {
  CaptureMode,
  CaptureResponse,
  CaptureResult,
  ClipboardMode,
  CustomOptions,
  Preset,
  Settings,
} from "../lib/types"
import { HistoryScreen } from "./History"
import { SettingsScreen } from "./Settings"
import "../style.css"

type PopupState =
  | { status: "idle" }
  | { status: "capturing" }
  | { status: "success"; result: CaptureResult }
  | { status: "error"; message: string }

type Screen = "main" | "history" | "settings"

function IndexPopup() {
  const [screen, setScreen] = useState<Screen>("main")
  const [state, setState] = useState<PopupState>({ status: "idle" })
  const [preset, setPreset] = useState<Preset>(DEFAULT_SETTINGS.preset)
  const [mode, setMode] = useState<CaptureMode>(DEFAULT_SETTINGS.screenshotMode)
  const [customOptions, setCustomOptions] = useState<CustomOptions>({
    ...DEFAULT_SETTINGS.customOptions,
  })
  const [clipboardMode, setClipboardMode] = useState<ClipboardMode>(
    DEFAULT_SETTINGS.clipboardMode,
  )

  // Load settings + check for stored area capture result
  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }).then((s) => {
      const settings = s as Settings
      setClipboardMode(settings.clipboardMode ?? DEFAULT_SETTINGS.clipboardMode)
    })

    chrome.storage.session
      ?.get("pagenab_area_result")
      .then((result) => {
        const stored = result?.pagenab_area_result as
          | { data: CaptureResult; timestamp: number }
          | undefined
        if (stored && Date.now() - stored.timestamp < 60000) {
          setState({ status: "success", result: stored.data })
        }
        // Clear stored result regardless of age
        chrome.storage.session.remove("pagenab_area_result")
      })
      .catch(() => {
        // session storage not available
      })
  }, [])

  const handleCapture = async () => {
    if (mode === "area") {
      // Area mode: close popup FIRST so it doesn't steal focus from the page,
      // then background injects the area selector overlay.
      // Use fire-and-forget sendMessage — popup will close before response arrives.
      chrome.runtime.sendMessage({
        type: "START_AREA_CAPTURE",
        preset,
        customOptions: preset === "custom" ? customOptions : undefined,
      })
      window.close()
      return
    }

    setState({ status: "capturing" })
    try {
      const response: CaptureResponse = await chrome.runtime.sendMessage({
        type: "CAPTURE_PAGE",
        preset,
        mode,
        customOptions: preset === "custom" ? customOptions : undefined,
      })
      if (response.success) {
        // Write clipboard from popup — has user activation from click + focus
        try {
          const items: Record<string, Blob> = {}
          if (clipboardMode === "text" || clipboardMode === "both") {
            items["text/plain"] = new Blob([response.data.clipboardText], { type: "text/plain" })
          }
          if (clipboardMode === "image" || clipboardMode === "both") {
            const imgResp = await fetch(response.data.screenshot)
            items["image/png"] = await imgResp.blob()
          }
          await navigator.clipboard.write([new ClipboardItem(items)])
        } catch {
          // Clipboard write failed — data still saved to downloads + history
        }
        setState({ status: "success", result: response.data })
      } else {
        setState({ status: "error", message: response.error })
      }
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  if (screen === "history") {
    return (
      <div className="w-[360px] bg-white">
        <HistoryScreen onBack={() => setScreen("main")} />
      </div>
    )
  }

  if (screen === "settings") {
    return (
      <div className="w-[360px] bg-white">
        <SettingsScreen onBack={() => setScreen("main")} />
      </div>
    )
  }

  return (
    <div className="w-[360px] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 pb-2 pt-4">
        <span className="text-base font-bold text-neutral-900">PageNab</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScreen("history")}
            className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
            title="History"
          >
            <HistoryIcon />
          </button>
          <button
            type="button"
            onClick={() => setScreen("settings")}
            className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
            title="Settings"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        {state.status === "idle" && (
          <IdleView
            preset={preset}
            mode={mode}
            customOptions={customOptions}
            onPresetChange={setPreset}
            onModeChange={setMode}
            onCustomOptionsChange={setCustomOptions}
            onCapture={handleCapture}
          />
        )}
        {state.status === "capturing" && <CapturingView />}
        {state.status === "success" && (
          <SuccessView
            result={state.result}
            clipboardMode={clipboardMode}
            onCapture={handleCapture}
          />
        )}
        {state.status === "error" && <ErrorView message={state.message} onRetry={handleCapture} />}
      </div>
    </div>
  )
}

// === Idle View ===

function IdleView({
  preset,
  mode,
  customOptions,
  onPresetChange,
  onModeChange,
  onCustomOptionsChange,
  onCapture,
}: {
  preset: Preset
  mode: CaptureMode
  customOptions: CustomOptions
  onPresetChange: (p: Preset) => void
  onModeChange: (m: CaptureMode) => void
  onCustomOptionsChange: (o: CustomOptions) => void
  onCapture: () => void
}) {
  const handlePresetChange = (v: string) => {
    const newPreset = v as Preset
    onPresetChange(newPreset)
    // Auto-enable/disable interactions tracking based on preset
    const enabled = newPreset === "full" || (newPreset === "custom" && customOptions.interactions)
    chrome.runtime.sendMessage({ type: "UPDATE_INTERACTIONS_TRACKING", enabled })
  }

  const handleCustomOptionChange = (key: keyof CustomOptions, checked: boolean) => {
    const updated = { ...customOptions, [key]: checked }
    onCustomOptionsChange(updated)
    if (key === "interactions") {
      chrome.runtime.sendMessage({ type: "UPDATE_INTERACTIONS_TRACKING", enabled: checked })
    }
  }

  return (
    <>
      {/* Screenshot mode */}
      <label className="mb-1 block text-xs font-medium text-neutral-500">Screenshot</label>
      <SegmentedControl
        options={[
          { value: "fullpage", label: "Full page" },
          { value: "area", label: "Area" },
        ]}
        value={mode}
        onChange={(v) => onModeChange(v as CaptureMode)}
      />

      {/* Preset */}
      <label className="mb-1 mt-3 block text-xs font-medium text-neutral-500">Capture</label>
      <SegmentedControl
        options={[
          { value: "light", label: "Light" },
          { value: "full", label: "Full" },
          { value: "custom", label: "Custom" },
        ]}
        value={preset}
        onChange={handlePresetChange}
      />

      {/* Preset hint */}
      <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">
        {preset === "light" && "Errors, warnings, failed requests"}
        {preset === "full" &&
          "Console, network, DOM, cookies, storage, interactions, perf"}
        {preset === "custom" && "Screenshot + metadata always included"}
      </p>

      {/* Custom options */}
      {preset === "custom" && (
        <div className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-1.5">
          {(
            [
              ["console", "Console"],
              ["network", "Network"],
              ["dom", "DOM"],
              ["cookies", "Cookies"],
              ["storage", "Storage"],
              ["performance", "Perf"],
              ["interactions", "Interactions"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 text-xs text-neutral-700">
              <input
                type="checkbox"
                checked={customOptions[key]}
                onChange={(e) => handleCustomOptionChange(key, e.target.checked)}
                className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
              />
              {label}
            </label>
          ))}
        </div>
      )}

      {/* Capture button */}
      <button
        type="button"
        onClick={onCapture}
        className="mt-4 w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 active:bg-neutral-950"
      >
        Nab this page
      </button>

      {/* Shortcut hint */}
      <p className="mt-2 text-center text-xs text-neutral-400">Ctrl+Shift+N</p>
    </>
  )
}

// === Capturing View ===

function CapturingView() {
  return (
    <div className="flex flex-col items-center py-12">
      <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
      <p className="text-sm font-medium text-neutral-600">Nabbing...</p>
    </div>
  )
}

// === Success View ===

function SuccessView({
  result,
  clipboardMode,
  onCapture,
}: {
  result: CaptureResult
  clipboardMode: ClipboardMode
  onCapture: () => void
}) {
  const statsLine = buildStatsLine(result)
  const [copiedBtn, setCopiedBtn] = useState<string | null>(null)

  const successLabel =
    clipboardMode === "text"
      ? "Captured! Text copied."
      : clipboardMode === "image"
        ? "Captured! Screenshot copied."
        : "Captured! Copied."

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([result.clipboardText], { type: "text/plain" }),
        }),
      ])
      setCopiedBtn("text")
      setTimeout(() => setCopiedBtn(null), 1500)
    } catch {
      // Clipboard write failed
    }
  }

  const handleCopyScreenshot = async (dataUrl: string, key: string) => {
    try {
      const resp = await fetch(dataUrl)
      const blob = await resp.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ])
      setCopiedBtn(key)
      setTimeout(() => setCopiedBtn(null), 1500)
    } catch {
      // Clipboard write failed
    }
  }

  return (
    <>
      <p className="mb-3 text-sm font-medium text-green-600">&#10003; {successLabel}</p>

      {/* Thumbnail */}
      <div className="overflow-hidden rounded-lg border border-neutral-200">
        <img
          src={result.screenshot}
          alt="Captured screenshot"
          className="h-40 w-full object-cover object-top"
        />
      </div>

      <p className="mt-2 truncate text-sm font-medium text-neutral-700">{result.domain}</p>
      {statsLine && <p className="text-xs text-neutral-500">{statsLine}</p>}

      {/* Copy buttons */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleCopyText}
          disabled={copiedBtn === "text"}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          {copiedBtn === "text" ? "Copied!" : "\uD83D\uDCCB Copy text"}
        </button>
        <button
          type="button"
          onClick={() => handleCopyScreenshot(result.screenshot, "screenshot")}
          disabled={copiedBtn === "screenshot"}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          {copiedBtn === "screenshot" ? "Copied!" : "\uD83D\uDDBC Copy screenshot"}
        </button>
      </div>

      {/* Full page screenshot button (area mode only) */}
      {result.fullScreenshot && (
        <button
          type="button"
          onClick={() => handleCopyScreenshot(result.fullScreenshot!, "full")}
          disabled={copiedBtn === "full"}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          {copiedBtn === "full" ? "Copied!" : "\uD83D\uDDBC Copy full page screenshot"}
        </button>
      )}

      <button
        type="button"
        onClick={onCapture}
        className="mt-3 w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 active:bg-neutral-950"
      >
        Nab again
      </button>
    </>
  )
}

// === Error View ===

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <>
      <p className="mb-1 text-sm font-medium text-red-600">&#10007; Capture failed</p>
      <p className="mb-4 text-xs text-neutral-500">{message}</p>

      <button
        type="button"
        onClick={onRetry}
        className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 active:bg-neutral-950"
      >
        Try again
      </button>
    </>
  )
}

// === Segmented Control ===

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-lg bg-neutral-100 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// === Icons ===

function HistoryIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 2" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2m0 10v2M1 8h2m10 0h2M2.93 2.93l1.41 1.41m7.32 7.32l1.41 1.41M13.07 2.93l-1.41 1.41M4.34 11.66l-1.41 1.41" />
    </svg>
  )
}

// === Helpers ===

function buildStatsLine(result: CaptureResult): string {
  const parts: string[] = []
  const s = result.stats
  if (s.errors !== undefined) parts.push(`${s.errors} error${s.errors !== 1 ? "s" : ""}`)
  if (s.failedRequests !== undefined) parts.push(`${s.failedRequests} failed`)
  if (s.hasDom) parts.push("DOM \u2713")
  if (s.cookiesCount !== undefined) parts.push(`\uD83C\uDF6A ${s.cookiesCount}`)
  if (s.storageKeys !== undefined) parts.push(`\uD83D\uDCE6 ${s.storageKeys} keys`)
  if (s.lcpTime !== undefined) parts.push(`\u26A1 LCP ${(s.lcpTime / 1000).toFixed(1)}s`)
  return parts.join(" \u00B7 ")
}

export default IndexPopup
