import type {
  CaptureMetadata,
  ConsoleData,
  CookiesData,
  ElementData,
  InteractionsData,
  NetworkData,
  PerformanceData,
  StorageData,
  StoredCapture,
} from "../lib/types"
import { DEFAULT_SETTINGS } from "../lib/config"

const HISTORY_KEY = "pagenab_captures"
const SETTINGS_KEY = "pagenab_settings"

export async function getMaxCaptures(): Promise<number> {
  const result = await chrome.storage.local.get(SETTINGS_KEY)
  const settings = result[SETTINGS_KEY] as { maxCaptures?: number } | undefined
  return settings?.maxCaptures ?? DEFAULT_SETTINGS.maxCaptures
}

export async function saveCapture(
  screenshot: string,
  metadata: CaptureMetadata,
  screenshotPath: string,
  areaScreenshotPath?: string,
  consoleData?: ConsoleData,
  networkData?: NetworkData,
  dom?: string,
  cookiesData?: CookiesData,
  storageData?: StorageData,
  interactionsData?: InteractionsData,
  performanceData?: PerformanceData,
  areaScreenshot?: string,
  elementData?: ElementData,
  elementScreenshot?: string,
  elementScreenshotPath?: string,
): Promise<StoredCapture> {
  const maxCaptures = await getMaxCaptures()
  const captures = await getCaptures()

  // Generate thumbnail (~50KB)
  const thumbnail = await generateThumbnail(screenshot)
  const areaThumbnail = areaScreenshot ? await generateThumbnail(areaScreenshot) : undefined
  const elementThumbnail = elementScreenshot ? await generateThumbnail(elementScreenshot) : undefined

  const stored: StoredCapture = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: metadata.timestamp,
    url: metadata.url,
    domain: metadata.domain,
    title: metadata.title,
    screenshotThumbnail: thumbnail,
    areaScreenshotThumbnail: areaThumbnail,
    elementScreenshotThumbnail: elementThumbnail,
    screenshotPath,
    areaScreenshotPath,
    elementScreenshotPath,
    preset: metadata.preset,
    capturedData: metadata.capturedData,
    captureMode: metadata.captureMode,
    metadata,
    console: consoleData,
    network: networkData,
    dom,
    cookies: cookiesData,
    storage: storageData,
    interactions: interactionsData,
    performance: performanceData,
    element: elementData,
  }

  // Add to front, enforce limit
  captures.unshift(stored)
  const trimmed = captures.slice(0, maxCaptures)

  await chrome.storage.local.set({ [HISTORY_KEY]: trimmed })
  return stored
}

export async function getCaptures(): Promise<StoredCapture[]> {
  const result = await chrome.storage.local.get(HISTORY_KEY)
  return (result[HISTORY_KEY] as StoredCapture[] | undefined) ?? []
}

export async function deleteCapture(id: string): Promise<void> {
  const captures = await getCaptures()
  const filtered = captures.filter((c) => c.id !== id)
  await chrome.storage.local.set({ [HISTORY_KEY]: filtered })
}

export async function clearCaptures(): Promise<void> {
  await chrome.storage.local.remove(HISTORY_KEY)
}

export async function getStorageUsage(): Promise<number> {
  const result = await chrome.storage.local.get(HISTORY_KEY)
  const json = JSON.stringify(result[HISTORY_KEY] ?? [])
  return new Blob([json]).size
}

async function generateThumbnail(dataUrl: string): Promise<string> {
  // Use OffscreenCanvas to resize the screenshot
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)

  const width = 320
  const height = Math.round(bitmap.height * (width / bitmap.width))

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext("2d")
  if (!ctx) return dataUrl // Fallback to full image

  ctx.drawImage(bitmap, 0, 0, width, height)

  const thumbnailBlob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.7,
  })

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => resolve(dataUrl)
    reader.readAsDataURL(thumbnailBlob)
  })
}
