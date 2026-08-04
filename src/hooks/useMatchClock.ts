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

  const isTicking =
    fields.status === 'LIVE' || fields.status === 'HALFTIME'
  const staticMinute = getMatchMinute(fields)
  const [liveMinute, setLiveMinute] = useState(staticMinute)
  const [trackedFields, setTrackedFields] = useState(fields)

  if (trackedFields !== fields) {
    setTrackedFields(fields)
    setLiveMinute(staticMinute)
  }

  useEffect(() => {
    if (!isTicking) return
    const id = setInterval(() => setLiveMinute(getMatchMinute(fields)), 1000)
    return () => clearInterval(id)
  }, [fields, isTicking])

  return isTicking ? liveMinute : staticMinute
}
