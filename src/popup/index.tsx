import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Copy, Image } from "lucide-react"

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
import { NeuButton } from "./components/NeuButton"
import { NeuSegmented } from "./components/NeuSegmented"
import { NeuCheckbox } from "./components/NeuCheckbox"
import { Header } from "./components/Header"
import { CapturingOrb } from "./components/CapturingOrb"
import { StateBadge } from "./components/StateBadge"
import "../style.css"

// ─── Types ───────────────────────────────────────────────────────────────────

type PopupState =
  | { status: "idle" }
  | { status: "capturing" }
  | { status: "success"; result: CaptureResult }
  | { status: "error"; message: string }

type Screen = "main" | "history" | "settings"

// ─── Animation presets ───────────────────────────────────────────────────────

const screenVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

const stateVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const spring = { type: "spring" as const, stiffness: 320, damping: 30 }

// ─── Root ─────────────────────────────────────────────────────────────────────

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

  // Load settings + check for stored area/element capture result
  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }).then((s) => {
      const settings = s as Settings
      setClipboardMode(settings.clipboardMode ?? DEFAULT_SETTINGS.clipboardMode)
    })

    chrome.storage.session
      ?.get(["pagenab_area_result", "pagenab_element_result"])
      .then((result) => {
        const areaStored = result?.pagenab_area_result as
          | { data: CaptureResult; timestamp: number }
          | undefined
        const elementStored = result?.pagenab_element_result as
          | { data: CaptureResult; timestamp: number }
          | undefined

        const stored = elementStored ?? areaStored
        if (stored && Date.now() - stored.timestamp < 60000) {
          setState({ status: "success", result: stored.data })
        } else {
          if (areaStored) chrome.storage.session.remove("pagenab_area_result")
          if (elementStored) chrome.storage.session.remove("pagenab_element_result")
        }
      })
      .catch(() => {})
  }, [])

  const handleCapture = async () => {
    chrome.storage.session?.remove("pagenab_area_result").catch(() => {})
    chrome.storage.session?.remove("pagenab_element_result").catch(() => {})

    if (mode === "area") {
      chrome.runtime.sendMessage({
        type: "START_AREA_CAPTURE",
        preset,
        customOptions: preset === "custom" ? customOptions : undefined,
      })
      window.close()
      return
    }

    if (mode === "element") {
      chrome.runtime.sendMessage({
        type: "START_ELEMENT_CAPTURE",
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
        try {
          const items: Record<string, Blob> = {}
          if (clipboardMode === "text" || clipboardMode === "both") {
            items["text/plain"] = new Blob([response.data.clipboardText], {
              type: "text/plain",
            })
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

  return (
    <div
      className="relative w-[360px] overflow-hidden"
      style={{ background: "var(--neu-base)" }}
    >
      <AnimatePresence mode="wait">
        {screen === "history" && (
          <motion.div
            key="history"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={spring}
          >
            <HistoryScreen onBack={() => setScreen("main")} />
          </motion.div>
        )}

        {screen === "settings" && (
          <motion.div
            key="settings"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={spring}
          >
            <SettingsScreen onBack={() => setScreen("main")} />
          </motion.div>
        )}

        {screen === "main" && (
          <motion.div
            key="main"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={spring}
          >
            <Header
              onHistory={() => setScreen("history")}
              onSettings={() => setScreen("settings")}
            />

            <div className="px-5 pb-6 pt-5">
              <AnimatePresence mode="wait">
                {state.status === "idle" && (
                  <motion.div
                    key="idle"
                    variants={stateVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={spring}
                  >
                    <IdleView
                      preset={preset}
                      mode={mode}
                      customOptions={customOptions}
                      onPresetChange={setPreset}
                      onModeChange={setMode}
                      onCustomOptionsChange={setCustomOptions}
                      onCapture={handleCapture}
                    />
                  </motion.div>
                )}

                {state.status === "capturing" && (
                  <motion.div
                    key="capturing"
                    variants={stateVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={spring}
                  >
                    <CapturingView />
                  </motion.div>
                )}

                {state.status === "success" && (
                  <motion.div
                    key="success"
                    variants={stateVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={spring}
                  >
                    <SuccessView
                      result={(state as Extract<PopupState, { status: "success" }>).result}
                      clipboardMode={clipboardMode}
                      onCapture={handleCapture}
                    />
                  </motion.div>
                )}

                {state.status === "error" && (
                  <motion.div
                    key="error"
                    variants={stateVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={spring}
                  >
                    <ErrorView
                      message={(state as Extract<PopupState, { status: "error" }>).message}
                      onRetry={handleCapture}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Idle View ────────────────────────────────────────────────────────────────

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
    <div className="flex flex-col gap-4">
      {/* Screenshot mode */}
      <div>
        <SectionLabel>Mode</SectionLabel>
        <NeuSegmented
          layoutId="mode-pill"
          options={[
            { value: "fullpage", label: "Full page" },
            { value: "area", label: "Area" },
            { value: "element", label: "Element" },
          ]}
          value={mode}
          onChange={(v) => onModeChange(v as CaptureMode)}
        />
      </div>

      {/* Preset */}
      <div>
        <SectionLabel>Capture</SectionLabel>
        <NeuSegmented
          layoutId="preset-pill"
          options={[
            { value: "light", label: "Light" },
            { value: "full", label: "Full" },
            { value: "custom", label: "Custom" },
          ]}
          value={preset}
          onChange={handlePresetChange}
        />
      </div>

      {/* Preset hint — crossfades on change */}
      <AnimatePresence mode="wait">
        <motion.p
          key={preset}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
          className="text-[11px] leading-relaxed -mt-1"
          style={{ color: "var(--neu-text2)" }}
        >
          {preset === "light" && "Errors, warnings, failed requests"}
          {preset === "full" &&
            "Console, network, DOM, cookies, storage, interactions, perf"}
          {preset === "custom" && "Screenshot + metadata always included"}
        </motion.p>
      </AnimatePresence>

      {/* Custom options */}
      <AnimatePresence>
        {preset === "custom" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl p-3"
              style={{
                background: "var(--neu-base)",
                boxShadow: "var(--shadow-inset-sm)",
              }}
            >
              <div className="grid grid-cols-3 gap-x-3 gap-y-2.5">
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
                  <NeuCheckbox
                    key={key}
                    checked={customOptions[key]}
                    onChange={(checked) => handleCustomOptionChange(key, checked)}
                    label={label}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <NeuButton fullWidth onClick={onCapture}>
        Nab this page
      </NeuButton>

      {/* Shortcut hint — styled as a keyboard key */}
      <div className="flex justify-center">
        <span
          className="rounded-full px-3 py-1 text-[10px] font-medium tracking-wide"
          style={{
            color: "var(--neu-text2)",
            background: "var(--neu-base)",
            boxShadow: "var(--shadow-inset-sm)",
            opacity: 0.8,
          }}
        >
          ⌨ Ctrl+Shift+N
        </span>
      </div>
    </div>
  )
}

// ─── Capturing View ───────────────────────────────────────────────────────────

function CapturingView() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <CapturingOrb />
      <p className="text-sm font-semibold" style={{ color: "var(--neu-text2)" }}>
        Nabbing…
      </p>
    </div>
  )
}

// ─── Success View ─────────────────────────────────────────────────────────────

function SuccessView({
  result,
  clipboardMode,
  onCapture,
}: {
  result: CaptureResult
  clipboardMode: ClipboardMode
  onCapture: () => void
}) {
  const [copiedBtn, setCopiedBtn] = useState<string | null>(null)

  const successLabel =
    clipboardMode === "text"
      ? "Text copied to clipboard"
      : clipboardMode === "image"
        ? "Screenshot copied to clipboard"
        : "Copied to clipboard"

  const statsLine = buildStatsLine(result)

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
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      setCopiedBtn(key)
      setTimeout(() => setCopiedBtn(null), 1500)
    } catch {
      // Clipboard write failed
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Badge + label */}
      <div className="flex items-center gap-3">
        <StateBadge variant="success" />
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--neu-success)" }}>
            Captured!
          </p>
          <p className="text-[11px]" style={{ color: "var(--neu-text2)" }}>
            {successLabel}
          </p>
        </div>
      </div>

      {/* Screenshot thumbnail */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ boxShadow: "var(--shadow-raised-sm)" }}
      >
        <img
          src={result.screenshot}
          alt="Captured screenshot"
          className={`w-full ${result.fullScreenshot ? "h-32 object-contain" : "h-32 object-cover object-top"}`}
          style={result.fullScreenshot ? { background: "var(--neu-base)" } : undefined}
        />
      </div>

      {/* Domain + stats */}
      <div>
        <p
          className="truncate text-sm font-semibold"
          style={{ color: "var(--neu-text1)" }}
        >
          {result.domain}
        </p>
        {statsLine && (
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--neu-text2)" }}>
            {statsLine}
          </p>
        )}
      </div>

      {/* Copy actions */}
      <div className="flex gap-2">
        <CopyActionButton
          onClick={handleCopyText}
          disabled={copiedBtn === "text"}
          copied={copiedBtn === "text"}
          icon={<Copy size={12} />}
          label="Copy text"
        />
        <CopyActionButton
          onClick={() => handleCopyScreenshot(result.screenshot, "screenshot")}
          disabled={copiedBtn === "screenshot"}
          copied={copiedBtn === "screenshot"}
          icon={<Image size={12} />}
          label="Screenshot"
        />
      </div>

      {result.fullScreenshot && (
        <CopyActionButton
          fullWidth
          onClick={() => handleCopyScreenshot(result.fullScreenshot!, "full")}
          disabled={copiedBtn === "full"}
          copied={copiedBtn === "full"}
          icon={<Image size={12} />}
          label="Copy full page screenshot"
        />
      )}

      <NeuButton fullWidth onClick={onCapture}>
        Nab again
      </NeuButton>
    </div>
  )
}

// ─── Error View ───────────────────────────────────────────────────────────────

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <StateBadge variant="error" />
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--neu-error)" }}>
            Capture failed
          </p>
          <p className="text-[11px] leading-snug" style={{ color: "var(--neu-text2)" }}>
            {message}
          </p>
        </div>
      </div>

      <NeuButton fullWidth onClick={onRetry}>
        Try again
      </NeuButton>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: "var(--neu-text2)" }}
    >
      {children}
    </p>
  )
}

function CopyActionButton({
  onClick,
  disabled,
  copied,
  icon,
  label,
  fullWidth = false,
}: {
  onClick: () => void
  disabled: boolean
  copied: boolean
  icon: React.ReactNode
  label: string
  fullWidth?: boolean
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      className={`flex items-center justify-center gap-1.5 rounded-full py-2 px-3 text-xs font-medium outline-none ${fullWidth ? "w-full" : "flex-1"} ${disabled ? "opacity-50" : ""}`}
      style={{
        background: "var(--neu-base)",
        boxShadow: "var(--shadow-raised-sm)",
        color: copied ? "var(--neu-success)" : "var(--neu-text2)",
        transition: "color 0.2s ease",
      }}
    >
      {icon}
      {copied ? "Copied!" : label}
    </motion.button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildStatsLine(result: CaptureResult): string {
  const parts: string[] = []
  const s = result.stats
  if (s.errors !== undefined) parts.push(`${s.errors} error${s.errors !== 1 ? "s" : ""}`)
  if (s.failedRequests !== undefined) parts.push(`${s.failedRequests} failed`)
  if (s.hasDom) parts.push("DOM ✓")
  if (s.cookiesCount !== undefined) parts.push(`🍪 ${s.cookiesCount}`)
  if (s.storageKeys !== undefined) parts.push(`📦 ${s.storageKeys} keys`)
  if (s.lcpTime !== undefined) parts.push(`⚡ LCP ${(s.lcpTime / 1000).toFixed(1)}s`)
  if (s.elementSelector) parts.push(`🎯 ${s.elementSelector}`)
  return parts.join(" · ")
}

export default IndexPopup
