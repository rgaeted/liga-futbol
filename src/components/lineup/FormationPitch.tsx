'use client'

import type { LineupView } from '@/lib/match-lineup'

type Props = {
  lineup: LineupView
  /** If provided, empty slots become selectable */
  onSelectSlot?: (slotKey: string) => void
  selectedSlotKey?: string | null
  className?: string
}

export function FormationPitch({
  lineup,
  onSelectSlot,
  selectedSlotKey,
  className = '',
}: Props) {
  const maxRow = Math.max(...lineup.pitch.map((s) => s.row), 0)

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-emerald-800 bg-gradient-to-b from-emerald-700 to-emerald-900 ${className}`}
    >
      <p className="absolute left-2 top-2 z-10 rounded bg-black/40 px-2 py-0.5 text-xs text-white">
        {lineup.scheme}
      </p>
      {lineup.pitch.map((slot) => {
        const top = `${((maxRow - slot.row) / (maxRow + 1)) * 85 + 5}%`
        const left = `${slot.col * 100}%`
        const filled = Boolean(slot.playerName)
        return (
          <button
            key={slot.slotKey}
            type="button"
            disabled={!onSelectSlot}
            onClick={() => onSelectSlot?.(slot.slotKey)}
            style={{ top, left, transform: 'translate(-50%, -50%)' }}
            className={`absolute flex h-14 w-14 flex-col items-center justify-center rounded-full border text-center text-[10px] leading-tight ${
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
}
