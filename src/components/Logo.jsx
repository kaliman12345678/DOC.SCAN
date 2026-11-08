import React from 'react'

export function Logo({ size = 'md', showSlogan = true }) {
  const sizeMap = {
    sm: { icon: 'w-8 h-8', text: 'text-base', sub: 'text-[10px]' },
    md: { icon: 'w-10 h-10', text: 'text-lg', sub: 'text-[11px]' },
    lg: { icon: 'w-12 h-12', text: 'text-xl', sub: 'text-xs' }
  }

  const s = sizeMap[size] || sizeMap.md

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Premium Monogram FSC Icon Badge */}
      <div
        className={`${s.icon} rounded-2xl bg-gradient-to-tr from-slate-950 via-blue-900 to-blue-600 p-1 shadow-md shadow-blue-500/30 flex items-center justify-center relative overflow-hidden border border-sky-400/30 shrink-0`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Letters F S C */}
          <g fill="#ffffff" fontWeight="900" fontSize="28" fontFamily="system-ui, sans-serif" letterSpacing="-1">
            <text x="50" y="60" textAnchor="middle" fill="url(#logoFscGrad)">FSC</text>
          </g>

          <defs>
            <linearGradient id="logoFscGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" />
              <stop offset="100%" stop-color="#7dd3fc" />
            </linearGradient>
          </defs>

          {/* Electric Scanner Laser Ray */}
          <rect x="8" y="50" width="84" height="3" rx="1.5" fill="#38bdf8" opacity="0.9" />
          <rect x="18" y="50.7" width="64" height="1.6" rx="0.8" fill="#ffffff" />

          {/* Gold Sparkle Accent */}
          <path
            d="M82 18 L84 23 L89 25 L84 27 L82 32 L80 27 L75 25 L80 23 Z"
            fill="#facc15"
          />
        </svg>
      </div>

      {/* Typography */}
      <div>
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tight text-white ${s.text}`}>
            FÁCIL<span className="text-sky-400">SCAN</span>
          </span>
          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/20 text-sky-300 border border-blue-400/30">
            PRO
          </span>
        </div>
        {showSlogan && (
          <p className={`${s.sub} text-slate-400 font-medium mt-1 leading-tight`}>
            Escanear nunca fue tan fácil
          </p>
        )}
      </div>
    </div>
  )
}
