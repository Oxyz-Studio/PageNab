import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ExternalLink } from "lucide-react"

import { DEFAULT_SETTINGS } from "../lib/config"
import type { ClipboardMode, Settings } from "../lib/types"
import { Header } from "./components/Header"
import { Switch } from "./components/Switch"

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }).then((s) => {
      setSettings(s as Settings)
    }).catch(() => {})
  }, [])

  async function handleSave(updated: Settings) {
    setSettings(updated)
    await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: updated })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="bg-[var(--bg-primary)]">
      <Header
        showBack
        onBack={onBack}
        title="Settings"
        status={saved ? "Saved" : undefined}
      />

      <div className="space-y-3 px-4 py-4">
        {/* Keyboard shortcut */}
        <SettingsCard>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-[var(--text-secondary)]">
            Keyboard shortcut
          </p>
          <div className="flex items-center gap-1">
            {(settings.shortcut || (navigator.platform.includes("Mac") ? "⌘+Shift+E" : "Ctrl+Shift+E")).split("+").map((key, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <span className="text-[10px] text-[var(--text-tertiary)]">+</span>
                )}
                <kbd className="kbd-pill px-2.5 py-1 text-sm font-semibold text-[var(--text-primary)]">
                  {key.trim()}
                </kbd>
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-[var(--text-tertiary)]">
            Change via chrome://extensions/shortcuts
          </p>
        </SettingsCard>

        {/* Notifications */}
        <SettingsCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                Show notification after capture
              </p>
            </div>
            <Switch
              checked={settings.notifications}
              onChange={(checked) => handleSave({ ...settings, notifications: checked })}
            />
          </div>
        </SettingsCard>

        {/* Clipboard mode */}
        <SettingsCard>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-[var(--text-secondary)]">
            Clipboard
          </p>
          <div className="space-y-2">
            {(
              [
                ["text", "Text only", "Best for AI assistants. Screenshot saved to Downloads."],
                ["image", "Image only", "Pastes the screenshot. Text data in capture history."],
                ["both", "Both", "May not work in all apps (some only read one format)."],
              ] as const
            ).map(([value, label, desc]) => {
              const isChecked = (settings.clipboardMode ?? DEFAULT_SETTINGS.clipboardMode) === value
              return (
                <label
                  key={value}
                  className={`-mx-2 flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 transition-colors duration-150 ${
                    isChecked
                      ? "bg-[var(--accent-soft)]"
                      : "hover:bg-[var(--bg-secondary)]"
                  }`}
                  onClick={() => handleSave({ ...settings, clipboardMode: value as ClipboardMode })}
                >
                  <div
                    className="relative mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-150"
                    style={{
                      background: isChecked ? "var(--accent)" : "var(--bg-primary)",
                      borderColor: isChecked ? "var(--accent)" : "var(--border-secondary)",
                    }}
                  >
                    <AnimatePresence>
                      {isChecked && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 28 }}
                          className="h-1.5 w-1.5 rounded-full bg-white"
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-[var(--text-secondary)]">{desc}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </SettingsCard>

        {/* Max captures */}
        <SettingsCard>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-[var(--text-secondary)]">
            Max captures in history
          </p>
          <input
            type="number"
            min={5}
            max={100}
            value={settings.maxCaptures}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (val >= 5 && val <= 100) handleSave({ ...settings, maxCaptures: val })
            }}
            className="w-24 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
          />
        </SettingsCard>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-3 border-t border-[var(--border-primary)] px-4 py-3 text-[11px] text-[var(--text-tertiary)]">
        <span>PageNab v0.0.1 · MIT</span>
        <a
          href="https://github.com/Oxyz-Studio/PageNab"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
        >
          GitHub <ExternalLink size={10} />
        </a>
      </div>
    </div>
  )
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
      {children}
    </div>
  )
}
