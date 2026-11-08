/**
 * Advanced Document Scanning & Legibility Filters
 * High-definition background normalization, adaptive shadow removal,
 * and anti-aliased edge sharpening for maximum readability.
 */

export const FILTER_TYPES = {
  COLOR_DOC: 'color_doc',
  BW_SCAN: 'bw_scan',
  GRAYSCALE: 'grayscale',
  ORIGINAL: 'original'
}

/**
 * Applies selected filter preset and fine adjustments to an input canvas.
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
      // High Definition B&W: background normalized with anti-aliased crisp text
      applyHighDefBW(pixels, w, h)
      break

    case FILTER_TYPES.COLOR_DOC:
      // Enhanced color: spotless paper background + vibrant ink & crisp dark text
      applyHighDefColorDoc(pixels, w, h)
      break

    case FILTER_TYPES.GRAYSCALE:
      applyGrayscaleEnhance(pixels, w, h)
      break

    case FILTER_TYPES.ORIGINAL:
    default:
      break
  }

  // Apply fine-tuning adjustments if requested
  if (brightness !== 0 || contrast !== 0) {
    applyBrightnessContrast(pixels, brightness, contrast)
  }

  // Apply edge sharpness (default slight sharpening for all document presets to ensure maximum legibility)
  const effectiveSharpness = sharpness > 0 ? sharpness / 100 : (filterType !== FILTER_TYPES.ORIGINAL ? 0.25 : 0)
  if (effectiveSharpness > 0) {
    applySharpness(pixels, w, h, effectiveSharpness)
  }

  ctx.putImageData(imageData, 0, 0)
  return outCanvas
}

/**
 * Computes an integral image from a grayscale Uint8Array
 */
function computeIntegralImage(gray, w, h) {
  const integral = new Uint32Array(w * h)
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    const rowOffset = y * w
    const prevRowOffset = (y - 1) * w
    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x
      rowSum += gray[idx]
      integral[idx] = (y === 0 ? 0 : integral[prevRowOffset + x]) + rowSum
    }
  }
  return integral
}

/**
 * High Definition B&W Document Scanner:
 * Uses local background illumination estimation via 2D Integral Image.
 * Eliminates all phone shadows, hand shadows and lighting gradients while
 * strictly preserving font anti-aliasing so thin letters, dots and signatures
 * NEVER break or become jagged/illegible.
 */
function applyHighDefBW(pixels, w, h) {
  // Step 1: Grayscale representation
  const gray = new Uint8Array(w * h)
  for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
    gray[j] = (pixels[i] * 77 + pixels[i + 1] * 150 + pixels[i + 2] * 29) >> 8
  }

  // Step 2: 2D Integral image for O(1) local mean background estimation
  const integral = computeIntegralImage(gray, w, h)

  // Local window radius: ~1/28th of document width adapts to local shadows
  const s = Math.max(8, Math.floor(w / 28))

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - s)
    const y2 = Math.min(h - 1, y + s)
    const rowY1 = y1 * w
    const rowY2 = y2 * w

    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - s)
      const x2 = Math.min(w - 1, x + s)
      const count = (x2 - x1 + 1) * (y2 - y1 + 1)

      const sum = integral[rowY2 + x2]
        - (x1 > 0 ? integral[rowY2 + (x1 - 1)] : 0)
        - (y1 > 0 ? integral[(y1 - 1) * w + x2] : 0)
        + (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * w + (x1 - 1)] : 0)

      const localMean = sum / count || 1
      const currentVal = gray[y * w + x]

      // Ratio of pixel lightness to local background illumination
      const ratio = currentVal / localMean

      let outVal
      if (ratio >= 0.88) {
        // Pure clean paper background (removes all phone/hand shadows)
        outVal = 255
      } else if (ratio <= 0.42) {
        // Solid black ink stroke center
        outVal = 0
      } else {
        // Smooth anti-aliased edge transition for maximum legibility of small text
        const t = (ratio - 0.42) / (0.88 - 0.42) // 0..1
        // Smooth non-linear curve to keep text dark and defined
        outVal = Math.round(Math.pow(t, 1.45) * 255)
      }

      const pixelIdx = (y * w + x) * 4
      pixels[pixelIdx] = outVal
      pixels[pixelIdx + 1] = outVal
      pixels[pixelIdx + 2] = outVal
    }
  }
}

/**
 * High Definition Color Document Scanner:
 * Normalizes background to pure spotless white, sharpens text,
 * and maintains full fidelity of colored signatures, official ink stamps and logos.
 */
function applyHighDefColorDoc(pixels, w, h) {
  // Grayscale for background luminance estimation
  const gray = new Uint8Array(w * h)
  for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
    gray[j] = (pixels[i] * 77 + pixels[i + 1] * 150 + pixels[i + 2] * 29) >> 8
  }

  const integral = computeIntegralImage(gray, w, h)
  const s = Math.max(8, Math.floor(w / 28))

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - s)
    const y2 = Math.min(h - 1, y + s)
    const rowY1 = y1 * w
    const rowY2 = y2 * w

    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - s)
      const x2 = Math.min(w - 1, x + s)
      const count = (x2 - x1 + 1) * (y2 - y1 + 1)

      const sum = integral[rowY2 + x2]
        - (x1 > 0 ? integral[rowY2 + (x1 - 1)] : 0)
        - (y1 > 0 ? integral[(y1 - 1) * w + x2] : 0)
        + (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * w + (x1 - 1)] : 0)

      const localMean = Math.max(30, sum / count)
      const idx = (y * w + x) * 4

      let r = pixels[idx]
      let g = pixels[idx + 1]
      let b = pixels[idx + 2]

      // Detect color saturation (is this blue pen, red stamp or logo?)
      const maxC = Math.max(r, g, b)
      const minC = Math.min(r, g, b)
      const chroma = maxC - minC

      // Background illumination normalization factor
      const normFactor = 255 / localMean

      if (chroma > 24) {
        // Vibrant colored ink: boost vibrancy and normalize brightness
        const boost = 1.15
        r = Math.min(255, Math.round(r * (normFactor * 0.9) * boost))
        g = Math.min(255, Math.round(g * (normFactor * 0.9) * boost))
        b = Math.min(255, Math.round(b * (normFactor * 0.9) * boost))
      } else {
        // Neutral text or paper
        const luma = gray[y * w + x]
        const ratio = luma / localMean

        if (ratio >= 0.88) {
          // Pure white paper
          r = 255
          g = 255
          b = 255
        } else if (ratio <= 0.42) {
          // Dark crisp text
          r = 0
          g = 0
          b = 0
        } else {
          // Smooth anti-aliased edge
          const t = (ratio - 0.42) / (0.88 - 0.42)
          const val = Math.round(Math.pow(t, 1.45) * 255)
          r = val
          g = val
          b = val
        }
      }

      pixels[idx] = r
      pixels[idx + 1] = g
      pixels[idx + 2] = b
    }
  }
}

/**
 * High quality grayscale document mode.
 */
function applyGrayscaleEnhance(pixels, w, h) {
  const gray = new Uint8Array(w * h)
  for (let i = 0, j = 0; i < pixels.length; i += 4, j++) {
    gray[j] = (pixels[i] * 77 + pixels[i + 1] * 150 + pixels[i + 2] * 29) >> 8
  }

  const integral = computeIntegralImage(gray, w, h)
  const s = Math.max(8, Math.floor(w / 28))

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - s)
    const y2 = Math.min(h - 1, y + s)
    const rowY1 = y1 * w
    const rowY2 = y2 * w

    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - s)
      const x2 = Math.min(w - 1, x + s)
      const count = (x2 - x1 + 1) * (y2 - y1 + 1)

      const sum = integral[rowY2 + x2]
        - (x1 > 0 ? integral[rowY2 + (x1 - 1)] : 0)
        - (y1 > 0 ? integral[(y1 - 1) * w + x2] : 0)
        + (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * w + (x1 - 1)] : 0)

      const localMean = Math.max(30, sum / count)
      const currentVal = gray[y * w + x]
      const ratio = currentVal / localMean

      let val
      if (ratio >= 0.92) {
        val = 255
      } else {
        val = Math.min(255, Math.max(0, Math.round(Math.pow(ratio / 0.92, 1.3) * 255)))
      }

      const idx = (y * w + x) * 4
      pixels[idx] = val
      pixels[idx + 1] = val
      pixels[idx + 2] = val
    }
  }
}

/**
 * Adjusts brightness (-50..50) and contrast (-50..50).
 */
function applyBrightnessContrast(pixels, brightness, contrast) {
  const c = Math.max(-50, Math.min(50, contrast)) * 2.55
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
 * High quality Unsharp Masking kernel to make text characters pop with sharp, crisp definition.
 */
function applySharpness(pixels, w, h, amount) {
  if (amount <= 0) return

  const copy = new Uint8ClampedArray(pixels)
  const kCenter = 1 + 4 * amount
  const kEdge = -amount

  for (let y = 1; y < h - 1; y++) {
    const rowOffset = y * w
    const prevRowOffset = (y - 1) * w
    const nextRowOffset = (y + 1) * w

    for (let x = 1; x < w - 1; x++) {
      const idx = (rowOffset + x) * 4

      for (let c = 0; c < 3; c++) {
        const val =
          kCenter * copy[idx + c] +
          kEdge * (
            copy[(prevRowOffset + x) * 4 + c] +
            copy[(nextRowOffset + x) * 4 + c] +
            copy[(rowOffset + (x - 1)) * 4 + c] +
            copy[(rowOffset + (x + 1)) * 4 + c]
          )
        pixels[idx + c] = Math.max(0, Math.min(255, Math.round(val)))
      }
    }
  }
}
