import { EventType } from '@prisma/client'

export function aggregateFriendlyEvents(
  events: Array<{ type: EventType | string }>
) {
  return {
    goals: events.filter((e) => e.type === EventType.GOAL).length,
    yellowCards: events.filter((e) => e.type === EventType.YELLOW_CARD).length,
    redCards: events.filter((e) => e.type === EventType.RED_CARD).length,
  }
}
