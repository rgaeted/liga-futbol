import { EventType } from '@prisma/client'

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  GOAL: 'Gol',
  OWN_GOAL: 'Gol en contra',
  YELLOW_CARD: 'Tarjeta amarilla',
  RED_CARD: 'Tarjeta roja',
  SHOT_ON_TARGET: 'Tiro al arco',
  SHOT_OFF_TARGET: 'Tiro desviado',
  SUBSTITUTION: 'Cambio',
  FOUL: 'Falta',
  KICKOFF: 'Inicio',
  HALFTIME: 'Entretiempo',
  FULLTIME: 'Final',
}

export const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[]

export const PLAYER_EVENT_TYPES: EventType[] = [
  EventType.GOAL,
  EventType.OWN_GOAL,
  EventType.YELLOW_CARD,
  EventType.RED_CARD,
  EventType.SHOT_ON_TARGET,
  EventType.SHOT_OFF_TARGET,
  EventType.SUBSTITUTION,
]

export function eventNeedsPlayer(type: EventType) {
  return PLAYER_EVENT_TYPES.includes(type)
}
