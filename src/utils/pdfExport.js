import { jsPDF } from 'jspdf'

/**
 * Creates and downloads a high-resolution PDF from a list of scanned canvas elements or image data URLs.
 * @param {Array<{ dataUrl: string, width: number, height: number }>} pages
 * @param {object} options - { filename: string, pageSize: 'a4' | 'letter' | 'fit', orientation: 'portrait' | 'auto' }
 */
export async function exportToPdf(pages, options = {}) {
  const {
    filename = 'Documento_Escaneado.pdf',
    pageSize = 'a4',
    margin = 5 // mm
  } = options

  if (!pages || pages.length === 0) {
    throw new Error('No hay páginas para exportar')
  }

  // Dimensions in mm
  const standardSizes = {
    a4: { w: 210, h: 297 },
    letter: { w: 215.9, h: 279.4 }
  }

  let doc = null

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const imgAspect = page.width / page.height
    const isLandscape = imgAspect > 1.05

    let pageFormat = pageSize
    let pageOrientation = isLandscape ? 'landscape' : 'portrait'
    let targetW, targetH

    if (pageSize === 'fit') {
      // Fit exactly to page aspect ratio
      const baseWidth = isLandscape ? 297 : 210
      targetW = baseWidth
      targetH = baseWidth / imgAspect
      pageFormat = [targetW, targetH]
    } else {
      const std = standardSizes[pageSize] || standardSizes.a4
      targetW = isLandscape ? std.h : std.w
      targetH = isLandscape ? std.w : std.h
      pageFormat = pageSize
    }

    if (i === 0) {
      doc = new jsPDF({
        orientation: pageOrientation,
        unit: 'mm',
        format: pageFormat,
        compress: true
      })
    } else {
      doc.addPage(pageFormat, pageOrientation)
    }

    // Calculate image placement maintaining aspect ratio within page margins
    const availW = targetW - margin * 2
    const availH = targetH - margin * 2

    let drawW = availW
    let drawH = drawW / imgAspect

    if (drawH > availH) {
      drawH = availH
      drawW = drawH * imgAspect
    }

    const posX = margin + (availW - drawW) / 2
    const posY = margin + (availH - drawH) / 2

    doc.addImage(page.dataUrl, 'JPEG', posX, posY, drawW, drawH, undefined, 'FAST')
  }

  // Save PDF
  doc.save(filename)
  return doc
}

/**
 * Native Web Share API helper for mobile devices to share files via WhatsApp, Mail, etc.
 */
export async function sharePdf(pages, filename = 'Documento_Escaneado.pdf') {
  if (!navigator.canShare) {
    throw new Error('Tu navegador no soporta la función directa de compartir. Usa el botón de descarga.')
  }

  // Generate blob
  const doc = await exportToPdf(pages, { filename })
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: 'Documento Escaneado',
      text: 'Adjunto documento digitalizado con DocScan.',
      files: [file]
    })
  } else {
    throw new Error('No es posible compartir archivos directamente desde este navegador.')
  }
}
