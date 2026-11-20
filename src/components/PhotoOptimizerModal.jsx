import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Upload,
  Sparkles,
  Zap,
  Sliders,
  Check,
  Download,
  Share2,
  FileText,
  Archive,
  ArrowRight,
  ShieldCheck,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  Eye
} from 'lucide-react'
import {
  OPTIMIZER_PRESETS,
  loadAndNormalizeImage,
  optimizePhoto,
  formatBytes,
  downloadBlob,
  downloadPhotosAsZip,
  exportPhotosAsPdf,
  shareOptimizedPhotos
} from '../utils/photoOptimizer'

export function PhotoOptimizerModal({
  initialFiles = [],
  initialPages = [],
  onClose
}) {
  const [photoItems, setPhotoItems] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState('whatsapp')
  const [isLoading, setIsLoading] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [exportSuccessMsg, setExportSuccessMsg] = useState('')

  // Custom Controls State
  const [customFormat, setCustomFormat] = useState('image/jpeg')
  const [customQuality, setCustomQuality] = useState(85)
  const [resizeMode, setResizeMode] = useState('preset_px') // 'original' | 'preset_px' | 'percentage'
  const [targetDimension, setTargetDimension] = useState(1600)
  const [targetPercentage, setTargetPercentage] = useState(100)
  const [targetMaxKb, setTargetMaxKb] = useState('')
  const [grayscale, setGrayscale] = useState(false)
  const [stripMetadata, setStripMetadata] = useState(true)

  // Zoom / Compare View toggle
  const [showOriginalComparison, setShowOriginalComparison] = useState(false)

  const fileInputRef = useRef(null)

  // Load initial files or pages on mount
  useEffect(() => {
    let isMounted = true

    async function loadInitial() {
      if (initialFiles && initialFiles.length > 0) {
        setIsLoading(true)
        try {
          const loaded = []
          for (const file of initialFiles) {
            const item = await loadAndNormalizeImage(file)
            loaded.push(item)
          }
          if (isMounted) {
            setPhotoItems(loaded)
            setActiveIndex(0)
          }
        } catch (err) {
          console.error(err)
          if (isMounted) setErrorMessage('No se pudieron cargar algunas fotos')
        } finally {
          if (isMounted) setIsLoading(false)
        }
      } else if (initialPages && initialPages.length > 0) {
        setIsLoading(true)
        try {
          const loaded = []
          for (let i = 0; i < initialPages.length; i++) {
            const page = initialPages[i]
            const url = page.processedUrl || page.previewUrl || page.originalUrl
            // Fetch blob from dataURL
            const res = await fetch(url)
            const blob = await res.blob()
            const file = new File([blob], `Pagina_${i + 1}.jpg`, { type: 'image/jpeg' })
            const item = await loadAndNormalizeImage(file)
            loaded.push(item)
          }
          if (isMounted) {
            setPhotoItems(loaded)
            setActiveIndex(0)
          }
        } catch (err) {
          console.error(err)
        } finally {
          if (isMounted) setIsLoading(false)
        }
      }
    }

    loadInitial()

    return () => {
      isMounted = false
    }
  }, [initialFiles, initialPages])

  // Get active configuration based on selected preset or custom
  const getActiveConfig = () => {
    if (selectedPreset === 'custom') {
      return {
        format: customFormat,
        quality: customQuality / 100,
        resizeMode,
        targetDimension: resizeMode === 'preset_px' ? targetDimension : null,
        targetPercentage: resizeMode === 'percentage' ? targetPercentage : 100,
        targetMaxBytes: targetMaxKb ? parseInt(targetMaxKb, 10) * 1024 : null,
        grayscale,
        stripMetadata,
        fillTransparentWithWhite: true
      }
    }

    const preset = OPTIMIZER_PRESETS[selectedPreset.toUpperCase()] || OPTIMIZER_PRESETS.WHATSAPP
    return {
      format: preset.format,
      quality: preset.quality,
      resizeMode: preset.maxWidth ? 'preset_px' : 'original',
      targetDimension: preset.maxWidth,
      targetPercentage: 100,
      targetMaxBytes: preset.maxBytes,
      grayscale: false,
      stripMetadata,
      fillTransparentWithWhite: true
    }
  }

  // Re-optimize photos whenever config or photo list changes
  useEffect(() => {
    if (photoItems.length === 0) return

    let cancelled = false
    const config = getActiveConfig()

    async function runOptimization() {
      setIsOptimizing(true)
      try {
        const updated = []
        for (const item of photoItems) {
          const opt = await optimizePhoto(item, config)
          updated.push(opt)
        }
        if (!cancelled) {
          setPhotoItems(updated)
        }
      } catch (err) {
        console.error('Optimization error:', err)
        if (!cancelled) setErrorMessage('Error al optimizar imagen')
      } finally {
        if (!cancelled) setIsOptimizing(false)
      }
    }

    const timeout = setTimeout(runOptimization, 120)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [
    photoItems.length,
    selectedPreset,
    customFormat,
    customQuality,
    resizeMode,
    targetDimension,
    targetPercentage,
    targetMaxKb,
    grayscale,
    stripMetadata
  ])

  // Add more files from disk/device
  const handleAddFiles = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files)
    setIsLoading(true)
    setErrorMessage('')

    try {
      const newItems = []
      for (const file of files) {
        const item = await loadAndNormalizeImage(file)
        newItems.push(item)
      }
      setPhotoItems((prev) => [...prev, ...newItems])
      if (photoItems.length === 0) setActiveIndex(0)
    } catch (err) {
      console.error(err)
      setErrorMessage('Error al agregar nuevas imágenes')
    } finally {
      setIsLoading(false)
      e.target.value = ''
    }
  }

  // Remove a photo from list
  const handleRemovePhoto = (idx) => {
    setPhotoItems((prev) => {
      const copy = prev.filter((_, i) => i !== idx)
      return copy
    })
    if (activeIndex >= photoItems.length - 1) {
      setActiveIndex(Math.max(0, photoItems.length - 2))
    }
  }

  // Downloads
  const handleDownloadCurrent = () => {
    const current = photoItems[activeIndex]
    if (!current || !current.optimizedBlob) return
    const baseName = current.originalName.replace(/\.[^/.]+$/, '')
    const fileName = `${baseName}_optimizada.${current.ext || 'jpg'}`
    downloadBlob(current.optimizedBlob, fileName)
    triggerSuccess('Foto descargada con éxito')
  }

  const handleDownloadAllZip = async () => {
    if (photoItems.length === 0) return
    setIsExporting(true)
    try {
      await downloadPhotosAsZip(photoItems, 'FacilScan_Fotos_Optimizadas.zip')
      triggerSuccess('Archivo ZIP descargado')
    } catch (err) {
      console.error(err)
      setErrorMessage('Error al generar archivo ZIP')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportAllPdf = async () => {
    if (photoItems.length === 0) return
    setIsExporting(true)
    try {
      await exportPhotosAsPdf(photoItems, 'FacilScan_Fotos_Optimizadas.pdf')
      triggerSuccess('Documento PDF generado')
    } catch (err) {
      console.error(err)
      setErrorMessage('Error al generar PDF')
    } finally {
      setIsExporting(false)
    }
  }

  const handleShare = async () => {
    if (photoItems.length === 0) return
    setIsExporting(true)
    try {
      await shareOptimizedPhotos(photoItems, 'Fotos Optimizadas - FácilScan')
    } catch (err) {
      console.warn(err)
      // If Web Share was cancelled or unsupported, fallback to single download
      if (err.name !== 'AbortError') {
        handleDownloadCurrent()
      }
    } finally {
      setIsExporting(false)
    }
  }

  const triggerSuccess = (msg) => {
    setExportSuccessMsg(msg)
    setTimeout(() => setExportSuccessMsg(''), 2500)
  }

  // Cumulative metrics for batch
  const totalOriginalBytes = photoItems.reduce((acc, p) => acc + (p.originalSize || 0), 0)
  const totalOptimizedBytes = photoItems.reduce(
    (acc, p) => acc + (p.optimizedSize || p.originalSize || 0),
    0
  )
  const totalSavingsBytes = Math.max(0, totalOriginalBytes - totalOptimizedBytes)
  const totalSavingsPercent =
    totalOriginalBytes > 0
      ? Math.round(((totalOriginalBytes - totalOptimizedBytes) / totalOriginalBytes) * 100)
      : 0

  const activePhoto = photoItems[activeIndex] || null

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={handleAddFiles}
      />

      <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[96vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                  Optimizador Universal de Fotos
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                  HD & Pro
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Comprime, redimensiona y convierte cualquier imagen sin perder nitidez.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error / Success Toast Banner */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="font-bold underline">
              Cerrar
            </button>
          </div>
        )}
        {exportSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* If No Photos loaded yet: Upload Dropzone */}
          {photoItems.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-3xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 my-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-white shadow-md text-blue-600 flex items-center justify-center">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base">
                  Selecciona o arrastra una o varias fotos
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Compatible con JPG, PNG (con o sin transparencia), WebP y fotos de celular (HEIC).
                </p>
              </div>
              <button
                type="button"
                className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20"
              >
                Elegir Fotografías
              </button>
            </div>
          ) : (
            <>
              {/* Batch Thumbnails & Quick Addition Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                {photoItems.map((photo, idx) => {
                  const isActive = idx === activeIndex
                  return (
                    <div
                      key={photo.id || idx}
                      onClick={() => setActiveIndex(idx)}
                      className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden cursor-pointer border-2 transition ${
                        isActive
                          ? 'border-blue-600 ring-2 ring-blue-500/30 shadow-md'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo.optimizedDataUrl || photo.imageSource?.src}
                        alt="thumb"
                        className="w-full h-full object-cover"
                      />
                      {/* Savings badge */}
                      {photo.savingsPercent > 0 && (
                        <div className="absolute bottom-1 right-1 bg-emerald-600/90 text-white text-[9px] font-black px-1 rounded-sm leading-tight">
                          -{photo.savingsPercent}%
                        </div>
                      )}
                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemovePhoto(idx)
                        }}
                        className="absolute top-1 right-1 w-4 h-4 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition"
                        title="Eliminar de la lista"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )
                })}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 text-slate-500 hover:text-blue-600 flex flex-col items-center justify-center gap-1 transition"
                  title="Añadir más fotos"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-bold">+ Foto</span>
                </button>
              </div>

              {/* Cumulative Savings Banner (If 2 or more photos) */}
              {photoItems.length > 1 && (
                <div className="p-3 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm border border-blue-800/40">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-200">
                      Total Lote ({photoItems.length} fotos):
                    </span>
                    <span className="text-xs line-through text-slate-400">
                      {formatBytes(totalOriginalBytes)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-sky-400" />
                    <span className="text-xs font-black text-sky-300">
                      {formatBytes(totalOptimizedBytes)}
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold">
                    Ahorro total: -{totalSavingsPercent}% ({formatBytes(totalSavingsBytes)})
                  </div>
                </div>
              )}

              {/* Live Before vs. After Comparative Card */}
              {activePhoto && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/90 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Comparison Toggle */}
                      <button
                        onMouseDown={() => setShowOriginalComparison(true)}
                        onMouseUp={() => setShowOriginalComparison(false)}
                        onTouchStart={() => setShowOriginalComparison(true)}
                        onTouchEnd={() => setShowOriginalComparison(false)}
                        type="button"
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 shadow-2xs select-none active:bg-blue-50 active:text-blue-700"
                        title="Mantén presionado para ver la foto original"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          {showOriginalComparison ? 'Viendo Original' : 'Mantener para comparar'}
                        </span>
                      </button>

                      <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                        {activePhoto.originalName}
                      </span>
                    </div>

                    {isOptimizing && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Calculando compresión...</span>
                      </div>
                    )}
                  </div>

                  {/* Visual Preview Box */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center max-h-64 sm:max-h-72">
                    <img
                      src={
                        showOriginalComparison
                          ? activePhoto.imageSource?.src
                          : activePhoto.optimizedDataUrl || activePhoto.imageSource?.src
                      }
                      alt="preview"
                      className="max-h-64 sm:max-h-72 w-auto object-contain transition-all"
                    />

                    {/* Floating Pill on Image */}
                    <div className="absolute top-2.5 left-2.5 bg-slate-950/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-2 border border-slate-700">
                      <span>{showOriginalComparison ? 'ORIGINAL' : 'OPTIMIZADA'}</span>
                      <span className="text-slate-400">|</span>
                      <span>
                        {showOriginalComparison
                          ? `${activePhoto.originalWidth} × ${activePhoto.originalHeight} px`
                          : `${activePhoto.optimizedWidth || activePhoto.originalWidth} × ${activePhoto.optimizedHeight || activePhoto.originalHeight} px`}
                      </span>
                    </div>

                    {/* Format Badge */}
                    <div className="absolute top-2.5 right-2.5 bg-blue-600/90 text-white px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm">
                      {activePhoto.ext || 'jpg'}
                    </div>
                  </div>

                  {/* Quantitative Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Peso Original
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-700">
                        {formatBytes(activePhoto.originalSize)}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                      <span className="text-[10px] font-bold text-blue-600 uppercase block">
                        Peso Optimizado
                      </span>
                      <span className="text-xs sm:text-sm font-extrabold text-blue-700">
                        {formatBytes(activePhoto.optimizedSize || activePhoto.originalSize)}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Resolución
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-700 truncate block">
                        {activePhoto.optimizedWidth || activePhoto.originalWidth} ×{' '}
                        {activePhoto.optimizedHeight || activePhoto.originalHeight}
                      </span>
                    </div>

                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                        Ahorro
                      </span>
                      <span className="text-xs sm:text-sm font-black text-emerald-700">
                        -{activePhoto.savingsPercent || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Intelligent Presets Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Perfiles Rápidos (Presets Inteligentes)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {Object.values(OPTIMIZER_PRESETS).map((preset) => {
                    const isSelected = selectedPreset === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedPreset(preset.id)}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`text-xs font-extrabold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}
                          >
                            {preset.name}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight">
                          {preset.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Manual Controls (When "Personalizado" is selected) */}
              {selectedPreset === 'custom' && (
                <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 space-y-4 animate-in fade-in">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-100">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    <span>Controles Manuales de Optimización</span>
                  </div>

                  {/* Format Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Formato de Salida
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          id: 'image/jpeg',
                          label: 'JPG',
                          desc: 'Universal (Fondo blanco)'
                        },
                        {
                          id: 'image/png',
                          label: 'PNG',
                          desc: 'Conserva transparencia'
                        },
                        {
                          id: 'image/webp',
                          label: 'WebP',
                          desc: 'Máxima compresión'
                        }
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setCustomFormat(fmt.id)}
                          className={`p-2.5 rounded-xl border text-center transition ${
                            customFormat === fmt.id
                              ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="text-xs font-black">{fmt.label}</div>
                          <div
                            className={`text-[10px] ${customFormat === fmt.id ? 'text-blue-100' : 'text-slate-400'}`}
                          >
                            {fmt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Slider (for JPG and WebP) */}
                  {customFormat !== 'image/png' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Calidad / Compresión</span>
                        <span className="text-blue-600 font-black">{customQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={customQuality}
                        onChange={(e) => setCustomQuality(Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Más liviana (10%)</span>
                        <span>Equilibrada (80%)</span>
                        <span>Máxima nitidez (100%)</span>
                      </div>
                    </div>
                  )}

                  {/* Dimension Mode & Scaling */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Dimensiones y Resolución
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { mode: 'original', dim: null, label: 'Original' },
                        { mode: 'preset_px', dim: 2000, label: '2000 px' },
                        { mode: 'preset_px', dim: 1600, label: '1600 px (HD)' },
                        { mode: 'preset_px', dim: 1280, label: '1280 px' },
                        { mode: 'preset_px', dim: 800, label: '800 px (Mini)' },
                        { mode: 'percentage', pct: 75, label: '75%' },
                        { mode: 'percentage', pct: 50, label: '50%' },
                        { mode: 'percentage', pct: 25, label: '25%' }
                      ].map((item, idx) => {
                        const isMatch =
                          (item.mode === 'original' && resizeMode === 'original') ||
                          (item.mode === 'preset_px' &&
                            resizeMode === 'preset_px' &&
                            targetDimension === item.dim) ||
                          (item.mode === 'percentage' &&
                            resizeMode === 'percentage' &&
                            targetPercentage === item.pct)

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setResizeMode(item.mode)
                              if (item.dim) setTargetDimension(item.dim)
                              if (item.pct) setTargetPercentage(item.pct)
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                              isMatch
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Target Limit in KB or MB */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Límite de Peso Objetivo (Opcional)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Ej: 500"
                        value={targetMaxKb}
                        onChange={(e) => setTargetMaxKb(e.target.value)}
                        className="w-32 px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-500">KB</span>
                      {targetMaxKb && (
                        <button
                          type="button"
                          onClick={() => setTargetMaxKb('')}
                          className="text-xs text-rose-500 font-semibold hover:underline"
                        >
                          Quitar límite
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grayscale filter toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Filtro Escala de Grises / B&N
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Reduce aún más el peso eliminando datos cromáticos.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={grayscale}
                      onChange={(e) => setGrayscale(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Privacy and Technical Guarantees */}
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-slate-100">
                      Privacidad y Seguridad Garantizada
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Eliminar metadatos (GPS, fecha y modelo de cámara) activo por defecto.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-300 cursor-pointer flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={stripMetadata}
                      onChange={(e) => setStripMetadata(e.target.checked)}
                      className="accent-blue-500 w-3.5 h-3.5"
                    />
                    <span>Limpiar metadatos EXIF/GPS</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer / Action Bar */}
        {photoItems.length > 0 && (
          <div className="pt-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 font-semibold">
              {photoItems.length} {photoItems.length === 1 ? 'fotografía' : 'fotografías'} en lista
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Share button */}
              {typeof navigator !== 'undefined' && !!navigator.share && (
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={isExporting}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
                  title="Compartir por WhatsApp, correo u otras apps"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Compartir</span>
                </button>
              )}

              {/* Grouped PDF Export */}
              <button
                type="button"
                onClick={handleExportAllPdf}
                disabled={isExporting}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
                title="Guardar como archivo PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>PDF ({photoItems.length})</span>
              </button>

              {/* Download ZIP if multiple photos */}
              {photoItems.length > 1 ? (
                <button
                  type="button"
                  onClick={handleDownloadAllZip}
                  disabled={isExporting}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 shadow-md shadow-blue-600/25"
                >
                  <Archive className="w-4 h-4" />
                  <span>Descargar Todas (.ZIP)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadCurrent}
                  disabled={isExporting}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 shadow-md shadow-blue-600/25"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Foto</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
