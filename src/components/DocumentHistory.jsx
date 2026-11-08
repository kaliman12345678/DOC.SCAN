import React, { useState } from 'react'
import {
  FileText,
  Search,
  Plus,
  Camera,
  Images,
  Download,
  Share2,
  Trash2,
  Calendar,
  CreditCard,
  Sparkles,
  Edit3,
  Zap
} from 'lucide-react'
import { exportToPdf } from '../utils/pdfExport'

export function DocumentHistory({
  documents,
  onOpenDocument,
  onNewScanCamera,
  onNewScanGallery,
  onNewScanIdCard,
  onDeleteDocument,
  onRenameDocument
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const filteredDocs = documents.filter((doc) =>
    (doc.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleStartRename = (doc) => {
    setEditingId(doc.id)
    setEditTitle(doc.title)
  }

  const handleSaveRename = (docId) => {
    if (editTitle.trim()) {
      onRenameDocument(docId, editTitle.trim())
    }
    setEditingId(null)
  }

  const handleQuickDownloadPdf = async (e, doc) => {
    e.stopPropagation()
    const cleanPages = (doc.pages || []).map((p) => ({
      dataUrl: p.processedUrl || p.previewUrl || p.originalUrl,
      width: p.width || 800,
      height: p.height || 1100
    }))

    await exportToPdf(cleanPages, {
      filename: `${doc.title || 'Documento'}.pdf`,
      pageSize: 'a4',
      showPageNumbers: true
    })
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Hero Banner - Blue Palette */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-blue-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-sky-300 text-xs font-semibold backdrop-blur-xs">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              <span>Escanear nunca fue tan fácil</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Mis Documentos
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg">
              Tus digitalizaciones guardadas en tu equipo con máxima nitidez y privacidad.
            </p>
          </div>

          {/* Quick Action Buttons in Blue Palette */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onNewScanCamera}
              type="button"
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-600/30 active:scale-95 transition"
            >
              <Camera className="w-4 h-4 text-sky-200" />
              <span>Escanear con Cámara</span>
            </button>

            <button
              onClick={onNewScanGallery}
              type="button"
              className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-2xl border border-white/15 backdrop-blur-xs active:scale-95 transition"
            >
              <Images className="w-4 h-4 text-sky-400" />
              <span>Subir de Galería</span>
            </button>

            <button
              onClick={onNewScanIdCard}
              type="button"
              className="flex items-center gap-2 px-3.5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm rounded-2xl border border-white/15 backdrop-blur-xs active:scale-95 transition"
              title="Escanear Frente y Reverso de una Cédula en una sola hoja"
            >
              <CreditCard className="w-4 h-4 text-sky-400" />
              <span>Modo Cédula</span>
            </button>
          </div>
        </div>

        {/* Decorative ambient blue light */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de documento..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold self-end sm:self-center">
          {filteredDocs.length} {filteredDocs.length === 1 ? 'documento' : 'documentos'}
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-500 mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg mb-1">
            {searchQuery ? 'No se encontraron documentos' : 'Aún no tienes documentos guardados'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6">
            {searchQuery
              ? 'Prueba con otro término de búsqueda.'
              : 'FácilScan hace que escanear sea tan simple como tomar una foto.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onNewScanCamera}
              type="button"
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-blue-600/20 active:scale-95 transition"
            >
              <Camera className="w-4 h-4" />
              <span>Tomar primera foto</span>
            </button>
            <button
              onClick={onNewScanGallery}
              type="button"
              className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md active:scale-95 transition"
            >
              <Images className="w-4 h-4 text-sky-400" />
              <span>Elegir varias fotos</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
          {filteredDocs.map((doc) => {
            const pageCount = (doc.pages || []).length
            const isEditing = editingId === doc.id
            const dateStr = doc.updatedAt
              ? new Date(doc.updatedAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Reciente'

            return (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
                className="group relative bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-500/50 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between"
              >
                {/* Document Thumbnail Preview */}
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden border-b border-slate-100 flex items-center justify-center p-3">
                  <div className="h-full aspect-[3/4] bg-white rounded-md shadow-md overflow-hidden border border-slate-200 flex items-center justify-center">
                    <img
                      src={doc.coverUrl || (doc.pages && doc.pages[0]?.previewUrl) || ''}
                      alt={doc.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Page count pill */}
                  <div className="absolute bottom-3 right-3 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-950/75 text-white backdrop-blur-xs flex items-center gap-1 shadow-sm">
                    <FileText className="w-3 h-3 text-sky-400" />
                    <span>{pageCount} {pageCount === 1 ? 'pág' : 'págs'}</span>
                  </div>
                </div>

                {/* Document Information & Actions */}
                <div className="p-4 space-y-3">
                  <div>
                    {isEditing ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(doc.id)
                          }}
                          className="w-full px-2 py-1 text-xs font-bold border border-blue-500 rounded-lg focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(doc.id)}
                          className="px-2 py-1 text-xs font-bold bg-blue-600 text-white rounded-lg"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-800 text-sm truncate flex-1 hover:text-blue-700 transition">
                          {doc.title || 'Documento sin título'}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartRename(doc)
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition opacity-80 sm:opacity-0 group-hover:opacity-100"
                          title="Renombrar documento"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  {/* Action buttons footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={(e) => handleQuickDownloadPdf(e, doc)}
                      type="button"
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200/70 transition active:scale-95"
                      title="Descargar PDF directo"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`¿Eliminar "${doc.title}" de tu historial?`)) {
                          onDeleteDocument(doc.id)
                        }
                      }}
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Eliminar documento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
