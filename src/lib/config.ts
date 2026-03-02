import type { CustomOptions, Settings } from "./types"

export const CAPTURE_VERSION = "1.0.0"

export const DEFAULT_CUSTOM_OPTIONS: CustomOptions = {
  console: true,
  network: true,
  dom: false,
  cookies: false,
  storage: false,
  interactions: false,
  performance: false,
}

export const DEFAULT_SETTINGS: Settings = {
  preset: "light",
  customOptions: { ...DEFAULT_CUSTOM_OPTIONS },
  screenshotMode: "element",
  clipboardMode: "both",
  notifications: true,
  maxCaptures: 20,
  shortcut: "Ctrl+Shift+N",
}

export function generateScreenshotFilename(domain: string, isArea = false, isElement = false): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  const suffix = isArea ? "-area" : isElement ? "-element" : ""
  return `pagenab-${domain}-${date}_${time}${suffix}.png`
}

export function parseDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return "unknown"
  }
}

export function parsePath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return "/"
  }
}
