import React from 'react'
import { FileScan, ShieldCheck, FolderGit2, History, Plus } from 'lucide-react'

export function Header({
  viewMode, // 'history' | 'editor'
  onSwitchView,
  onReset,
  docTitle,
  pageCount = 0
}) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 text-white backdrop-blur-md border-b border-slate-800 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div
          onClick={() => onSwitchView('history')}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20">
            <FileScan className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-white">
                CamScan
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Escáner móvil y HD en navegador
            </p>
          </div>
        </div>

        {/* View Switcher / Actions */}
        <div className="flex items-center gap-2">
          {/* History Button */}
          <button
            onClick={() => onSwitchView('history')}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              viewMode === 'history'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Mis Documentos</span>
          </button>

          {/* Current Document Pill (if in editor) */}
          {viewMode === 'editor' && pageCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
                {pageCount} {pageCount === 1 ? 'pág' : 'págs'}
              </span>

              <button
                onClick={onReset}
                type="button"
                className="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 transition"
                title="Cerrar y guardar documento"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
