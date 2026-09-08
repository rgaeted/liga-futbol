import { personInitials } from '@/lib/player-name'
import type { LineupView } from '@/lib/match-lineup'

function shortPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].toUpperCase()
  return `${parts[0][0]!.toUpperCase()}. ${parts[parts.length - 1]!.toUpperCase()}`
}

export function LosLunesDarkPitch({ lineup }: { lineup: LineupView }) {
  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#141414]">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 150"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect width="100" height="150" fill="#141414" />
        <rect x="4" y="4" width="92" height="142" fill="none" stroke="#5a5a5a" strokeWidth="0.7" />
        <line x1="4" y1="75" x2="96" y2="75" stroke="#5a5a5a" strokeWidth="0.55" />
        <circle cx="50" cy="75" r="12" fill="none" stroke="#5a5a5a" strokeWidth="0.55" />
        <circle cx="50" cy="75" r="1.1" fill="#5a5a5a" />
        <rect x="22" y="4" width="56" height="22" fill="none" stroke="#5a5a5a" strokeWidth="0.55" />
        <rect x="34" y="4" width="32" height="8" fill="none" stroke="#4a4a4a" strokeWidth="0.45" />
        <rect x="22" y="124" width="56" height="22" fill="none" stroke="#5a5a5a" strokeWidth="0.55" />
        <rect x="34" y="138" width="32" height="8" fill="none" stroke="#4a4a4a" strokeWidth="0.45" />
      </svg>

      <span className="absolute left-2.5 top-2 z-20 font-display text-[12px] font-bold uppercase tracking-[0.12em] text-org-primary">
        {lineup.scheme}
      </span>

      {lineup.pitch.map((slot) => {
        const filled = Boolean(slot.playerName)
        return (
          <div
            key={slot.slotKey}
            className="absolute z-10 flex w-[4.4rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ top: `${slot.topPct}%`, left: `${slot.leftPct}%` }}
          >
            <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[#1c1c1c] ring-[1.5px] ring-white/35">
              {filled && slot.playerPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slot.playerPhotoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-[9px] font-bold text-white/80">
                  {filled ? personInitials(slot.playerName!) : '—'}
                </span>
              )}
            </div>
            <span className="mt-1 max-w-[4.4rem] truncate text-center text-[8px] font-semibold uppercase tracking-wide text-white">
              {filled ? shortPlayerName(slot.playerName!) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
