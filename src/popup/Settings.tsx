import { useEffect, useState } from "react"

import { DEFAULT_SETTINGS } from "../lib/config"
import type { Settings } from "../lib/types"

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
        <span className="text-base font-bold text-neutral-900">Settings</span>
        {saved && <span className="ml-auto text-xs text-green-600">Saved</span>}
      </div>

      <div className="space-y-4 px-4 py-3">
        {/* Keyboard shortcut */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Keyboard shortcut
          </label>
          <p className="text-sm text-neutral-700">{settings.shortcut}</p>
          <p className="mt-0.5 text-[10px] text-neutral-400">
            Change via chrome://extensions/shortcuts
          </p>
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-700">Notifications</p>
            <p className="text-xs text-neutral-400">Show notification after capture</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.notifications}
            onClick={() => handleSave({ ...settings, notifications: !settings.notifications })}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              settings.notifications ? "bg-neutral-900" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                settings.notifications ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* Max captures */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">
            Max captures in history
          </label>
          <input
            type="number"
            min={5}
            max={100}
            value={settings.maxCaptures}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (val >= 5 && val <= 100) {
                handleSave({ ...settings, maxCaptures: val })
              }
            }}
            className="w-20 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-100 px-4 py-3 text-center text-xs text-neutral-400">
        <p>PageNab v0.0.1 · MIT License</p>
        <a
          href="https://github.com/Oxyz-Studio/PageNab"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-500 hover:text-neutral-700"
        >
          GitHub
        </a>
      </div>
    </div>
  )
}
