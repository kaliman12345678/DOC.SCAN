import React, { useRef, useState, useEffect } from 'react'
import {
  RotateCw,
  Check,
  Maximize2,
  RefreshCw,
  X,
  Sparkles,
  Move,
  Layers,
  Minimize2,
  SlidersHorizontal
} from 'lucide-react'
import { detectDocumentCorners } from '../utils/edgeDetection'

/**
 * Interactive perspective adjuster with:
 * 1. Independent 4-corner adjustment with magnifier loupe
 * 2. Full line / edge sliding (Top, Right, Bottom, Left)
 * 3. Mode selector: Corners only, Edges only, or Both
 * 4. Automatic document boundary detection to remove tables / background surfaces
 */
export function CornerAdjuster({
  imageSrc,
  initialCorners,
  onConfirm,
  onCancel,
  pageIndex = 0
}) {
  const containerRef = useRef(null)
  const imgRef = useRef(null)
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [corners, setCorners] = useState(initialCorners || null)

  // Dragging state
  const [activeCornerIdx, setActiveCornerIdx] = useState(null)
  const [activeEdgeIdx, setActiveEdgeIdx] = useState(null)
  const [edgeDragStart, setEdgeDragStart] = useState(null) // { clientX, clientY, snapshot }

  // Control mode: 'both' | 'corners' | 'edges'
  const [adjustMode, setAdjustMode] = useState('both')
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 })
  const [isDetecting, setIsDetecting] = useState(false)

  // Edge definitions: which two corner indices form each of the 4 edges
  const edges = [
    { id: 0, name: 'Borde Superior', p1: 0, p2: 1, isHoriz: true },
    { id: 1, name: 'Borde Derecho', p1: 1, p2: 2, isHoriz: false },
    { id: 2, name: 'Borde Inferior', p1: 3, p2: 2, isHoriz: true },
    { id: 3, name: 'Borde Izquierdo', p1: 0, p2: 3, isHoriz: false }
  ]

  // Update sizes when image loads and auto-detect boundary
  const handleImageLoad = (e) => {
    const img = e.target
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    setNaturalSize({ width: nw, height: nh })

    if (!corners || corners.length !== 4) {
      // Run automatic table/document detection
      try {
        const detected = detectDocumentCorners(img)
        if (detected && detected.length === 4) {
          setCorners(detected)
          return
        }
      } catch (err) {
        console.warn('Auto detection fallback:', err)
      }

      // Default fallback: 5% inset
      const mx = nw * 0.05
      const my = nh * 0.05
      setCorners([
        { x: mx, y: my },
        { x: nw - mx, y: my },
        { x: nw - mx, y: nh - my },
        { x: mx, y: nh - my }
      ])
    }
  }

  // Measure display size to map natural coords to screen coords
  useEffect(() => {
    const updateDisplaySize = () => {
      if (imgRef.current) {
        const rect = imgRef.current.getBoundingClientRect()
        setDisplaySize({ width: rect.width, height: rect.height })
      }
    }

    updateDisplaySize()
    window.addEventListener('resize', updateDisplaySize)
    return () => window.removeEventListener('resize', updateDisplaySize)
  }, [naturalSize])

  const scaleX = naturalSize.width ? displaySize.width / naturalSize.width : 1
  const scaleY = naturalSize.height ? displaySize.height / naturalSize.height : 1

  // ------------------- CORNER DRAGGING -------------------

  const handleCornerPointerDown = (index, e) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveCornerIdx(index)
    setActiveEdgeIdx(null)
    updateCornerPosition(index, e)
  }

  const updateCornerPosition = (index, e) => {
    if (!imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    const screenX = Math.max(0, Math.min(rect.width, clientX - rect.left))
    const screenY = Math.max(0, Math.min(rect.height, clientY - rect.top))

    const natX = Math.round(screenX / scaleX)
    const natY = Math.round(screenY / scaleY)

    setCorners((prev) => {
      const updated = [...prev]
      updated[index] = { x: natX, y: natY }
      return updated
    })

    setMagnifierPos({ x: screenX, y: screenY })
  }

  // ------------------- EDGE / FULL LINE DRAGGING -------------------

  const handleEdgePointerDown = (edgeIdx, e) => {
    e.preventDefault()
    e.stopPropagation()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    setActiveEdgeIdx(edgeIdx)
    setActiveCornerIdx(null)
    setEdgeDragStart({
      clientX,
      clientY,
      snapshot: corners.map((c) => ({ ...c }))
    })
  }

  const updateEdgePosition = (e) => {
    if (activeEdgeIdx === null || !edgeDragStart || !imgRef.current) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    // Compute delta in natural coordinates
    const deltaScreenX = clientX - edgeDragStart.clientX
    const deltaScreenY = clientY - edgeDragStart.clientY

    const deltaNatX = Math.round(deltaScreenX / scaleX)
    const deltaNatY = Math.round(deltaScreenY / scaleY)

    const edge = edges[activeEdgeIdx]
    const nw = naturalSize.width
    const nh = naturalSize.height

    setCorners(() => {
      const updated = edgeDragStart.snapshot.map((c) => ({ ...c }))
      const p1 = edge.p1
      const p2 = edge.p2

      // Apply movement to both endpoints of this edge
      updated[p1].x = Math.max(0, Math.min(nw, edgeDragStart.snapshot[p1].x + deltaNatX))
      updated[p1].y = Math.max(0, Math.min(nh, edgeDragStart.snapshot[p1].y + deltaNatY))
      updated[p2].x = Math.max(0, Math.min(nw, edgeDragStart.snapshot[p2].x + deltaNatX))
      updated[p2].y = Math.max(0, Math.min(nh, edgeDragStart.snapshot[p2].y + deltaNatY))

      return updated
    })
  }

  // ------------------- GLOBAL POINTER DISPATCHER -------------------

  const handlePointerMove = (e) => {
    if (activeCornerIdx !== null) {
      e.preventDefault()
      updateCornerPosition(activeCornerIdx, e)
    } else if (activeEdgeIdx !== null) {
      e.preventDefault()
      updateEdgePosition(e)
    }
  }

  const handlePointerUp = () => {
    setActiveCornerIdx(null)
    setActiveEdgeIdx(null)
    setEdgeDragStart(null)
  }

  // ------------------- QUICK SMART ACTIONS -------------------

  // Trigger Automatic Paper Boundary Detection
  const handleAutoDetect = () => {
    if (!imgRef.current) return
    setIsDetecting(true)
    setTimeout(() => {
      try {
        const detected = detectDocumentCorners(imgRef.current)
        if (detected) {
          setCorners(detected)
        }
      } catch (err) {
        console.warn('Auto detection error:', err)
      } finally {
        setIsDetecting(false)
      }
    }, 50)
  }

  // Inset edges inward by 3% to cleanly remove any remaining table border
  const handleTrimBorders = () => {
    const nw = naturalSize.width
    const nh = naturalSize.height
    const dx = nw * 0.03
    const dy = nh * 0.03

    setCorners((prev) => [
      { x: Math.min(nw, prev[0].x + dx), y: Math.min(nh, prev[0].y + dy) },
      { x: Math.max(0, prev[1].x - dx), y: Math.min(nh, prev[1].y + dy) },
      { x: Math.max(0, prev[2].x - dx), y: Math.max(0, prev[2].y - dy) },
      { x: Math.min(nw, prev[3].x + dx), y: Math.max(0, prev[3].y - dy) }
    ])
  }

  const handleResetToFull = () => {
    const nw = naturalSize.width
    const nh = naturalSize.height
    setCorners([
      { x: 0, y: 0 },
      { x: nw, y: 0 },
      { x: nw, y: nh },
      { x: 0, y: nh }
    ])
  }

  const handleRotate = () => {
    const nw = naturalSize.width
    const nh = naturalSize.height

    const rotatedCorners = corners.map((pt) => ({
      x: nh - pt.y,
      y: pt.x
    }))
    const reordered = [
      rotatedCorners[3],
      rotatedCorners[0],
      rotatedCorners[1],
      rotatedCorners[2]
    ]

    const canvas = document.createElement('canvas')
    canvas.width = nh
    canvas.height = nw
    const ctx = canvas.getContext('2d')
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((90 * Math.PI) / 180)
    ctx.drawImage(imgRef.current, -nw / 2, -nh / 2)

    imgRef.current.src = canvas.toDataURL('image/jpeg', 0.95)
    setNaturalSize({ width: nh, height: nw })
    setCorners(reordered)
  }

  // Calculate polygon points
  const polygonPoints = corners && corners.length === 4
    ? corners.map((pt) => `${pt.x * scaleX},${pt.y * scaleY}`).join(' ')
    : ''

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col justify-between p-3 sm:p-5 select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top Bar: Title & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-white max-w-4xl w-full mx-auto pb-2 border-b border-slate-800">
        <div>
          <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
            Ajustar Bordes del Documento
            <span className="text-xs font-normal text-sky-300 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-800">
              Página {pageIndex + 1}
            </span>
          </h3>
          <p className="text-xs text-slate-300">
            {adjustMode === 'edges'
              ? 'Arrastra las 4 líneas para mover bordes completos y quitar la mesa.'
              : adjustMode === 'corners'
              ? 'Arrastra las 4 esquinas individualmente para afinar la perspectiva.'
              : 'Mueve las esquinas o arrastra las barras centrales de cada línea.'}
          </p>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'both', label: 'Ambos' },
            { id: 'edges', label: 'Bordes / Líneas' },
            { id: 'corners', label: 'Esquinas' }
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setAdjustMode(m.id)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                adjustMode === m.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
          title="Cerrar sin guardar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image & Adjuster Area */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden my-2 select-none"
      >
        <div className="relative inline-block max-h-full max-w-full">
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Para recortar"
            onLoad={handleImageLoad}
            className="max-h-[66vh] max-w-full object-contain rounded-lg shadow-2xl block select-none pointer-events-none"
            draggable={false}
          />

          {/* SVG Overlay: Polygon & Interactive Clickable Lines */}
          {displaySize.width > 0 && corners && corners.length === 4 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${displaySize.width} ${displaySize.height}`}
            >
              {/* Semi-transparent blue fill for selected document area */}
              <polygon
                points={polygonPoints}
                className="fill-blue-500/25 stroke-sky-400 stroke-2"
              />

              {/* Highlight lines connecting the corners */}
              {edges.map((edge) => {
                const p1 = corners[edge.p1]
                const p2 = corners[edge.p2]
                const isEdgeActive = activeEdgeIdx === edge.id

                return (
                  <line
                    key={edge.id}
                    x1={p1.x * scaleX}
                    y1={p1.y * scaleY}
                    x2={p2.x * scaleX}
                    y2={p2.y * scaleY}
                    className={`transition-all duration-150 ${
                      isEdgeActive
                        ? 'stroke-amber-400 stroke-[4]'
                        : 'stroke-sky-400 stroke-2'
                    }`}
                  />
                )
              })}
            </svg>
          )}

          {/* Edge Midpoint Drag Handles (Allow moving the entire line with 1 touch) */}
          {displaySize.width > 0 &&
            corners &&
            (adjustMode === 'both' || adjustMode === 'edges') &&
            edges.map((edge) => {
              const p1 = corners[edge.p1]
              const p2 = corners[edge.p2]
              const midX = ((p1.x + p2.x) / 2) * scaleX
              const midY = ((p1.y + p2.y) / 2) * scaleY
              const isEdgeActive = activeEdgeIdx === edge.id

              return (
                <div
                  key={`edge_${edge.id}`}
                  onPointerDown={(e) => handleEdgePointerDown(edge.id, e)}
                  style={{
                    left: `${midX}px`,
                    top: `${midY}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className={`absolute z-20 cursor-move touch-none flex items-center justify-center transition-transform ${
                    isEdgeActive ? 'scale-125' : 'hover:scale-110'
                  }`}
                  title={`Arrastrar ${edge.name} completo`}
                >
                  {/* Large touch area for mobile fingertips */}
                  <div className="w-14 h-14 -m-4 flex items-center justify-center">
                    <div
                      className={`px-2.5 py-1 rounded-full border-2 border-white shadow-lg flex items-center gap-1 ${
                        isEdgeActive
                          ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/50'
                          : 'bg-blue-600 text-white ring-2 ring-blue-500/40'
                      }`}
                    >
                      <Move className="w-3 h-3 stroke-[2.5]" />
                      <span className="text-[9px] font-black uppercase tracking-tight">
                        {edge.id === 0 ? 'Arriba' : edge.id === 1 ? 'Der' : edge.id === 2 ? 'Abajo' : 'Izq'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

          {/* Corner Drag Handles (Independent corner movement) */}
          {displaySize.width > 0 &&
            corners &&
            (adjustMode === 'both' || adjustMode === 'corners') &&
            corners.map((pt, idx) => {
              const screenX = pt.x * scaleX
              const screenY = pt.y * scaleY
              const isActive = activeCornerIdx === idx

              return (
                <div
                  key={`corner_${idx}`}
                  onPointerDown={(e) => handleCornerPointerDown(idx, e)}
                  style={{
                    left: `${screenX}px`,
                    top: `${screenY}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className={`absolute z-20 cursor-grab active:cursor-grabbing touch-none flex items-center justify-center transition-transform ${
                    isActive ? 'scale-125' : 'hover:scale-110'
                  }`}
                  title="Arrastrar esquina"
                >
                  <div className="w-14 h-14 -m-4 flex items-center justify-center">
                    <div
                      className={`w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
                        isActive
                          ? 'bg-amber-400 ring-4 ring-amber-400/50'
                          : 'bg-blue-600 ring-2 ring-blue-500/40'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  </div>
                </div>
              )
            })}

          {/* Magnifier Loupe when dragging a corner (Mobile zoom aid) */}
          {activeCornerIdx !== null && corners && (
            <div
              style={{
                left: `${magnifierPos.x}px`,
                top: `${magnifierPos.y - 75}px`,
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute pointer-events-none z-30 w-28 h-28 rounded-full border-4 border-amber-400 shadow-2xl overflow-hidden bg-black ring-4 ring-black/40"
            >
              <div
                style={{
                  width: `${displaySize.width}px`,
                  height: `${displaySize.height}px`,
                  transform: `scale(2.5) translate(${-(
                    corners[activeCornerIdx].x * scaleX -
                    56 / 2.5
                  )}px, ${-(corners[activeCornerIdx].y * scaleY - 56 / 2.5)}px)`,
                  transformOrigin: 'top left'
                }}
              >
                <img
                  src={imageSrc}
                  alt="Zoom"
                  className="w-full h-full object-contain select-none"
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-0.5 bg-amber-400" />
                <div className="h-4 w-0.5 bg-amber-400 -ml-2" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar: Tools & Confirmation */}
      <div className="max-w-4xl w-full mx-auto flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
        {/* Smart Edge & Table Removal Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Tap Table Removal / Auto Detect Document */}
          <button
            onClick={handleAutoDetect}
            disabled={isDetecting}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-sky-200 bg-blue-950 hover:bg-blue-900 border border-blue-700/80 rounded-xl transition active:scale-95 shadow-xs"
            title="Detecta automáticamente el papel y quita la mesa"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isDetecting ? 'Detectando...' : 'Auto-detectar papel (Quitar mesa)'}</span>
          </button>

          {/* Quick 3% Inset to trim any leftover table slivers */}
          <button
            onClick={handleTrimBorders}
            type="button"
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700 active:scale-95"
            title="Recorta un 3% hacia adentro para limpiar bordes de la mesa"
          >
            <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Recortar bordes (-3%)</span>
          </button>

          <button
            onClick={handleRotate}
            type="button"
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700 active:scale-95"
            title="Girar 90°"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Girar</span>
          </button>

          <button
            onClick={handleResetToFull}
            type="button"
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700 active:scale-95"
            title="Usar toda la foto"
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Toda la foto</span>
          </button>
        </div>

        {/* Confirmation buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            type="button"
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(corners, imgRef.current)}
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-600/30 transition active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Enderezar y Guardar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
