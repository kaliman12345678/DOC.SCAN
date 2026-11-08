/**
 * Image Processing Filters for Document Scanning
 * Focus: High legibility, crisp text, shadow removal, and preservation of color fidelity.
 */

export const FILTER_TYPES = {
  COLOR_DOC: 'color_doc',
  BW_SCAN: 'bw_scan',
  GRAYSCALE: 'grayscale',
  ORIGINAL: 'original'
}

/**
 * Applies selected filter preset and fine adjustments to an input canvas.
 * @param {HTMLCanvasElement} inputCanvas
 * @param {string} filterType
 * @param {object} options - { brightness: -50..50, contrast: -50..50, sharpness: 0..100 }
 * @returns {HTMLCanvasElement}
 */
export function applyDocumentFilter(inputCanvas, filterType = FILTER_TYPES.COLOR_DOC, options = {}) {
  const { brightness = 0, contrast = 0, sharpness = 0 } = options

  const outCanvas = document.createElement('canvas')
  outCanvas.width = inputCanvas.width
  outCanvas.height = inputCanvas.height
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(inputCanvas, 0, 0)

  if (filterType === FILTER_TYPES.ORIGINAL && brightness === 0 && contrast === 0 && sharpness === 0) {
    return outCanvas
  }

  const imageData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height)
  const pixels = imageData.data
  const w = outCanvas.width
  const h = outCanvas.height

  switch (filterType) {
    case FILTER_TYPES.BW_SCAN:
      applyAdaptiveThreshold(pixels, w, h)
      break

    case FILTER_TYPES.COLOR_DOC:
      applyColorDocumentEnhance(pixels, w, h)
      break

    case FILTER_TYPES.GRAYSCALE:
      applyGrayscaleEnhance(pixels, w, h)
      break

    case FILTER_TYPES.ORIGINAL:
    default:
      // Keep colors, proceed to adjustments if any
      break
  }

  // Apply fine-tuning adjustments if requested
  if (brightness !== 0 || contrast !== 0) {
    applyBrightnessContrast(pixels, brightness, contrast)
  }

  if (sharpness > 0) {
    applySharpness(pixels, w, h, sharpness / 100)
  }

  ctx.putImageData(imageData, 0, 0)
  return outCanvas
}

/**
 * Enhances color documents:
 * - Detects background paper color and neutralizes shadows to clean white
 * - Boosts contrast of text, signatures and official stamps
 * - Preserves vibrant ink (blue, red, green)
 */
function applyColorDocumentEnhance(pixels, w, h) {
  // Step 1: Find approximate background lightness using a quick sample
  let sampleCount = 0
  let maxLuma = 0
  const step = Math.max(1, Math.floor((w * h) / 10000))

  for (let i = 0; i < pixels.length; i += 4 * step) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    if (luma > maxLuma) maxLuma = luma
    sampleCount++
  }

  // Paper threshold: anything above ~82% of max luma is likely paper background
  const whitePoint = Math.max(180, Math.min(250, maxLuma * 0.95))
  const blackPoint = 35

  const range = whitePoint - blackPoint || 1
  const scale = 255 / range

  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i]
    let g = pixels[i + 1]
    let b = pixels[i + 2]

    // Luminance
    const luma = 0.299 * r + 0.587 * g + 0.114 * b

    // Color saturation detection (is it colored ink like blue pen or red stamp?)
    const maxC = Math.max(r, g, b)
    const minC = Math.min(r, g, b)
    const chroma = maxC - minC

    if (chroma > 28) {
      // It's colorful ink! Keep and boost vibrancy slightly
      const boost = 1.15
      r = Math.min(255, (r - blackPoint) * scale * boost)
      g = Math.min(255, (g - blackPoint) * scale * boost)
      b = Math.min(255, (b - blackPoint) * scale * boost)
    } else {
      // Mostly neutral (paper or dark text)
      if (luma > whitePoint - 20) {
        // Soft roll-off to pure white paper
        const t = (luma - (whitePoint - 20)) / 20
        r = Math.min(255, r * (1 - t) + 255 * t)
        g = Math.min(255, g * (1 - t) + 255 * t)
        b = Math.min(255, b * (1 - t) + 255 * t)
      } else {
        // Deepen text
        r = Math.max(0, Math.min(255, (r - blackPoint) * scale))
        g = Math.max(0, Math.min(255, (g - blackPoint) * scale))
        b = Math.max(0, Math.min(255, (b - blackPoint) * scale))
      }
    }

    pixels[i] = r
    pixels[i + 1] = g
    pixels[i + 2] = b
  }
}

/**
 * Adaptive Integral Image Thresholding (Bradley-Roth / Sauvola style):
 * Completely removes phone shadows, desk shadows, and lighting gradients,
 * making text 100% crisp black on pure white.
 */
function applyAdaptiveThreshold(pixels, w, h) {
  // Step 1: Grayscale conversion & 2D integral image
  const gray = new Uint8Array(w * h)
  for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
    gray[j] = (pixels[i] * 77 + pixels[i + 1] * 150 + pixels[i + 2] * 29) >> 8
  }

  // Integral image (sum of pixel values using 32-bit uint for low memory and high speed)
  const integral = new Uint32Array(w * h)
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      rowSum += gray[idx]
      integral[idx] = (y === 0 ? 0 : integral[idx - w]) + rowSum
    }
  }

  // Window radius: roughly 1/32 of document width for local adaptation
  const s = Math.max(7, Math.floor(w / 32))
  const t = 0.14 // 14% darker than surrounding local average triggers black text

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - s)
    const y2 = Math.min(h - 1, y + s)
    const rowY1 = y1 * w
    const rowY2 = y2 * w

    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - s)
      const x2 = Math.min(w - 1, x + s)
      const count = (x2 - x1 + 1) * (y2 - y1 + 1)

      // Calculate sum within [x1, y1] to [x2, y2] using integral image
      const sum = integral[rowY2 + x2]
        - (x1 > 0 ? integral[rowY2 + (x1 - 1)] : 0)
        - (y1 > 0 ? integral[(y1 - 1) * w + x2] : 0)
        + (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * w + (x1 - 1)] : 0)

      const pixelIdx = (y * w + x) * 4
      const currentVal = gray[y * w + x]

      // Threshold decision
      const isText = (currentVal * count) < (sum * (1.0 - t))
      const outVal = isText ? 0 : 255

      pixels[pixelIdx] = outVal
      pixels[pixelIdx + 1] = outVal
      pixels[pixelIdx + 2] = outVal
    }
  }
}

/**
 * High quality grayscale document mode.
 */
function applyGrayscaleEnhance(pixels, w, h) {
  for (let i = 0; i < pixels.length; i += 4) {
    const luma = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
    // Boost contrast slightly
    const enhanced = luma > 190 ? Math.min(255, luma * 1.08) : Math.max(0, (luma - 20) * 1.15)
    pixels[i] = enhanced
    pixels[i + 1] = enhanced
    pixels[i + 2] = enhanced
  }
}

/**
 * Adjusts brightness (-50..50) and contrast (-50..50).
 */
function applyBrightnessContrast(pixels, brightness, contrast) {
  // contrast factor formula: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  const c = Math.max(-50, Math.min(50, contrast)) * 2.55 // map to -127..127
  const factor = (259 * (c + 255)) / (255 * (259 - c))
  const b = brightness * 2.55

  for (let i = 0; i < pixels.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      let val = pixels[i + j] + b
      val = factor * (val - 128) + 128
      pixels[i + j] = Math.max(0, Math.min(255, Math.round(val)))
    }
  }
}

/**
 * Unsharp masking to improve text edge sharpness.
 */
function applySharpness(pixels, w, h, amount) {
  if (amount <= 0) return

  // Simple 3x3 Laplacian sharpening kernel
  // [ 0, -1,  0]
  // [-1,  5, -1]
  // [ 0, -1,  0]
  const copy = new Uint8ClampedArray(pixels)
  const kCenter = 1 + 4 * amount
  const kEdge = -amount

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4

      for (let c = 0; c < 3; c++) {
        const val =
          kCenter * copy[idx + c] +
          kEdge * (
            copy[((y - 1) * w + x) * 4 + c] +
            copy[((y + 1) * w + x) * 4 + c] +
            copy[(y * w + (x - 1)) * 4 + c] +
            copy[(y * w + (x + 1)) * 4 + c]
          )
        pixels[idx + c] = Math.max(0, Math.min(255, Math.round(val)))
      }
    }
  }
}
