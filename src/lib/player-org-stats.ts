import { EventType } from '@prisma/client'
import { db } from '@/lib/db'
import { SCORING_GOAL_EVENT_TYPES } from '@/lib/event-labels'

export type PlayerOrgEventStats = {
  goals: number
  assists: number
  yellowCards: number
  redCards: number
}

/** Goles, asistencias y tarjetas desde eventos (liga + amistosos). */
export async function getPlayerOrgEventStats(playerId: string): Promise<PlayerOrgEventStats> {
  const [goals, assists, yellowCards, redCards] = await Promise.all([
    db.matchEvent.count({
      where: {
        playerId,
        type: { in: [...SCORING_GOAL_EVENT_TYPES] },
      },
    }),
    db.matchEvent.count({
      where: {
        assistPlayerId: playerId,
        type: EventType.GOAL,
      },
    }),
    db.matchEvent.count({
      where: {
        playerId,
        type: EventType.YELLOW_CARD,
      },
    }),
    db.matchEvent.count({
      where: {
        playerId,
        type: EventType.RED_CARD,
      },
    }),
  ])

  return { goals, assists, yellowCards, redCards }
}
