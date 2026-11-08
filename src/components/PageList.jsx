import React from 'react'
import { ChevronUp, ChevronDown, Trash2, Crop, RotateCw, Plus } from 'lucide-react'

export function PageList({
  pages,
  activePageIndex,
  onSelectPage,
  onMovePage,
  onDeletePage,
  onRotatePage,
  onEditCorners,
  onAddMorePages
}) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          Páginas del documento
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {pages.length}
          </span>
        </h3>
        <span className="text-xs text-slate-500 hidden sm:inline">
          Selecciona una página para verla o editar sus bordes
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-300">
        {pages.map((page, idx) => {
          const isActive = activePageIndex === idx

          return (
            <div
              key={page.id || idx}
              onClick={() => onSelectPage(idx)}
              className={`group relative shrink-0 w-28 sm:w-32 rounded-xl p-2 border-2 cursor-pointer transition-all ${
                isActive
                  ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {/* Badge & Order Controls */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Pág {idx + 1}
                </span>

                <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {idx > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onMovePage(idx, idx - 1)
                      }}
                      className="p-1 rounded hover:bg-slate-200 text-slate-600 transition"
                      title="Mover antes"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                  )}
                  {idx < pages.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onMovePage(idx, idx + 1)
                      }}
                      className="p-1 rounded hover:bg-slate-200 text-slate-600 transition"
                      title="Mover después"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Thumbnail Image */}
              <div className="aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden border border-slate-200/60 flex items-center justify-center relative">
                <img
                  src={page.previewUrl || page.originalUrl}
                  alt={`Página ${idx + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Action buttons under thumbnail */}
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditCorners(idx)
                  }}
                  className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Ajustar 4 esquinas"
                >
                  <Crop className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRotatePage(idx)
                  }}
                  className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                  title="Girar 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeletePage(idx)
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                  title="Eliminar página"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}

        {/* Add more button tile in the list */}
        <div
          onClick={onAddMorePages}
          className="shrink-0 w-24 sm:w-28 aspect-[3/4] rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 cursor-pointer transition p-2 text-center"
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center mb-1.5">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold leading-tight">Añadir más fotos</span>
        </div>
      </div>
    </div>
  )
}
