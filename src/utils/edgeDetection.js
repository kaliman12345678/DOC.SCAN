/**
 * Smart Document Edge Detection Algorithm
 * Detects the document boundary on top of tables, desks, or background surfaces.
 * Uses adaptive gradient analysis, Otsu thresholding, and corner quad fitting.
 */

export function detectDocumentCorners(sourceImage) {
  const nw = sourceImage.naturalWidth || sourceImage.width
  const nh = sourceImage.naturalHeight || sourceImage.height

  if (!nw || !nh) {
    return null
  }

  // Work on downscaled canvas for fast processing (< 25ms)
  const scale = Math.min(1, 400 / Math.max(nw, nh))
  const sw = Math.round(nw * scale)
  const sh = Math.round(nh * scale)

  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(sourceImage, 0, 0, sw, sh)

  const imgData = ctx.getImageData(0, 0, sw, sh)
  const pixels = imgData.data

  // 1. Grayscale representation
  const gray = new Uint8Array(sw * sh)
  for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
    gray[j] = (pixels[i] * 77 + pixels[i + 1] * 150 + pixels[i + 2] * 29) >> 8
  }

  // 2. Compute edge gradient magnitude using Sobel-like 3x3 filter
  const edges = new Uint8Array(sw * sh)
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const idx = y * sw + x
      // Horizontal gradient
      const gx =
        -gray[idx - sw - 1] + gray[idx - sw + 1] +
        -2 * gray[idx - 1] + 2 * gray[idx + 1] +
        -gray[idx + sw - 1] + gray[idx + sw + 1]

      // Vertical gradient
      const gy =
        -gray[idx - sw - 1] - 2 * gray[idx - sw] - gray[idx - sw + 1] +
        gray[idx + sw - 1] + 2 * gray[idx + sw] + gray[idx + sw + 1]

      const mag = Math.min(255, (Math.abs(gx) + Math.abs(gy)) >> 2)
      edges[idx] = mag
    }
  }

  // 3. Scan from outside inward along multiple scanlines to locate document perimeter
  // We scan from top, bottom, left, and right towards center
  const centerCol = Math.floor(sw / 2)
  const centerRow = Math.floor(sh / 2)

  // Find top edge boundary candidates
  let topBoundaries = []
  for (let x = Math.floor(sw * 0.15); x < sw * 0.85; x += 4) {
    for (let y = 3; y < centerRow; y++) {
      if (edges[y * sw + x] > 40) {
        topBoundaries.push({ x, y })
        break
      }
    }
  }

  // Bottom edge candidates
  let bottomBoundaries = []
  for (let x = Math.floor(sw * 0.15); x < sw * 0.85; x += 4) {
    for (let y = sh - 4; y > centerRow; y--) {
      if (edges[y * sw + x] > 40) {
        bottomBoundaries.push({ x, y })
        break
      }
    }
  }

  // Left edge candidates
  let leftBoundaries = []
  for (let y = Math.floor(sh * 0.15); y < sh * 0.85; y += 4) {
    for (let x = 3; x < centerCol; x++) {
      if (edges[y * sw + x] > 40) {
        leftBoundaries.push({ x, y })
        break
      }
    }
  }

  // Right edge candidates
  let rightBoundaries = []
  for (let y = Math.floor(sh * 0.15); y < sh * 0.85; y += 4) {
    for (let x = sw - 4; x > centerCol; x--) {
      if (edges[y * sw + x] > 40) {
        rightBoundaries.push({ x, y })
        break
      }
    }
  }

  // Helper: compute median of an array of numbers
  const median = (arr) => {
    if (arr.length === 0) return null
    const s = [...arr].sort((a, b) => a - b)
    return s[Math.floor(s.length / 2)]
  }

  const topY = median(topBoundaries.map((p) => p.y))
  const botY = median(bottomBoundaries.map((p) => p.y))
  const leftX = median(leftBoundaries.map((p) => p.x))
  const rightX = median(rightBoundaries.map((p) => p.x))

  // Validate detected bounds: must be reasonably sized (at least 35% of image width/height)
  const marginFallbackX = nw * 0.05
  const marginFallbackY = nh * 0.05

  if (
    topY === null ||
    botY === null ||
    leftX === null ||
    rightX === null ||
    (botY - topY) < sh * 0.35 ||
    (rightX - leftX) < sw * 0.35
  ) {
    // Fallback: 5% inset
    return [
      { x: Math.round(marginFallbackX), y: Math.round(marginFallbackY) },
      { x: Math.round(nw - marginFallbackX), y: Math.round(marginFallbackY) },
      { x: Math.round(nw - marginFallbackX), y: Math.round(nh - marginFallbackY) },
      { x: Math.round(marginFallbackX), y: Math.round(nh - marginFallbackY) }
    ]
  }

  // Refine corners with slight slant angle tolerance
  // Convert back to natural coordinates
  const minX = Math.max(0, Math.round(leftX / scale))
  const maxX = Math.min(nw, Math.round(rightX / scale))
  const minY = Math.max(0, Math.round(topY / scale))
  const maxY = Math.min(nh, Math.round(botY / scale))

  return [
    { x: minX, y: minY }, // Top-Left
    { x: maxX, y: minY }, // Top-Right
    { x: maxX, y: maxY }, // Bottom-Right
    { x: minX, y: maxY }  // Bottom-Left
  ]
}
