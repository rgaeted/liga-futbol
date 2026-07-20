'use client'

import { useEffect, useMemo, useState } from 'react'
import { getMatchMinute, toClockFields } from '@/lib/match-clock'

export type SerializableClockState = {
  status: string
  clockStartedAt: string | null
  secondHalfStartedAt: string | null
  halftimeAt: string | null
}

export function useMatchClock(clock: SerializableClockState) {
  const fields = useMemo(
    () =>
      toClockFields({
        status: clock.status,
        clockStartedAt: clock.clockStartedAt,
        secondHalfStartedAt: clock.secondHalfStartedAt,
        halftimeAt: clock.halftimeAt,
      }),
    [clock.status, clock.clockStartedAt, clock.secondHalfStartedAt, clock.halftimeAt]
  )

  const [minute, setMinute] = useState(() => getMatchMinute(fields))

  useEffect(() => {
    setMinute(getMatchMinute(fields))
    if (fields.status !== 'LIVE' && fields.status !== 'HALFTIME') return
    const id = setInterval(() => setMinute(getMatchMinute(fields)), 1000)
    return () => clearInterval(id)
  }, [fields])

  return minute
}
