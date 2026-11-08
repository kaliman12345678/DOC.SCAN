import React, { useRef, useState, useEffect } from 'react'
import { RotateCw, Check, Maximize2, RefreshCw, X, CornerUpRight } from 'lucide-react'

/**
 * Interactive 4-corner perspective adjuster with touch support and magnifier loupe
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
  const [activeCornerIdx, setActiveCornerIdx] = useState(null)
  const [rotationAngle, setRotationAngle] = useState(0)
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0 })

  // Corner labels
  const cornerLabels = ['Sup. Izq.', 'Sup. Der.', 'Inf. Der.', 'Inf. Izq.']

  // Update sizes when image loads
  const handleImageLoad = (e) => {
    const img = e.target
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    setNaturalSize({ width: nw, height: nh })

    if (!corners || corners.length !== 4) {
      // Default 5% margin
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
  }, [naturalSize, rotationAngle])

  const scaleX = naturalSize.width ? displaySize.width / naturalSize.width : 1
  const scaleY = naturalSize.height ? displaySize.height / naturalSize.height : 1

  // Handle pointer down (touch or mouse)
  const handlePointerDown = (index, e) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveCornerIdx(index)
    updatePointerPosition(index, e)
  }

  // Pointer move
  const handlePointerMove = (e) => {
    if (activeCornerIdx === null || !imgRef.current) return
    e.preventDefault()
    updatePointerPosition(activeCornerIdx, e)
  }

  // Pointer up
  const handlePointerUp = () => {
    setActiveCornerIdx(null)
  }

  const updatePointerPosition = (index, e) => {
    if (!imgRef.current) return
    const rect = imgRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    // Clamp inside image bounds
    const screenX = Math.max(0, Math.min(rect.width, clientX - rect.left))
    const screenY = Math.max(0, Math.min(rect.height, clientY - rect.top))

    // Convert to natural coordinates
    const natX = Math.round(screenX / scaleX)
    const natY = Math.round(screenY / scaleY)

    setCorners((prev) => {
      const updated = [...prev]
      updated[index] = { x: natX, y: natY }
      return updated
    })

    setMagnifierPos({ x: screenX, y: screenY })
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

  const handleResetToDefault = () => {
    const nw = naturalSize.width
    const nh = naturalSize.height
    const mx = nw * 0.05
    const my = nh * 0.05
    setCorners([
      { x: mx, y: my },
      { x: nw - mx, y: my },
      { x: nw - mx, y: nh - my },
      { x: mx, y: nh - my }
    ])
  }

  const handleRotate = () => {
    // Rotate 90 deg clockwise
    // Swap dimensions & re-map corners
    const nw = naturalSize.width
    const nh = naturalSize.height

    const rotatedCorners = corners.map((pt) => ({
      x: nh - pt.y,
      y: pt.x
    }))
    // Shift corner order so [TL, TR, BR, BL] stays consistent
    const reordered = [
      rotatedCorners[3],
      rotatedCorners[0],
      rotatedCorners[1],
      rotatedCorners[2]
    ]

    // Rotate image through a canvas
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

  // Polygon SVG path in display coordinates
  const polygonPoints = corners && corners.length === 4
    ? corners.map((pt) => `${pt.x * scaleX},${pt.y * scaleY}`).join(' ')
    : ''

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col justify-between p-3 sm:p-6"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between text-white max-w-4xl w-full mx-auto pb-2">
        <div>
          <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
            Ajustar bordes del documento
            <span className="text-xs font-normal text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-800">
              Página {pageIndex + 1}
            </span>
          </h3>
          <p className="text-xs text-slate-300">
            Arrastra los 4 círculos a las esquinas exactas del papel para enderezarlo.
          </p>
        </div>

        <button
          onClick={onCancel}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
          title="Cerrar sin guardar cambios"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Canvas / Image Area */}
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
            className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl block select-none pointer-events-none"
            draggable={false}
          />

          {/* SVG Overlay for bounding polygon */}
          {displaySize.width > 0 && corners && corners.length === 4 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${displaySize.width} ${displaySize.height}`}
            >
              {/* Semi-transparent blue fill for selected document area */}
              <polygon
                points={polygonPoints}
                className="fill-blue-500/20 stroke-blue-500 stroke-2 stroke-dasharray-[4]"
              />
            </svg>
          )}

          {/* Draggable Corner Handles */}
          {displaySize.width > 0 && corners && corners.map((pt, idx) => {
            const screenX = pt.x * scaleX
            const screenY = pt.y * scaleY
            const isActive = activeCornerIdx === idx

            return (
              <div
                key={idx}
                onPointerDown={(e) => handlePointerDown(idx, e)}
                style={{
                  left: `${screenX}px`,
                  top: `${screenY}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`absolute z-20 cursor-grab active:cursor-grabbing touch-none flex items-center justify-center transition-transform ${
                  isActive ? 'scale-125' : 'hover:scale-110'
                }`}
              >
                {/* Large invisible touch hitbox for mobile fingertips */}
                <div className="w-14 h-14 -m-4 flex items-center justify-center">
                  <div
                    className={`w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
                      isActive ? 'bg-amber-400 ring-4 ring-amber-400/50' : 'bg-blue-600 ring-2 ring-blue-500/40'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Magnifier Loupe when dragging (essential for mobile precision) */}
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
                  transform: `scale(2.5) translate(${-(corners[activeCornerIdx].x * scaleX - 56 / 2.5)}px, ${-(corners[activeCornerIdx].y * scaleY - 56 / 2.5)}px)`,
                  transformOrigin: 'top left'
                }}
              >
                <img
                  src={imageSrc}
                  alt="Zoom"
                  className="w-full h-full object-contain select-none"
                />
              </div>
              {/* Crosshair target in the center of the loupe */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-0.5 bg-amber-400" />
                <div className="h-4 w-0.5 bg-amber-400 -ml-2" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="max-w-4xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
        {/* Quick Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRotate}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700 active:scale-95"
            title="Girar 90 grados"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Girar</span>
          </button>

          <button
            onClick={handleResetToDefault}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700 active:scale-95"
            title="Ajuste estándar"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Auto</span>
          </button>

          <button
            onClick={handleResetToFull}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700 active:scale-95"
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
            className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(corners, imgRef.current)}
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/30 transition active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Enderezar y Guardar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
