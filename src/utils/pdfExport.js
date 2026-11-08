import { jsPDF } from 'jspdf'

/**
 * Creates and downloads a high-resolution PDF from a list of scanned pages.
 * Ensures each scanned document is placed on its own clearly differentiated,
 * standard page (A4 or Letter) with optional page numbering and clean borders.
 *
 * @param {Array<{ dataUrl: string, width: number, height: number }>} pages
 * @param {object} options
 */
export async function exportToPdf(pages, options = {}) {
  const {
    filename = 'Documento_Escaneado.pdf',
    pageSize = 'a4', // 'a4' | 'letter'
    showPageNumbers = true,
    quality = 'high', // 'high' | 'medium'
    margin = 8 // mm
  } = options

  if (!pages || pages.length === 0) {
    throw new Error('No hay páginas para exportar')
  }

  // Standard dimensions in millimeters
  const PAGE_SPECS = {
    a4: { w: 210, h: 297 },
    letter: { w: 215.9, h: 279.4 }
  }

  const spec = PAGE_SPECS[pageSize] || PAGE_SPECS.a4
  const compressionMode = quality === 'high' ? 'NONE' : 'FAST'

  let doc = null

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const imgAspect = page.width / (page.height || 1)
    const isLandscape = imgAspect > 1.15

    const pageOrientation = isLandscape ? 'landscape' : 'portrait'
    const pageW = isLandscape ? spec.h : spec.w
    const pageH = isLandscape ? spec.w : spec.h

    if (i === 0) {
      doc = new jsPDF({
        orientation: pageOrientation,
        unit: 'mm',
        format: pageSize === 'letter' ? 'letter' : 'a4',
        compress: true
      })
    } else {
      doc.addPage(pageSize === 'letter' ? 'letter' : 'a4', pageOrientation)
    }

    // Available drawing area inside page margins
    const bottomSpaceForNumber = showPageNumbers ? 10 : 0
    const availW = pageW - margin * 2
    const availH = pageH - margin * 2 - bottomSpaceForNumber

    let drawW = availW
    let drawH = drawW / imgAspect

    if (drawH > availH) {
      drawH = availH
      drawW = drawH * imgAspect
    }

    // Center image on the page
    const posX = margin + (availW - drawW) / 2
    const posY = margin + (availH - drawH) / 2

    // Add high-resolution page image
    doc.addImage(
      page.dataUrl,
      'JPEG',
      posX,
      posY,
      drawW,
      drawH,
      undefined,
      compressionMode
    )

    // Optional CamScanner style page footer
    if (showPageNumbers && pages.length > 1) {
      doc.setFontSize(8)
      doc.setTextColor(140, 140, 140)
      doc.text(
        `Página ${i + 1} de ${pages.length}`,
        pageW / 2,
        pageH - 4,
        { align: 'center' }
      )
    }
  }

  doc.save(filename)
  return doc
}

/**
 * Downloads a single page as an individual PDF file
 */
export async function exportSinglePagePdf(page, pageIndex, totalPages, filename) {
  return exportToPdf([page], {
    filename: filename || `Pagina_${pageIndex + 1}.pdf`,
    pageSize: 'a4',
    showPageNumbers: false
  })
}

/**
 * Downloads all pages as individual JPG images
 */
export function downloadPagesAsImages(pages, baseFilename = 'Documento') {
  pages.forEach((page, idx) => {
    const link = document.createElement('a')
    link.href = page.dataUrl || page.previewUrl || page.originalUrl
    link.download = `${baseFilename}_pag_${idx + 1}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  })
}

/**
 * Web Share API for mobile devices to share PDF directly via WhatsApp or email
 */
export async function sharePdf(pages, filename = 'Documento_Escaneado.pdf', options = {}) {
  if (!navigator.canShare) {
    throw new Error('Tu dispositivo no soporta compartir directamente desde el navegador. Usa el botón de descarga.')
  }

  const doc = await exportToPdf(pages, { filename, ...options })
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  if (navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: filename.replace('.pdf', ''),
      text: 'Adjunto documento escaneado en alta resolución con DocScan.',
      files: [file]
    })
  } else {
    throw new Error('No es posible compartir archivos directamente desde este navegador.')
  }
}
