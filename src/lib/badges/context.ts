import { EventType } from '@prisma/client'
import { isScoringGoalEvent } from '@/lib/event-labels'
import { APP_TIMEZONE } from '@/lib/locale'
import type { BadgeEvent, BadgeRosterRow, BadgeSide } from '@/lib/badges/types'

export function minutoTotalDePartido(events: BadgeEvent[]): number {
  const fulltime = events.find((event) => event.type === 'FULLTIME')
  if (fulltime) {
    return Math.max(1, fulltime.minute)
  }

  const maxMinute = events.reduce((max, event) => Math.max(max, event.minute), 0)
  return Math.max(60, maxMinute, 1)
}

export function minutoPrimerTiempo(events: BadgeEvent[]): number {
  const halftime = events.find((event) => event.type === 'HALFTIME')
  if (halftime) {
    return halftime.minute
  }

  return Math.floor(minutoTotalDePartido(events) / 2)
}

export function scoresAfterEvents(events: BadgeEvent[]): Map<string, { a: number; b: number }> {
  const scores = new Map<string, { a: number; b: number }>()
  let a = 0
  let b = 0

  for (const event of events) {
    if (!event.side) continue

    if (isScoringGoalEvent(event.type as EventType)) {
      if (event.side === 'A') a += 1
      else b += 1
    } else if (event.type === 'OWN_GOAL') {
      if (event.side === 'A') b += 1
      else a += 1
    } else {
      continue
    }

    scores.set(event.id, { a, b })
  }

  return scores
}

export function ladoDeJugador(
  roster: BadgeRosterRow[],
  playerId: string,
): BadgeSide | null {
  return roster.find((row) => row.playerId === playerId)?.side ?? null
}

export function chileYear(d: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE, year: 'numeric' }).format(d),
  )
}
