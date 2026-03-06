// === Presets ===
export type Preset = "light" | "full" | "custom"
export type CaptureMode = "fullpage" | "area" | "element"

export interface CustomOptions {
  console: boolean
  network: boolean
  dom: boolean
  cookies: boolean
  storage: boolean
  interactions: boolean
  performance: boolean
}

// === Settings ===
export type ClipboardMode = "text" | "image" | "both"

export interface Settings {
  preset: Preset
  customOptions: CustomOptions
  screenshotMode: CaptureMode
  clipboardMode: ClipboardMode
  notifications: boolean
  maxCaptures: number
  shortcut: string
}

// === Metadata ===
export interface CaptureMetadata {
  version: string
  timestamp: string
  url: string
  title: string
  domain: string
  path: string
  viewport: { width: number; height: number }
  userAgent: string
  language: string
  colorScheme: "light" | "dark"
  captureMode: CaptureMode
  areaRect: { x: number; y: number; width: number; height: number } | null
  elementRect: { x: number; y: number; width: number; height: number } | null
  preset: Preset
  capturedData: string[]
  captureVersion: string
  captureDuration: number
}

// === Console ===
export type ConsoleLevel = "error" | "warning" | "log" | "info" | "debug"

export interface ConsoleLog {
  level: ConsoleLevel
  message: string
  source?: string
  line?: number
  column?: number
  stack?: string
  timestamp: string
  count?: number
}

export interface ConsoleData {
  summary: { total: number; errors: number; warnings: number; logs: number; info: number }
  logs: ConsoleLog[]
}

// === Network ===
export interface NetworkRequest {
  url: string
  method?: string
  status: number
  statusText: string
  type: string
  duration: number
  size?: number
  timestamp: string
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  responseBody?: string
  requestBodyPreview?: string
  responseBodyPreview?: string
  initiator?: string
}

export interface NetworkData {
  summary: { total: number; failed: number; slow: number; opaque?: number }
  failed: NetworkRequest[]
  slow: NetworkRequest[]
  all?: NetworkRequest[]
}

// === Cookies ===
export interface CookieEntry {
  name: string
  value: string
  secure: boolean
  sameSite: string
}

export interface CookiesData {
  summary: { total: number }
  cookies: CookieEntry[]
}

// === Storage ===
export interface StorageEntry {
  key: string
  value: string
  size: string
}

export interface StorageSectionData {
  summary: { keys: number; totalSize: string }
  entries: StorageEntry[]
}

export interface StorageData {
  localStorage: StorageSectionData
  sessionStorage: StorageSectionData
}

// === Interactions ===
export type InteractionType = "click" | "scroll" | "input" | "change"

export interface InteractionEvent {
  type: InteractionType
  target?: string
  text?: string
  coordinates?: { x: number; y: number }
  direction?: string
  distance?: number
  inputType?: string
  value?: string
  timestamp: string
}

export interface InteractionsData {
  summary: { total: number; clicks: number; scrolls: number; inputs: number }
  events: InteractionEvent[]
}

// === Performance ===
export interface PerformanceData {
  loadTime: number
  domContentLoaded: number
  firstPaint: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  memoryUsed?: number
  memoryLimit?: number
}

// === Element ===
export interface ElementData {
  selector: string
  tag: string
  id?: string
  classes: string[]
  attributes: Record<string, string>
  boundingRect: { x: number; y: number; width: number; height: number }
  outerHTML: string
  computedStyles: Record<string, string>
  accessibility: { role?: string; ariaLabel?: string; tabIndex?: number }
  parentContext?: string
}

// === Capture Bundle ===
export interface CaptureBundle {
  screenshot: string
  areaScreenshot?: string
  elementScreenshot?: string
  metadata: CaptureMetadata
  console?: ConsoleData
  network?: NetworkData
  dom?: string
  cookies?: CookiesData
  storage?: StorageData
  interactions?: InteractionsData
  performance?: PerformanceData
  element?: ElementData
}

// === Stored Capture ===
export interface StoredCapture {
  id: string
  timestamp: string
  url: string
  domain: string
  title: string
  screenshotThumbnail: string
  areaScreenshotThumbnail?: string
  elementScreenshotThumbnail?: string
  screenshotPath: string
  areaScreenshotPath?: string
  elementScreenshotPath?: string
  preset: Preset
  capturedData: string[]
  captureMode: CaptureMode
  metadata: CaptureMetadata
  console?: ConsoleData
  network?: NetworkData
  dom?: string
  cookies?: CookiesData
  storage?: StorageData
  interactions?: InteractionsData
  performance?: PerformanceData
  element?: ElementData
}

// === Chrome Messages ===

// Popup → Background
export type PopupMessage =
  | {
      type: "CAPTURE_PAGE"
      preset: Preset
      mode: CaptureMode
      customOptions?: CustomOptions
    }
  | { type: "UPDATE_INTERACTIONS_TRACKING"; enabled: boolean }
  | {
      type: "START_AREA_CAPTURE"
      preset: Preset
      customOptions?: CustomOptions
    }
  | {
      type: "START_ELEMENT_CAPTURE"
      preset: Preset
      customOptions?: CustomOptions
    }
  | { type: "GET_CAPTURES" }
  | { type: "DELETE_CAPTURE"; id: string }
  | { type: "GET_STORAGE_USAGE" }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: Settings }

// Background → Content Script (interactions)
export type BackgroundToContentMessage = { type: "GET_INTERACTIONS" }

// Content Script → Background (interactions response)
export interface InteractionsResponse {
  summary: { total: number; clicks: number; scrolls: number; inputs: number }
  events: InteractionEvent[]
}

// Background → Popup (via sendResponse)
export type CaptureResponse =
  | { success: true; data: CaptureResult }
  | { success: false; error: string }

export interface CaptureResult {
  screenshot: string
  fullScreenshot?: string
  clipboardText: string
  domain: string
  url: string
  title: string
  screenshotPath: string
  areaScreenshotPath?: string
  elementScreenshotPath?: string
  capturedData: string[]
  stats: CaptureStats
}

export interface CaptureStats {
  errors?: number
  warnings?: number
  failedRequests?: number
  totalRequests?: number
  hasDom?: boolean
  cookiesCount?: number
  storageKeys?: number
  lcpTime?: number
  interactionsCount?: number
  elementSelector?: string
}
