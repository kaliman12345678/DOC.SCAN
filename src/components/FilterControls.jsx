import React, { useState } from 'react'
import { FILTER_TYPES } from '../utils/imageFilters'
import { Sparkles, Sliders, Palette, FileText, Check, Layers } from 'lucide-react'

export function FilterControls({
  currentFilter,
  onFilterChange,
  filterOptions,
  onFilterOptionsChange,
  onApplyToAllPages,
  pageCount = 1
}) {
  const [showSliders, setShowSliders] = useState(false)
  const [appliedNotice, setAppliedNotice] = useState(false)

  const presets = [
    {
      id: FILTER_TYPES.COLOR_DOC,
      title: 'Doc. Color',
      subtitle: 'Fiel + Sellos/Firmas',
      icon: Palette,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: FILTER_TYPES.BW_SCAN,
      title: 'B&N Escáner',
      subtitle: 'Texto Nítido HD',
      icon: FileText,
      color: 'from-slate-700 to-slate-900'
    },
    {
      id: FILTER_TYPES.GRAYSCALE,
      title: 'Escala Grises',
      subtitle: 'Monocromo suave',
      icon: Layers,
      color: 'from-gray-500 to-gray-700'
    },
    {
      id: FILTER_TYPES.ORIGINAL,
      title: 'Original',
      subtitle: 'Sin retoque de color',
      icon: Sparkles,
      color: 'from-emerald-500 to-teal-600'
    }
  ]

  const handleApplyToAll = () => {
    onApplyToAllPages()
    setAppliedNotice(true)
    setTimeout(() => setAppliedNotice(false), 2200)
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            Filtros de Legibilidad
            <span className="text-[11px] font-normal text-slate-500">
              (Estilo escáner profesional)
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {pageCount > 1 && (
            <button
              onClick={handleApplyToAll}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                appliedNotice
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70'
              }`}
              title="Aplica este filtro a todas las páginas escaneadas"
            >
              {appliedNotice ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>¡Aplicado a todas!</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Aplicar filtro a todas ({pageCount})</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setShowSliders(!showSliders)}
            type="button"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              showSliders
                ? 'bg-slate-200 text-slate-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showSliders ? 'Ocultar ajustes' : 'Ajustes finos'}</span>
          </button>
        </div>
      </div>

      {/* Preset Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {presets.map((preset) => {
          const isSelected = currentFilter === preset.id
          const Icon = preset.icon

          return (
            <button
              key={preset.id}
              onClick={() => onFilterChange(preset.id)}
              type="button"
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition relative active:scale-98 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div
                  className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${preset.color} flex items-center justify-center text-white shadow-xs`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {isSelected && (
                  <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>
              <span className="font-bold text-xs text-slate-900 block">
                {preset.title}
              </span>
              <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                {preset.subtitle}
              </span>
            </button>
          )
        })}
      </div>

      {/* Optional Fine Tuning Sliders */}
      {showSliders && (
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="flex justify-between font-medium text-slate-700 mb-1">
              <span>Brillo</span>
              <span className="text-slate-500">{filterOptions.brightness || 0}</span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              value={filterOptions.brightness || 0}
              onChange={(e) =>
                onFilterOptionsChange({
                  ...filterOptions,
                  brightness: parseInt(e.target.value, 10)
                })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between font-medium text-slate-700 mb-1">
              <span>Contraste</span>
              <span className="text-slate-500">{filterOptions.contrast || 0}</span>
            </div>
            <input
              type="range"
              min="-40"
              max="40"
              value={filterOptions.contrast || 0}
              onChange={(e) =>
                onFilterOptionsChange({
                  ...filterOptions,
                  contrast: parseInt(e.target.value, 10)
                })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between font-medium text-slate-700 mb-1">
              <span>Nitidez de texto</span>
              <span className="text-slate-500">{filterOptions.sharpness || 0}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              value={filterOptions.sharpness || 0}
              onChange={(e) =>
                onFilterOptionsChange({
                  ...filterOptions,
                  sharpness: parseInt(e.target.value, 10)
                })
              }
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      )}
    </div>
  )
}
