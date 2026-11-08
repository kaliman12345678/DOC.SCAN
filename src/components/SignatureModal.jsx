import React, { useRef, useState, useEffect } from 'react'
import { PenTool, Check, Trash2, X, RotateCcw } from 'lucide-react'

export function SignatureModal({ onConfirmSignature, onClose }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [inkColor, setInkColor] = useState('#0f172a') // dark slate/black

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3
    ctx.strokeStyle = inkColor
  }, [inkColor])

  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    setIsDrawing(true)
    setHasDrawn(true)
    const { x, y } = getCoordinates(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = inkColor
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const { x, y } = getCoordinates(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleConfirm = () => {
    if (!hasDrawn) return
    const signatureDataUrl = canvasRef.current.toDataURL('image/png')
    onConfirmSignature(signatureDataUrl)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Firma Digital</h3>
              <p className="text-[11px] text-slate-500">Dibuja tu firma con el dedo o ratón</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-semibold text-slate-600">Color de tinta:</span>
          <div className="flex items-center gap-2">
            {[
              { id: '#0f172a', label: 'Negro' },
              { id: '#1e40af', label: 'Azul' },
              { id: '#334155', label: 'Gris' }
            ].map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setInkColor(col.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
                  inkColor === col.id
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: col.id }}
                />
                <span>{col.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Drawing Pad Canvas */}
        <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 overflow-hidden mb-4 touch-none">
          <canvas
            ref={canvasRef}
            width={380}
            height={180}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-44 cursor-crosshair bg-white block"
          />

          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium select-none">
              Firma aquí con tu dedo o ratón
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            onClick={handleClear}
            disabled={!hasDrawn}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 disabled:opacity-40 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!hasDrawn}
              type="button"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition"
            >
              <Check className="w-4 h-4" />
              <span>Estampar Firma</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
