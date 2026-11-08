import React, { useRef } from 'react'
import { Camera, Images, Trash2, ArrowRight, Plus, Sparkles, FileText, CheckCircle2 } from 'lucide-react'

export function CaptureStaging({
  stagedPhotos,
  onAddFiles,
  onRemovePhoto,
  onClearAll,
  onProceedToProcess
}) {
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  const handleCameraChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handleGalleryChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      {/* Hidden inputs always attached to the DOM */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraChange}
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGalleryChange}
      />

      {/* Header card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Fotos Capturadas
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                {stagedPhotos.length} {stagedPhotos.length === 1 ? 'foto' : 'fotos'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Toma todas las fotos que necesites. Puedes eliminar las que salgan borrosas antes de convertir.
            </p>
          </div>

          {stagedPhotos.length > 0 && (
            <button
              onClick={onClearAll}
              type="button"
              className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition px-2 py-1"
            >
              Borrar todas
            </button>
          )}
        </div>

        {/* Buttons to take more or select more */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => cameraInputRef.current?.click()}
            type="button"
            className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-600/20 active:scale-98 transition"
          >
            <Camera className="w-5 h-5 text-blue-100" />
            <span>📷 Tomar otra foto con cámara</span>
          </button>

          <button
            onClick={() => galleryInputRef.current?.click()}
            type="button"
            className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-md shadow-slate-900/10 active:scale-98 transition"
          >
            <Images className="w-5 h-5 text-indigo-300" />
            <span>🖼️ Añadir más desde galería</span>
          </button>
        </div>
      </div>

      {/* Grid of staged photos */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Fotos listas para el escáner (Revisa y elimina las que no sirvan)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {stagedPhotos.map((photo, idx) => (
            <div
              key={photo.id || idx}
              className="group relative aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-xs flex flex-col justify-between p-2"
            >
              {/* Photo Image */}
              <img
                src={photo.dataUrl}
                alt={`Foto ${idx + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Top Tag & Delete Button */}
              <div className="relative z-10 flex items-center justify-between w-full">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-black/60 text-white backdrop-blur-xs shadow-xs">
                  #{idx + 1}
                </span>

                <button
                  onClick={() => onRemovePhoto(idx)}
                  type="button"
                  className="p-1.5 rounded-xl bg-rose-600 text-white shadow-md hover:bg-rose-700 active:scale-90 transition"
                  title="Eliminar esta foto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom gradient hint */}
              <div className="relative z-10 text-[10px] text-white/90 font-medium px-1 bg-black/40 backdrop-blur-xs rounded-md w-fit">
                {photo.name || `Página ${idx + 1}`}
              </div>
            </div>
          ))}

          {/* Quick card to shoot another photo directly */}
          <div
            onClick={() => cameraInputRef.current?.click()}
            className="aspect-[3/4] rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 flex flex-col items-center justify-center p-3 text-center cursor-pointer transition active:scale-98"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mb-2 shadow-sm">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-blue-900">Tomar foto #{stagedPhotos.length + 1}</span>
            <span className="text-[11px] text-blue-600 mt-0.5">con la cámara</span>
          </div>
        </div>

        {/* Primary Action Button: Proceed to Scanner Conversion */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={onProceedToProcess}
            type="button"
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base rounded-2xl shadow-lg shadow-blue-600/30 active:scale-98 transition"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>Aprobar y Convertir todas a Escáner ({stagedPhotos.length})</span>
            <ArrowRight className="w-5 h-5 ml-1" />
          </button>
          <p className="text-center text-xs text-slate-500 mt-2">
            Se corregirá la perspectiva, se eliminarán sombras y quedarán listas para exportar a PDF.
          </p>
        </div>
      </div>
    </div>
  )
}
