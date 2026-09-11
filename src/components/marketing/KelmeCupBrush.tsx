export function KelmeCupBrushBackdrop({ dense = false }: { dense?: boolean }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 1600"
      preserveAspectRatio="none"
      aria-hidden
    >
      <g fill="none" stroke="#1A7AE8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 80 C 180 20, 320 110, 480 48" strokeWidth={dense ? 22 : 18} opacity="0.92" />
        <path d="M20 140 C 90 60, 40 260, 70 420" strokeWidth={dense ? 28 : 22} opacity="0.88" />
        <path d="M0 1280 C 80 1420, 260 1540, 520 1570" strokeWidth={26} opacity="0.9" />
        <path d="M1120 60 C 1180 220, 1160 480, 1188 720" strokeWidth={24} opacity="0.86" />
        <path d="M760 40 C 920 10, 1080 90, 1180 40" strokeWidth={18} opacity="0.8" />
        <path d="M1180 1320 C 1080 1480, 860 1575, 620 1588" strokeWidth={22} opacity="0.88" />
        <path d="M-10 720 C 40 640, 20 860, 8 980" strokeWidth={16} opacity="0.45" />
      </g>
    </svg>
  )
}

export function KelmePawMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <ellipse cx="8" cy="7.2" rx="2.1" ry="2.7" />
      <ellipse cx="12" cy="5.4" rx="2.1" ry="2.7" />
      <ellipse cx="16" cy="7.2" rx="2.1" ry="2.7" />
      <ellipse cx="6.6" cy="11.6" rx="1.7" ry="2.2" />
      <path d="M12 11.2c-3.4 0-5.8 2.6-5.8 5.2 0 2.4 2.1 3.6 5.8 3.6s5.8-1.2 5.8-3.6c0-2.6-2.4-5.2-5.8-5.2z" />
    </svg>
  )
}
