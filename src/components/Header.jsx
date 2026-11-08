import React from 'react'
import { FileScan, ShieldCheck, Sparkles } from 'lucide-react'

export function Header({ pageCount, onReset }) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <FileScan className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              DocScan
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60">
                HD
              </span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Digitalizador rápido y fiel para móvil y PC
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Privado en tu equipo</span>
          </div>

          {pageCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                {pageCount} {pageCount === 1 ? 'página' : 'páginas'}
              </span>
              <button
                onClick={onReset}
                className="text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors px-2 py-1"
                title="Limpiar todo y empezar de nuevo"
              >
                Reiniciar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
