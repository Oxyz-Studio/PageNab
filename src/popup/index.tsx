import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Clipboard, Image } from "lucide-react"

import { DEFAULT_SETTINGS } from "../lib/config"
import type {
  CaptureMode,
  CaptureResponse,
  CaptureResult,
  CaptureStats,
  ClipboardMode,
  CustomOptions,
  Preset,
  Settings,
} from "../lib/types"
import { HistoryScreen } from "./History"
import { SettingsScreen } from "./Settings"
import { Button } from "./components/Button"
import { Segmented } from "./components/Segmented"
import { Checkbox } from "./components/Checkbox"
import { Header } from "./components/Header"
import { LoadingSpinner } from "./components/LoadingSpinner"
import { StateBadge } from "./components/StateBadge"
import { ErrorBoundary } from "./components/ErrorBoundary"
import "../style.css"

// ─── Types ───────────────────────────────────────────────────────────────────

type PopupState =
  | { status: "idle" }
  | { status: "capturing" }
  | { status: "success"; result: CaptureResult }
  | { status: "error"; message: string }

type Screen = "main" | "history" | "settings"

// ─── Animation presets ───────────────────────────────────────────────────────

const screenTransition = { duration: 0.12, ease: "easeOut" as const }

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

// ─── Preset metadata ─────────────────────────────────────────────────────────

const PRESET_HINT: Record<string, string> = {
  light: "Errors, warnings, failed requests",
  full: "Console, network, DOM, cookies, storage, interactions, perf",
  custom: "Choose which data to capture",
}

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
  const settingsRef = useRef<Settings>({ ...DEFAULT_SETTINGS })

  const savePreferences = (updates: Partial<Settings>) => {
    const merged = { ...settingsRef.current, ...updates }
    settingsRef.current = merged
    chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: merged })
  }

  const handleModeChange = (m: CaptureMode) => {
    setMode(m)
    savePreferences({ screenshotMode: m })
  }

  const handlePresetChange = (p: Preset) => {
    setPreset(p)
    savePreferences({ preset: p })
  }

  const handleCustomOptionsChange = (o: CustomOptions) => {
    setCustomOptions(o)
    savePreferences({ customOptions: o })
  }

  // Load settings + check for stored area/element capture result
  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }).then((s) => {
      const settings = s as Settings
      settingsRef.current = settings
      setPreset(settings.preset ?? DEFAULT_SETTINGS.preset)
      setMode(settings.screenshotMode ?? DEFAULT_SETTINGS.screenshotMode)
      setCustomOptions(settings.customOptions ?? { ...DEFAULT_SETTINGS.customOptions })
      setClipboardMode(settings.clipboardMode ?? DEFAULT_SETTINGS.clipboardMode)
    }).catch(() => {})

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
      const response = (await Promise.race([
        chrome.runtime.sendMessage({
          type: "CAPTURE_PAGE",
          preset,
          mode,
          customOptions: preset === "custom" ? customOptions : undefined,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Capture timed out")), 30_000),
        ),
      ])) as CaptureResponse
      if (response.success) {
        setState({ status: "success", result: response.data })

        // Clipboard write fire-and-forget — SuccessView has manual Copy buttons as fallback
        ;(async () => {
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
            // Clipboard write failed — SuccessView has manual Copy buttons
          }
        })()
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
    <ErrorBoundary>
    <div className="relative w-[360px] overflow-hidden bg-[var(--bg-primary)]">
      <AnimatePresence mode="wait" initial={false}>
        {screen === "history" && (
          <motion.div
            key="history"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={screenTransition}
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
            transition={screenTransition}
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
            transition={screenTransition}
          >
            {state.status === "success" ? (
              <Header
                showBack
                onBack={() => setState({ status: "idle" })}
                title="Captured"
              />
            ) : (
              <Header
                onHistory={() => setScreen("history")}
                onSettings={() => setScreen("settings")}
              />
            )}

            <div className="px-5 pb-6 pt-5">
              <AnimatePresence mode="popLayout" initial={false}>
                {state.status === "idle" && (
                  <motion.div
                    key="idle"
                    variants={stateVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={screenTransition}
                  >
                    <IdleView
                      preset={preset}
                      mode={mode}
                      customOptions={customOptions}
                      onPresetChange={handlePresetChange}
                      onModeChange={handleModeChange}
                      onCustomOptionsChange={handleCustomOptionsChange}
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
                    transition={screenTransition}
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
                    transition={screenTransition}
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
                    transition={screenTransition}
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
    </ErrorBoundary>
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
  const [showInteractionsWarning, setShowInteractionsWarning] = useState(false)

  const handlePresetChange = (v: string) => {
    const newPreset = v as Preset
    onPresetChange(newPreset)
    const enabled = newPreset === "full" || (newPreset === "custom" && customOptions.interactions)
    chrome.runtime.sendMessage({ type: "UPDATE_INTERACTIONS_TRACKING", enabled })
    setShowInteractionsWarning(enabled)
  }

  const handleCustomOptionChange = (key: keyof CustomOptions, checked: boolean) => {
    const updated = { ...customOptions, [key]: checked }
    onCustomOptionsChange(updated)
    if (key === "interactions") {
      chrome.runtime.sendMessage({ type: "UPDATE_INTERACTIONS_TRACKING", enabled: checked })
      if (checked) setShowInteractionsWarning(true)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Screenshot mode */}
      <div>
        <SectionLabel>Mode</SectionLabel>
        <Segmented
          layoutId="mode-pill"
          options={[
            { value: "element", label: "Element" },
            { value: "area", label: "Area" },
            { value: "fullpage", label: "Full page" },
          ]}
          value={mode}
          onChange={(v) => onModeChange(v as CaptureMode)}
        />
      </div>

      {/* Preset */}
      <div>
        <SectionLabel>Capture</SectionLabel>
        <Segmented
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

      {/* Preset hint */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={preset}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12 }}
          className="text-[11px] leading-relaxed -mt-1 text-[var(--text-secondary)]"
        >
          {PRESET_HINT[preset]}
        </motion.p>
      </AnimatePresence>

      {/* Interactions warning */}
      <AnimatePresence>
        {showInteractionsWarning && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden rounded-lg px-3 py-2 text-[11px] leading-relaxed -mt-1"
            style={{ background: "#fffbeb", color: "#b45309" }}
          >
            Interactions tracking just activated. Refresh the page to capture previous interactions.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Custom options */}
      <AnimatePresence>
        {preset === "custom" && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={{
              open: {
                height: "auto",
                transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
              },
              closed: {
                height: 0,
                transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1], delay: 0.05 },
              },
            }}
            className="overflow-hidden"
          >
            <motion.div
              variants={{
                open: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.15, delay: 0.08, ease: "easeOut" },
                },
                closed: {
                  opacity: 0,
                  y: -6,
                  transition: { duration: 0.1, ease: "easeIn" },
                },
              }}
            >
            <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
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
                  <Checkbox
                    key={key}
                    checked={customOptions[key]}
                    onChange={(checked) => handleCustomOptionChange(key, checked)}
                    label={label}
                  />
                ))}
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <Button fullWidth onClick={onCapture}>
        Nab this page
      </Button>

      {/* Shortcut hint */}
      <div className="flex items-center justify-center gap-1">
        {[navigator.platform.includes("Mac") ? "⌘" : "Ctrl", "Shift", "E"].map((key, i) => (
          <span key={key} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-[9px] text-[var(--text-tertiary)]">+</span>
            )}
            <kbd className="kbd-pill px-1.5 py-0.5 text-[10px] font-medium">
              {key}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Capturing View ───────────────────────────────────────────────────────────

function CapturingView() {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <LoadingSpinner />
      <p className="text-sm font-medium text-[var(--text-secondary)]">
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
          <p className="text-sm font-semibold text-[var(--success)]">
            Captured!
          </p>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {successLabel}
          </p>
        </div>
      </div>

      {/* Screenshot thumbnail */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-primary)]">
        <img
          src={result.screenshot}
          alt="Captured screenshot"
          className={`w-full ${result.fullScreenshot ? "h-32 object-contain" : "h-32 object-cover object-top"}`}
          style={result.fullScreenshot ? { background: "var(--bg-secondary)" } : undefined}
        />
      </div>

      {/* Domain + stats */}
      <div className="flex flex-col gap-1.5">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {result.domain}
        </p>
        <StatsSummary stats={result.stats} />
      </div>

      {/* Copy actions */}
      <div className="flex gap-2">
        <CopyActionButton
          onClick={handleCopyText}
          disabled={copiedBtn === "text"}
          copied={copiedBtn === "text"}
          icon={<Clipboard size={12} />}
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

      <Button fullWidth onClick={onCapture}>
        Nab again
      </Button>
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
          <p className="text-sm font-semibold text-[var(--error)]">
            Capture failed
          </p>
          <p className="text-[11px] leading-snug text-[var(--text-secondary)]">
            {message}
          </p>
        </div>
      </div>

      <Button fullWidth onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-[var(--text-secondary)]">
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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] py-2 px-3 text-xs font-medium outline-none transition-all duration-150 hover:bg-[var(--bg-tertiary)] active:scale-[0.98] ${fullWidth ? "w-full" : "flex-1"} ${disabled ? "opacity-50" : ""}`}
      style={{
        color: copied ? "var(--success)" : "var(--text-secondary)",
      }}
    >
      {icon}
      {copied ? "Copied!" : label}
    </button>
  )
}

// ─── Stats Summary ────────────────────────────────────────────────────────────

type ChipVariant = "default" | "error" | "warning" | "success"

const CHIP_STYLES: Record<ChipVariant, { background: string; color: string }> = {
  default: { background: "var(--bg-tertiary)", color: "var(--text-secondary)" },
  error:   { background: "var(--error-soft)",  color: "var(--error)" },
  warning: { background: "#fffbeb",            color: "#b45309" },
  success: { background: "var(--success-soft)", color: "var(--success)" },
}

function StatChip({ text, variant = "default" }: { text: string; variant?: ChipVariant }) {
  const s = CHIP_STYLES[variant]
  return (
    <span
      className="rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none"
      style={s}
    >
      {text}
    </span>
  )
}

function StatsSummary({ stats: s }: { stats: CaptureStats }) {
  const chips: Array<{ text: string; variant: ChipVariant }> = []

  if (s.errors !== undefined)
    chips.push({ text: `${s.errors} error${s.errors !== 1 ? "s" : ""}`, variant: s.errors > 0 ? "error" : "default" })
  if (s.warnings !== undefined && s.warnings > 0)
    chips.push({ text: `${s.warnings} warning${s.warnings !== 1 ? "s" : ""}`, variant: "warning" })
  if (s.failedRequests !== undefined && s.failedRequests > 0)
    chips.push({ text: `${s.failedRequests} failed`, variant: "warning" })
  if (s.hasDom)
    chips.push({ text: "DOM", variant: "success" })
  if (s.cookiesCount !== undefined)
    chips.push({ text: `${s.cookiesCount} cookie${s.cookiesCount !== 1 ? "s" : ""}`, variant: "default" })
  if (s.storageKeys !== undefined)
    chips.push({ text: `${s.storageKeys} key${s.storageKeys !== 1 ? "s" : ""}`, variant: "default" })
  if (s.lcpTime !== undefined)
    chips.push({ text: `LCP ${(s.lcpTime / 1000).toFixed(1)}s`, variant: "default" })
  if (s.interactionsCount !== undefined && s.interactionsCount > 0)
    chips.push({ text: `${s.interactionsCount} event${s.interactionsCount !== 1 ? "s" : ""}`, variant: "default" })

  if (chips.length === 0 && !s.elementSelector) return null

  return (
    <div className="flex flex-col gap-1.5">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((chip, i) => (
            <StatChip key={i} text={chip.text} variant={chip.variant} />
          ))}
        </div>
      )}
      {s.elementSelector && (
        <p
          className="truncate rounded-md bg-[var(--bg-secondary)] px-2 py-1 font-mono text-[10px] text-[var(--text-tertiary)]"
          title={s.elementSelector}
        >
          {s.elementSelector}
        </p>
      )}
    </div>
  )
}

export default IndexPopup
