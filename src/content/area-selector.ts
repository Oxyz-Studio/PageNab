// Area selector: injects a semi-opaque overlay for rectangle selection.
// Injected via chrome.scripting.executeScript when area mode is triggered.

export interface AreaRect {
  x: number
  y: number
  width: number
  height: number
}

export function startAreaSelection(): Promise<AreaRect | null> {
  return new Promise((resolve) => {
    // Force crosshair cursor on entire document so no page element can override it
    const cursorStyle = document.createElement("style")
    cursorStyle.id = "pagenab-cursor-override"
    cursorStyle.textContent = "* { cursor: crosshair !important; }"
    document.head.appendChild(cursorStyle)

    // Create overlay
    const overlay = document.createElement("div")
    overlay.id = "pagenab-area-overlay"
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      cursor: "crosshair",
      zIndex: "2147483647",
      userSelect: "none",
    })

    // Selection rectangle
    const selection = document.createElement("div")
    selection.id = "pagenab-area-selection"
    Object.assign(selection.style, {
      position: "fixed",
      border: "2px solid #fff",
      backgroundColor: "transparent",
      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
      zIndex: "2147483647",
      display: "none",
      pointerEvents: "none",
    })

    // Banner animation style
    const bannerStyle = document.createElement("style")
    bannerStyle.id = "pagenab-area-banner-style"
    bannerStyle.textContent = `
@keyframes pagenab-banner-enter {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
`
    document.head.appendChild(bannerStyle)

    // Instructions bar
    const instructions = document.createElement("div")
    Object.assign(instructions.style, {
      position: "fixed",
      bottom: "24px",
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
    instructions.textContent = "Draw a rectangle \u00B7 Esc to cancel"

    document.body.appendChild(overlay)
    document.body.appendChild(selection)
    document.body.appendChild(instructions)

    let startX = 0
    let startY = 0
    let isDragging = false

    function cleanup() {
      overlay.remove()
      selection.remove()
      instructions.remove()
      cursorStyle.remove()
      bannerStyle.remove()
      document.removeEventListener("keydown", onKeyDown)
    }

    function computeRect(endX: number, endY: number) {
      return {
        left: Math.min(startX, endX),
        top: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY),
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cleanup()
        resolve(null)
      }
    }

    document.addEventListener("keydown", onKeyDown)

    overlay.addEventListener("mousedown", (e: MouseEvent) => {
      isDragging = true
      startX = e.clientX
      startY = e.clientY
      selection.style.display = "block"
      selection.style.left = `${startX}px`
      selection.style.top = `${startY}px`
      selection.style.width = "0"
      selection.style.height = "0"
      overlay.style.backgroundColor = "transparent"
    })

    overlay.addEventListener("mousemove", (e: MouseEvent) => {
      if (!isDragging) return
      const r = computeRect(e.clientX, e.clientY)
      selection.style.left = `${r.left}px`
      selection.style.top = `${r.top}px`
      selection.style.width = `${r.width}px`
      selection.style.height = `${r.height}px`
    })

    overlay.addEventListener("mouseup", (e: MouseEvent) => {
      if (!isDragging) return
      isDragging = false

      const r = computeRect(e.clientX, e.clientY)
      cleanup()

      // Minimum size check
      if (r.width < 10 || r.height < 10) {
        resolve(null)
        return
      }

      // Wait for browser to repaint after overlay removal.
      // cleanup() removes DOM elements synchronously, but the visual
      // repaint is async — without this delay, captureVisibleTab
      // captures the overlay still visible on screen.
      setTimeout(() => {
        resolve({
          x: Math.round(r.left),
          y: Math.round(r.top),
          width: Math.round(r.width),
          height: Math.round(r.height),
        })
      }, 100)
    })
  })
}
