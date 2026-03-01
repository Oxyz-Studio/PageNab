// Crop a screenshot data URL to a specific rectangle using OffscreenCanvas.
// The rect is in CSS pixels; the image may be at a higher DPR resolution.
// We compute the scale factor from the image dimensions vs the CSS viewport.

export async function cropScreenshot(
  fullDataUrl: string,
  rect: { x: number; y: number; width: number; height: number },
  cssViewport: { width: number; height: number },
): Promise<string> {
  const response = await fetch(fullDataUrl)
  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)

  // Scale factor: captured image may be larger than CSS viewport (HiDPI)
  const scale = bitmap.width / cssViewport.width

  const sx = Math.round(rect.x * scale)
  const sy = Math.round(rect.y * scale)
  const sw = Math.round(rect.width * scale)
  const sh = Math.round(rect.height * scale)

  const canvas = new OffscreenCanvas(sw, sh)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas context")

  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh)

  const croppedBlob = await canvas.convertToBlob({ type: "image/png" })
  return blobToDataUrl(croppedBlob)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
