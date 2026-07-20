'use client'

import { formatMatchMinute } from '@/lib/match-clock'
import { useMatchClock, type SerializableClockState } from '@/hooks/useMatchClock'

type Props = {
  clock: SerializableClockState
  className?: string
}

export function MatchClockDisplay({ clock, className = '' }: Props) {
  const minute = useMatchClock(clock)
  const showClock = clock.status === 'LIVE' || clock.status === 'HALFTIME'

  if (!showClock) return null

  return (
    <p className={`font-display text-4xl font-extrabold tabular-nums ${className}`}>
      {formatMatchMinute(minute)}
    </p>
  )
}
