import { MatchStatus } from '@prisma/client'

export type MatchClockFields = {
  status: MatchStatus | string
  clockStartedAt: Date | null
  secondHalfStartedAt: Date | null
  halftimeAt: Date | null
}

export function getMatchMinute(match: MatchClockFields, now: Date = new Date()): number {
  if (match.status === MatchStatus.HALFTIME && match.clockStartedAt && match.halftimeAt) {
    const ms = match.halftimeAt.getTime() - match.clockStartedAt.getTime()
    return Math.max(0, Math.floor(ms / 60_000))
  }

  if (match.status === MatchStatus.LIVE) {
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

export function formatMatchMinute(minute: number): string {
  return `${minute}'`
}

export function parseClockDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

export function toClockFields(match: {
  status: MatchStatus | string
  clockStartedAt?: Date | string | null
  secondHalfStartedAt?: Date | string | null
  halftimeAt?: Date | string | null
}): MatchClockFields {
  return {
    status: match.status,
    clockStartedAt: parseClockDate(match.clockStartedAt),
    secondHalfStartedAt: parseClockDate(match.secondHalfStartedAt),
    halftimeAt: parseClockDate(match.halftimeAt),
  }
}
