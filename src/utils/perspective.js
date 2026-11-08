/**
 * Computes the 3x3 projective transformation (homography) matrix
 * that maps source quadrilateral points to destination rectangle points.
 */
function getPerspectiveTransform(src, dst) {
  // src: [{x, y}, ... 4 points]
  // dst: [{x, y}, ... 4 points]
  const a = []
  const b = []

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x
    const sy = src[i].y
    const dx = dst[i].x
    const dy = dst[i].y

    a.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy])
    b.push(dx)

    a.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy])
    b.push(dy)
  }

  // Solve 8x8 linear system a * h = b using Gaussian elimination
  const h = gaussianElimination(a, b)
  return [
    h[0], h[1], h[2],
    h[3], h[4], h[5],
    h[6], h[7], 1.0
  ]
}

function gaussianElimination(A, B) {
  const n = B.length
  for (let i = 0; i < n; i++) {
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k
      }
    }
    const tempA = A[i]
    A[i] = A[maxRow]
    A[maxRow] = tempA

    const tempB = B[i]
    B[i] = B[maxRow]
    B[maxRow] = tempB

    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i]
      for (let j = i; j < n; j++) {
        if (i === j) {
          A[k][j] = 0
        } else {
          A[k][j] += c * A[i][j]
        }
      }
      B[k] += c * B[i]
    }
  }

  const x = new Array(n)
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0
    for (let j = i + 1; j < n; j++) {
      sum += A[i][j] * x[j]
    }
    x[i] = (B[i] - sum) / A[i][i]
  }
  return x
}

function invert3x3(m) {
  const [a, b, c, d, e, f, g, h, i] = m
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
  if (Math.abs(det) < 1e-12) return null

  const invDet = 1 / det
  return [
    (e * i - f * h) * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    (f * g - d * i) * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    (d * h - e * g) * invDet,
    (g * b - a * h) * invDet,
    (a * e - b * d) * invDet,
  ]
}

/**
 * Warps the quadrilateral area defined by corners in srcCanvas to a straightened rectangular canvas.
 * @param {HTMLCanvasElement|HTMLImageElement} sourceImage
 * @param {Array<{x: number, y: number}>} corners [TL, TR, BR, BL] in source pixel coordinates
 * @param {number} [targetWidth]
 * @param {number} [targetHeight]
 * @returns {HTMLCanvasElement}
 */
export function warpPerspective(sourceImage, corners, targetWidth, targetHeight) {
  const [tl, tr, br, bl] = corners

  // Calculate realistic dimensions if not provided
  const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y)
  const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y)
  const heightLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y)
  const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y)

  let outW = Math.round(targetWidth || Math.max(widthTop, widthBottom))
  let outH = Math.round(targetHeight || Math.max(heightLeft, heightRight))

  // Cap maximum dimension to 2048px to ensure razor sharp text and zero mobile memory crashes
  const MAX_DIM = 2048
  if (outW > MAX_DIM || outH > MAX_DIM) {
    const scale = Math.min(MAX_DIM / outW, MAX_DIM / outH)
    outW = Math.max(100, Math.round(outW * scale))
    outH = Math.max(100, Math.round(outH * scale))
  }

  if (outW <= 0 || outH <= 0) {
    throw new Error('Dimensiones de perspectiva inválidas')
  }

  // Draw source image to canvas to get pixel data
  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = sourceImage.naturalWidth || sourceImage.width
  srcCanvas.height = sourceImage.naturalHeight || sourceImage.height
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })
  srcCtx.drawImage(sourceImage, 0, 0)

  const srcImageData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height)
  const srcPixels = srcImageData.data
  const srcW = srcCanvas.width
  const srcH = srcCanvas.height

  // Destination rectangle points
  const dstCorners = [
    { x: 0, y: 0 },
    { x: outW, y: 0 },
    { x: outW, y: outH },
    { x: 0, y: outH }
  ]

  // Map destination (u,v) to source (x,y)
  const H = getPerspectiveTransform(corners, dstCorners)
  const Hinv = invert3x3(H)

  const dstCanvas = document.createElement('canvas')
  dstCanvas.width = outW
  dstCanvas.height = outH
  const dstCtx = dstCanvas.getContext('2d')
  const dstImageData = dstCtx.createImageData(outW, outH)
  const dstPixels = dstImageData.data

  const h0 = Hinv[0], h1 = Hinv[1], h2 = Hinv[2]
  const h3 = Hinv[3], h4 = Hinv[4], h5 = Hinv[5]
  const h6 = Hinv[6], h7 = Hinv[7], h8 = Hinv[8]

  let dstIdx = 0
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const z = h6 * x + h7 * y + h8
      if (z !== 0) {
        const sx = (h0 * x + h1 * y + h2) / z
        const sy = (h3 * x + h4 * y + h5) / z

        if (sx >= 0 && sx < srcW - 1 && sy >= 0 && sy < srcH - 1) {
          // Bilinear interpolation
          const x0 = Math.floor(sx)
          const y0 = Math.floor(sy)
          const x1 = x0 + 1
          const y1 = y0 + 1

          const wx1 = sx - x0
          const wx0 = 1 - wx1
          const wy1 = sy - y0
          const wy0 = 1 - wy1

          const idx00 = (y0 * srcW + x0) * 4
          const idx10 = (y0 * srcW + x1) * 4
          const idx01 = (y1 * srcW + x0) * 4
          const idx11 = (y1 * srcW + x1) * 4

          for (let c = 0; c < 3; c++) {
            const val = (
              srcPixels[idx00 + c] * wx0 * wy0 +
              srcPixels[idx10 + c] * wx1 * wy0 +
              srcPixels[idx01 + c] * wx0 * wy1 +
              srcPixels[idx11 + c] * wx1 * wy1
            )
            dstPixels[dstIdx + c] = Math.round(val)
          }
          dstPixels[dstIdx + 3] = 255
        } else if (sx >= 0 && sx < srcW && sy >= 0 && sy < srcH) {
          const idx = (Math.round(sy) * srcW + Math.round(sx)) * 4
          dstPixels[dstIdx] = srcPixels[idx]
          dstPixels[dstIdx + 1] = srcPixels[idx + 1]
          dstPixels[dstIdx + 2] = srcPixels[idx + 2]
          dstPixels[dstIdx + 3] = 255
        } else {
          // Outside boundaries: pure white
          dstPixels[dstIdx] = 255
          dstPixels[dstIdx + 1] = 255
          dstPixels[dstIdx + 2] = 255
          dstPixels[dstIdx + 3] = 255
        }
      }
      dstIdx += 4
    }
  }

  dstCtx.putImageData(dstImageData, 0, 0)
  return dstCanvas
}

/**
 * Returns sensible default 4 corner points (Top-Left, Top-Right, Bottom-Right, Bottom-Left)
 * with a slight margin inset to make corners easily visible and grabbable.
 */
export function getDefaultCorners(width, height) {
  const marginX = width * 0.05
  const marginY = height * 0.05
  return [
    { x: Math.round(marginX), y: Math.round(marginY) },                  // Top-Left
    { x: Math.round(width - marginX), y: Math.round(marginY) },          // Top-Right
    { x: Math.round(width - marginX), y: Math.round(height - marginY) }, // Bottom-Right
    { x: Math.round(marginX), y: Math.round(height - marginY) }          // Bottom-Left
  ]
}
