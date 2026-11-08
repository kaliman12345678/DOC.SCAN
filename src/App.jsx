import React, { useState, useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { UploadZone } from './components/UploadZone'
import { CaptureStaging } from './components/CaptureStaging'
import { PageList } from './components/PageList'
import { DocumentPreview } from './components/DocumentPreview'
import { FilterControls } from './components/FilterControls'
import { CornerAdjuster } from './components/CornerAdjuster'
import { ExportModal } from './components/ExportModal'
import { warpPerspective, getDefaultCorners } from './utils/perspective'
import { applyDocumentFilter, FILTER_TYPES } from './utils/imageFilters'
import { optimizeImageFile } from './utils/imageOptimizer'
import {
  savePagesToStorage,
  loadPagesFromStorage,
  clearPagesFromStorage,
  saveStagedPhotosToStorage,
  loadStagedPhotosFromStorage,
  clearStagedPhotosFromStorage
} from './utils/storage'
import { Download, Loader2, Camera, Images, AlertCircle, Plus, Sparkles } from 'lucide-react'

export function App() {
  const [pages, setPages] = useState([])
  const [stagedPhotos, setStagedPhotos] = useState([])
  const [activePageIndex, setActivePageIndex] = useState(0)
  const [adjustingPageIndex, setAdjustingPageIndex] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [errorMessage, setErrorMessage] = useState('')

  // Top bar hidden inputs for editor view
  const editorCameraInputRef = useRef(null)
  const editorGalleryInputRef = useRef(null)

  // Load saved state from IndexedDB on startup (survives tab reload)
  useEffect(() => {
    let mounted = true
    Promise.all([loadPagesFromStorage(), loadStagedPhotosFromStorage()]).then(([savedPages, savedStaged]) => {
      if (mounted) {
        if (savedPages && savedPages.length > 0) setPages(savedPages)
        if (savedStaged && savedStaged.length > 0) setStagedPhotos(savedStaged)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Auto-persist staged photos
  useEffect(() => {
    saveStagedPhotosToStorage(stagedPhotos)
  }, [stagedPhotos])

  // Auto-persist converted pages
  useEffect(() => {
    if (pages.length > 0) {
      savePagesToStorage(pages)
    }
  }, [pages])

  const activePage = pages[activePageIndex] || null

  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = (e) => reject(e)
      img.src = src
    })
  }

  /**
   * Stage new raw photos taken with camera or chosen from gallery
   */
  const handleAddRawPhotos = async (files) => {
    if (!files || files.length === 0) return
    setErrorMessage('')

    const newStaged = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const optimized = await optimizeImageFile(file, 2048)
        newStaged.push({
          id: `${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          dataUrl: optimized.dataUrl,
          width: optimized.width,
          height: optimized.height,
          name: file.name || `Foto ${stagedPhotos.length + i + 1}`
        })
      } catch (err) {
        console.error('Error optimizing photo:', err)
        setErrorMessage('Hubo un problema leyendo una de las fotos.')
      }
    }

    if (newStaged.length > 0) {
      setStagedPhotos((prev) => [...prev, ...newStaged])
    }
  }

  const handleRemoveStagedPhoto = (idx) => {
    setStagedPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleClearStaged = () => {
    setStagedPhotos([])
    clearStagedPhotosFromStorage()
  }

  /**
   * Process and convert single page to scanner look
   */
  const renderProcessedPage = async (pageData) => {
    const img = await loadImage(pageData.originalUrl)
    const nw = img.naturalWidth || img.width
    const nh = img.naturalHeight || img.height

    const corners = pageData.corners || getDefaultCorners(nw, nh)
    const warped = warpPerspective(img, corners)

    const filtered = applyDocumentFilter(
      warped,
      pageData.filter || FILTER_TYPES.COLOR_DOC,
      pageData.filterOptions || { brightness: 0, contrast: 0, sharpness: 0 }
    )

    const finalDataUrl = filtered.toDataURL('image/jpeg', 0.94)

    return {
      ...pageData,
      width: filtered.width,
      height: filtered.height,
      corners,
      previewUrl: finalDataUrl,
      processedUrl: finalDataUrl
    }
  }

  /**
   * Batch approve and convert all staged photos into scanned pages
   */
  const handleProcessAllStagedPhotos = async () => {
    if (stagedPhotos.length === 0) return

    setIsProcessingBatch(true)
    setBatchProgress({ current: 0, total: stagedPhotos.length })

    const convertedPages = []
    const startIdx = pages.length

    for (let i = 0; i < stagedPhotos.length; i++) {
      setBatchProgress({ current: i + 1, total: stagedPhotos.length })
      const raw = stagedPhotos[i]
      try {
        const initialCorners = getDefaultCorners(raw.width, raw.height)
        const rawPage = {
          id: raw.id,
          originalUrl: raw.dataUrl,
          width: raw.width,
          height: raw.height,
          corners: initialCorners,
          filter: FILTER_TYPES.COLOR_DOC,
          filterOptions: { brightness: 0, contrast: 0, sharpness: 0 }
        }

        const processed = await renderProcessedPage(rawPage)
        convertedPages.push(processed)
      } catch (err) {
        console.error('Error processing staged photo:', err)
      }
    }

    setPages((prev) => [...prev, ...convertedPages])
    setStagedPhotos([])
    clearStagedPhotosFromStorage()

    if (pages.length === 0) {
      setActivePageIndex(0)
    } else {
      setActivePageIndex(startIdx)
    }

    setIsProcessingBatch(false)
  }

  const handleFilterChange = async (newFilter) => {
    if (!activePage) return
    const updatedPage = { ...activePage, filter: newFilter }
    const rendered = await renderProcessedPage(updatedPage)
    setPages((prev) => {
      const copy = [...prev]
      copy[activePageIndex] = rendered
      return copy
    })
  }

  const handleFilterOptionsChange = async (newOptions) => {
    if (!activePage) return
    const updatedPage = { ...activePage, filterOptions: newOptions }
    const rendered = await renderProcessedPage(updatedPage)
    setPages((prev) => {
      const copy = [...prev]
      copy[activePageIndex] = rendered
      return copy
    })
  }

  const handleApplyToAllPages = async () => {
    if (!activePage || pages.length <= 1) return

    setIsProcessingBatch(true)
    const targetFilter = activePage.filter
    const targetOptions = activePage.filterOptions

    const updatedPages = []
    for (let i = 0; i < pages.length; i++) {
      setBatchProgress({ current: i + 1, total: pages.length })
      const p = pages[i]
      const updated = {
        ...p,
        filter: targetFilter,
        filterOptions: { ...targetOptions }
      }
      const rendered = await renderProcessedPage(updated)
      updatedPages.push(rendered)
    }

    setPages(updatedPages)
    setIsProcessingBatch(false)
  }

  const handleRotatePage = async (index) => {
    const page = pages[index]
    if (!page) return

    const img = await loadImage(page.originalUrl)
    const nw = img.naturalWidth || img.width
    const nh = img.naturalHeight || img.height

    const canvas = document.createElement('canvas')
    canvas.width = nh
    canvas.height = nw
    const ctx = canvas.getContext('2d')
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((90 * Math.PI) / 180)
    ctx.drawImage(img, -nw / 2, -nh / 2)

    const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.90)
    const newCorners = getDefaultCorners(canvas.width, canvas.height)

    const updated = {
      ...page,
      originalUrl: rotatedDataUrl,
      width: canvas.width,
      height: canvas.height,
      corners: newCorners
    }

    const rendered = await renderProcessedPage(updated)
    setPages((prev) => {
      const copy = [...prev]
      copy[index] = rendered
      return copy
    })
  }

  const handleConfirmCorners = async (adjustedCorners, updatedImgElement) => {
    if (adjustingPageIndex === null) return

    const page = pages[adjustingPageIndex]
    const updated = {
      ...page,
      originalUrl: updatedImgElement ? updatedImgElement.src : page.originalUrl,
      corners: adjustedCorners
    }

    const rendered = await renderProcessedPage(updated)
    setPages((prev) => {
      const copy = [...prev]
      copy[adjustingPageIndex] = rendered
      return copy
    })

    setAdjustingPageIndex(null)
  }

  const handleMovePage = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= pages.length) return
    setPages((prev) => {
      const copy = [...prev]
      const [moved] = copy.splice(fromIdx, 1)
      copy.splice(toIdx, 0, moved)
      return copy
    })
    setActivePageIndex(toIdx)
  }

  const handleDeletePage = (index) => {
    setPages((prev) => {
      const copy = prev.filter((_, idx) => idx !== index)
      return copy
    })
    if (activePageIndex >= pages.length - 1) {
      setActivePageIndex(Math.max(0, pages.length - 2))
    }
  }

  const handleReset = () => {
    if (confirm('¿Deseas reiniciar y eliminar todas las páginas del documento?')) {
      setPages([])
      setStagedPhotos([])
      setActivePageIndex(0)
      clearPagesFromStorage()
      clearStagedPhotosFromStorage()
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-16">
      {/* Hidden inputs attached to DOM for adding more pages from the editor */}
      <input
        type="file"
        ref={editorCameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleAddRawPhotos(Array.from(e.target.files))
            e.target.value = ''
          }
        }}
      />
      <input
        type="file"
        ref={editorGalleryInputRef}
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleAddRawPhotos(Array.from(e.target.files))
            e.target.value = ''
          }
        }}
      />

      {/* Header */}
      <Header pageCount={pages.length} onReset={handleReset} />

      {/* Error alert banner */}
      {errorMessage && (
        <div className="max-w-6xl mx-auto px-4 mt-3 w-full">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="font-bold hover:underline">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {/* VIEW 1: Taking / Staging multiple photos before approval */}
        {stagedPhotos.length > 0 ? (
          <CaptureStaging
            stagedPhotos={stagedPhotos}
            onAddFiles={handleAddRawPhotos}
            onRemovePhoto={handleRemoveStagedPhoto}
            onClearAll={handleClearStaged}
            onProceedToProcess={handleProcessAllStagedPhotos}
          />
        ) : pages.length === 0 ? (
          /* VIEW 2: Initial Empty State */
          <div className="my-auto py-6 sm:py-10">
            <UploadZone onFilesSelected={handleAddRawPhotos} />
          </div>
        ) : (
          /* VIEW 3: Editor / Document Scanned Pages */
          <div className="space-y-5">
            {/* Top Bar with Add More and Export to PDF */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => editorCameraInputRef.current?.click()}
                  type="button"
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-200/80 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tomar más fotos</span>
                </button>

                <button
                  onClick={() => editorGalleryInputRef.current?.click()}
                  type="button"
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition border border-slate-200 shadow-2xs active:scale-95"
                >
                  <Images className="w-4 h-4 text-indigo-600" />
                  <span>+ Añadir de galería</span>
                </button>
              </div>

              <button
                onClick={() => setShowExportModal(true)}
                type="button"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/25 active:scale-95 transition"
              >
                <Download className="w-4 h-4" />
                <span>Exportar PDF ({pages.length})</span>
              </button>
            </div>

            {/* Thumbnail Strip */}
            <PageList
              pages={pages}
              activePageIndex={activePageIndex}
              onSelectPage={setActivePageIndex}
              onMovePage={handleMovePage}
              onDeletePage={handleDeletePage}
              onRotatePage={handleRotatePage}
              onEditCorners={(idx) => setAdjustingPageIndex(idx)}
              onAddMorePages={() => editorGalleryInputRef.current?.click()}
            />

            {/* Filter Presets and Adjustments */}
            {activePage && (
              <FilterControls
                currentFilter={activePage.filter || FILTER_TYPES.COLOR_DOC}
                onFilterChange={handleFilterChange}
                filterOptions={activePage.filterOptions || {}}
                onFilterOptionsChange={handleFilterOptionsChange}
                onApplyToAllPages={handleApplyToAllPages}
                pageCount={pages.length}
              />
            )}

            {/* Document High-Res Preview */}
            {activePage && (
              <DocumentPreview
                currentPage={activePage}
                pageIndex={activePageIndex}
                totalPages={pages.length}
                onPrevPage={() => setActivePageIndex((i) => Math.max(0, i - 1))}
                onNextPage={() => setActivePageIndex((i) => Math.min(pages.length - 1, i + 1))}
                onEditCorners={(idx) => setAdjustingPageIndex(idx)}
                onRotate={handleRotatePage}
              />
            )}
          </div>
        )}
      </main>

      {/* Batch Processing Overlay */}
      {isProcessingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 text-base mb-1">
              Procesando y convirtiendo documentos...
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Corrigiendo perspectiva y optimizando nitidez
            </p>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-200"
                style={{
                  width: `${(batchProgress.current / Math.max(1, batchProgress.total)) * 100}%`
                }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-400 mt-2 block">
              Página {batchProgress.current} de {batchProgress.total}
            </span>
          </div>
        </div>
      )}

      {/* Interactive 4-corner adjuster modal */}
      {adjustingPageIndex !== null && pages[adjustingPageIndex] && (
        <CornerAdjuster
          imageSrc={pages[adjustingPageIndex].originalUrl}
          initialCorners={pages[adjustingPageIndex].corners}
          pageIndex={adjustingPageIndex}
          onConfirm={handleConfirmCorners}
          onCancel={() => setAdjustingPageIndex(null)}
        />
      )}

      {/* Export / Download Modal */}
      {showExportModal && (
        <ExportModal
          pages={pages}
          activePageIndex={activePageIndex}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  )
}
export default App
