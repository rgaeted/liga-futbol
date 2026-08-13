export type MatchClockFields = {
  status: string
  clockStartedAt: Date | null
  secondHalfStartedAt: Date | null
  halftimeAt: Date | null
}

export function getMatchMinute(match: MatchClockFields, now: Date = new Date()): number {
  if (match.status === 'HALFTIME' && match.clockStartedAt && match.halftimeAt) {
    const ms = match.halftimeAt.getTime() - match.clockStartedAt.getTime()
    return Math.max(0, Math.floor(ms / 60_000))
  }

  if (match.status === 'LIVE') {
    if (match.secondHalfStartedAt) {
      const ms = now.getTime() - match.secondHalfStartedAt.getTime()
      return 45 + Math.max(0, Math.floor(ms / 60_000))
    }
    if (match.clockStartedAt) {
      const ms = now.getTime() - match.clockStartedAt.getTime()
      return Math.max(0, Math.floor(ms / 60_000))
    }
  }

  return 0
}

export function getMatchClock(
  match: MatchClockFields,
  now: Date = new Date(),
): { minute: number; running: boolean } {
  return {
    minute: getMatchMinute(match, now),
    running: match.status === 'LIVE',
  }
}

export function formatMatchMinute(minute: number): string {
  return `${minute}'`
}
