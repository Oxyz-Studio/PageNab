import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Clipboard, Image, Trash2 } from "lucide-react"

import type { StoredCapture } from "../lib/types"
import type { FormatInput } from "../lib/format"
import { generateTextContent, extractFile, extractPath } from "../lib/format"
import { truncate } from "../lib/sanitize"
import { Header } from "./components/Header"

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
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
  element: "Element",
}

const BADGE_STYLES: Record<string, { background: string; color: string }> = {
  console:      { background: "#fef3c7", color: "#b45309" },
  network:      { background: "#dbeafe", color: "#1d4ed8" },
  dom:          { background: "#ede9fe", color: "#6d28d9" },
  cookies:      { background: "#fce7f3", color: "#9d174d" },
  storage:      { background: "#d1fae5", color: "#065f46" },
  performance:  { background: "#ffedd5", color: "#c2410c" },
  interactions: { background: "#cffafe", color: "#0e7490" },
  element:      { background: "#e0e7ff", color: "#3730a3" },
}

function buildFormatInput(capture: StoredCapture): FormatInput {
  return {
    metadata: capture.metadata,
    screenshotPath: capture.screenshotPath,
    areaScreenshotPath: capture.areaScreenshotPath,
    elementScreenshotPath: capture.elementScreenshotPath,
    console: capture.console,
    network: capture.network,
    dom: capture.dom,
    cookies: capture.cookies,
    storage: capture.storage,
    interactions: capture.interactions,
    performance: capture.performance,
    element: capture.element,
  }
}

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [captures, setCaptures] = useState<StoredCapture[]>([])
  const [storageUsage, setStorageUsage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedBtn, setCopiedBtn] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const caps = (await chrome.runtime.sendMessage({ type: "GET_CAPTURES" })) as StoredCapture[]
    setCaptures(caps)
    const usage = (await chrome.runtime.sendMessage({ type: "GET_STORAGE_USAGE" })) as { bytes: number }
    setStorageUsage(usage.bytes)
  }

  async function handleDelete(id: string) {
    await chrome.runtime.sendMessage({ type: "DELETE_CAPTURE", id })
    await loadData()
  }

  async function handleCopyText(capture: StoredCapture) {
    try {
      const text = generateTextContent(buildFormatInput(capture))
      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }) }),
      ])
      setCopiedBtn(`text-${capture.id}`)
      setTimeout(() => setCopiedBtn(null), 1500)
    } catch { /* Clipboard write failed */ }
  }

  async function handleCopyScreenshot(capture: StoredCapture, key: string, dataUrl: string) {
    try {
      const resp = await fetch(dataUrl)
      const blob = await resp.blob()
      const bitmap = await createImageBitmap(blob)
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.drawImage(bitmap, 0, 0)
      const pngBlob = await canvas.convertToBlob({ type: "image/png" })
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })])
      setCopiedBtn(`${key}-${capture.id}`)
      setTimeout(() => setCopiedBtn(null), 1500)
    } catch { /* Clipboard write failed */ }
  }

  return (
    <div className="bg-[var(--bg-primary)]">
      <Header showBack onBack={onBack} title="History" />

      <div className="scroll-area max-h-[420px] overflow-y-auto px-4 py-3">
        {captures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
              <Image size={22} className="text-[var(--text-tertiary)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-secondary)]">No captures yet</p>
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">Nab a page to get started</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
            className="flex flex-col gap-3"
          >
            {captures.map((capture) => (
              <CaptureCard
                key={capture.id}
                capture={capture}
                expanded={expandedId === capture.id}
                copiedBtn={copiedBtn}
                onToggleExpand={() => setExpandedId(expandedId === capture.id ? null : capture.id)}
                onCopyText={handleCopyText}
                onCopyScreenshot={handleCopyScreenshot}
                onDelete={handleDelete}
              />
            ))}
          </motion.div>
        )}
      </div>

      <div className="border-t border-[var(--border-primary)] px-4 py-2.5 text-center text-[11px] text-[var(--text-tertiary)]">
        {captures.length} capture{captures.length !== 1 ? "s" : ""} · {formatBytes(storageUsage)} used
      </div>
    </div>
  )
}

function CaptureCard({
  capture, expanded, copiedBtn, onToggleExpand, onCopyText, onCopyScreenshot, onDelete,
}: {
  capture: StoredCapture
  expanded: boolean
  copiedBtn: string | null
  onToggleExpand: () => void
  onCopyText: (c: StoredCapture) => void
  onCopyScreenshot: (c: StoredCapture, key: string, url: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 500, damping: 28 } },
      }}
      className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3"
    >
      {/* Thumbnail + meta */}
      <div className="flex gap-2.5">
        <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border-primary)]">
          <img src={capture.screenshotThumbnail} alt="" className="h-full w-full object-cover object-top" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{capture.domain}</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
            {formatTimeAgo(capture.timestamp)} · {capture.preset}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {capture.capturedData.map((type) => {
              const badgeStyle = BADGE_STYLES[type]
              return (
                <span
                  key={type}
                  className="rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                  style={
                    badgeStyle ?? {
                      background: "var(--bg-secondary)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-primary)",
                    }
                  }
                >
                  {DATA_BADGES[type] ?? type}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <HActionBtn
          onClick={() => onCopyText(capture)}
          disabled={copiedBtn === `text-${capture.id}`}
          active={copiedBtn === `text-${capture.id}`}
          icon={<Clipboard size={11} />}
          label={copiedBtn === `text-${capture.id}` ? "Copied!" : "Text"}
        />
        <HActionBtn
          onClick={() => onCopyScreenshot(capture, "img", capture.screenshotThumbnail)}
          disabled={copiedBtn === `img-${capture.id}`}
          active={copiedBtn === `img-${capture.id}`}
          icon={<Image size={11} />}
          label={copiedBtn === `img-${capture.id}` ? "Copied!" : "Screenshot"}
        />
        {capture.areaScreenshotThumbnail && (
          <HActionBtn
            onClick={() => onCopyScreenshot(capture, "area", capture.areaScreenshotThumbnail!)}
            disabled={copiedBtn === `area-${capture.id}`}
            active={copiedBtn === `area-${capture.id}`}
            icon={<Image size={11} />}
            label={copiedBtn === `area-${capture.id}` ? "Copied!" : "Area"}
          />
        )}
        {capture.elementScreenshotThumbnail && (
          <HActionBtn
            onClick={() => onCopyScreenshot(capture, "element", capture.elementScreenshotThumbnail!)}
            disabled={copiedBtn === `element-${capture.id}`}
            active={copiedBtn === `element-${capture.id}`}
            icon={<Image size={11} />}
            label={copiedBtn === `element-${capture.id}` ? "Copied!" : "Element"}
          />
        )}

        <div className="flex-1" />

        {/* Details */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center gap-0.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)] outline-none transition-colors duration-150 hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
        >
          <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
            <ChevronRight size={12} />
          </motion.span>
          {expanded ? "Hide" : "Details"}
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(capture.id)}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--error)] outline-none transition-colors duration-150 hover:bg-[var(--error-soft)] active:scale-[0.95]"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2.5">
              <CaptureDetails capture={capture} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function HActionBtn({
  onClick, disabled, active, icon, label,
}: {
  onClick: () => void
  disabled: boolean
  active: boolean
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-medium outline-none transition-all duration-150 hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
      style={{
        color: active ? "var(--success)" : "var(--text-secondary)",
        opacity: disabled && !active ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function CollapsibleSection({ label, summary, children }: {
  label: string
  summary: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 text-left outline-none"
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="flex-shrink-0"
        >
          <ChevronRight size={10} className="text-[var(--text-secondary)]" />
        </motion.span>
        <span className="font-semibold text-[var(--text-secondary)]">{label}: </span>
        <span className="text-[var(--text-primary)]">{summary}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="mt-1 pl-3"
              style={{ borderLeft: "2px solid var(--border-primary)", marginLeft: 4 }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const LEVEL_COLORS: Record<string, string> = {
  error: "var(--error)",
  warning: "var(--warning)",
  log: "var(--text-primary)",
  info: "var(--accent)",
  debug: "var(--text-secondary)",
}

function CaptureDetails({ capture }: { capture: StoredCapture }) {
  return (
    <div className="space-y-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-primary)]">
      <div>
        <span className="font-semibold text-[var(--text-secondary)]">URL: </span>
        <span className="break-all">{capture.url}</span>
      </div>

      {capture.console && (
        <CollapsibleSection
          label="Console"
          summary={`${capture.console.summary.errors} errors, ${capture.console.summary.warnings} warnings`}
        >
          {capture.console.logs.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No console output.</p>
          ) : (
            <div className="space-y-1">
              {capture.console.logs.map((log, i) => {
                const location = log.source || log.line
                  ? ` — ${extractFile(log.source)}${log.line ? `:${log.line}` : ""}`
                  : ""
                return (
                  <div key={i}>
                    <span className="font-semibold" style={{ color: LEVEL_COLORS[log.level] ?? "var(--text-primary)" }}>
                      [{log.level.toUpperCase()}]
                    </span>{" "}
                    <span>{truncate(log.message, 150)}</span>
                    {location && <span className="text-[var(--text-secondary)]">{location}</span>}
                    {log.stack && (
                      <pre className="mt-0.5 whitespace-pre-wrap text-[10px] text-[var(--text-secondary)]">
                        {log.stack.split("\n").slice(0, 2).join("\n")}
                      </pre>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CollapsibleSection>
      )}

      {capture.network && (
        <CollapsibleSection
          label="Network"
          summary={`${capture.network.summary.total} total, ${capture.network.summary.failed} failed`}
        >
          {(() => {
            const allReqs = capture.network.all ?? [...capture.network.failed, ...capture.network.slow]
            if (allReqs.length === 0) return <p className="text-[var(--text-secondary)]">No requests recorded.</p>
            const sorted = [...allReqs].sort((a, b) => {
              const aF = a.status >= 400 ? 0 : 1
              const bF = b.status >= 400 ? 0 : 1
              if (aF !== bF) return aF - bF
              return (a.duration > 3000 ? 0 : 1) - (b.duration > 3000 ? 0 : 1)
            })
            return (
              <div className="space-y-0.5">
                {sorted.slice(0, 20).map((req, i) => {
                  const isFailed = req.status >= 400
                  const isSlow = !isFailed && req.duration > 3000
                  const color = isFailed ? "var(--error)" : isSlow ? "var(--warning)" : "var(--text-primary)"
                  return (
                    <div key={i} style={{ color }}>
                      <span className="font-semibold">{req.status}</span>{" "}
                      <span>{truncate(extractPath(req.url), 60)}</span>{" "}
                      <span className="text-[var(--text-secondary)]">{req.duration}ms · {req.type}</span>
                    </div>
                  )
                })}
                {sorted.length > 20 && <p className="text-[var(--text-secondary)]">... and {sorted.length - 20} more</p>}
              </div>
            )
          })()}
        </CollapsibleSection>
      )}

      {capture.dom && (
        <CollapsibleSection label="DOM" summary={formatBytes(new Blob([capture.dom]).size)}>
          <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-all text-[10px] text-[var(--text-primary)]">
            {capture.dom.slice(0, 2000)}{capture.dom.length > 2000 && "\n… (truncated)"}
          </pre>
        </CollapsibleSection>
      )}

      {capture.cookies && (
        <CollapsibleSection label="Cookies" summary={`${capture.cookies.summary.total} cookies`}>
          {capture.cookies.cookies.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No cookies.</p>
          ) : (
            <div className="space-y-0.5">
              {capture.cookies.cookies.map((c, i) => (
                <div key={i}>
                  <span className="font-semibold">{c.name}</span>: <span>{truncate(c.value, 80)}</span>
                  {c.secure && (
                    <span className="ml-1 rounded-md bg-[var(--success-soft)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--success)]">
                      secure
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {capture.storage && (
        <CollapsibleSection
          label="Storage"
          summary={`${capture.storage.localStorage.summary.keys} local, ${capture.storage.sessionStorage.summary.keys} session`}
        >
          <div className="space-y-0.5">
            {capture.storage.localStorage.entries.map((e, i) => (
              <div key={`l-${i}`}>
                <span className="text-[var(--text-secondary)]">[local]</span>{" "}
                <span className="font-semibold">{e.key}</span>: <span>{truncate(e.value, 80)}</span>
              </div>
            ))}
            {capture.storage.sessionStorage.entries.map((e, i) => (
              <div key={`s-${i}`}>
                <span className="text-[var(--text-secondary)]">[session]</span>{" "}
                <span className="font-semibold">{e.key}</span>: <span>{truncate(e.value, 80)}</span>
              </div>
            ))}
            {capture.storage.localStorage.entries.length === 0 && capture.storage.sessionStorage.entries.length === 0 && (
              <p className="text-[var(--text-secondary)]">No storage entries.</p>
            )}
          </div>
        </CollapsibleSection>
      )}

      {capture.performance && (
        <CollapsibleSection
          label="Performance"
          summary={`LCP ${capture.performance.largestContentfulPaint}ms, CLS ${capture.performance.cumulativeLayoutShift}`}
        >
          <div className="space-y-0.5">
            <div>Load: {capture.performance.loadTime}ms</div>
            <div>DOMContentLoaded: {capture.performance.domContentLoaded}ms</div>
            <div>First Paint: {capture.performance.firstPaint}ms</div>
            <div>FCP: {capture.performance.firstContentfulPaint}ms</div>
            <div>LCP: {capture.performance.largestContentfulPaint}ms</div>
            <div>CLS: {capture.performance.cumulativeLayoutShift}</div>
            <div>FID: {capture.performance.firstInputDelay}ms</div>
            {capture.performance.memoryUsed != null && capture.performance.memoryLimit != null && (
              <div>Memory: {formatBytes(capture.performance.memoryUsed)} / {formatBytes(capture.performance.memoryLimit)}</div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {capture.interactions && (
        <CollapsibleSection label="Interactions" summary={`${capture.interactions.summary.total} events`}>
          {capture.interactions.events.length === 0 ? (
            <p className="text-[var(--text-secondary)]">No interactions recorded.</p>
          ) : (
            <div className="space-y-0.5">
              {capture.interactions.events.map((evt, i) => (
                <div key={i}>
                  <span className="font-semibold">[{evt.type}]</span>{" "}
                  {evt.target && <span>{evt.target}</span>}
                  {evt.text && <span> "{truncate(evt.text, 30)}"</span>}
                  {evt.direction && <span> {evt.direction}</span>}
                  {evt.distance != null && <span> {evt.distance}px</span>}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {capture.element && (
        <CollapsibleSection label="Element" summary={capture.element.selector}>
          <div className="space-y-0.5">
            <div><span className="font-semibold">Tag: </span>{capture.element.tag}</div>
            {capture.element.id && <div><span className="font-semibold">ID: </span>#{capture.element.id}</div>}
            {capture.element.classes.length > 0 && (
              <div><span className="font-semibold">Classes: </span>{capture.element.classes.slice(0, 5).join(", ")}</div>
            )}
            <div>
              <span className="font-semibold">Size: </span>
              {capture.element.boundingRect.width}x{capture.element.boundingRect.height}px
            </div>
            {capture.element.accessibility.role && (
              <div><span className="font-semibold">Role: </span>{capture.element.accessibility.role}</div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}
