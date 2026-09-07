import { EventType } from '@prisma/client'
import { isScoringGoalEvent } from '@/lib/event-labels'

export function aggregateFriendlyEvents(
  events: Array<{ type: EventType | string }>
) {
  return {
    goals: events.filter((e) => isScoringGoalEvent(e.type as EventType)).length,
    yellowCards: events.filter((e) => e.type === EventType.YELLOW_CARD).length,
    redCards: events.filter((e) => e.type === EventType.RED_CARD).length,
  }
}
