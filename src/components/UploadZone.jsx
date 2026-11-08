import React, { useRef, useState } from 'react'
import { Camera, Upload, Images, CheckCircle2, HelpCircle } from 'lucide-react'

export function UploadZone({ onFilesSelected, isAppending = false, onTriggerCameraNext }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(e.dataTransfer.files)
    }
  }

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      processSelectedFiles(files)
      e.target.value = '' // Clear so same file or subsequent camera shots trigger change
    }
  }

  const processSelectedFiles = (fileList) => {
    const validImageFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|heic|heif)$/i.test(f.name)
    )
    if (validImageFiles.length > 0) {
      onFilesSelected(validImageFiles)
    }
  }

  // Compact bar when adding more pages in the editor
  if (isAppending) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <button
          onClick={() => cameraInputRef.current?.click()}
          type="button"
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-200/80 active:scale-95"
        >
          <Camera className="w-4 h-4" />
          <span>Tomar otra foto</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          type="button"
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition border border-slate-200 shadow-2xs active:scale-95"
        >
          <Images className="w-4 h-4 text-indigo-600" />
          <span>+ Elegir varias fotos</span>
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Hidden inputs: One for live camera single-shot, one for multiple gallery selection */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-10 text-center transition-all duration-200 bg-white shadow-sm ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400'
        }`}
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/25">
          <Upload className="w-8 h-8" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight mb-2">
          Digitaliza tus documentos
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Sube tus fotos o tómalas directamente con la cámara de tu teléfono.
        </p>

        {/* Buttons for mobile and PC */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
          {/* Multiple Gallery / PC File Picker */}
          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-md shadow-blue-600/20 active:scale-98 transition duration-150"
          >
            <Images className="w-5 h-5" />
            <span>Elegir varias fotos</span>
          </button>

          {/* Mobile Camera Button */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            type="button"
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl shadow-md shadow-slate-900/10 active:scale-98 transition duration-150"
          >
            <Camera className="w-5 h-5 text-blue-400" />
            <span>Tomar foto con cámara</span>
          </button>
        </div>

        {/* Mobile Guidance Banner */}
        <div className="mt-6 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-amber-900 text-xs text-left flex items-start gap-2.5 max-w-lg mx-auto">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">¿Cómo subir varias fotos desde el celular?</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-800">
              <li>Si ya tomaste las fotos con la cámara normal de tu celular: pulsa <strong>"Elegir varias fotos"</strong> y marca todas las que quieras de tu galería.</li>
              <li>Si usas <strong>"Tomar foto con cámara"</strong>: la app te permitirá tomar una foto y de inmediato presionar <strong>"Tomar otra"</strong> para continuar con la siguiente página.</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Carga masiva sin límite
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Enderezado automático
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Exportar a PDF
          </span>
        </div>
      </div>
    </div>
  )
}
