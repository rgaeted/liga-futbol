import { EventType } from '@prisma/client'
import {
  DEFAULT_REFEREE_EVENT_TYPES,
  normalizeRefereeEventTypes,
} from '@/lib/match-referee-events'

export type RefereeEventPreset = 'basico' | 'completo' | 'personalizado'

export const REFEREE_EVENT_PRESET_LABELS: Record<RefereeEventPreset, string> = {
  basico: 'Básico',
  completo: 'Completo',
  personalizado: 'Personalizado',
}

export const BASIC_REFEREE_EVENT_TYPES: EventType[] = normalizeRefereeEventTypes([
  EventType.GOAL,
  EventType.YELLOW_CARD,
  EventType.RED_CARD,
])

export function refereeEventTypesForPreset(
  preset: Exclude<RefereeEventPreset, 'personalizado'>
): EventType[] {
  if (preset === 'basico') {
    return [...BASIC_REFEREE_EVENT_TYPES]
  }
  return normalizeRefereeEventTypes([...DEFAULT_REFEREE_EVENT_TYPES])
}

function sameEventTypes(a: EventType[], b: EventType[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((type) => setB.has(type))
}

export function detectRefereeEventPreset(types: EventType[]): RefereeEventPreset {
  const normalized = normalizeRefereeEventTypes(types)
  if (sameEventTypes(normalized, refereeEventTypesForPreset('basico'))) return 'basico'
  if (sameEventTypes(normalized, refereeEventTypesForPreset('completo'))) return 'completo'
  return 'personalizado'
}
