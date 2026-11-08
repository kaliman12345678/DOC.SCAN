import React, { useState } from 'react'
import { FileDown, ImageDown, Share2, Check, X, FileText, Loader2, Sparkles } from 'lucide-react'
import { exportToPdf, sharePdf } from '../utils/pdfExport'

export function ExportModal({
  pages,
  activePageIndex,
  onClose
}) {
  const [docName, setDocName] = useState('Documento_Escaneado')
  const [pageSize, setPageSize] = useState('a4') // 'a4', 'letter', 'fit'
  const [isExporting, setIsExporting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true)
      setErrorMessage('')

      const cleanPages = pages.map((p) => ({
        dataUrl: p.processedUrl || p.previewUrl || p.originalUrl,
        width: p.width || 800,
        height: p.height || 1100
      }))

      await exportToPdf(cleanPages, {
        filename: `${docName.trim() || 'Documento_Escaneado'}.pdf`,
        pageSize
      })

      setIsSuccess(true)
      setTimeout(() => {
        setIsSuccess(false)
        onClose()
      }, 1500)
    } catch (err) {
      console.error(err)
      setErrorMessage(err.message || 'Error al generar el PDF')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDownloadImage = () => {
    const activePage = pages[activePageIndex] || pages[0]
    if (!activePage) return

    const src = activePage.processedUrl || activePage.previewUrl || activePage.originalUrl
    const link = document.createElement('a')
    link.href = src
    link.download = `${docName.trim() || 'Documento'}_pag_${activePageIndex + 1}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    try {
      setIsExporting(true)
      setErrorMessage('')

      const cleanPages = pages.map((p) => ({
        dataUrl: p.processedUrl || p.previewUrl || p.originalUrl,
        width: p.width || 800,
        height: p.height || 1100
      }))

      await sharePdf(cleanPages, `${docName.trim() || 'Documento_Escaneado'}.pdf`)
    } catch (err) {
      console.warn(err)
      setErrorMessage(err.message || 'No se pudo compartir. Puedes usar la opción de Descargar PDF.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <FileDown className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Descargar o Compartir</h3>
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
          {/* Document name input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nombre del archivo
            </label>
            <div className="relative">
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Nombre de tu documento"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                .pdf
              </span>
            </div>
          </div>

          {/* Page Format selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tamaño de página del PDF
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'a4', label: 'A4', desc: 'Estándar' },
                { id: 'letter', label: 'Carta', desc: 'Oficina' },
                { id: 'fit', label: 'Auto', desc: 'Ajuste foto' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPageSize(opt.id)}
                  className={`p-2 rounded-xl text-center border text-xs font-bold transition ${
                    pageSize === opt.id
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block">{opt.label}</span>
                  <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
            <span>Páginas incluidas:</span>
            <span className="font-bold text-slate-800">
              {pages.length} {pages.length === 1 ? 'página' : 'páginas'}
            </span>
          </div>

          {/* Primary Action: Download PDF */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            type="button"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-blue-600/20 active:scale-98 transition"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando PDF en alta calidad...</span>
              </>
            ) : isSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>¡Descarga lista!</span>
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                <span>Descargar PDF Completo ({pages.length})</span>
              </>
            )}
          </button>

          {/* Secondary Actions: Native Share (mobile) or Individual Image */}
          <div className="flex gap-2 pt-1">
            {canShare && (
              <button
                onClick={handleShare}
                disabled={isExporting}
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs active:scale-95 transition"
              >
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>Compartir (WhatsApp)</span>
              </button>
            )}

            <button
              onClick={handleDownloadImage}
              type="button"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs active:scale-95 transition"
              title="Descargar solo la página visible como foto JPG"
            >
              <ImageDown className="w-4 h-4 text-emerald-600" />
              <span>Guardar como Imagen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
