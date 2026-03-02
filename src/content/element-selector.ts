// Element selector: highlights elements on hover, captures data on click.
// Injected via chrome.scripting.executeScript when element mode is triggered.
// Self-contained (zero imports) — serialized for executeScript({func}).

export interface ElementSelectionResult {
  rect: { x: number; y: number; width: number; height: number }
  element: {
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
}

export function startElementSelection(): Promise<ElementSelectionResult | null> {
  return new Promise((resolve) => {
    // --- Highlight style ---
    const highlightClass = "pagenab-highlight"
    const style = document.createElement("style")
    style.id = "pagenab-element-style"
    style.textContent = `
@keyframes pagenab-glow {
  0%, 100% { box-shadow: 0 0 0 2px rgba(99,102,241,0.6), 0 0 8px 0 rgba(99,102,241,0.15) !important; }
  50% { box-shadow: 0 0 0 2px rgba(99,102,241,0.6), 0 0 16px 2px rgba(99,102,241,0.25) !important; }
}
@keyframes pagenab-selected {
  0% { outline-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.6), 0 0 12px 2px rgba(99,102,241,0.3); }
  50% { outline-color: #818cf8; box-shadow: 0 0 0 3px rgba(99,102,241,0.8), 0 0 24px 4px rgba(99,102,241,0.35); }
  100% { outline-color: transparent; box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; }
}
@keyframes pagenab-banner-enter {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.${highlightClass} { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; box-shadow: 0 0 0 2px rgba(99,102,241,0.6), 0 0 8px 0 rgba(99,102,241,0.15) !important; animation: pagenab-glow 2s ease-in-out infinite !important; will-change: box-shadow !important; }
.pagenab-selected { outline: 2px solid #818cf8 !important; outline-offset: 2px !important; animation: pagenab-selected 0.35s cubic-bezier(0.16,1,0.3,1) forwards !important; will-change: box-shadow, outline-color !important; }
`
    document.head.appendChild(style)

    // --- Banner ---
    const banner = document.createElement("div")
    Object.assign(banner.style, {
      position: "fixed",
      top: "12px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "8px 16px",
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      color: "#fff",
      fontSize: "13px",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      borderRadius: "10px",
      zIndex: "2147483647",
      pointerEvents: "none",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      animation: "pagenab-banner-enter 0.3s cubic-bezier(0.16,1,0.3,1) both",
    })
    banner.textContent = "Click an element \u00B7 Esc to cancel"
    document.body.appendChild(banner)

    let currentTarget: Element | null = null

    // --- CSS properties to capture ---
    const CSS_PROPS = [
      "display", "position", "width", "height", "min-width", "max-width", "min-height", "max-height",
      "margin", "padding", "box-sizing", "top", "right", "bottom", "left",
      "flex-direction", "flex-wrap", "justify-content", "align-items", "gap",
      "grid-template-columns", "grid-template-rows",
      "color", "background-color", "border", "border-radius", "box-shadow", "opacity", "overflow",
      "font-family", "font-size", "font-weight", "line-height", "text-align",
      "z-index", "cursor", "visibility", "transform", "pointer-events",
    ]

    // --- Attributes to keep ---
    const KEEP_ATTRS = new Set([
      "role", "aria-label", "aria-labelledby", "aria-describedby", "aria-hidden",
      "aria-expanded", "aria-selected", "aria-checked", "aria-disabled",
      "data-testid", "type", "href", "src", "name", "action", "placeholder", "alt", "title",
      "for", "method", "target", "rel", "value",
    ])

    function cleanup() {
      if (currentTarget) currentTarget.classList.remove(highlightClass)
      style.remove()
      banner.remove()
      document.removeEventListener("mouseover", onMouseOver, true)
      document.removeEventListener("mouseout", onMouseOut, true)
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("keydown", onKeyDown, true)
    }

    function buildSelector(el: Element): string {
      const parts: string[] = []
      let node: Element | null = el
      while (node && node !== document.documentElement) {
        let segment = node.tagName.toLowerCase()
        if (node.id) {
          segment += `#${node.id}`
          parts.unshift(segment)
          break
        }
        const classes = Array.from(node.classList)
          .filter((c) => c !== highlightClass)
          .slice(0, 3)
        if (classes.length > 0) segment += `.${classes.join(".")}`
        parts.unshift(segment)
        node = node.parentElement
      }
      return parts.join(" > ")
    }

    function getFilteredStyles(el: Element): Record<string, string> {
      const computed = window.getComputedStyle(el)
      const result: Record<string, string> = {}
      // Default values to filter out
      const defaults: Record<string, string> = {
        "position": "static",
        "top": "auto",
        "right": "auto",
        "bottom": "auto",
        "left": "auto",
        "min-width": "auto",
        "max-width": "none",
        "min-height": "auto",
        "max-height": "none",
        "flex-direction": "row",
        "flex-wrap": "nowrap",
        "justify-content": "normal",
        "align-items": "normal",
        "gap": "normal",
        "grid-template-columns": "none",
        "grid-template-rows": "none",
        "box-shadow": "none",
        "opacity": "1",
        "overflow": "visible",
        "z-index": "auto",
        "visibility": "visible",
        "transform": "none",
        "pointer-events": "auto",
        "cursor": "auto",
      }
      for (const prop of CSS_PROPS) {
        const val = computed.getPropertyValue(prop)
        if (!val) continue
        // Skip defaults
        if (defaults[prop] && val === defaults[prop]) continue
        result[prop] = val
      }
      return result
    }

    function sanitizeHTML(html: string, maxLen: number): string {
      // Remove script tags and their content
      let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Mask password input values
      cleaned = cleaned.replace(
        /(<input[^>]*type\s*=\s*["']password["'][^>]*)\bvalue\s*=\s*["'][^"']*["']/gi,
        '$1value="***"',
      )
      if (cleaned.length > maxLen) {
        cleaned = cleaned.slice(0, maxLen) + "\n<!-- truncated -->"
      }
      return cleaned
    }

    function buildParentContext(el: Element, maxLen: number): string | undefined {
      const parent = el.parentElement
      if (!parent || parent === document.body || parent === document.documentElement) return undefined

      // Clone parent, simplify siblings
      const clone = parent.cloneNode(false) as Element
      for (const child of Array.from(parent.children)) {
        if (child === el) {
          // Mark selected element with a comment
          const tag = el.tagName.toLowerCase()
          const id = el.id ? `#${el.id}` : ""
          const cls = Array.from(el.classList)
            .filter((c) => c !== highlightClass)
            .slice(0, 3)
            .map((c) => `.${c}`)
            .join("")
          const comment = document.createComment(` \u25B6 selected: ${tag}${id}${cls} `)
          clone.appendChild(comment)
        } else {
          // Simplified sibling: tag + class only
          const tag = child.tagName.toLowerCase()
          const cls = Array.from(child.classList).slice(0, 2)
          const className = cls.length > 0 ? ` class="${cls.join(" ")}"` : ""
          const type = child.getAttribute("type")
          const typeAttr = type ? ` type="${type}"` : ""
          const stub = document.createElement(tag)
          stub.innerHTML = "" // self-closing-like
          let stubHTML = `<${tag}${className}${typeAttr}>`
          clone.insertAdjacentHTML("beforeend", stubHTML)
        }
      }

      let html = clone.outerHTML
      // Remove script content
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      if (html.length > maxLen) {
        html = html.slice(0, maxLen) + "\n<!-- truncated -->"
      }
      return html
    }

    function collectAttributes(el: Element): Record<string, string> {
      const result: Record<string, string> = {}
      for (const attr of Array.from(el.attributes)) {
        if (KEEP_ATTRS.has(attr.name) || attr.name.startsWith("aria-") || attr.name.startsWith("data-testid")) {
          // Mask password values
          if (attr.name === "value" && el.getAttribute("type") === "password") {
            result[attr.name] = "***"
          } else {
            result[attr.name] = attr.value
          }
        }
      }
      return result
    }

    function collectElementData(el: Element): ElementSelectionResult {
      const rect = el.getBoundingClientRect()
      const boundingRect = {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }

      const tag = el.tagName.toLowerCase()
      const id = el.id || undefined
      const classes = Array.from(el.classList)
        .filter((c) => c !== highlightClass)
      const selector = buildSelector(el)
      const attributes = collectAttributes(el)
      const outerHTML = sanitizeHTML(el.outerHTML, 20480) // 20KB
      const computedStyles = getFilteredStyles(el)

      const ariaLabel = el.getAttribute("aria-label") ?? undefined
      const role = el.getAttribute("role") ?? (el as HTMLElement).role ?? undefined
      const tabIndex = (el as HTMLElement).tabIndex !== -1 ? (el as HTMLElement).tabIndex : undefined
      const accessibility = { role, ariaLabel, tabIndex }

      const parentContext = buildParentContext(el, 5120) // 5KB

      return {
        rect: boundingRect,
        element: {
          selector,
          tag,
          id,
          classes,
          attributes,
          boundingRect,
          outerHTML,
          computedStyles,
          accessibility,
          parentContext,
        },
      }
    }

    function onMouseOver(e: MouseEvent) {
      const target = e.target as Element
      if (!target || target === document.body || target === document.documentElement) return
      if (currentTarget) currentTarget.classList.remove(highlightClass)
      currentTarget = target
      target.classList.add(highlightClass)
    }

    function onMouseOut(e: MouseEvent) {
      const target = e.target as Element
      if (target) target.classList.remove(highlightClass)
    }

    function onClick(e: MouseEvent) {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()

      const target = e.target as Element
      if (!target || target === document.body || target === document.documentElement) return

      // Check minimum size
      const rect = target.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return

      // Stop hover interactions immediately
      document.removeEventListener("mouseover", onMouseOver, true)
      document.removeEventListener("mouseout", onMouseOut, true)

      // Switch from glow to selected flash animation
      target.classList.remove(highlightClass)
      target.classList.add("pagenab-selected")

      // Scroll element into view for screenshot
      target.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior })

      // Wait for selected animation (350ms) + buffer before cleanup + resolve
      setTimeout(() => {
        target.classList.remove("pagenab-selected")
        cleanup()
        resolve(collectElementData(target))
      }, 400)
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cleanup()
        resolve(null)
      }
    }

    document.addEventListener("mouseover", onMouseOver, true)
    document.addEventListener("mouseout", onMouseOut, true)
    document.addEventListener("click", onClick, true)
    document.addEventListener("keydown", onKeyDown, true)
  })
}
