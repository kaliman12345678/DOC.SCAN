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
      {/* Icon Badge */}
      <div
        className={`${s.icon} rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-400 p-0.5 shadow-md shadow-blue-500/25 flex items-center justify-center relative overflow-hidden`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Document Sheet */}
          <path
            d="M26 18 H62 L78 34 V82 C78 84.2 76.2 86 74 86 H26 C23.8 86 22 84.2 22 82 V22 C22 19.8 23.8 18 26 18 Z"
            fill="#ffffff"
          />
          {/* Corner Fold */}
          <path
            d="M62 18 V30 C62 32.2 63.8 34 66 34 H78 Z"
            fill="#93c5fd"
          />
          {/* Document Lines */}
          <rect x="32" y="42" width="28" height="3" rx="1.5" fill="#94a3b8" />
          <rect x="32" y="49" width="38" height="3" rx="1.5" fill="#94a3b8" />
          <rect x="32" y="56" width="32" height="3" rx="1.5" fill="#94a3b8" />
          <rect x="32" y="63" width="22" height="3" rx="1.5" fill="#94a3b8" />

          {/* Electric Scanner Laser Ray */}
          <rect x="10" y="48" width="80" height="4" rx="2" fill="#38bdf8" opacity="0.85" />
          <rect x="18" y="49" width="64" height="2" rx="1" fill="#ffffff" />

          {/* Magic Star / Easy Instant Sparkle */}
          <path
            d="M80 14 L82.5 20.5 L89 23 L82.5 25.5 L80 32 L77.5 25.5 L71 23 L77.5 20.5 Z"
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
