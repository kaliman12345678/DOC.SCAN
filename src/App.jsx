import React, { useState, useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { DocumentHistory } from './components/DocumentHistory'
import { UploadZone } from './components/UploadZone'
import { CaptureStaging } from './components/CaptureStaging'
import { PageList } from './components/PageList'
import { DocumentPreview } from './components/DocumentPreview'
import { FilterControls } from './components/FilterControls'
import { CornerAdjuster } from './components/CornerAdjuster'
import { ExportModal } from './components/ExportModal'
import { SignatureModal } from './components/SignatureModal'
import { WatermarkModal } from './components/WatermarkModal'
import { IdCardComposer } from './components/IdCardComposer'
import { warpPerspective, getDefaultCorners } from './utils/perspective'
import { detectDocumentCorners } from './utils/edgeDetection'
import { applyDocumentFilter, FILTER_TYPES } from './utils/imageFilters'
import { optimizeImageFile } from './utils/imageOptimizer'
import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  saveStagedPhotosToStorage,
  loadStagedPhotosFromStorage,
  clearStagedPhotosFromStorage
} from './utils/storage'
import { Download, Loader2, Camera, Images, AlertCircle, ArrowLeft } from 'lucide-react'

export function App() {
  const [viewMode, setViewMode] = useState('history') // 'history' | 'editor'
  const [documents, setDocuments] = useState([])
  const [currentDocId, setCurrentDocId] = useState(null)
  const [currentDocTitle, setCurrentDocTitle] = useState('Nuevo Escaneo')
  const [pages, setPages] = useState([])
  const [stagedPhotos, setStagedPhotos] = useState([])
  const [activePageIndex, setActivePageIndex] = useState(0)

  // Modals
  const [adjustingPageIndex, setAdjustingPageIndex] = useState(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [showWatermarkModal, setShowWatermarkModal] = useState(false)
  const [showIdCardComposer, setShowIdCardComposer] = useState(false)

  // Progress and errors
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [errorMessage, setErrorMessage] = useState('')

  // Top hidden input refs for camera/gallery in editor
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  // Initial load: Fetch document history and staged photos
  useEffect(() => {
    let mounted = true
    Promise.all([getAllDocuments(), loadStagedPhotosFromStorage()]).then(([docs, staged]) => {
      if (mounted) {
        setDocuments(docs || [])
        if (staged && staged.length > 0) {
          setStagedPhotos(staged)
          setViewMode('editor')
        }
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Auto-save current document into history when pages change
  useEffect(() => {
    if (pages.length > 0) {
      const docId = currentDocId || `doc_${Date.now()}`
      if (!currentDocId) setCurrentDocId(docId)

      const docObj = {
        id: docId,
        title: currentDocTitle,
        coverUrl: pages[0]?.previewUrl || pages[0]?.originalUrl,
        pageCount: pages.length,
        pages
      }

      saveDocument(docObj).then((saved) => {
        if (saved) {
          setDocuments((prev) => {
            const exists = prev.some((d) => d.id === saved.id)
            if (exists) {
              return prev.map((d) => (d.id === saved.id ? saved : d))
            } else {
              return [saved, ...prev]
            }
          })
        }
      })
    }
  }, [pages, currentDocTitle])

  // Persist staged photos
  useEffect(() => {
    saveStagedPhotosToStorage(stagedPhotos)
  }, [stagedPhotos])

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
   * Add raw photos to the staging tray
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
          name: file.name || `Página ${stagedPhotos.length + i + 1}`
        })
      } catch (err) {
        console.error('Error optimizing photo:', err)
        setErrorMessage('Hubo un problema leyendo una de las fotos.')
      }
    }

    if (newStaged.length > 0) {
      setStagedPhotos((prev) => [...prev, ...newStaged])
      setViewMode('editor')
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
   * Process single page: warp perspective + apply filter
   */
  const renderProcessedPage = async (pageData) => {
    const img = await loadImage(pageData.originalUrl)
    const nw = img.naturalWidth || img.width
    const nh = img.naturalHeight || img.height

    let corners = pageData.corners
    if (!corners || corners.length !== 4) {
      try {
        corners = detectDocumentCorners(img)
      } catch (err) {
        corners = getDefaultCorners(nw, nh)
      }
    }
    if (!corners) {
      corners = getDefaultCorners(nw, nh)
    }

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
   * Approve and convert all staged photos into document pages
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
        const imgObj = await loadImage(raw.dataUrl)
        let initialCorners = null
        try {
          initialCorners = detectDocumentCorners(imgObj)
        } catch (e) {
          initialCorners = getDefaultCorners(raw.width, raw.height)
        }

        const rawPage = {
          id: raw.id,
          originalUrl: raw.dataUrl,
          width: raw.width,
          height: raw.height,
          corners: initialCorners || getDefaultCorners(raw.width, raw.height),
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

    const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.94)
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

  // Signature Stamping onto active page
  const handleApplySignature = async (signatureDataUrl) => {
    if (!activePage) return

    const baseImg = await loadImage(activePage.processedUrl || activePage.previewUrl)
    const sigImg = await loadImage(signatureDataUrl)

    const canvas = document.createElement('canvas')
    canvas.width = baseImg.width
    canvas.height = baseImg.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(baseImg, 0, 0)

    // Stamp signature in bottom right quadrant
    const sigW = Math.round(canvas.width * 0.32)
    const sigH = Math.round(sigW * (sigImg.height / sigImg.width))
    const sigX = canvas.width - sigW - Math.round(canvas.width * 0.08)
    const sigY = canvas.height - sigH - Math.round(canvas.height * 0.08)

    ctx.drawImage(sigImg, sigX, sigY, sigW, sigH)

    const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.94)

    setPages((prev) => {
      const copy = [...prev]
      copy[activePageIndex] = {
        ...copy[activePageIndex],
        previewUrl: stampedDataUrl,
        processedUrl: stampedDataUrl
      }
      return copy
    })

    setShowSignatureModal(false)
  }

  // Watermark Stamping onto active page
  const handleApplyWatermark = async ({ text, opacity }) => {
    if (!activePage) return

    const baseImg = await loadImage(activePage.processedUrl || activePage.previewUrl)

    const canvas = document.createElement('canvas')
    canvas.width = baseImg.width
    canvas.height = baseImg.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(baseImg, 0, 0)

    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((-35 * Math.PI) / 180)
    ctx.fillStyle = `rgba(180, 20, 20, ${opacity})`
    ctx.font = `bold ${Math.round(canvas.width * 0.09)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 0)
    ctx.restore()

    const stampedDataUrl = canvas.toDataURL('image/jpeg', 0.94)

    setPages((prev) => {
      const copy = [...prev]
      copy[activePageIndex] = {
        ...copy[activePageIndex],
        previewUrl: stampedDataUrl,
        processedUrl: stampedDataUrl
      }
      return copy
    })

    setShowWatermarkModal(false)
  }

  // Open existing document from history
  const handleOpenDocument = (doc) => {
    setCurrentDocId(doc.id)
    setCurrentDocTitle(doc.title || 'Documento')
    setPages(doc.pages || [])
    setActivePageIndex(0)
    setStagedPhotos([])
    setViewMode('editor')
  }

  // Rename document in history
  const handleRenameDocument = async (docId, newTitle) => {
    const doc = documents.find((d) => d.id === docId)
    if (doc) {
      const updated = { ...doc, title: newTitle }
      await saveDocument(updated)
      setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)))
      if (currentDocId === docId) {
        setCurrentDocTitle(newTitle)
      }
    }
  }

  // Delete document from history
  const handleDeleteDocument = async (docId) => {
    await deleteDocument(docId)
    setDocuments((prev) => prev.filter((d) => d.id !== docId))
    if (currentDocId === docId) {
      handleCloseDocument()
    }
  }

  // Close current document and return to History
  const handleCloseDocument = () => {
    setPages([])
    setStagedPhotos([])
    setCurrentDocId(null)
    setCurrentDocTitle('Nuevo Escaneo')
    setActivePageIndex(0)
    clearStagedPhotosFromStorage()
    setViewMode('history')
  }

  // Start new scan from camera
  const handleNewScanCamera = () => {
    handleCloseDocument()
    setViewMode('editor')
    setTimeout(() => cameraInputRef.current?.click(), 100)
  }

  // Start new scan from gallery
  const handleNewScanGallery = () => {
    handleCloseDocument()
    setViewMode('editor')
    setTimeout(() => galleryInputRef.current?.click(), 100)
  }

  // Start ID Card mode
  const handleNewScanIdCard = () => {
    setShowIdCardComposer(true)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Hidden inputs always attached to DOM for camera and gallery */}
      <input
        type="file"
        ref={cameraInputRef}
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
        ref={galleryInputRef}
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
      <Header
        viewMode={viewMode}
        onSwitchView={setViewMode}
        onReset={handleCloseDocument}
        docTitle={currentDocTitle}
        pageCount={pages.length}
      />

      {/* Error alert banner */}
      {errorMessage && (
        <div className="max-w-6xl mx-auto px-4 mt-3 w-full">
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="font-bold hover:underline">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {viewMode === 'history' ? (
          /* ================= VIEW 1: CAMSCANNER DOCUMENT HISTORY ================= */
          <DocumentHistory
            documents={documents}
            onOpenDocument={handleOpenDocument}
            onNewScanCamera={handleNewScanCamera}
            onNewScanGallery={handleNewScanGallery}
            onNewScanIdCard={handleNewScanIdCard}
            onDeleteDocument={handleDeleteDocument}
            onRenameDocument={handleRenameDocument}
          />
        ) : stagedPhotos.length > 0 ? (
          /* ================= VIEW 2: CAPTURE STAGING TRAY ================= */
          <div className="space-y-4">
            <button
              onClick={() => setViewMode('history')}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Mis Documentos</span>
            </button>

            <CaptureStaging
              stagedPhotos={stagedPhotos}
              onAddFiles={handleAddRawPhotos}
              onRemovePhoto={handleRemoveStagedPhoto}
              onClearAll={handleClearStaged}
              onProceedToProcess={handleProcessAllStagedPhotos}
            />
          </div>
        ) : pages.length === 0 ? (
          /* ================= VIEW 3: EMPTY SCANNER LAUNCHER ================= */
          <div className="space-y-4">
            <button
              onClick={() => setViewMode('history')}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Mis Documentos</span>
            </button>

            <div className="py-6 sm:py-10">
              <UploadZone onFilesSelected={handleAddRawPhotos} />
            </div>
          </div>
        ) : (
          /* ================= VIEW 4: CAMSCANNER PRO DOCUMENT EDITOR ================= */
          <div className="space-y-5 text-slate-800">
            {/* Top Bar with Document Title, Add More and Export to PDF */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('history')}
                  type="button"
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition"
                  title="Volver a Mis Documentos"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={currentDocTitle}
                  onChange={(e) => setCurrentDocTitle(e.target.value)}
                  className="text-base sm:text-lg font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white px-2 py-1 rounded-xl border border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden max-w-[200px] sm:max-w-xs truncate"
                  placeholder="Título del documento"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition border border-blue-200/80 active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Foto</span>
                </button>

                <button
                  onClick={() => galleryInputRef.current?.click()}
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition border border-slate-200 shadow-2xs active:scale-95"
                >
                  <Images className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Galería</span>
                </button>

                <button
                  onClick={() => setShowExportModal(true)}
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/25 active:scale-95 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar ({pages.length})</span>
                </button>
              </div>
            </div>

            {/* Thumbnail Strip */}
            <PageList
              pages={pages}
              activePageIndex={activePageIndex}
              onSelectPage={setActivePageIndex}
              onMovePage={(from, to) => {
                setPages((prev) => {
                  const copy = [...prev]
                  const [moved] = copy.splice(from, 1)
                  copy.splice(to, 0, moved)
                  return copy
                })
                setActivePageIndex(to)
              }}
              onDeletePage={(idx) => {
                setPages((prev) => prev.filter((_, i) => i !== idx))
                if (activePageIndex >= pages.length - 1) {
                  setActivePageIndex(Math.max(0, pages.length - 2))
                }
              }}
              onRotatePage={handleRotatePage}
              onEditCorners={(idx) => setAdjustingPageIndex(idx)}
              onAddMorePages={() => galleryInputRef.current?.click()}
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
                onOpenSignature={() => setShowSignatureModal(true)}
                onOpenWatermark={() => setShowWatermarkModal(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Batch Processing Overlay */}
      {isProcessingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <Loader2 className="w-10 h-10 animate-spin text-sky-400 mx-auto mb-3" />
            <h4 className="font-bold text-base mb-1">
              Digitalizando documentos...
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Alineando bordes y mejorando nitidez
            </p>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-200"
                style={{
                  width: `${(batchProgress.current / Math.max(1, batchProgress.total)) * 100}%`
                }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 mt-2 block">
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

      {/* CamScanner Export Modal */}
      {showExportModal && (
        <ExportModal
          pages={pages}
          activePageIndex={activePageIndex}
          docTitle={currentDocTitle}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          onConfirmSignature={handleApplySignature}
          onClose={() => setShowSignatureModal(false)}
        />
      )}

      {/* Watermark Modal */}
      {showWatermarkModal && (
        <WatermarkModal
          onConfirmWatermark={handleApplyWatermark}
          onClose={() => setShowWatermarkModal(false)}
        />
      )}

      {/* ID Card Composer Modal */}
      {showIdCardComposer && (
        <IdCardComposer
          onCompleteIdCard={(composedDoc) => {
            setShowIdCardComposer(false)
            setCurrentDocId(composedDoc.id)
            setCurrentDocTitle(composedDoc.title)
            setPages([composedDoc])
            setActivePageIndex(0)
            setViewMode('editor')
          }}
          onClose={() => setShowIdCardComposer(false)}
        />
      )}
    </div>
  )
}
export default App
