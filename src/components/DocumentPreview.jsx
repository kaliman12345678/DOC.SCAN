import React, { useState } from 'react'
import { Eye, EyeOff, Crop, RotateCw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react'

export function DocumentPreview({
  currentPage,
  pageIndex,
  totalPages,
  onPrevPage,
  onNextPage,
  onEditCorners,
  onRotate
}) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  if (!currentPage) return null

  const displaySrc = showOriginal
    ? currentPage.originalUrl
    : currentPage.previewUrl || currentPage.originalUrl

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col items-center">
      {/* Top Preview Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">
            Vista Previa (Página {pageIndex + 1} de {totalPages})
          </span>
          <button
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            type="button"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition select-none ${
              showOriginal
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="Mantén presionado para ver la foto original"
          >
            {showOriginal ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showOriginal ? 'Viendo Foto Original' : 'Mantén: Ver Original'}</span>
          </button>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEditCorners(pageIndex)}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition"
            title="Recortar / Enderezar bordes"
          >
            <Crop className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Ajustar Bordes</span>
          </button>

          <button
            onClick={() => onRotate(pageIndex)}
            type="button"
            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
            title="Girar 90°"
          >
            <RotateCw className="w-4 h-4 text-slate-600" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Zoom controls */}
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
            type="button"
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            type="button"
            className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Restablecer tamaño"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.25))}
            type="button"
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Display Paper */}
      <div className="relative w-full min-h-[350px] max-h-[65vh] flex items-center justify-center overflow-auto p-4 bg-slate-100/80 rounded-xl border border-slate-200/60">
        {/* Navigation arrows for multipage */}
        {pageIndex > 0 && (
          <button
            onClick={onPrevPage}
            type="button"
            className="absolute left-2 z-10 p-2 rounded-full bg-white/90 shadow-md text-slate-700 hover:bg-white hover:text-blue-600 transition"
            title="Página anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {pageIndex < totalPages - 1 && (
          <button
            onClick={onNextPage}
            type="button"
            className="absolute right-2 z-10 p-2 rounded-full bg-white/90 shadow-md text-slate-700 hover:bg-white hover:text-blue-600 transition"
            title="Página siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Paper Container with realistic drop shadow */}
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          className="transition-transform duration-150 inline-block shadow-2xl bg-white border border-slate-300 rounded-xs overflow-hidden max-w-full"
        >
          <img
            src={displaySrc}
            alt={`Página ${pageIndex + 1}`}
            className="max-h-[58vh] max-w-full object-contain block mx-auto"
          />
        </div>
      </div>
    </div>
  )
}
