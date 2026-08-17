/** Teal industrial backdrop for company sign-in (matches GNS Insights reference). */
export default function LoginBackdrop() {
  const iconSvg = "fill-none stroke-current [stroke-width:1.35] [stroke-linecap:round] [stroke-linejoin:round]";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#c9dad5]" aria-hidden>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="loginBgGlow" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#e8f2ef" />
            <stop offset="55%" stopColor="#d5e6e1" />
            <stop offset="100%" stopColor="#b8ccc6" />
          </radialGradient>
        </defs>

        <rect width="1920" height="1080" fill="url(#loginBgGlow)" />

        <g fill="none" stroke="#ffffff" strokeLinecap="round">
          <path
            d="M-60 210 C 260 90, 520 50, 780 130 S 1200 310, 1520 190 S 1960 70, 2140 150"
            strokeWidth="1.6"
            opacity="0.62"
          />
          <path
            d="M-100 460 C 240 350, 500 310, 760 390 S 1160 540, 1480 420 S 1920 300, 2080 380"
            strokeWidth="1.3"
            opacity="0.48"
          />
          <path
            d="M-80 720 C 280 620, 540 580, 800 660 S 1220 820, 1540 700 S 1960 580, 2120 660"
            strokeWidth="1.5"
            opacity="0.52"
          />
          <path
            d="M140 920 C 440 820, 700 780, 960 860 S 1360 1020, 1680 900 S 2020 780, 2180 860"
            strokeWidth="1.2"
            opacity="0.38"
          />
          <ellipse cx="960" cy="540" rx="680" ry="380" strokeWidth="1" opacity="0.3" />
          <ellipse cx="960" cy="540" rx="860" ry="500" strokeWidth="0.85" opacity="0.22" />
        </g>
      </svg>

      {/* Factory — top left */}
      <svg
        className={`absolute left-[4%] top-[7%] h-[5.5rem] w-[5.5rem] text-[#94ada6] opacity-[0.28] sm:h-28 sm:w-28 ${iconSvg}`}
        viewBox="0 0 80 80"
      >
        <path d="M12 62V34l10-5 10 5v28M42 62V28l10-5 10 5v34" />
        <path d="M18 24h8M38 20h8" />
        <path d="M22 16v6M42 12v6" />
        <path d="M20 12c2-4 8-4 10 0M40 8c2-4 8-4 10 0" />
        <path d="M16 18c1-2 3-2 4 0M36 14c1-2 3-2 4 0" />
      </svg>

      {/* Money bags — middle left */}
      <svg
        className={`absolute left-[6%] top-[36%] h-20 w-20 text-[#94ada6] opacity-[0.26] sm:h-24 sm:w-24 ${iconSvg}`}
        viewBox="0 0 80 80"
      >
        <path d="M18 58c0-10 8-18 18-18s18 8 18 18" />
        <path d="M14 58h40" />
        <path d="M36 40V24M36 24l-8 8M36 24l8 8" />
        <path d="M28 58c0-6 4-10 8-10s8 4 8 10" />
        <path d="M24 58h16" />
      </svg>

      {/* Crossed tools — lower left */}
      <svg
        className={`absolute bottom-[30%] left-[4%] h-[4.5rem] w-[4.5rem] text-[#94ada6] opacity-[0.28] sm:h-20 sm:w-20 ${iconSvg}`}
        viewBox="0 0 80 80"
      >
        <path d="M18 58l22-30" />
        <path d="M14 54l6 6" />
        <path d="M34 24l8-8" />
        <path d="M42 58L20 28" />
        <path d="M46 54l-6 6" />
        <path d="M26 24l-8-8" />
      </svg>

      {/* Gear — bottom left */}
      <svg
        className={`absolute bottom-[10%] left-[8%] h-16 w-16 text-[#94ada6] opacity-[0.3] sm:h-[4.5rem] sm:w-[4.5rem] ${iconSvg}`}
        viewBox="0 0 80 80"
      >
        <circle cx="40" cy="40" r="14" />
        <circle cx="40" cy="40" r="5" />
        <path d="M40 26v6M40 48v6M26 40h6M48 40h6M30 30l4 4M46 46l4 4M30 50l4-4M46 34l4-4" />
      </svg>

      {/* Clipboard — top right */}
      <svg
        className={`absolute right-[6%] top-[8%] h-20 w-20 text-[#94ada6] opacity-[0.28] sm:h-24 sm:w-24 ${iconSvg}`}
        viewBox="0 0 80 80"
      >
        <rect x="22" y="16" width="36" height="48" rx="4" />
        <path d="M30 28h20M30 38h20M30 48h12" />
        <path d="M34 12h12v8H34z" />
      </svg>

      {/* Bar chart — middle right */}
      <svg
        className={`absolute right-[18%] top-[42%] h-16 w-16 text-[#94ada6] opacity-[0.24] sm:h-20 sm:w-20 ${iconSvg}`}
        viewBox="0 0 80 80"
      >
        <path d="M14 58V22h52v36" />
        <rect x="22" y="38" width="8" height="20" rx="1" />
        <rect x="36" y="30" width="8" height="28" rx="1" />
        <rect x="50" y="34" width="8" height="24" rx="1" />
      </svg>

      {/* Warehouse — middle right */}
      <svg
        className={`absolute right-[5%] top-[32%] h-[5.5rem] w-[5.5rem] text-[#94ada6] opacity-[0.26] sm:h-28 sm:w-28 ${iconSvg}`}
        viewBox="0 0 80 80"
      >
        <path d="M10 58V30l30-14 30 14v28" />
        <path d="M24 58V40h32v18" />
        <path d="M24 40h32" />
        <path d="M34 58V48h12v10" />
      </svg>

      {/* Delivery truck — bottom right */}
      <svg
        className={`absolute bottom-[9%] right-[6%] h-[5.5rem] w-[5.5rem] text-[#94ada6] opacity-[0.28] sm:h-28 sm:w-28 ${iconSvg}`}
        viewBox="0 0 80 80"
      >
        <path d="M10 52h38l6-16H16l-6 16z" />
        <path d="M18 52v6h30v-6" />
        <circle cx="24" cy="58" r="4" />
        <circle cx="44" cy="58" r="4" />
        <path d="M48 36h14v16" />
        <rect x="50" y="24" width="12" height="10" rx="1.5" />
        <path d="M56 20v4" />
      </svg>
    </div>
  );
}
