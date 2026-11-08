import React, { useState, useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { UploadZone } from './components/UploadZone'
import { PageList } from './components/PageList'
import { DocumentPreview } from './components/DocumentPreview'
import { FilterControls } from './components/FilterControls'
import { CornerAdjuster } from './components/CornerAdjuster'
import { ExportModal } from './components/ExportModal'
import { warpPerspective, getDefaultCorners } from './utils/perspective'
import { applyDocumentFilter, FILTER_TYPES } from './utils/imageFilters'
import { optimizeImageFile } from './utils/imageOptimizer'
import { savePagesToStorage, loadPagesFromStorage, clearPagesFromStorage } from './utils/storage'
import { Download, Loader2, Camera, AlertCircle, Plus, Check } from 'lucide-react'

export function App() {
  const [pages, setPages] = useState([])
  const [activePageIndex, setActivePageIndex] = useState(0)
  const [adjustingPageIndex, setAdjustingPageIndex] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [errorMessage, setErrorMessage] = useState('')
  const [showTakeAnotherPrompt, setShowTakeAnotherPrompt] = useState(false)

  const quickCameraInputRef = useRef(null)

  // Load saved pages from storage on startup (survives mobile browser reload)
  useEffect(() => {
    let mounted = true
    loadPagesFromStorage().then((savedPages) => {
      if (mounted && savedPages && savedPages.length > 0) {
        setPages(savedPages)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Auto-save pages when updated
  useEffect(() => {
    if (pages.length > 0) {
      savePagesToStorage(pages)
    }
  }, [pages])

  // Active page shortcut
  const activePage = pages[activePageIndex] || null

  /**
   * Helper to load an image File or Blob into an HTMLImageElement
   */
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
   * Processes a single page item:
   * Takes original image, warps perspective via corners, and applies current filter.
   */
  const renderProcessedPage = async (pageData) => {
    const img = await loadImage(pageData.originalUrl)
    const nw = img.naturalWidth || img.width
    const nh = img.naturalHeight || img.height

    const corners = pageData.corners || getDefaultCorners(nw, nh)

    // 1. Warp perspective
    const warped = warpPerspective(img, corners)

    // 2. Apply document filter
    const filtered = applyDocumentFilter(
      warped,
      pageData.filter || FILTER_TYPES.COLOR_DOC,
      pageData.filterOptions || { brightness: 0, contrast: 0, sharpness: 0 }
    )

    const finalDataUrl = filtered.toDataURL('image/jpeg', 0.90)

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
   * Handles multi-file / batch upload or camera photos
   */
  const handleFilesSelected = async (fileList) => {
    if (!fileList || fileList.length === 0) return

    setErrorMessage('')
    setIsProcessingBatch(true)
    setBatchProgress({ current: 0, total: fileList.length })

    const newPages = []
    const startIdx = pages.length

    for (let i = 0; i < fileList.length; i++) {
      setBatchProgress({ current: i + 1, total: fileList.length })
      const file = fileList[i]
      try {
        // Optimize and resize image to prevent mobile memory overload
        const optimized = await optimizeImageFile(file, 1600)
        const nw = optimized.width
        const nh = optimized.height

        const initialCorners = getDefaultCorners(nw, nh)

        const rawPage = {
          id: `${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          originalUrl: optimized.dataUrl,
          width: nw,
          height: nh,
          corners: initialCorners,
          filter: FILTER_TYPES.COLOR_DOC, // Default to enhanced color document
          filterOptions: { brightness: 0, contrast: 0, sharpness: 0 }
        }

        const processed = await renderProcessedPage(rawPage)
        newPages.push(processed)
      } catch (err) {
        console.error('Error processing page', file.name, err)
        setErrorMessage(`Hubo un detalle procesando "${file.name}". Intenta de nuevo.`)
      }
    }

    if (newPages.length > 0) {
      setPages((prev) => [...prev, ...newPages])
      if (pages.length === 0) {
        setActivePageIndex(0)
      } else {
        setActivePageIndex(startIdx)
      }

      // If single file uploaded (likely from camera single shot), prompt user if they want to shoot another page
      if (fileList.length === 1) {
        setShowTakeAnotherPrompt(true)
        setTimeout(() => setShowTakeAnotherPrompt(false), 5000)
      }
    }

    setIsProcessingBatch(false)
  }

  /**
   * Changes the filter preset of the currently active page
   */
  const handleFilterChange = async (newFilter) => {
    if (!activePage) return
    const updatedPage = {
      ...activePage,
      filter: newFilter
    }
    const rendered = await renderProcessedPage(updatedPage)
    setPages((prev) => {
      const copy = [...prev]
      copy[activePageIndex] = rendered
      return copy
    })
  }

  /**
   * Changes fine tuning slider options for active page
   */
  const handleFilterOptionsChange = async (newOptions) => {
    if (!activePage) return
    const updatedPage = {
      ...activePage,
      filterOptions: newOptions
    }
    const rendered = await renderProcessedPage(updatedPage)
    setPages((prev) => {
      const copy = [...prev]
      copy[activePageIndex] = rendered
      return copy
    })
  }

  /**
   * Batch action: Apply current page's filter and settings to ALL pages!
   */
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

  /**
   * Rotates a page 90 degrees
   */
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

  /**
   * Confirms corner adjustment from CornerAdjuster modal
   */
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

  /**
   * Moves a page position in the sequence (reorder)
   */
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

  /**
   * Deletes a page
   */
  const handleDeletePage = (index) => {
    setPages((prev) => {
      const copy = prev.filter((_, idx) => idx !== index)
      return copy
    })
    if (activePageIndex >= pages.length - 1) {
      setActivePageIndex(Math.max(0, pages.length - 2))
    }
  }

  /**
   * Reset / Clear all
   */
  const handleReset = () => {
    if (confirm('¿Estás seguro de que deseas eliminar todas las páginas y empezar de nuevo?')) {
      setPages([])
      setActivePageIndex(0)
      clearPagesFromStorage()
    }
  }

  const triggerNextCameraShot = () => {
    setShowTakeAnotherPrompt(false)
    quickCameraInputRef.current?.click()
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-16">
      {/* Hidden camera input for consecutive shots */}
      <input
        type="file"
        ref={quickCameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(e.target.files)
            e.target.value = ''
          }
        }}
      />

      {/* Header */}
      <Header pageCount={pages.length} onReset={handleReset} />

      {/* Error banner if any */}
      {errorMessage && (
        <div className="max-w-6xl mx-auto px-4 mt-3 w-full">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="font-bold hover:underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Toast Prompt for Consecutive Camera Shots */}
      {showTakeAnotherPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="text-xs font-medium">✅ Página agregada. ¿Tomar otra?</span>
          <button
            onClick={triggerNextCameraShot}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-xs rounded-xl text-white shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Tomar siguiente</span>
          </button>
          <button
            onClick={() => setShowTakeAnotherPrompt(false)}
            className="text-xs text-slate-400 hover:text-white px-1"
          >
            Listo
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {pages.length === 0 ? (
          /* Empty State: Upload / Camera Zone */
          <div className="my-auto py-6 sm:py-10">
            <UploadZone onFilesSelected={handleFilesSelected} />
          </div>
        ) : (
          /* Workspace with pages loaded */
          <div className="space-y-5">
            {/* Top Action Bar: Add more & Export buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <UploadZone onFilesSelected={handleFilesSelected} isAppending={true} />

              <button
                onClick={() => setShowExportModal(true)}
                type="button"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/25 active:scale-95 transition"
              >
                <Download className="w-4 h-4" />
                <span>Exportar PDF ({pages.length})</span>
              </button>
            </div>

            {/* Pages Thumbnail Strip */}
            <PageList
              pages={pages}
              activePageIndex={activePageIndex}
              onSelectPage={setActivePageIndex}
              onMovePage={handleMovePage}
              onDeletePage={handleDeletePage}
              onRotatePage={handleRotatePage}
              onEditCorners={(idx) => setAdjustingPageIndex(idx)}
              onAddMorePages={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.multiple = true
                input.accept = 'image/*'
                input.onchange = (e) => {
                  if (e.target.files) handleFilesSelected(e.target.files)
                }
                input.click()
              }}
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
              Procesando fotos...
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Optimizando calidad y legibilidad
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
