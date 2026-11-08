import React, { useState } from 'react'
import { ShieldAlert, Check, X } from 'lucide-react'

export function WatermarkModal({ onConfirmWatermark, onClose }) {
  const [text, setText] = useState('CONFIDENCIAL')
  const [opacity, setOpacity] = useState(22) // percentage

  const presets = ['CONFIDENCIAL', 'COPIA', 'SOLO TRÁMITE', 'NO VÁLIDO', 'ORIGINAL']

  const handleConfirm = () => {
    if (!text.trim()) return
    onConfirmWatermark({
      text: text.trim().toUpperCase(),
      opacity: opacity / 100
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Marca de Agua</h3>
              <p className="text-[11px] text-slate-500">Protege tu documento contra copias</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Texto de la Marca de Agua
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ej: CONFIDENCIAL"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Quick presets */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
              Sugerencias rápidas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setText(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                    text === p
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Intensidad / Opacidad</span>
              <span className="text-slate-500">{opacity}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              value={opacity}
              onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!text.trim()}
              type="button"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar a la Página</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
