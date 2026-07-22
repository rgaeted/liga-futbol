'use client'

import { TeamCrest } from '@/components/TeamCrest'
import { personInitials } from '@/lib/player-name'
import type { LineupView } from '@/lib/match-lineup'

type Props = {
  lineup: LineupView
  /** If provided, empty slots become selectable */
  onSelectSlot?: (slotKey: string) => void
  selectedSlotKey?: string | null
  className?: string
  variant?: 'editor' | 'live'
  teamName?: string
  crestSrc?: string | null
  color?: string | null
}

/** Vertical % aligned with pitch SVG penalty areas (viewBox 0–150). */
function slotTopPercent(
  row: number,
  maxRow: number,
  variant: 'editor' | 'live',
  compact: boolean
): number {
  if (maxRow <= 0) return 50

  // Compact formats (F5–F7): extra inset so markers are not glued to the goal line.
  const attackEnd = compact ? 0.19 : 0.15
  const defendEnd = compact ? 0.81 : 0.85

  if (variant === 'live') {
    // Live panels: GK (row 0) defends the top goal, attack goes down.
    const t = row / maxRow
    return (attackEnd + t * (defendEnd - attackEnd)) * 100
  }

  // Editor: classic board — GK (row 0) at bottom, attack upward.
  const t = (maxRow - row) / maxRow
  return (attackEnd + t * (defendEnd - attackEnd)) * 100
}

function PitchSurface() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            180deg,
            #1a6b40 0px,
            #1a6b40 24px,
            #207648 24px,
            #207648 48px
          )`,
        }}
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-white/25"
        viewBox="0 0 100 150"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect x="4" y="4" width="92" height="142" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <line x1="4" y1="75" x2="96" y2="75" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="50" cy="75" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <rect x="22" y="4" width="56" height="22" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <rect x="34" y="4" width="32" height="8" fill="none" stroke="currentColor" strokeWidth="0.4" />
        <rect x="22" y="124" width="56" height="22" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <rect x="34" y="138" width="32" height="8" fill="none" stroke="currentColor" strokeWidth="0.4" />
        <circle cx="50" cy="16" r="0.8" fill="currentColor" />
        <circle cx="50" cy="134" r="0.8" fill="currentColor" />
      </svg>
    </>
  )
}

function LivePlayerMarker({
  slot,
  top,
  left,
}: {
  slot: LineupView['pitch'][number]
  top: string
  left: string
}) {
  const filled = Boolean(slot.playerName)

  return (
    <div
      className="absolute z-10 flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ top, left }}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow-lg ${
          filled
            ? 'border-white/90 bg-white text-emerald-900'
            : 'border-dashed border-white/50 bg-black/25 text-white/60'
        }`}
      >
        {filled ? personInitials(slot.playerName!) : slot.label}
      </div>
      {filled && (
        <span className="mt-1 max-w-[4.75rem] truncate text-center text-[9px] font-medium leading-tight text-white drop-shadow-sm">
          {slot.playerName}
        </span>
      )}
    </div>
  )
}

export function FormationPitch({
  lineup,
  onSelectSlot,
  selectedSlotKey,
  className = '',
  variant = 'editor',
  teamName,
  crestSrc,
  color,
}: Props) {
  const maxRow = Math.max(...lineup.pitch.map((s) => s.row), 0)
  const compact = lineup.pitch.length < 11
  const isLive = variant === 'live'

  const pitch = (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-emerald-900/80 ${
        isLive ? 'shadow-inner' : 'border-emerald-800 bg-gradient-to-b from-emerald-700 to-emerald-900'
      }`}
    >
      {isLive ? (
        <PitchSurface />
      ) : null}

      <p
        className={`absolute left-2 top-2 z-20 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          isLive ? 'bg-black/50 text-amber-200/90' : 'bg-black/40 text-white'
        }`}
      >
        {lineup.scheme}
      </p>

      {lineup.pitch.map((slot) => {
        const top = `${slotTopPercent(slot.row, maxRow, variant, compact)}%`
        const left = `${slot.col * 100}%`
        const filled = Boolean(slot.playerName)

        if (isLive) {
          return (
            <LivePlayerMarker key={slot.slotKey} slot={slot} top={top} left={left} />
          )
        }

        return (
          <button
            key={slot.slotKey}
            type="button"
            disabled={!onSelectSlot}
            onClick={() => onSelectSlot?.(slot.slotKey)}
            style={{ top, left, transform: 'translate(-50%, -50%)' }}
            className={`absolute z-10 flex h-14 w-14 flex-col items-center justify-center rounded-full border text-center text-[10px] leading-tight ${
              selectedSlotKey === slot.slotKey
                ? 'border-kelme-red bg-white text-kelme-gray-900'
                : filled
                  ? 'border-white/60 bg-kelme-gray-900/80 text-white'
                  : 'border-dashed border-white/40 bg-black/20 text-white/70'
            }`}
          >
            <span className="font-semibold">{slot.label}</span>
            <span className="line-clamp-2 px-0.5">{slot.playerName ?? '—'}</span>
          </button>
        )
      })}
    </div>
  )

  if (!isLive) {
    return <div className={className}>{pitch}</div>
  }

  return (
    <div className={className}>
      {teamName && (
        <div className="mb-3 flex items-center justify-center gap-2">
          <TeamCrest name={teamName} src={crestSrc} color={color} size="sm" />
          <p className="font-ui text-xs font-semibold uppercase tracking-widest text-white/85">
            {teamName}
          </p>
        </div>
      )}
      {pitch}
    </div>
  )
}
