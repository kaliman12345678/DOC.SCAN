import React, { useState } from 'react'
import {
  FileDown,
  ImageDown,
  Share2,
  Check,
  X,
  FileText,
  Loader2,
  Layers
} from 'lucide-react'
import { exportToPdf, exportSinglePagePdf, downloadPagesAsImages, sharePdf } from '../utils/pdfExport'

export function ExportModal({
  pages,
  activePageIndex,
  docTitle = 'Documento_Escaneado',
  onClose
}) {
  const [name, setName] = useState(docTitle)
  const [pageSize, setPageSize] = useState('a4') // 'a4' | 'letter'
  const [quality, setQuality] = useState('high') // 'high' | 'medium'
  const [showPageNumbers, setShowPageNumbers] = useState(true)
  const [exportMode, setExportMode] = useState('single_pdf') // 'single_pdf' | 'separate_pdfs' | 'images'
  const [isExporting, setIsExporting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  const cleanPages = pages.map((p) => ({
    dataUrl: p.processedUrl || p.previewUrl || p.originalUrl,
    width: p.width || 800,
    height: p.height || 1100
  }))

  const handleDownload = async () => {
    try {
      setIsExporting(true)
      setErrorMessage('')
      const baseFilename = name.trim() || 'Documento_Escaneado'

      if (exportMode === 'single_pdf') {
        await exportToPdf(cleanPages, {
          filename: `${baseFilename}.pdf`,
          pageSize,
          quality,
          showPageNumbers
        })
      } else if (exportMode === 'separate_pdfs') {
        for (let i = 0; i < cleanPages.length; i++) {
          await exportSinglePagePdf(
            cleanPages[i],
            i,
            cleanPages.length,
            `${baseFilename}_pagina_${i + 1}.pdf`
          )
        }
      } else if (exportMode === 'images') {
        downloadPagesAsImages(cleanPages, baseFilename)
      }

      setIsSuccess(true)
      setTimeout(() => {
        setIsSuccess(false)
        onClose()
      }, 1400)
    } catch (err) {
      console.error(err)
      setErrorMessage(err.message || 'Error durante la exportación')
    } finally {
      setIsExporting(false)
    }
  }

  const handleShare = async () => {
    try {
      setIsExporting(true)
      setErrorMessage('')
      const baseFilename = name.trim() || 'Documento_Escaneado'

      await sharePdf(cleanPages, `${baseFilename}.pdf`, {
        pageSize,
        quality,
        showPageNumbers
      })
    } catch (err) {
      console.warn(err)
      setErrorMessage(err.message || 'No se pudo compartir directamente.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Exportar Documentos</h3>
              <p className="text-[11px] text-slate-500">
                {pages.length} {pages.length === 1 ? 'página lista' : 'páginas listas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <div className="space-y-4">
          {/* File Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nombre del Archivo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              placeholder="Nombre del documento"
            />
          </div>

          {/* Export Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Método de Descarga
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'single_pdf',
                  title: 'PDF Completo',
                  desc: 'Hojas A4 separadas',
                  icon: FileText
                },
                {
                  id: 'separate_pdfs',
                  title: 'PDFs Individuales',
                  desc: '1 PDF por página',
                  icon: Layers
                },
                {
                  id: 'images',
                  title: 'Fotos JPG',
                  desc: 'Imágenes limpias',
                  icon: ImageDown
                }
              ].map((opt) => {
                const Icon = opt.icon
                const isSel = exportMode === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setExportMode(opt.id)}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                      isSel
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-2 ${isSel ? 'text-blue-600' : 'text-slate-400'}`} />
                    <div>
                      <span className="block text-xs font-bold text-slate-900">{opt.title}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">{opt.desc}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* PDF Page Settings */}
          {exportMode !== 'images' && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Tamaño de hoja:</span>
                <div className="flex gap-1.5">
                  {[
                    { id: 'a4', label: 'A4 Estándar' },
                    { id: 'letter', label: 'Carta (Letter)' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPageSize(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                        pageSize === p.id
                          ? 'border-blue-600 bg-white text-blue-700 shadow-2xs'
                          : 'border-transparent text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Numbering Checkbox */}
              <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                <span className="font-medium text-slate-700">
                  Incluir numeración de página (ej. "Página 1 de {pages.length}")
                </span>
                <input
                  type="checkbox"
                  checked={showPageNumbers}
                  onChange={(e) => setShowPageNumbers(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-600"
                />
              </label>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            onClick={handleDownload}
            disabled={isExporting}
            type="button"
            className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-blue-600/25 active:scale-98 transition"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando documentos...</span>
              </>
            ) : isSuccess ? (
              <>
                <Check className="w-4 h-4 text-blue-200" />
                <span>¡Descarga completada!</span>
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                <span>
                  {exportMode === 'single_pdf'
                    ? `Descargar PDF Completo (${pages.length} hojas)`
                    : exportMode === 'separate_pdfs'
                    ? `Descargar ${pages.length} PDFs Separados`
                    : `Descargar ${pages.length} Fotos JPG`}
                </span>
              </>
            )}
          </button>

          {/* Mobile Direct Share */}
          {canShare && exportMode === 'single_pdf' && (
            <button
              onClick={handleShare}
              disabled={isExporting}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs active:scale-95 transition"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>Compartir directo a WhatsApp / Correo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
