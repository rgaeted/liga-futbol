'use client'

import { formationFitTone, type FormationFitResult } from '@/lib/formation-position-fit'

const TONE_STYLES = {
  great: {
    ring: 'stroke-emerald-500',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  good: {
    ring: 'stroke-lime-500',
    bg: 'bg-lime-50 border-lime-200',
    text: 'text-lime-900',
    badge: 'bg-lime-100 text-lime-900',
  },
  fair: {
    ring: 'stroke-amber-500',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-900',
  },
  poor: {
    ring: 'stroke-red-500',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-900',
  },
} as const

function ScoreRing({ percentage, tone }: { percentage: number; tone: keyof typeof TONE_STYLES }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0 -rotate-90">
      <circle
        cx="44"
        cy="44"
        r={radius}
        fill="none"
        strokeWidth="8"
        className="stroke-kelme-gray-200"
      />
      <circle
        cx="44"
        cy="44"
        r={radius}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={TONE_STYLES[tone].ring}
      />
    </svg>
  )
}

export function FormationFitScore({ fit }: { fit: FormationFitResult }) {
  if (fit.percentage === null) {
    return (
      <div className="rounded-xl border border-dashed border-kelme-border bg-kelme-gray-50 px-4 py-3 text-sm text-kelme-gray-500">
        {fit.message}
      </div>
    )
  }

  const tone = formationFitTone(fit.percentage)
  const styles = TONE_STYLES[tone]

  return (
    <div className={`rounded-xl border px-4 py-4 ${styles.bg}`}>
      <div className="flex items-center gap-4">
        <div className="relative flex h-[88px] w-[88px] items-center justify-center">
          <ScoreRing percentage={fit.percentage} tone={tone} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-display text-2xl font-bold tabular-nums ${styles.text}`}>
              {fit.percentage}%
            </span>
            <span className="text-[10px] uppercase tracking-wide text-kelme-gray-500">acierto</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-ui text-xs uppercase tracking-wider text-kelme-gray-500">
            Acierto táctico
          </p>
          <p className={`font-display text-lg font-bold ${styles.text}`}>{fit.message}</p>
          <p className="mt-1 text-sm text-kelme-gray-600">
            Compara la posición natural de cada jugador con el slot en la cancha.
          </p>
        </div>
      </div>

      {fit.mismatches.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-black/5 pt-3">
          {fit.mismatches.map((row) => (
            <li
              key={`${row.slotKey}-${row.playerId}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate text-kelme-gray-700">
                <span className="font-medium">{row.playerLabel}</span>
                <span className="text-kelme-gray-500">
                  {' '}
                  ({row.positionLabel}) en {row.slotLabel}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${styles.badge}`}>
                {row.score}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PlayerFitBadge({ score }: { score: number }) {
  const tone = formationFitTone(score)
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${TONE_STYLES[tone].badge}`}
    >
      {score}%
    </span>
  )
}
