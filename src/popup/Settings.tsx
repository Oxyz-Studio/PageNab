import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ExternalLink } from "lucide-react"

import { DEFAULT_SETTINGS } from "../lib/config"
import type { ClipboardMode, Settings } from "../lib/types"
import { Header } from "./components/Header"
import { NeuSwitch } from "./components/NeuSwitch"

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }).then((s) => {
      setSettings(s as Settings)
    })
  }, [])

  async function handleSave(updated: Settings) {
    setSettings(updated)
    await chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings: updated })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ background: "var(--neu-base)" }}>
      <Header
        showBack
        onBack={onBack}
        title="Settings"
        status={saved ? "Saved" : undefined}
      />

      <div className="space-y-3 px-4 py-4">
        {/* Keyboard shortcut */}
        <SettingsCard>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--neu-text2)" }}>
            Keyboard shortcut
          </p>
          <div
            className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold"
            style={{
              background: "var(--neu-base)",
              boxShadow: "var(--shadow-inset-sm)",
              color: "var(--neu-text1)",
              fontFamily: "monospace",
            }}
          >
            {settings.shortcut}
          </div>
          <p className="mt-1.5 text-[10px]" style={{ color: "var(--neu-text2)", opacity: 0.7 }}>
            Change via chrome://extensions/shortcuts
          </p>
        </SettingsCard>

        {/* Notifications */}
        <SettingsCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--neu-text1)" }}>Notifications</p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--neu-text2)" }}>
                Show notification after capture
              </p>
            </div>
            <NeuSwitch
              checked={settings.notifications}
              onChange={(checked) => handleSave({ ...settings, notifications: checked })}
            />
          </div>
        </SettingsCard>

        {/* Clipboard mode */}
        <SettingsCard>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--neu-text2)" }}>
            Clipboard
          </p>
          <div className="space-y-2">
            {(
              [
                ["text", "Text only", "Best for AI assistants. Screenshot saved to Downloads."],
                ["image", "Image only", "Pastes the screenshot. Text data in Downloads."],
                ["both", "Both", "May not work in all apps (some only read one format)."],
              ] as const
            ).map(([value, label, desc]) => {
              const isChecked = (settings.clipboardMode ?? DEFAULT_SETTINGS.clipboardMode) === value
              return (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-3"
                  onClick={() => handleSave({ ...settings, clipboardMode: value as ClipboardMode })}
                >
                  <div
                    className="relative mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: isChecked ? "#6366f1" : "var(--neu-base)",
                      boxShadow: isChecked
                        ? "inset 2px 2px 4px rgba(0,0,0,0.2), inset -1px -1px 3px rgba(140,140,255,0.4)"
                        : "inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light)",
                      transition: "background 0.22s ease, box-shadow 0.22s ease",
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
                    <p className="text-sm font-medium" style={{ color: "var(--neu-text1)" }}>{label}</p>
                    <p className="mt-0.5 text-[10px] leading-snug" style={{ color: "var(--neu-text2)" }}>{desc}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </SettingsCard>

        {/* Max captures */}
        <SettingsCard>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--neu-text2)" }}>
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
            className="w-24 rounded-full bg-transparent px-4 py-2 text-sm font-semibold outline-none"
            style={{
              background: "var(--neu-base)",
              boxShadow: "var(--shadow-inset-sm)",
              color: "var(--neu-text1)",
            }}
          />
        </SettingsCard>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-center gap-3 px-4 py-3 text-[11px]"
        style={{ borderTop: "1px solid rgba(163,177,198,0.38)", color: "var(--neu-text2)", opacity: 0.8 }}
      >
        <span>PageNab v0.0.1 · MIT</span>
        <a
          href="https://github.com/Oxyz-Studio/PageNab"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 font-medium"
          style={{ color: "var(--neu-accent)" }}
        >
          GitHub <ExternalLink size={10} />
        </a>
      </div>
    </div>
  )
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--neu-base)", boxShadow: "var(--shadow-raised-sm)" }}
    >
      {children}
    </div>
  )
}
